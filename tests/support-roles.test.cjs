require('reflect-metadata');
require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios').default;
const { BenfekController } = require('../src/controllers/benfek.controller');
const { OperationsController } = require('../src/controllers/operations.controller');
const { NotificationWorkflowService } = require('../src/services/notification-workflow.service');
const { NotificationService } = require('../src/services/notification.service');
const { config } = require('../src/config/config');

const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
function harness(role) {
  const user = { id: 2, role, firstName: 'Test', lastName: 'User', email: 'test@example.com', phone: '2349000000000' };
  const checker = { id: 1, role: 'researcher', researcherType: 'checker' };
  const tickets = [], replies = [], jobs = [], emails = [];
  const db = {
    user: { findUnique: async ({ where }) => where.id === 1 ? checker : user },
    inbox: {
      create: async ({ data }) => { const ticket = { id: tickets.length + 1, createdAt: new Date(), replies: [], ...data }; tickets.push(ticket); return ticket; },
      findUnique: async ({ where }) => tickets.find(ticket => ticket.id === where.id),
      findMany: async ({ where }) => tickets.filter(ticket => ticket.userId === where.userId && ticket.subject.startsWith(where.subject.startsWith))
        .map(ticket => ({ ...ticket, replies: replies.filter(reply => reply.ticketId === ticket.id) })),
      update: async ({ where, data }) => Object.assign(tickets.find(ticket => ticket.id === where.id), data),
    },
    supportReply: {
      findUnique: async ({ where }) => replies.find(reply => reply.requestId === where.requestId),
      create: async ({ data }) => { const reply = { id: replies.length + 1, createdAt: new Date(), ...data }; replies.push(reply); return reply; },
    },
    notificationJob: { upsert: async ({ create }) => {
      const existing = jobs.find(job => job.idempotencyKey === create.idempotencyKey);
      if (existing) return existing;
      const job = { id: jobs.length + 1, ...create }; jobs.push(job); return job;
    } },
    $transaction: async action => action(db),
  };
  const workflows = new NotificationWorkflowService(db, {});
  const controller = new BenfekController(db, {}, { notifyAdmin: async (...args) => { emails.push(args); } }, workflows);
  const operations = new OperationsController(db, workflows);
  const request = { user: { id: 2, role: 'benfek' }, body: { category: 'Delivery', subject: 'Delivery enquiry', message: 'Please check my delivery.' } };
  return { user, checker, db, workflows, controller, operations, request, jobs, tickets, replies, emails };
}

test('all three supported roles can submit, receive a checker reply, and see their own history', async t => {
  for (const role of ['benfek', 'principal', 'wholesaler']) await t.test(role, async () => {
    const h = harness(role); let res = response();
    await h.controller.createSupportTicket(h.request, res);
    assert.equal(res.statusCode, 201); assert.equal(h.tickets[0].userId, 2);
    assert.equal(h.jobs[0].kind, 'support_received'); assert.equal(h.jobs[0].userId, 2);
    assert.match(h.emails[0][0], new RegExp(role, 'i'));
    const replyRequest = { user: h.checker, params: { id: '1' }, body: {
      message: 'Your delivery is being reviewed.', resolve: true, requestId: '263512b1-5c22-4757-b808-76b98114e96b',
    } };
    for (let i = 0; i < 2; i++) { res = response(); await h.operations.reply(replyRequest, res); assert.equal(res.statusCode, 201); }
    assert.equal(h.replies.length, 1); assert.equal(h.jobs[1].kind, 'support_reply');
    res = response(); await h.controller.getSupportTickets(h.request, res);
    assert.equal(res.statusCode, 200); assert.equal(res.body.data.tickets[0].status, 'resolved');
    assert.equal(res.body.data.tickets[0].replies[0].message, 'Your delivery is being reviewed.');
    assert.equal((await h.workflows.prepare(h.jobs[0])).role, role);
    assert.equal((await h.workflows.prepare(h.jobs[1])).role, role);
  });
});

test('support history and queued messages use the authenticated owner, not client-supplied identities or roles', async () => {
  const h = harness('wholesaler');
  h.request.body.userId = 99; h.request.body.role = 'principal';
  await h.controller.createSupportTicket(h.request, response());
  h.tickets.push({ id: 99, userId: 99, subject: '[Support] Another owner', message: 'Private', replies: [] });
  const res = response(); await h.controller.getSupportTickets(h.request, res);
  assert.equal(res.body.data.tickets.length, 1); assert.equal(h.tickets[0].userId, 2);
  const prepared = await h.workflows.prepare(h.jobs[0]); assert.equal(prepared.role, 'wholesaler');
  h.user.role = 'principal';
  assert.equal((await h.workflows.prepare(h.jobs[0])).role, 'principal');
});

test('unsupported, deleted and unauthenticated users cannot submit or read tickets', async () => {
  for (const role of ['researcher', 'admin', 'pharmacy', 'customer']) {
    const h = harness(role);
    for (const method of ['createSupportTicket', 'getSupportTickets']) {
      const res = response(); await h.controller[method](h.request, res); assert.equal(res.statusCode, 403);
    }
    assert.equal(h.tickets.length, 0); assert.equal(h.jobs.length, 0);
  }
  const h = harness('principal');
  const unauthenticated = response(); await h.controller.createSupportTicket({ body: h.request.body }, unauthenticated);
  assert.equal(unauthenticated.statusCode, 401);
  h.db.user.findUnique = async () => null;
  const missing = response(); await h.controller.getSupportTickets(h.request, missing); assert.equal(missing.statusCode, 403);
});

test('invalid or overlong support submissions never persist a ticket or job', async () => {
  for (const values of [{ category: ' ' }, { subject: 'a'.repeat(161) }, { category: 'a'.repeat(81) }, { message: 'a'.repeat(5001) }]) {
    const h = harness('principal'); const res = response();
    await h.controller.createSupportTicket({ ...h.request, body: { ...h.request.body, ...values } }, res);
    assert.equal(res.statusCode, 400); assert.equal(h.tickets.length, 0); assert.equal(h.jobs.length, 0);
  }
});

test('both support templates include the correct role-specific history URL, in either environment', async () => {
  const original = { ...config.whatsapp }, oldPost = axios.post, base = config.frontendBaseUrl;
  try {
    Object.assign(config.whatsapp, { provider: 'meta', apiUrl: 'https://example.invalid/messages', apiKey: 'test-only',
      eventTemplates: { support_received: 'hls_support_received', support_reply: 'hls_support_reply' } });
    const sent = [];
    axios.post = async (_url, body) => { sent.push(body); return { data: { messages: [{ id: `test.${sent.length}` }] } }; };
    for (const environment of ['https://testing.hlsnigeria.com', 'https://hlsnigeria.com']) {
      config.frontendBaseUrl = environment;
      const service = new NotificationService({ whatsAppDelivery: { upsert: async () => undefined } });
      for (const [role, path] of [['benfek', '/support'], ['principal', '/principal/support'], ['wholesaler', '/wholesaler/support']]) {
        for (const method of ['sendSupportTicketReceivedMessage', 'sendSupportReplyMessage']) {
          await service[method]({ phone: '2349000000000', subject: 'Delivery enquiry', role });
          assert.deepEqual(sent.at(-1).template.components[0].parameters, [
            { type: 'text', text: 'Delivery enquiry' }, { type: 'text', text: `${environment}${path}?tab=history` },
          ]);
        }
      }
    }
    assert.equal(sent.length, 12);
  } finally { Object.assign(config.whatsapp, original); config.frontendBaseUrl = base; axios.post = oldPost; }
});
