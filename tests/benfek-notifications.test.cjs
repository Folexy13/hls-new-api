require('reflect-metadata');
require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios').default;
const { config } = require('../src/config/config');
const { NotificationService } = require('../src/services/notification.service');
const { QuizCodeController } = require('../src/controllers/quizcode.controller');
const { AuthService } = require('../src/services/auth.service');

const invitation = {
  id: 10, code: 'HLS12345', benfekName: 'Test Benfek',
  benfekEmail: 'benfek@example.com', benfekPhone: '09067814722',
  benfekAge: '30', benfekGender: 'female', benfekWeight: '60', benfekHeight: '165',
};
const completed = {
  code: invitation.code, basics: { nickname: 'Test' },
  lifestyle: { habits: 'Walking', funActivities: 'Reading', desires: 'Fitness', priority: 'Health' },
  preferences: { drugForm: 'Capsule', budget: 5000 },
};
const sentEmail = { status: 'sent', sent: true, message: 'Email sent' };
const failedEmail = { status: 'pending', sent: false, message: 'Queued for retry' };
const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

// Never contact a real provider or database from this suite.
axios.post = async () => { throw new Error('Unexpected provider call'); };

test('invitation endpoint preserves referral and reports each channel independently', async t => {
  for (const [name, email, whatsapp, expected] of [
    ['both submitted', sentEmail, { success: true, payload: { messages: [{ id: 'wamid.test' }] } }, 'accepted'],
    ['WhatsApp rejected', sentEmail, { success: false }, 'failed'],
    ['email pending', failedEmail, { success: true }, 'accepted'],
    ['unconfigured stub', sentEmail, { success: true, stubbed: true }, 'not_configured'],
    ['WhatsApp throws', sentEmail, new Error('Provider unavailable'), 'failed'],
    ['email throws', new Error('Queue unavailable'), { success: true }, 'accepted'],
    ['both throw', new Error('Queue unavailable'), new Error('Provider unavailable'), 'failed'],
  ]) {
    await t.test(name, async () => {
      let saved = 0, emails = 0, whatsapps = 0;
      const controller = new QuizCodeController({}, {
        create: async () => { saved++; return invitation; },
      }, {}, {
        sendBenfekCodeMessage: async options => {
          whatsapps++;
          assert.deepEqual(options, { phone: invitation.benfekPhone, benfekName: invitation.benfekName, code: invitation.code });
          if (whatsapp instanceof Error) throw whatsapp;
          return whatsapp;
        },
      }, {}, {
        sendBenfekCode: async () => { emails++; if (email instanceof Error) throw email; return email; },
      });
      const res = response();
      await controller.createQuizCode({ user: { id: 1, role: 'principal' }, body: invitation }, res);
      assert.equal(res.statusCode, 201);
      assert.equal(saved, 1);
      assert.equal(emails, 1);
      assert.equal(whatsapps, 1);
      assert.equal(res.body.data.whatsappDelivery.status, expected);
      assert.equal(res.body.data.emailDelivery.sent, email.sent === true);
      assert.equal(res.body.data.whatsappDelivery.accepted, expected === 'accepted');
      assert.equal(res.body.data.whatsappDelivery.providerMessageId, whatsapp.payload?.messages?.[0]?.id || null);
    });
  }
});

test('Meta invitation matches the approved variable structure and tracks acceptance', async () => {
  Object.assign(config.whatsapp, {
    provider: 'meta', apiUrl: 'https://example.invalid/messages', apiKey: 'test-only',
    senderPhone: '2348129431472', benfekTemplateName: 'benfek_quiz_invitation', benfekTemplateLanguage: 'en',
  });
  config.frontendBaseUrl = 'https://hlsnigeria.com/';
  const records = [];
  const service = new NotificationService({ whatsAppDelivery: { upsert: async record => records.push(record) } });
  let payload;
  axios.post = async (url, body) => {
    assert.equal(url, 'https://example.invalid/messages');
    payload = body;
    return { data: { messages: [{ id: 'wamid.test' }] } };
  };
  const result = await service.sendBenfekCodeMessage({ phone: invitation.benfekPhone, benfekName: invitation.benfekName, code: invitation.code });
  assert.equal(result.success, true);
  assert.equal(payload.to, '2349067814722');
  assert.equal(payload.template.name, 'benfek_quiz_invitation');
  assert.equal(payload.template.language.code, 'en');
  assert.deepEqual(payload.template.components, [
    { type: 'body', parameters: [{ type: 'text', text: 'Test Benfek' }] },
    { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'HLS12345' }] },
  ]);
  const link = new URL(service.buildQuizLink(invitation.code));
  assert.equal(link.pathname, '/quiz');
  assert.equal(link.searchParams.get('code'), invitation.code);
  assert.equal(records[0].create.status, 'accepted');
  assert.equal(records[0].create.providerMessageId, 'wamid.test');
  axios.post = async () => ({ data: {} });
  assert.equal((await service.sendBenfekCodeMessage({ phone: invitation.benfekPhone, code: invitation.code })).success, false);
  config.whatsapp.benfekTemplateName = '';
  assert.equal((await service.sendBenfekCodeMessage({ phone: invitation.benfekPhone, code: invitation.code })).success, false);
  config.whatsapp.apiKey = '';
  config.whatsapp.benfekTemplateName = 'benfek_quiz_invitation';
  const stub = await new NotificationService({}).sendBenfekCodeMessage({ phone: invitation.benfekPhone, code: invitation.code });
  assert.equal(stub.stubbed, true);
  assert.equal(stub.success, false);
});

test('new Benfek receives completion notification after registration links their submitted quiz', async () => {
  for (const budget of [5000, null]) {
    const events = [];
    const user = { id: 20, email: invitation.benfekEmail, phone: invitation.benfekPhone, firstName: 'Test' };
    const db = {
      quizCode: {
        findUnique: async () => ({ ...invitation, usedBy: null, preferenceBudget: budget }),
        updateMany: async () => { events.push('linked'); return { count: 1 }; },
      },
    };
    db.$transaction = async action => action(db);
    const service = new AuthService({
      findUserByEmail: async () => null, findUserByPhone: async () => null,
      createUser: async () => { events.push('registered'); return user; },
    }, db, {
      sendAssessmentCompletedMessage: async options => {
        events.push('notified');
        assert.equal(options.phone, undefined);
        throw new Error('Provider unavailable');
      },
    }, { notifyAdmin: async () => undefined }, { sendBenfekWelcome: async () => sentEmail }, {
      syncPharmacySelection: async () => undefined,
      enqueueAssessmentCompleted: async (id, tx) => { assert.equal(id, invitation.id); assert.equal(tx, db); events.push('queued'); },
    });
    service.createAuthResponse = async () => ({ user });
    const result = await service.registerUnreferredBenfek({
      email: user.email, phone: user.phone, firstName: 'Test', lastName: 'Benfek',
      password: 'test-password', quizCode: invitation.code,
    });
    assert.equal(result.user.id, 20);
    assert.deepEqual(events, budget ? ['registered', 'linked', 'queued', 'notified'] : ['registered', 'linked']);
  }
});

test('completion endpoint defers new users and avoids notifications on repeat submissions', async () => {
  for (const [usedBy, budget, expected] of [[null, null, 0], [20, null, 1], [20, 5000, 0]]) {
    let notifications = 0;
    let queued = 0;
    const db = {
      user: { findUnique: async () => ({ firstName: 'Test', email: invitation.benfekEmail }) },
      quizCode: { update: async () => ({ ...invitation, usedBy, preferenceBudget: 5000 }) },
    };
    db.$transaction = async action => action(db);
    const controller = new QuizCodeController({}, {
      findByCode: async () => ({ ...invitation, createdBy: 1, usedBy, preferenceBudget: budget }),
      completeBenfekQuiz: async () => ({ ...invitation, preferenceBudget: 5000 }),
    }, db, {
      sendAssessmentCompletedMessage: async options => { assert.equal(options.phone, undefined); notifications++; throw new Error('Provider unavailable'); },
    }, { notifyAdmin: async () => undefined }, {}, {
      enqueueAssessmentCompleted: async (id, tx) => { assert.equal(tx, db); if (usedBy) queued++; },
    });
    const res = response();
    await controller.completeBenfekQuiz({ body: completed }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(notifications, expected);
    assert.equal(queued, expected);
  }
});

test('invitation failures do not expose provider diagnostics or credentials', async () => {
  const original = { ...config.whatsapp };
  const originalPost = axios.post;
  try {
    Object.assign(config.whatsapp, {
      provider: 'meta', apiUrl: 'https://example.invalid/messages', apiKey: 'secret-test-token',
      senderPhone: '2348129431472', benfekTemplateName: 'benfek_quiz_invitation',
      appSecret: 'secret-test-app', verifyToken: 'secret-test-verify',
    });
    axios.post = async () => {
      throw Object.assign(new Error('Request failed with status code 400'), {
        code: 'ERR_BAD_REQUEST',
        config: { headers: { Authorization: 'Bearer secret-test-token' } },
        response: { status: 400, data: { error: {
          message: 'Invalid secret-test-token', type: 'OAuthException', code: 190,
          error_subcode: 463, fbtrace_id: 'test-trace',
          error_data: { messaging_product: 'whatsapp', details: 'secret-test-app secret-test-verify' },
        } } },
      });
    };
    const service = new NotificationService({});
    const result = await service.sendBenfekCodeMessage({ phone: invitation.benfekPhone, code: invitation.code });
    assert.equal(result.success, false);
    assert.equal(result.debugError, undefined);
    const controller = new QuizCodeController({}, { create: async () => invitation }, {}, service, {}, {
      sendBenfekCode: async () => sentEmail,
    });
    const res = response();
    await controller.createQuizCode({ user: { id: 1, role: 'principal' }, body: invitation }, res);
    const debug = res.body.data.whatsappDelivery.debug;
    assert.equal(debug, undefined);
    const serialized = JSON.stringify(res.body);
    assert.ok(!serialized.includes('secret-test-'));
    assert.ok(!serialized.includes('Authorization'));
  } finally {
    Object.assign(config.whatsapp, original);
    axios.post = originalPost;
  }
});
