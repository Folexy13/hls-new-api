# Notification workflow triggers

## Deploy in this order

1. Back up the target database and apply the new migration with
   `npx prisma migrate deploy` from `api`. Apply it independently to testing and
   production when deploying to each environment.
2. Deploy the backend (`npm run build`) and frontend (`npm run build`).
3. Configure approved event templates on the backend for delivery outside an
   open WhatsApp customer-service window. No new trigger/debug flag is required.

Migrations: `20261118160000_add_notification_workflows` and
`20261118190000_complete_notification_flows`. The first adds NotificationJob,
PharmacyRequest, SupportReply, and opt-in reminder flags on User and QuizCode.
It does not change existing opt-ins to true or send historical notifications.
The implementation does not apply this migration or send live test messages.
The second adds immutable Invoice snapshots and NotificationJob provider IDs.
Apply all pending migrations before starting the updated backend worker.

## Website actions

| Notification | Action |
| --- | --- |
| Pack available | Researcher Select Supplements > Dispatch or Dispatch All Packs; drafts do not notify |
| Assessment completed | First quiz completion in My Profile or standalone quiz; a completed standalone quiz queues after registration links its owner |
| Invoice link | Benfek nutrient pack > View Invoice > Share > Send invoice |
| Payment successful | Paystack verification or signed success webhook settles a pending or failed payment |
| Payment failed | Verification confirms failed/abandoned; pending/ongoing responses do not notify failure |
| Order processing | Researcher checker: Operations > Orders > Start processing |
| Order dispatched | Operations > Orders > Dispatch order |
| Order delivered | Operations > Orders > Mark delivered |
| Support received | Benfek, principal or wholesaler submits a support complaint |
| Support reply | Checker: Operations > Support > Send reply |
| Pharmacy referral | Checker approves a selected pharmacy with a phone number |
| Pharmacy acceptance | The same approval notifies the Benfek |
| Cart reminder | Opted-in Benfek leaves a nonempty cart inactive for 24 hours |
| Profile reminder | Opted-in Benfek has missing name, phone, or delivery address after 24 hours |
| Assessment reminder | Opted-in invitation or registered Benfek has an unfinished assessment after 24 hours |

Operations access is checked against the current database role on every request:
only researcher/checker accounts are allowed, not makers or principals. The button
is in the researcher header. Paid orders progress strictly through processing,
shipped, and delivered. Repeated status requests do not create another job.
During testing, allow the worker to process each stage before advancing the
order again; a superseded queued status notice is deliberately cancelled.

Support replies are stored and visible in the user's Support > History. Each
reply request has a stable UUID for retry deduplication; replying can also resolve
the ticket. User-entered message content stays on the website, rather than being
included in the support-reply WhatsApp notice.

The shared API is GET/POST `/api/v2/support`; `/api/v2/benfek/support` remains a
compatible alias. Both verify the current stored user role and scope history to
the authenticated owner; supported submitter roles are Benfek, principal and
wholesaler. Only researcher checkers can use the operations reply endpoint.
Checker lists show the submitter's name, role and email. The principal profile's
Make Complaints form and each role's Support navigation use the shared service.

Role-specific support pages are `/support`, `/principal/support` and
`/wholesaler/support`. Both support WhatsApp templates send the current owner's
role-specific history URL as their **second body variable**. Old one-variable
templates must be edited/re-approved or replaced before enabling this sender.
Links open History directly, retain that tab across login, and offer a link back
to the appropriate role dashboard. The support page has working Complaints and
History tabs; the old placeholder Chat/Care contacts were removed. History has
loading/error/empty states and a Refresh action for new replies. This is ticket
support, not a live chat or a customer follow-up-message thread.

Saving a pharmacy selection during registration or profile update creates or
updates a pending PharmacyRequest. Merely selecting a pharmacy is NOT acceptance.
The checker must verify the pharmacy/contact and permission to contact it before
approving. Approval queues a Benfek notice and, when a phone is present, a pharmacy
referral notice. Changing the selection increments its version, resets approval,
and invalidates old queued notices. The old login-time checks against nonexistent
preferredVendor flags are removed.

The principal Add Benfek form includes a separate assessment-reminder consent
checkbox, off by default. Registered Benfeks control their own reminder consent
in My Profile > Personal. Invitation consent covers the unregistered assessment
only; it does not opt a new account into cart/profile reminders. Registered users
opt in separately. Turning reminders off prevents queued reminders from sending.

## Queue and scheduler

Transactional actions persist their state and job in the same database
transaction. A worker runs every minute and claims at most 25 jobs using atomic
conditional updates and a lease token. Accepted jobs are not ordinarily resent.
Failures retry up to three attempts with backoff. Unconfigured provider stubs are
failures, not successful sends. Queue health is visible in Operations >
Notifications. These new jobs send WhatsApp only, so retries do not resend email.

The reminder scanner runs hourly at minute 15. Cart and assessment candidates
must be 24 hours to seven days old. Profiles are reminded at most once per seven
days. A cart is keyed by its last item/cart modification, and a quiz by its ID.
Only pending cart checkouts created in the last hour, for the same cart and item
quantities, delay cart reminders. Old, changed, unrelated and pack checkouts do
not block them. Active checkout jobs defer 15 minutes without spending provider
retry attempts. This never marks a payment failed or alters financial settlement.
Cart writes update parent activity.
The new jobs use the current account phone, falling back to its WhatsApp number.
Assessment reminders take unregistered recipients to the prefilled quiz page;
registered recipients go to My Profile to finish assessment details, rather than
being asked to validate an already-used code. Pack-available messages now link to
the Benfek dashboard instead of the already-used quiz-code page.
All reminder eligibility and consent are checked again immediately before send;
completed quizzes/profiles, emptied/changed carts and expired invitations cancel
stale jobs. Order notices are cancelled if the order has advanced past that state.

This is best-effort, at-least-once dispatch, not an exactly-once external API
guarantee. A crash after Meta accepts a message but before the queue is updated
can cause a repeat attempt after the ten-minute lease expires. `accepted` means
provider acceptance. Jobs retain the provider message ID; Operations joins it to
WhatsAppDelivery and shows sent/delivered/read/failed, timestamps and delivery errors.
The signed webhook protects delivered/read states from late lower-status events.
An accepted job with a delivery failure is visible but is not automatically resent.
Older jobs without provider IDs cannot be retrospectively matched reliably.
The UI does not expose
raw Axios requests, credentials or temporary debug objects.

## Approved template configuration

See [copy-ready template bodies and Meta setup steps](whatsapp-message-templates.md).

All 15 automated Meta event helpers require their configured approved template;
a missing name fails explicitly and never falls back to free text or an image.
The existing invitation template contract is unchanged. Configure approved names
and matching language before deploying; missing configuration uses the normal
bounded retry path and is visible in Operations.

Set `WHATSAPP_EVENT_TEMPLATE_LANGUAGE` to the exact approved language (default
`en`). Each variable below contains an approved template NAME, not an ID. The
templates have positional BODY variables in the following order, no media header
or dynamic buttons. Static website buttons can be configured in Meta; use the
correct environment's destination. Review categories/content with Meta before
sending, especially reminder and healthcare-related messages.

| Backend environment variable | Body parameters in order |
| --- | --- |
| WHATSAPP_TEMPLATE_PACK_AVAILABLE | pack name, full Benfek dashboard URL |
| WHATSAPP_TEMPLATE_ASSESSMENT_COMPLETED | Benfek name |
| WHATSAPP_TEMPLATE_PAYMENT_SUCCESSFUL | order number, numeric NGN amount |
| WHATSAPP_TEMPLATE_PAYMENT_FAILED | order number |
| WHATSAPP_TEMPLATE_INVOICE | full protected invoice page URL (body link, not media header) |
| WHATSAPP_TEMPLATE_ORDER_PROCESSING | order number |
| WHATSAPP_TEMPLATE_ORDER_DISPATCHED | order number, delivery address |
| WHATSAPP_TEMPLATE_ORDER_DELIVERED | order number |
| WHATSAPP_TEMPLATE_CART_REMINDER | cart item quantity |
| WHATSAPP_TEMPLATE_PROFILE_INCOMPLETE | comma-separated missing fields |
| WHATSAPP_TEMPLATE_ASSESSMENT_REMINDER | Benfek name, quiz code, full assessment URL |
| WHATSAPP_TEMPLATE_SUPPORT_RECEIVED | ticket subject, full role-specific support history URL |
| WHATSAPP_TEMPLATE_SUPPORT_REPLY | ticket subject, full role-specific support history URL |
| WHATSAPP_TEMPLATE_PHARMACY_REFERRAL | Benfek name |
| WHATSAPP_TEMPLATE_PHARMACY_ACCEPTED | pharmacy name |

The existing invitation contract is unchanged. Assessment-completed, payment and
invoice helpers support the body-only template settings above. Invoice sharing
is now a queued website trigger. Pack dispatch atomically saves pack/items
and a `pack_available` job keyed by pack ID; retries do not duplicate the job.
Drafts create no notice. Worker sends WhatsApp independently of existing email,
using current contact data and cancelling unpublished/deleted/mismatched packs.
The API returns queue status, and researcher single/bulk dispatch feedback uses
that status. Researcher dispatch means catalogue publication, not shipping.
The additional completion-flow migration is required for invoices and tracking.
This change does not create or publish templates on Meta.

## Protected invoice flow

POST `/api/v2/benfek/invoice` accepts **only** `{packId}` or `{orderId}`.
The server verifies the current Benfek role, source ownership and saved phone.
It snapshots server prices, names, quantities and total, never client prices or
an arbitrary image URL/recipient. Pack quotes and unpaid orders are labelled
Proforma invoice; paid orders use their stored order-item prices. Invoice data
and the WhatsApp job commit together. Repeat requests for the same source and
snapshot on the same UTC day reuse one invoice/job, not another message.

The `hls_invoice` template has one body parameter: the signed invoice page URL.
Links require the owning account to sign in **and** a valid signature, expire
after seven days, and serve no-store API responses. `JWT_SECRET` must be explicitly
configured; `FRONTEND_BASE_URL` must match the deployment. Changing the signing
secret invalidates existing links. No cloud upload or public invoice image is
created. The page offers a PDF download from the immutable snapshot and preserves
the invoice destination through login. Do not put clinical rationale in invoices.

GET `/api/v2/benfek/invoices/:id?token=...` is authenticated and owner-scoped.
The worker checks ownership, expiry and current saved phone again before sending.
The website reports queued/submitted, never delivered without a webhook. Failed
or cancelled repeated requests advise contacting support rather than claim success.

Assessment completion uses one idempotency key per QuizCode and the WhatsApp-only
worker across profile, standalone quiz and registration paths. Completion/link
changes and jobs are transactional; provider failures do not roll back the saved
assessment or duplicate email. No historical completion backfill is performed.

## Payment reconciliation

Both the authenticated verification endpoint and the signed `charge.success`
webhook use the same settlement path. A failed payment may recover to success
for the same stored reference. Success/refunded payments are not reprocessed,
and late failure responses cannot undo a successful payment or advance its order
backwards. A pending, processing, ongoing or queued provider response is not
treated as a confirmed failure.

Settlement locks the order row, re-reads payment state, checks ownership,
reference, successful amount and currency, and atomically commits the payment,
order, applicable stock/cart updates, principal credit and WhatsApp job. Replayed
or concurrent callbacks therefore do not repeat fulfillment or principal credit.
Stored checkout metadata is preserved when verification omits metadata.

Payment WhatsApp jobs use `WHATSAPP_TEMPLATE_PAYMENT_SUCCESSFUL` and
`WHATSAPP_TEMPLATE_PAYMENT_FAILED` from the template guide. The minute worker
sends them independently of the existing immediate emails. Before sending, it
checks the current payment state/reference/owner, cancelling stale failure
notices after recovery. An already-sent failure cannot be recalled; recovery
queues a new success confirmation. Provider acceptance still is not delivery.
The usual bounded retry and at-least-once external-send caveat applies.

No new migration or payment backfill is included. Previously failed payments
need a new signed success callback or authenticated Paystack verification;
deploying alone does not scan or retry historical payments. This change does
not reconcile refunded/reversed payments or add a refund workflow. The existing
notification-workflow migration must be applied before deploying this code.

Reference: [Paystack payment verification and transaction statuses](https://paystack.com/docs/payments/verify-payments/).

## Tests

Backend: `node --test tests/benfek-notifications.test.cjs tests/notification-workflows.test.cjs tests/pack-notifications.test.cjs tests/paystack-reconciliation.test.cjs tests/support-roles.test.cjs tests/notification-completion.test.cjs`.
Frontend: run the local dev server on port 7001, then run
`node tests/notification-operations.browser.cjs` and
`node tests/benfek-invitation.browser.cjs` and
`node tests/pack-notifications.browser.cjs` and
`node tests/support-roles.browser.cjs` and
`node tests/invoice-notifications.browser.cjs` with Playwright/Chrome available.
`PLAYWRIGHT_MODULE` optionally points to an installed Playwright package and
`TEST_BASE_URL` overrides the local frontend URL. All test provider/database/API
calls are mocked; no live recipients or database records are changed.
