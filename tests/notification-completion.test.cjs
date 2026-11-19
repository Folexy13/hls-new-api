require('reflect-metadata');
require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios').default;
const { InvoiceService } = require('../src/services/invoice.service');
const { NotificationWorkflowService } = require('../src/services/notification-workflow.service');
const { NotificationService } = require('../src/services/notification.service');
const { WhatsAppWebhookService } = require('../src/services/whatsapp-webhook.service');
const { BenfekController } = require('../src/controllers/benfek.controller');
const { OperationsController } = require('../src/controllers/operations.controller');
const { invoiceLink } = require('../src/utilities/invoice-link.utility');
const { config } = require('../src/config/config');
config.jwtSecret = 'test-only-invoice-signing-key';
axios.post = async () => { throw new Error('Unexpected provider request'); };
const response = () => ({ setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

function harness() {
  const jobs = [], invoices = [], calls = [];
  const user = { id: 2, role: 'benfek', firstName: 'Test', lastName: 'Customer', phone: '2349000000000', notificationRemindersEnabled: true };
  const code = { id: 5, code: 'TESTCODE', usedBy: 2, isUsed: true, preferenceBudget: 5000 };
  const order = { id: 4, userId: 2, orderNumber: 'ORD4', payment: { status: 'success' }, items: [{ productName: 'Test product', supplementId: 3, quantity: 2, price: 1250 }] };
  const cart = { id: 8, userId: 2, updatedAt: new Date(Date.now() - 30 * 3600000), items: [{ supplementId: 3, quantity: 2, updatedAt: new Date(Date.now() - 30 * 3600000) }] };
  let payments = [];
  const db = {
    user: { findUnique: async () => user },
    order: { findUnique: async () => order },
    quizCode: { findUnique: async () => ({ ...code }), findFirst: async () => ({ ...code }), findMany: async () => [code], update: async ({ data }) => Object.assign(code, data) },
    researcherPack: { findFirst: async ({ where }) => where.packId === 'pack-1' && where.quizCode.in.includes(code.code) ? {
      id: 9, packName: 'Test pack', items: [{ quantity: 2, supplement: { name: 'Test product', price: 1250 } }],
    } : null },
    cart: { findUnique: async () => cart },
    payment: { findMany: async ({ where }) => payments.filter(payment => payment.createdAt >= where.createdAt.gte) },
    invoice: {
      upsert: async ({ where, create }) => { let invoice = invoices.find(item => item.sourceKey === where.sourceKey);
        if (!invoice) { invoice = { ...create, createdAt: new Date() }; invoices.push(invoice); } return invoice; },
      findUnique: async ({ where }) => invoices.find(item => item.id === where.id) || null,
    },
    notificationJob: {
      upsert: async ({ where, create }) => { let job = jobs.find(item => item.idempotencyKey === where.idempotencyKey);
        if (!job) { job = { id: jobs.length + 1, status: 'pending', attemptCount: 0, nextAttemptAt: new Date(0), ...create }; jobs.push(job); } return job; },
      findMany: async () => jobs.filter(job => job.status === 'pending' && job.nextAttemptAt <= new Date()).map(job => ({ ...job })),
      updateMany: async ({ where, data }) => { const job = jobs.find(job => job.id === where.id); if (!job) return { count: 0 };
        for (const [key, value] of Object.entries(data)) job[key] = value && typeof value === 'object' && 'increment' in value ? job[key] + value.increment : value;
        return { count: 1 }; },
    },
    $transaction: async action => {
      const before = structuredClone({ jobs, invoices, code });
      try { return await action(db); }
      catch (error) { jobs.splice(0, jobs.length, ...before.jobs); invoices.splice(0, invoices.length, ...before.invoices);
        Object.assign(code, before.code); throw error; }
    },
  };
  const notifications = new Proxy({}, { get: (_, method) => async options => {
    calls.push({ method, options }); return { success: true, payload: [{ channel: 'whatsapp', payload: { messages: [{ id: 'wamid.test' }] } }] };
  } });
  const workflows = new NotificationWorkflowService(db, notifications);
  return { db, jobs, invoices, calls, workflows, user, code, order, cart, service: new InvoiceService(db, workflows), setPayments: value => { payments = value; } };
}

test('invoice uses owned immutable server data, deduplicates repeated clicks and queues a template link', async () => {
  const h = harness(); const first = await h.service.request(2, { orderId: 4 });
  const repeated = await h.service.request(2, { orderId: 4 });
  assert.equal(first.invoiceId, repeated.invoiceId); assert.equal(h.jobs.length, 1);
  assert.equal(h.invoices[0].snapshot.total, 2500); assert.equal(h.invoices[0].snapshot.type, 'Invoice');
  const url = new URL(invoiceLink(h.invoices[0]));
  h.order.items[0].price = 9999;
  const stored = await h.service.read(2, first.invoiceId, url.searchParams.get('token'));
  assert.equal(stored.total, 2500); assert.equal(stored.items[0].unitPrice, 1250);
  h.user.phone = '2349000000001';
  await h.workflows.processPending(); await h.workflows.processPending();
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].method, 'sendInvoiceLink');
  assert.equal(h.calls[0].options.phone, h.user.phone); assert.equal(h.calls[0].options.invoiceUrl, url.href);
  assert.equal(h.jobs[0].providerMessageId, 'wamid.test'); assert.equal(h.jobs[0].status, 'accepted');
});

test('invoice creation and profile completion roll back if their durable job cannot be saved', async () => {
  const h = harness();
  h.db.notificationJob.upsert = async () => { throw new Error('Queue unavailable'); };
  await assert.rejects(h.service.request(2, { orderId: 4 }), /Queue unavailable/);
  assert.equal(h.invoices.length, 0); assert.equal(h.calls.length, 0);
  h.code.preferenceBudget = null;
  const controller = new BenfekController(h.db, {}, {}, h.workflows);
  controller.buildProfile = async () => ({}); h.workflows.syncPharmacySelection = async () => {};
  const res = response(); await controller.updateProfile({ user: { id: 2 }, body: { preferenceBudget: 5000 } }, res);
  assert.equal(res.statusCode, 500); assert.equal(h.code.preferenceBudget, null); assert.equal(h.jobs.length, 0);
});

test('invoice rejects foreign sources, arbitrary URLs/recipients, missing phone and non-Benfeks', async () => {
  const h = harness();
  await assert.rejects(h.service.request(2, { imageUrl: 'https://example.invalid/invoice', phone: '123' }));
  await assert.rejects(h.service.request(2, { packId: 'foreign' }), /not found/);
  h.order.userId = 3; await assert.rejects(h.service.request(2, { orderId: 4 }), /not found/);
  h.user.phone = ''; await assert.rejects(h.service.request(2, { packId: 'pack-1' }), /phone number/);
  h.user.role = 'principal'; await assert.rejects(h.service.request(2, { packId: 'pack-1' }), /access required/);
  assert.equal(h.jobs.length, 0);
});

test('unpaid packs create proforma invoices; tokens require owner, integrity and expiry', async () => {
  const h = harness(); const result = await h.service.request(2, { packId: 'pack-1' });
  const invoice = h.invoices[0], token = new URL(invoiceLink(invoice)).searchParams.get('token');
  assert.equal(invoice.snapshot.type, 'Proforma invoice');
  await assert.rejects(h.service.read(3, result.invoiceId, token), /not found/);
  await assert.rejects(h.service.read(2, result.invoiceId, '0'.repeat(64)), /invalid/);
  invoice.expiresAt = new Date(0);
  await assert.rejects(h.service.read(2, result.invoiceId, token), /expired/);
  await h.workflows.processPending(); assert.equal(h.jobs[0].status, 'cancelled'); assert.equal(h.calls.length, 0);
});

test('profile quiz completion queues once; provider retries cannot repeat email', async () => {
  const h = harness(); h.code.preferenceBudget = null;
  const controller = new BenfekController(h.db, {}, {}, h.workflows);
  controller.buildProfile = async () => ({}); h.workflows.syncPharmacySelection = async () => {};
  for (let i = 0; i < 2; i++) {
    const res = response(); await controller.updateProfile({ user: { id: 2 }, body: { preferenceBudget: 5000 } }, res);
    assert.equal(res.statusCode, 200);
  }
  assert.equal(h.jobs.length, 1); assert.equal(h.jobs[0].kind, 'assessment_completed');
  let attempts = 0;
  h.workflows.notifications = { sendAssessmentCompletedMessage: async options => {
    assert.equal(options.email, undefined); attempts++; return { success: attempts > 1, reason: 'Provider unavailable' };
  } };
  await h.workflows.processPending(); assert.equal(h.jobs[0].status, 'pending');
  h.jobs[0].nextAttemptAt = new Date(0); await h.workflows.processPending();
  assert.equal(h.jobs[0].status, 'accepted'); assert.equal(attempts, 2);
});

test('stale and unrelated pending checkouts do not block carts; current matching checkout defers without consuming retries', async () => {
  for (const scenario of ['old', 'pack', 'other cart', 'changed items', 'active']) {
    const h = harness(); const payment = { createdAt: new Date(), metadata: JSON.stringify({ checkoutType: 'cart', cartId: 8 }), order: { items: [{ supplementId: 3, quantity: 2 }] } };
    if (scenario === 'old') payment.createdAt = new Date(Date.now() - 2 * 3600000);
    if (scenario === 'pack') payment.metadata = JSON.stringify({ checkoutType: 'pack', cartId: 8 });
    if (scenario === 'other cart') payment.metadata = JSON.stringify({ checkoutType: 'cart', cartId: 9 });
    if (scenario === 'changed items') payment.order.items[0].quantity = 5;
    h.setPayments([payment]);
    await h.workflows.enqueue('cart', 'cart_reminder', { cartId: 8, activity: Math.max(h.cart.updatedAt.getTime(), h.cart.items[0].updatedAt.getTime()) }, 2);
    await h.workflows.processPending();
    if (scenario === 'active') {
      assert.equal(h.jobs[0].status, 'pending'); assert.equal(h.jobs[0].attemptCount, 0); assert.equal(h.calls.length, 0);
      h.setPayments([]); h.jobs[0].nextAttemptAt = new Date(0); await h.workflows.processPending();
    }
    assert.equal(h.jobs[0].status, 'accepted'); assert.equal(h.calls.length, 1);
  }
});

test('all 15 automated Meta helpers require configured templates; no free-form fallback', async () => {
  Object.assign(config.whatsapp, { provider: 'meta', apiUrl: 'https://example.invalid/messages', apiKey: 'test-only', eventTemplates: {} });
  const service = new NotificationService({});
  const methods = [
    ['sendPackAvailableMessage', { packName: 'Test' }], ['sendAssessmentCompletedMessage', {}],
    ['sendPaymentSuccessfulMessage', { orderNumber: 'ORD', amount: 5 }], ['sendPaymentFailedMessage', { orderNumber: 'ORD' }],
    ['sendOrderProcessingMessage', { orderNumber: 'ORD' }], ['sendOrderDispatchedMessage', { orderNumber: 'ORD', deliveryAddress: 'Address' }],
    ['sendOrderDeliveredMessage', { orderNumber: 'ORD' }], ['sendCartReminderMessage', { itemCount: 1 }],
    ['sendProfileIncompleteMessage', { missingFields: 'Name' }], ['sendAssessmentReminderMessage', { code: 'TEST' }],
    ['sendSupportTicketReceivedMessage', { subject: 'Test' }], ['sendSupportReplyMessage', { subject: 'Test' }],
    ['notifyPharmacyReferral', { pharmacyPhone: '2349000000000', benfekName: 'Test' }],
    ['notifyPreferredVendorAcceptance', { role: 'benfek', pharmacyAccepted: true, preferredPharmacyName: 'Test' }],
    ['sendInvoiceLink', { invoiceUrl: 'https://example.invalid/invoices/test' }],
  ];
  for (const [method, data] of methods) {
    const result = await service[method]({ phone: '2349000000000', ...data });
    assert.equal(result.success, false, method); assert.match(result.reason, /WHATSAPP_TEMPLATE_/, method);
  }
});

test('webhook lifecycle never regresses read/delivered, exposes provider failures, and Operations joins delivery', async () => {
  let record;
  const db = { whatsAppDelivery: {
    upsert: async ({ create }) => { record ||= create; },
    updateMany: async ({ where, data }) => {
      if (!where.status.in.includes(record.status)) return { count: 0 };
      if (record.status === data.status && record.eventTimestamp > data.eventTimestamp) return { count: 0 };
      Object.assign(record, data); return { count: 1 };
    },
  } };
  const webhook = new WhatsAppWebhookService(db);
  const send = event => webhook.process({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { statuses: [{ id: 'wamid.test', timestamp: '100', ...event }] } }] }] });
  await send({ status: 'sent' }); await send({ status: 'failed', timestamp: '101', errors: [{ code: 131026, message: 'Undeliverable' }] });
  assert.equal(record.errorCode, '131026'); assert.equal(record.status, 'failed');
  await send({ status: 'delivered', timestamp: '102' }); await send({ status: 'sent', timestamp: '103' });
  assert.equal(record.status, 'delivered'); assert.equal(record.errorMessage, null);
  await send({ status: 'read', timestamp: '104' }); await send({ status: 'failed', timestamp: '105' });
  assert.equal(record.status, 'read');
  db.user = { findUnique: async () => ({ role: 'researcher', researcherType: 'checker' }) };
  db.notificationJob = { findMany: async () => [{ id: 1, status: 'accepted', providerMessageId: 'wamid.test' }] };
  db.whatsAppDelivery.findMany = async () => [record];
  const res = response(); await new OperationsController(db, {}).list({ user: { id: 1 }, params: { kind: 'notifications' }, query: {} }, res);
  assert.equal(res.body.data.items[0].delivery.status, 'read');
});
