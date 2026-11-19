require('reflect-metadata');
require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { PaystackController } = require('../src/controllers/paystack.controller');
const { NotificationWorkflowService } = require('../src/services/notification-workflow.service');
const { PaystackService } = require('../src/services/paystack.service');
const { config } = require('../src/config/config');

function harness({ status = 'failed', pack = false } = {}) {
  let state = {
    payment: { id: 7, orderId: 4, userId: 2, status, amount: 10000, currency: 'NGN', paystackReference: 'ref-test',
      paystackTransactionId: null, paystackChannel: null,
      metadata: JSON.stringify({ checkoutType: pack ? 'pack' : 'cart', orderId: 4, userId: 2,
        ...(pack ? { packId: 'economic', packName: 'Test pack', quizCode: 'TESTCODE' } : {}) }) },
    order: { id: 4, userId: 2, orderNumber: 'ORDER-4', total: 10000, status: status === 'success' ? 'paid' : status,
      items: [{ supplementId: 5, quantity: 2, price: 5000 }] },
    stock: 20, stockWrites: 0, cartClears: 0, wallet: { id: 3, balance: 0 }, walletWrites: 0,
    credits: [], jobs: [],
  };
  const emails = [], locks = [];
  let stockFailure = false, queueFailure = false, emailFailure = false, creditFailure = false;
  const db = {
    payment: {
      findUnique: async () => structuredClone(state.payment),
      update: async ({ data }) => { Object.assign(state.payment, data); return structuredClone(state.payment); },
    },
    order: {
      findUnique: async () => structuredClone(state.order),
      update: async ({ data }) => Object.assign(state.order, data),
    },
    user: { findUnique: async ({ where }) => ({ id: where.id, role: 'benfek', firstName: 'Test', lastName: 'User',
      email: 'test@example.com', phone: '2349000000000' }) },
    supplement: { update: async ({ data }) => {
      if (stockFailure) throw new Error('Stock write failed');
      state.stock -= data.stock.decrement; state.stockWrites++;
    } },
    cart: { findFirst: async () => ({ id: 8 }) },
    cartItem: { deleteMany: async () => { state.cartClears++; } },
    quizCode: { findUnique: async () => ({ createdBy: 3, benfekName: 'Test Benfek' }) },
    principalCredit: { findFirst: async () => state.credits[0] || null },
    wallet: {
      upsert: async () => structuredClone(state.wallet),
      update: async ({ data }) => { state.wallet.balance += data.balance.increment; state.walletWrites++; },
    },
    $queryRaw: async (_sql, id) => { locks.push(id); return [{ id }]; },
    $queryRawUnsafe: async () => [{ id: 6, quantity: 2, supplementName: 'Test supplement', sellingPrice: 5000,
      selectedWholesalerName: 'Test wholesaler', selectedWholesalerPrice: 3000, effectiveMarkupFactor: 1.3 }],
    $executeRawUnsafe: async (_sql, ...values) => {
      if (creditFailure) throw new Error('Credit insert failed');
      state.credits.push({ id: 1, paymentId: values[8], reference: values[9] });
    },
    notificationJob: {
      upsert: async ({ create }) => {
        if (queueFailure) throw new Error('Queue unavailable');
        const existing = state.jobs.find(job => job.idempotencyKey === create.idempotencyKey);
        if (existing) return existing;
        const job = { id: state.jobs.length + 1, status: 'pending', attemptCount: 0, nextAttemptAt: new Date(), ...create };
        state.jobs.push(job); return job;
      },
      findMany: async () => state.jobs.filter(job => job.status === 'pending').map(job => ({ ...job })),
      updateMany: async ({ where, data }) => {
        const job = state.jobs.find(job => job.id === where.id);
        if (!job || (where.claimToken && where.claimToken !== job.claimToken)) return { count: 0 };
        for (const [key, value] of Object.entries(data)) job[key] = value && typeof value === 'object' && 'increment' in value ? job[key] + value.increment : value;
        return { count: 1 };
      },
    },
  };
  // Model row-lock serialization with an in-memory transaction mutex; no DB/network calls.
  let tail = Promise.resolve();
  db.$transaction = async (callback, options) => {
    assert.equal(options.isolationLevel, 'ReadCommitted');
    const prior = tail; let release; tail = new Promise(resolve => { release = resolve; });
    await prior;
    const before = structuredClone(state);
    try { return await callback(db); }
    catch (error) { state = before; throw error; }
    finally { release(); }
  };
  const repository = { getPaymentByTransaction: async reference => reference === state.payment.paystackReference ? structuredClone(state.payment) : null };
  const notifications = {
    sendPaymentSuccessfulMessage: async options => { emails.push({ kind: 'success', ...options }); if (emailFailure) throw new Error('Email unavailable'); return { success: true }; },
    sendPaymentFailedMessage: async options => { emails.push({ kind: 'failed', ...options }); return { success: true }; },
  };
  const workflows = new NotificationWorkflowService(db, notifications);
  const controller = new PaystackController({}, db, {}, repository, {}, {}, notifications,
    { notifyAdmin: async () => undefined, notifyRecipient: async () => undefined }, workflows);
  const charge = overrides => ({ status: 'success', reference: 'ref-test', id: 1234, amount: 1000000,
    currency: 'NGN', channel: 'card', metadata: {}, ...overrides });
  return { controller, db, workflows, emails, locks, charge, state: () => state,
    stockFailure: value => { stockFailure = value; }, queueFailure: value => { queueFailure = value; },
    creditFailure: value => { creditFailure = value; }, emailFailure: value => { emailFailure = value; },
    run: overrides => controller.processPaystackCharge(charge(overrides), 'ref-test', 2) };
}

test('failed payments recover on verified success and repeated callbacks do not repeat fulfillment or notifications', async () => {
  const h = harness();
  const recovered = await h.run();
  assert.equal(recovered.status, 'success'); assert.equal(recovered.alreadyProcessed, false);
  assert.equal(h.state().payment.status, 'success'); assert.equal(h.state().order.status, 'paid');
  assert.equal(h.state().stock, 18); assert.equal(h.state().cartClears, 1);
  assert.equal(h.state().jobs[0].kind, 'payment_successful'); assert.equal(h.emails.length, 1);
  assert.equal(h.emails[0].phone, undefined); assert.equal(h.emails[0].email, 'test@example.com');
  for (let i = 0; i < 3; i++) assert.equal((await h.run()).alreadyProcessed, true);
  assert.equal(h.state().stockWrites, 1); assert.equal(h.state().jobs.length, 1); assert.equal(h.emails.length, 1);
  assert.ok(h.locks.every(id => id === 4));
});

test('simultaneous verification and webhook settlement only fulfill and notify once', async () => {
  const h = harness({ status: 'pending' });
  const results = await Promise.all([h.run(), h.run(), h.run()]);
  assert.equal(results.filter(result => !result.alreadyProcessed).length, 1);
  assert.equal(h.state().stockWrites, 1); assert.equal(h.state().cartClears, 1);
  assert.equal(h.state().jobs.length, 1); assert.equal(h.emails.length, 1);
});

test('a failed nutrient-pack payment recovers and credits its principal exactly once', async () => {
  const h = harness({ pack: true });
  await Promise.all([h.run(), h.run()]);
  assert.equal(h.state().payment.status, 'success'); assert.equal(h.state().walletWrites, 1);
  assert.ok(h.state().wallet.balance > 0); assert.equal(h.state().credits.length, 1);
  assert.equal(h.state().credits[0].paymentId, 7); assert.equal(h.state().stockWrites, 0);
  assert.equal(h.state().jobs.length, 1); assert.equal(h.emails.length, 1);
});

test('settlement failure rolls back stock, order, payment, credit and queue before allowing a retry', async () => {
  for (const fault of ['stockFailure', 'queueFailure', 'creditFailure']) {
    const h = harness({ pack: fault === 'creditFailure' }); h[fault](true);
    await assert.rejects(h.run());
    assert.equal(h.state().payment.status, 'failed'); assert.equal(h.state().order.status, 'failed');
    assert.equal(h.state().stock, 20); assert.equal(h.state().wallet.balance, 0);
    assert.equal(h.state().credits.length, 0); assert.equal(h.state().jobs.length, 0); assert.equal(h.emails.length, 0);
    h[fault](false); assert.equal((await h.run()).status, 'success');
    assert.equal(h.state().jobs.length, 1);
  }
});

test('a delayed failure cannot downgrade a successful payment or advanced order', async () => {
  const h = harness(); await h.run(); h.state().order.status = 'shipped';
  const delayed = await h.run({ status: 'failed' });
  assert.equal(delayed.status, 'success'); assert.equal(delayed.alreadyProcessed, true);
  assert.equal(h.state().order.status, 'shipped'); assert.equal(h.state().jobs.length, 1); assert.equal(h.emails.length, 1);
});

test('pending provider responses do not mark payments failed or send failure notifications', async () => {
  for (const status of ['pending', 'processing', 'ongoing', 'queued', undefined]) {
    const h = harness({ status: 'pending' });
    await h.run({ status });
    assert.equal(h.state().payment.status, 'pending'); assert.equal(h.state().order.status, 'pending');
    assert.equal(h.state().jobs.length, 0); assert.equal(h.emails.length, 0);
  }
});

test('confirmed failure notifies once; recovery cancels stale failure jobs and dispatches success', async () => {
  const h = harness({ status: 'pending' });
  await h.run({ status: 'failed' }); await h.run({ status: 'failed' });
  assert.equal(h.state().jobs.length, 1); assert.equal(h.emails.length, 1);
  await h.run(); assert.equal(h.state().jobs.length, 2);
  assert.equal(await h.workflows.prepare(h.state().jobs[0]), null);
  const prepared = await h.workflows.prepare(h.state().jobs[1]);
  assert.equal(prepared.amount, 10000); assert.equal(prepared.phone, '2349000000000');
  const delivered = [];
  h.workflows.notifications = { sendPaymentSuccessfulMessage: async payload => { delivered.push(payload); return { success: true }; } };
  await h.workflows.processPending();
  assert.equal(h.state().jobs[0].status, 'cancelled'); assert.equal(h.state().jobs[1].status, 'accepted');
  assert.equal(delivered.length, 1); assert.equal(delivered[0].orderNumber, 'ORDER-4'); assert.equal(delivered[0].email, undefined);
});

test('email failure cannot undo payment recovery or its durable WhatsApp notification', async () => {
  const h = harness(); h.emailFailure(true);
  assert.equal((await h.run()).status, 'success'); assert.equal(h.state().payment.status, 'success');
  assert.equal(h.state().jobs.length, 1); assert.equal((await h.run()).alreadyProcessed, true);
});

test('ownership, reference, amount and currency mismatch cannot settle or enqueue a notification', async () => {
  for (const overrides of [{ amount: 100 }, { currency: 'USD' }, { reference: 'other' }, { metadata: { userId: 99 } }, { metadata: { orderId: 99 } }]) {
    const h = harness(); await assert.rejects(h.run(overrides), { statusCode: 409 });
    assert.equal(h.state().payment.status, 'failed'); assert.equal(h.state().stockWrites, 0); assert.equal(h.state().jobs.length, 0);
  }
  const h = harness();
  await assert.rejects(h.controller.processPaystackCharge(h.charge(), 'ref-test', 99), { statusCode: 403 });
  assert.equal(h.state().jobs.length, 0);
});

test('stored pack metadata survives verification without provider metadata', async () => {
  const h = harness({ pack: true }); const result = await h.run({ metadata: null });
  assert.equal(result.checkoutType, 'pack'); assert.equal(result.packId, 'economic'); assert.equal(h.state().credits.length, 1);
});

test('refunded payments are not resurrected by a replayed success', async () => {
  const h = harness({ status: 'refunded' });
  assert.equal((await h.run()).status, 'refunded'); assert.equal(h.state().jobs.length, 0); assert.equal(h.state().stockWrites, 0);
});

const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; } });

test('the authenticated verify endpoint reconciles a previously failed payment', async () => {
  const h = harness(), original = PaystackService.verifyTransaction;
  try {
    PaystackService.verifyTransaction = async () => ({ data: h.charge() });
    const res = response();
    await h.controller.verifyCheckout({ user: { id: 2 }, params: { reference: 'ref-test' } }, res);
    assert.equal(res.statusCode, 200); assert.equal(res.body.data.status, 'success'); assert.equal(h.state().jobs.length, 1);
  } finally { PaystackService.verifyTransaction = original; }
});

test('a signed success webhook recovers the failed payment and ignores replay; invalid signatures do nothing', async () => {
  const h = harness(), secret = config.paystack.secretKey;
  try {
    config.paystack.secretKey = 'test-only-secret';
    const body = { event: 'charge.success', data: h.charge() }, rawBody = Buffer.from(JSON.stringify(body));
    const req = { body, rawBody, headers: { 'x-paystack-signature': crypto.createHmac('sha512', config.paystack.secretKey).update(rawBody).digest('hex') } };
    const invalid = response(); await h.controller.handleWebhook({ ...req, headers: {} }, invalid);
    assert.equal(invalid.statusCode, 400); assert.equal(h.state().payment.status, 'failed');
    for (let replay = 0; replay < 2; replay++) {
      const res = response(); await h.controller.handleWebhook(req, res); assert.equal(res.statusCode, 200);
    }
    assert.equal(h.state().payment.status, 'success'); assert.equal(h.state().jobs.length, 1); assert.equal(h.state().stockWrites, 1);
  } finally { config.paystack.secretKey = secret; }
});
