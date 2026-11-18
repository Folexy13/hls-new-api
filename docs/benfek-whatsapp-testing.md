# Benfek invitation notifications

## Deployment

Deploy both `api` and `fe`. This change does not modify the Prisma schema and
does not require a new migration. Existing EmailDelivery and WhatsAppDelivery
tables must already be present in the target database.

Configure the backend service that the frontend actually calls. The testing
frontend uses a separate service from production; production environment
variables do not automatically configure testing.

Backend variables for Meta invitations:

```ini
WHATSAPP_PROVIDER=meta
WHATSAPP_API_URL=https://graph.facebook.com/v26.0/<phone-number-id>/messages
WHATSAPP_API_KEY=<system-user-access-token>
WHATSAPP_SENDER_PHONE=<registered-number-with-country-code>
WHATSAPP_BENFEK_TEMPLATE_NAME=benfek_quiz_invitation
WHATSAPP_BENFEK_TEMPLATE_LANGUAGE=<exact-approved-language-code>
FRONTEND_BASE_URL=https://hlsnigeria.com
WHATSAPP_VERIFY_TOKEN=<callback-verification-token>
META_APP_SECRET=<app-secret-for-webhook-signatures>
```

Keep secrets on the backend, never in Vite environment variables. Use the
appropriate frontend URL in each environment. Retain existing email-provider
configuration and the existing WhatsApp phone-number/account IDs.

## Template contract

The approved invitation must contain one positional body text variable (Benfek
name) and one dynamic website button at index 0. Its URL must have the structure
`https://hlsnigeria.com/quiz?code={{1}}`; the API supplies only the quiz code as
the button suffix, not the entire URL. For testing, ensure the approved button
points to the intended website. The template language must match exactly.
Automated tests verify this outbound structure, not the remote approved asset.

## Behavior

`POST /api/v2/quiz-code/create` saves the referral first, then attempts the existing
queued email service and the WhatsApp service independently. It returns HTTP 201
with `emailDelivery` and `whatsappDelivery`, even if one or both providers fail.
WhatsApp statuses are `accepted`, `failed`, or `not_configured`. Acceptance is not
delivery. `providerMessageId` can be correlated with WhatsAppDelivery webhook
updates to check `delivered`, `read`, or `failed`.

Email `pending` retains the existing automatic retry mechanism. An email queue
submission error is reported as `failed`; it is not incorrectly promised a retry.
WhatsApp failures are not automatically retried by this change. Do not recreate
the referral solely to retry a notification.

For the standalone quiz, the assessment notification now runs after registration
links an already-completed quiz to the new user. Existing linked users receive it
on their first completion, not on ordinary repeat submissions. This is a
best-effort notification, not an exactly-once delivery queue. A provider failure
does not roll back registration or quiz completion.

Assessment completion still uses the existing free-text sender. It is not the
invitation template and needs an open customer-service window, or a separately
approved assessment-completion template, to be delivered through Meta.

## Verification

From `api`, run `node --test tests/benfek-notifications.test.cjs` and
`npx tsc --noEmit`. Providers and persistence are mocked; no real messages are sent.

From `fe`, run `npm run build`. The browser checks are in
`tests/benfek-invitation.browser.cjs`. With Playwright and Chrome available, start
the frontend on port 7001 and run `node tests/benfek-invitation.browser.cjs`.
`TEST_BASE_URL` overrides the local address, and `PLAYWRIGHT_MODULE` optionally
points to an installed Playwright module. API requests are intercepted. The
checks cover desktop/mobile feedback and the prefilled quiz-code link.

After deployment, obtain consent from one test recipient, add them through the
actual Principal form, and inspect both returned channel results. Correlate the
WhatsApp message ID with its delivery webhook, open the received button, and
confirm the quiz code is prefilled before clicking Validate Code. Live provider
delivery, remote template approval, and deployment configuration cannot be
proven by mocked tests alone.
