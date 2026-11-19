require('reflect-metadata');
require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ResearcherController } = require('../src/controllers/researcher.controller');
const { NotificationWorkflowService } = require('../src/services/notification-workflow.service');
const { NotificationService } = require('../src/services/notification.service');
const { config } = require('../src/config/config');
const axios = require('axios').default;

function harness() {
  let pack = null;
  const jobs = [], calls = [];
  const code = { id: 5, code: 'TESTCODE', usedBy: 2, benfekName: 'Test', benfekPhone: '2349000000000',
    benfekEmail: 'test@example.com', creator: { firstName: 'Test', lastName: 'Principal', email: 'principal@example.com' } };
  const db = {
    quizCode: { findUnique: async () => code },
    user: { findMany: async () => [], findUnique: async () => ({ role: 'benfek', phone: '2349000000002' }) },
    researcherPack: {
      findUnique: async () => pack,
      upsert: async ({ create, update }) => { pack = pack ? { ...pack, ...update } : { id: 9, ...create, items: [] }; return pack; },
    },
    researcherPackItem: { deleteMany: async () => undefined, upsert: async () => undefined },
    notificationJob: { upsert: async ({ create }) => {
      const found = jobs.find(job => job.idempotencyKey === create.idempotencyKey);
      if (found) return found;
      const job = { id: 1, status: 'pending', ...create }; jobs.push(job); return job;
    } },
    $transaction: async callback => {
      const previous = pack && { ...pack }, oldJobs = jobs.slice();
      try { return await callback(db); }
      catch (error) { pack = previous; jobs.splice(0, jobs.length, ...oldJobs); throw error; }
    },
  };
  const notifications = { sendPackAvailableMessage: async payload => { calls.push(payload); return { success: true }; } };
  const workflows = new NotificationWorkflowService(db, notifications);
  const controller = new ResearcherController(db, notifications, {}, workflows);
  async function dispatch(status = 'dispatched') {
    const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await controller.dispatchPack({ user: { id: 1, role: 'researcher' }, body: {
      code: 'TESTCODE', packId: 'starter', packName: 'Test pack', items: [{ id: 4, quantity: 2 }], status,
    } }, res);
    return res;
  }
  return { db, jobs, calls, code, workflows, dispatch, getPack: () => pack };
}

test('draft saves do not notify; publishing queues once and retains independent email', async () => {
  const h = harness();
  const draft = await h.dispatch('draft');
  assert.equal(draft.statusCode, 200); assert.equal(draft.body.data.whatsappDelivery, null);
  assert.equal(h.jobs.length, 0); assert.equal(h.calls.length, 0);
  for (let retry = 0; retry < 2; retry++) {
    const result = await h.dispatch();
    assert.equal(result.statusCode, 200); assert.equal(result.body.data.whatsappDelivery.status, 'queued');
  }
  assert.equal(h.jobs.length, 1); assert.equal(h.jobs[0].kind, 'pack_available');
  assert.equal(h.jobs[0].quizCodeId, 5); assert.equal(h.jobs[0].idempotencyKey, 'pack-ready:9');
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].phone, undefined);
  assert.equal(h.calls[0].email, 'test@example.com');
  h.jobs[0].status = 'accepted';
  assert.equal((await h.dispatch()).body.data.whatsappDelivery.status, 'accepted');
});

test('a failed queue or item write rolls back publication and sends nothing', async () => {
  for (const model of ['notificationJob', 'researcherPackItem']) {
    const h = harness();
    h.db[model].upsert = async () => { throw new Error('Simulated database failure'); };
    const result = await h.dispatch();
    assert.equal(result.statusCode, 500); assert.equal(h.getPack(), null);
    assert.equal(h.jobs.length, 0); assert.equal(h.calls.length, 0);
  }
});

test('pack job resolves the current registered contact or the unregistered invitation phone', async () => {
  const h = harness(); await h.dispatch(); const job = h.jobs[0];
  let prepared = await h.workflows.prepare(job);
  assert.equal(prepared.phone, '2349000000002'); assert.equal(prepared.packName, 'Test pack');
  h.db.user.findUnique = async () => ({ role: 'benfek', whatsappNumber: '2349000000003' });
  prepared = await h.workflows.prepare(job); assert.equal(prepared.phone, '2349000000003');
  h.code.usedBy = null;
  prepared = await h.workflows.prepare(job); assert.equal(prepared.phone, h.code.benfekPhone);
  h.code.benfekPhone = null;
  assert.equal(await h.workflows.prepare(job), null);
});

test('email failure cannot undo a published pack or its WhatsApp job', async () => {
  const h = harness();
  h.workflows.notifications.sendPackAvailableMessage = async () => { throw new Error('Email unavailable'); };
  const result = await h.dispatch();
  assert.equal(result.statusCode, 200); assert.equal(h.getPack().status, 'dispatched');
  assert.equal(h.jobs.length, 1); assert.equal(result.body.data.whatsappDelivery.status, 'queued');
});

test('pack notification retries a failed provider without repeating email', async () => {
  const h = harness(); await h.dispatch(); const job = h.jobs[0];
  Object.assign(job, { attemptCount: 0, nextAttemptAt: new Date(0) });
  h.db.notificationJob.findMany = async () => job.status === 'pending' ? [{ ...job }] : [];
  h.db.notificationJob.updateMany = async ({ where, data }) => {
    if (where.id !== job.id) return { count: 0 };
    for (const [key, value] of Object.entries(data)) job[key] = value && typeof value === 'object' && 'increment' in value ? job[key] + value.increment : value;
    return { count: 1 };
  };
  let attempts = 0;
  h.workflows.notifications = { sendPackAvailableMessage: async options => {
    assert.equal(options.email, undefined); attempts++;
    return { success: attempts > 1, reason: 'Provider unavailable' };
  } };
  await h.workflows.processPending(); assert.equal(job.status, 'pending');
  job.nextAttemptAt = new Date(0);
  await h.workflows.processPending(); assert.equal(job.status, 'accepted');
  assert.equal(attempts, 2); assert.equal(h.calls.length, 1);
});

test('additional template contracts match the handbook, including pack dashboard URL', async () => {
  const old = { ...config.whatsapp }, oldPost = axios.post;
  try {
    Object.assign(config.whatsapp, { provider: 'meta', apiUrl: 'https://example.invalid/messages', apiKey: 'test-only',
      eventTemplates: { pack_available: 'hls_pack_available', assessment_completed: 'hls_assessment_completed',
        payment_successful: 'hls_payment_successful', payment_failed: 'hls_payment_failed', invoice: 'hls_invoice' } });
    const sent = [];
    axios.post = async (_url, body) => { sent.push(body); return { data: { messages: [{ id: `test.${sent.length}` }] } }; };
    const service = new NotificationService({ whatsAppDelivery: { upsert: async () => undefined } });
    const phone = '2349000000000';
    await service.sendPackAvailableMessage({ phone, packName: 'Test pack', code: 'TESTCODE' });
    await service.sendAssessmentCompletedMessage({ phone, benfekName: 'Test' });
    await service.sendPaymentSuccessfulMessage({ phone, orderNumber: 'ORD4', amount: 5000 });
    await service.sendPaymentFailedMessage({ phone, orderNumber: 'ORD4' });
    await service.sendInvoiceImage({ phone, imageUrl: 'https://example.com/invoice.png', caption: 'Test invoice' });
    const values = sent.map(body => body.template.components[0].parameters.map(parameter => parameter.text));
    assert.equal(sent[0].template.name, 'hls_pack_available');
    assert.equal(values[0][0], 'Test pack'); assert.ok(values[0][1].endsWith('/benfek/dashboard'));
    assert.deepEqual(values.slice(1), [['Test'], ['ORD4', '5000'], ['ORD4'], ['https://example.com/invoice.png']]);
    assert.ok(sent.every(body => body.type === 'template'));
  } finally { Object.assign(config.whatsapp, old); axios.post = oldPost; }
});
