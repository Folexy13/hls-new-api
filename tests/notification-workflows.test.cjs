require('reflect-metadata');
require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NotificationWorkflowService } = require('../src/services/notification-workflow.service');
const { OperationsController } = require('../src/controllers/operations.controller');
const { BenfekController } = require('../src/controllers/benfek.controller');
const { NotificationService } = require('../src/services/notification.service');
const { config } = require('../src/config/config');
const axios = require('axios').default;

const person = () => ({ id: 2, role: 'benfek', firstName: 'Test', lastName: 'Benfek', phone: '2349000000000',
  email: 'test@example.com', notificationRemindersEnabled: true, preferredPharmacyName: 'Test Pharmacy', preferredPharmacyPhone: '2349000000001' });
const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const actor = { id: 1, role: 'researcher', researcherType: 'checker' };

function harness() {
  const jobs = [], calls = [], orders = [{ id: 4, userId: 2, orderNumber: 'ORD4', status: 'paid', shippingAddress: 'Test address' }];
  const user = person();
  const code = { id: 5, code: 'TESTCODE', usedBy: 2, notificationRemindersEnabled: true, preferenceBudget: null, expiresAt: null };
  const pack = { id: 9, quizCode: code.code, packName: 'Test pack', status: 'dispatched' };
  const pharmacy = { id: 6, userId: 2, pharmacyName: user.preferredPharmacyName, pharmacyPhone: user.preferredPharmacyPhone, version: 1, status: 'pending', user };
  const ticket = { id: 7, userId: 2, subject: '[Support] Test issue', isRead: false };
  const replies = [];
  let pendingPayment = null;
  const activity = new Date(Date.now() - 30 * 3600000);
  const cart = { id: 8, userId: 2, updatedAt: activity, items: [{ quantity: 2, updatedAt: activity }] };
  const db = {
    user: { findUnique: async ({ where }) => where.id === 1 ? actor : user },
    notificationJob: {
      upsert: async ({ where, create }) => {
        const existing = jobs.find(job => job.idempotencyKey === where.idempotencyKey);
        if (existing) return existing;
        const job = { id: jobs.length + 1, status: 'pending', attemptCount: 0, createdAt: new Date(), nextAttemptAt: new Date(), ...create };
        jobs.push(job); return job;
      },
      findMany: async () => jobs.filter(job => job.status === 'pending' && job.nextAttemptAt <= new Date()).map(job => ({ ...job })),
      findFirst: async () => jobs.find(job => job.kind === 'profile_incomplete') || null,
      updateMany: async ({ where, data }) => {
        if (!where.id) return { count: 0 };
        const job = jobs.find(job => job.id === where.id);
        if (!job || (where.claimToken && job.claimToken !== where.claimToken) || (typeof where.status === 'string' && job.status !== where.status)) return { count: 0 };
        if (where.OR && job.status !== 'pending') return { count: 0 };
        for (const [key, value] of Object.entries(data)) job[key] = value && typeof value === 'object' && 'increment' in value ? job[key] + value.increment : value;
        return { count: 1 };
      },
    },
    order: {
      findUnique: async () => orders[0],
      updateMany: async ({ where, data }) => {
        if (orders[0].status !== where.status) return { count: 0 };
        Object.assign(orders[0], data); return { count: 1 };
      },
    },
    cart: { findUnique: async () => cart, findFirst: async () => cart },
    payment: { findMany: async () => pendingPayment ? [pendingPayment] : [] },
    quizCode: { findUnique: async () => code },
    researcherPack: { findUnique: async () => pack },
    pharmacyRequest: {
      findUnique: async () => pharmacy,
      updateMany: async ({ data }) => { Object.assign(pharmacy, data); return { count: 1 }; },
      upsert: async ({ update }) => { Object.assign(pharmacy, update, { version: pharmacy.version + 1 }); return pharmacy; },
    },
    inbox: {
      findUnique: async () => ticket,
      create: async ({ data }) => Object.assign(ticket, data),
      update: async ({ data }) => Object.assign(ticket, data),
    },
    supportReply: {
      findUnique: async ({ where }) => replies.find(reply => reply.requestId === where.requestId) || null,
      create: async ({ data }) => { const reply = { id: replies.length + 1, ...data }; replies.push(reply); return reply; },
    },
    $transaction: async action => action(db),
  };
  const helpers = new Proxy({}, { get: (_, method) => async options => { calls.push({ method, options }); return { success: true }; } });
  const workflows = new NotificationWorkflowService(db, helpers);
  return { db, jobs, calls, workflows, user, code, pack, pharmacy, ticket, orders, replies, cart, setPendingPayment: value => { pendingPayment = value; } };
}

const cases = [
  ['order_processing', 'sendOrderProcessingMessage', { orderId: 4, orderNumber: 'ORD4' }, 'processing'],
  ['order_dispatched', 'sendOrderDispatchedMessage', { orderId: 4, orderNumber: 'ORD4', deliveryAddress: 'Test address' }, 'shipped'],
  ['order_delivered', 'sendOrderDeliveredMessage', { orderId: 4, orderNumber: 'ORD4' }, 'delivered'],
  ['cart_reminder', 'sendCartReminderMessage', { cartId: 8 }],
  ['profile_incomplete', 'sendProfileIncompleteMessage', {}],
  ['assessment_reminder', 'sendAssessmentReminderMessage', { code: 'TESTCODE', benfekName: 'Test' }],
  ['support_received', 'sendSupportTicketReceivedMessage', { subject: 'Test issue' }],
  ['support_reply', 'sendSupportReplyMessage', { subject: 'Test issue' }],
  ['pharmacy_referral', 'notifyPharmacyReferral', { requestId: 6, version: 1, phone: '2349000000001', benfekName: 'Test' }],
  ['pharmacy_accepted', 'notifyPreferredVendorAcceptance', { requestId: 6, version: 1, pharmacyName: 'Test Pharmacy' }],
  ['pack_available', 'sendPackAvailableMessage', { packId: 9 }],
];

test('all queued event kinds call their matching helper once for a persisted job', async t => {
  for (const [kind, method, payload, status] of cases) await t.test(kind, async () => {
    const h = harness(); h.orders[0].status = status || 'paid'; h.pharmacy.status = 'accepted';
    if (kind === 'cart_reminder') payload.activity = h.cart.updatedAt.getTime();
    await h.workflows.enqueue('test-key', kind, payload, 2, ['assessment_reminder', 'pack_available'].includes(kind) ? 5 : undefined);
    await h.workflows.enqueue('test-key', kind, payload, 2);
    await h.workflows.processPending(); await h.workflows.processPending();
    assert.equal(h.jobs.length, 1); assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].method, method); assert.equal(h.jobs[0].status, 'accepted');
    assert.equal(h.calls[0].options.email, undefined);
  });
});

test('stale or opted-out reminder jobs are cancelled before calling a provider', async t => {
  for (const [name, kind, mutate] of [
    ['opted out', 'profile_incomplete', h => { h.user.notificationRemindersEnabled = false; }],
    ['profile completed', 'profile_incomplete', h => { h.user.deliveryAddress = 'Test address'; }],
    ['cart cleared', 'cart_reminder', h => { h.cart.items = []; }],
    ['cart changed', 'cart_reminder', h => { h.cart.updatedAt = new Date(); }],
    ['quiz completed', 'assessment_reminder', h => { h.code.preferenceBudget = 5000; }],
    ['quiz expired', 'assessment_reminder', h => { h.code.expiresAt = new Date(0); }],
    ['registered owner opted out', 'assessment_reminder', h => { h.user.notificationRemindersEnabled = false; }],
    ['unregistered invitation opted out', 'assessment_reminder', h => { h.code.usedBy = null; h.code.notificationRemindersEnabled = false; }],
    ['pharmacy changed', 'pharmacy_accepted', h => { h.pharmacy.version = 2; }],
    ['order advanced', 'order_processing', h => { h.orders[0].status = 'shipped'; }],
    ['pack unpublished', 'pack_available', h => { h.pack.status = 'draft'; }],
    ['pack belongs to another quiz', 'pack_available', h => { h.pack.quizCode = 'OTHER'; }],
    ['pack removed', 'pack_available', h => { h.db.researcherPack.findUnique = async () => null; }],
    ['pack owner removed', 'pack_available', h => { h.db.user.findUnique = async () => null; }],
  ]) await t.test(name, async () => {
    const h = harness(); h.pharmacy.status = 'accepted';
    const payload = { activity: h.cart.updatedAt.getTime(), cartId: 8, requestId: 6, version: 1, orderId: 4, packId: 9 };
    await h.workflows.enqueue('test-key', kind, payload, kind === 'assessment_reminder' ? undefined : 2, ['assessment_reminder', 'pack_available'].includes(kind) ? 5 : undefined);
    mutate(h); await h.workflows.processPending();
    assert.equal(h.jobs[0].status, 'cancelled'); assert.equal(h.calls.length, 0);
  });
});

test('provider failures and stubs retry with a bounded attempt count; lost claims never send', async () => {
  const h = harness();
  h.workflows.notifications = { sendSupportReplyMessage: async () => ({ success: false, stubbed: true }) };
  await h.workflows.enqueue('test-key', 'support_reply', { subject: 'Test' }, 2);
  for (let attempt = 1; attempt <= 3; attempt++) {
    h.jobs[0].nextAttemptAt = new Date(0); await h.workflows.processPending();
    assert.equal(h.jobs[0].attemptCount, attempt);
    assert.equal(h.jobs[0].status, attempt === 3 ? 'failed' : 'pending');
  }
  const lost = harness(); await lost.workflows.enqueue('lost', 'support_reply', {}, 2);
  lost.db.notificationJob.updateMany = async () => ({ count: 0 });
  await lost.workflows.processPending(); assert.equal(lost.calls.length, 0);
});

test('scheduler queues opted-in stale cart, incomplete profile and assessment without duplicating', async () => {
  const h = harness(); const now = new Date();
  h.db.user.findMany = async ({ where }) => { assert.equal(where.notificationRemindersEnabled, true); return where.id.gt ? [] : [h.user]; };
  h.db.quizCode.findMany = async ({ where }) => where.id.gt ? [] : [{ ...h.code, createdAt: new Date(now - 30 * 3600000) }];
  await h.workflows.scheduleReminders(now); await h.workflows.scheduleReminders(now);
  assert.deepEqual(h.jobs.map(job => job.kind).sort(), ['assessment_reminder', 'cart_reminder', 'profile_incomplete']);
});

test('checker order transitions persist jobs atomically and reject invalid or repeated transitions', async () => {
  const h = harness(); const controller = new OperationsController(h.db, h.workflows);
  for (const status of ['processing', 'shipped', 'delivered']) {
    for (let retry = 0; retry < 2; retry++) {
      const res = response(); await controller.updateOrder({ user: actor, params: { id: '4' }, body: { status } }, res);
      assert.equal(res.statusCode, 200);
    }
  }
  assert.equal(h.jobs.length, 3);
  const res = response(); await controller.updateOrder({ user: actor, params: { id: '4' }, body: { status: 'processing' } }, res);
  assert.equal(res.statusCode, 409);
});

test('support receipt and reply are queued; reply retries are idempotent', async () => {
  const h = harness();
  const benfek = new BenfekController(h.db, {}, { notifyAdmin: async () => undefined }, h.workflows);
  let res = response();
  await benfek.createSupportTicket({ user: { id: 2 }, body: { category: 'Delivery', subject: 'Test issue', message: 'Help please' } }, res);
  assert.equal(res.statusCode, 201); assert.equal(h.jobs[0].kind, 'support_received');
  const controller = new OperationsController(h.db, h.workflows);
  const req = { user: actor, params: { id: '7' }, body: { message: 'We are reviewing your request.', requestId: '263512b1-5c22-4757-b808-76b98114e96b', resolve: true } };
  for (let retry = 0; retry < 2; retry++) { res = response(); await controller.reply(req, res); assert.equal(res.statusCode, 201); }
  assert.equal(h.replies.length, 1); assert.equal(h.jobs.filter(job => job.kind === 'support_reply').length, 1);
  assert.equal(h.ticket.isRead, true);
});

test('pharmacy approval queues both notifications once and rejects stale versions', async () => {
  const h = harness(); const controller = new OperationsController(h.db, h.workflows);
  let res = response(); await controller.acceptPharmacy({ user: actor, params: { id: '6' }, body: { version: 2 } }, res);
  assert.equal(res.statusCode, 409); assert.equal(h.jobs.length, 0);
  for (let retry = 0; retry < 2; retry++) { res = response(); await controller.acceptPharmacy({ user: actor, params: { id: '6' }, body: { version: 1 } }, res); assert.equal(res.statusCode, 200); }
  assert.deepEqual(h.jobs.map(job => job.kind).sort(), ['pharmacy_accepted', 'pharmacy_referral']);
});

test('saving a changed pharmacy selection resets approval without contacting an unverified pharmacy', async () => {
  const h = harness(); h.pharmacy.status = 'accepted';
  h.user.preferredPharmacyName = 'New Pharmacy'; h.user.preferredPharmacyPhone = '2349000000002';
  await h.workflows.syncPharmacySelection(2); await h.workflows.syncPharmacySelection(2);
  assert.equal(h.pharmacy.version, 2); assert.equal(h.pharmacy.status, 'pending');
  assert.equal(h.pharmacy.pharmacyName, 'New Pharmacy'); assert.equal(h.jobs.length, 0); assert.equal(h.calls.length, 0);
});

test('support history returns replies only for the authenticated ticket owner', async () => {
  const h = harness();
  h.db.inbox.findMany = async args => {
    assert.equal(args.where.userId, 2); assert.equal(args.where.subject.startsWith, '[Support]');
    return [{ ...h.ticket, message: 'Category: Delivery\n\nHelp please', replies: [{ id: 1, message: 'We are reviewing it.', createdAt: new Date() }] }];
  };
  const controller = new BenfekController(h.db, {}, {}, h.workflows); const res = response();
  await controller.getSupportTickets({ user: { id: 2 } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.data.tickets[0].replies[0].message, 'We are reviewing it.');
});

test('non-checkers cannot manage any operational resource, regardless of token claims', async () => {
  for (const role of ['principal', 'wholesaler', 'benfek', 'pharmacy', 'researcher']) {
    const h = harness(); h.db.user.findUnique = async () => ({ role, researcherType: 'maker' });
    const controller = new OperationsController(h.db, h.workflows);
    for (const method of ['access', 'list', 'reply', 'updateOrder', 'acceptPharmacy']) {
      const res = response(); await controller[method]({ user: actor }, res);
      assert.equal(res.statusCode, 403); assert.equal(h.jobs.length, 0);
    }
  }
});

test('configured event templates use their documented positional variables', async () => {
  const original = { ...config.whatsapp }; const oldPost = axios.post;
  try {
    Object.assign(config.whatsapp, { provider: 'meta', apiUrl: 'https://example.invalid/messages', apiKey: 'test-only', senderPhone: '2349000000000',
      eventTemplateLanguage: 'en', eventTemplates: Object.fromEntries(cases.map(([kind]) => [kind, `hls_${kind}`])) });
    const sent = [];
    axios.post = async (_url, payload) => { sent.push(payload); return { data: { messages: [{ id: `wamid.${sent.length}` }] } }; };
    const service = new NotificationService({ whatsAppDelivery: { upsert: async () => undefined } });
    const counts = [1, 2, 1, 1, 1, 3, 2, 2, 1, 1, 2];
    for (const [index, [kind, , originalPayload, status]] of cases.entries()) {
      const h = harness(); h.orders[0].status = status || 'paid'; h.pharmacy.status = 'accepted';
      const payload = { ...originalPayload };
      if (kind === 'cart_reminder') payload.activity = h.cart.updatedAt.getTime();
      h.workflows.notifications = service;
      await h.workflows.enqueue('template-test', kind, payload, 2, ['assessment_reminder', 'pack_available'].includes(kind) ? 5 : undefined);
      await h.workflows.processPending();
      assert.equal(sent[index].template.name, `hls_${kind}`);
      assert.equal(sent[index].template.language.code, 'en');
      assert.equal(sent[index].template.components[0].parameters.length, counts[index]);
      assert.equal(h.jobs[0].status, 'accepted');
    }
    assert.equal(sent.length, cases.length);
    assert.deepEqual(sent[1].template.components[0].parameters, [{ type: 'text', text: 'ORD4' }, { type: 'text', text: 'Test address' }]);
  } finally { Object.assign(config.whatsapp, original); axios.post = oldPost; }
});

test('notification links do not ask registered Benfeks to validate an already-used code', async () => {
  const original = { ...config.whatsapp }; const oldPost = axios.post;
  try {
    Object.assign(config.whatsapp, { provider: 'meta', apiUrl: 'https://example.invalid/messages', apiKey: 'test-only', senderPhone: person().phone,
      eventTemplates: { assessment_reminder: 'hls_assessment_reminder' } });
    const payloads = [];
    axios.post = async (_url, payload) => { payloads.push(payload); return { data: { messages: [{ id: `wamid.${payloads.length}` }] } }; };
    const service = new NotificationService({ whatsAppDelivery: { upsert: async () => undefined } });
    await service.sendAssessmentReminderMessage({ phone: person().phone, code: 'TESTCODE', registered: false });
    await service.sendAssessmentReminderMessage({ phone: person().phone, code: 'TESTCODE', registered: true });
    const packResult = await service.sendPackAvailableMessage({ phone: person().phone, code: 'TESTCODE', packName: 'Test pack' });
    assert.ok(payloads[0].template.components[0].parameters[2].text.includes('/quiz?code=TESTCODE'));
    assert.ok(payloads[1].template.components[0].parameters[2].text.includes('/benfek/my-profile'));
    assert.equal(packResult.success, false);
    assert.match(packResult.reason, /WHATSAPP_TEMPLATE_PACK_AVAILABLE/);
    assert.equal(payloads.length, 2);
  } finally { Object.assign(config.whatsapp, original); axios.post = oldPost; }
});
