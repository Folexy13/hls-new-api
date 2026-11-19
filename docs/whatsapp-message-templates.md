# HLS WhatsApp templates and rollout

## What requires a template?

Use approved Meta templates for automated, business-initiated notifications.
Free-form replies are allowed only within 24 hours of the recipient's latest
WhatsApp message. Completing the website quiz or receiving an invitation does
not open that window. The existing `benfek_quiz_invitation` does not authorize
other message bodies. Keep it and create the additional templates below.

Obtain permission to contact each recipient and honour opt-outs. Reminder
consent remains separate from transactional notifications. Meta can reject,
pause or recategorize a template; the suggested categories are not guarantees.

Important for HLS: Meta restricts messaging involving drugs, medical/healthcare
products and sensitive health information. Template approval is not permission
to run a prohibited commerce flow. Review HLS's actual services, audience and
content against the policy with Meta before enabling these notifications.
Do not put diagnoses, assessment answers, prescriptions or product claims in
template variables. A pack name or support subject can also reveal health
information; use neutral labels where appropriate and keep clinical details
inside the authenticated website. Cart and order messages below are intended
only for services/products Meta permits, not as a workaround for restrictions.

Sources checked November 18, 2026:
- [WhatsApp Business Messaging Policy](https://business.whatsapp.com/policy)
- [Utility messages](https://whatsappbusiness.com/products/conversation-categories/utility/)

## Create each template in Meta

1. Open WhatsApp Manager and select **Hls Nigeria**, the WABA used by the API.
2. Go to **Message templates > Manage templates > Create Template**.
3. Choose the suggested category below. For Utility, select Default, not Flows
   or Authentication. These are service updates, not login OTPs.
4. Enter the exact lowercase template name below and choose **English** (`en`).
   If you choose English (US), its code is `en_US`; the backend language setting
   must match. All event templates share one language setting, so use the same
   language for every event. The invitation has its own language setting.
5. Paste the body exactly, retaining positional variables `{{1}}`, `{{2}}`, etc.
   Select number/positional variables, not named variables.
6. Enter the fictional sample values listed below for each variable, in order.
7. For all NEW templates, leave the header, footer and buttons empty. The code
   sends body parameters only. Links in a body variable are clickable; no
   dynamic website button is needed. Static website buttons are optional, but
   must point to the correct testing/production environment.
8. Submit for review. Wait for Approved/Active before setting its backend env
   variable and sending a test. Check the final category and language in Meta.

Start with **hls_pack_available**. The invitation already exists; do not delete
or recreate the working one. Its dynamic button is a special existing contract.

## Existing invitation: benfek_quiz_invitation

Category: Utility. Already approved; keep the actual approved wording.

```text
Hello {{1}},

Your HLS health and lifestyle assessment is ready.

Use the button below to complete your assessment.
```

Body variable: 1 = Benfek name (`Alex Example`).
Existing button: **Complete assessment**, dynamic website URL
`https://hlsnigeria.com/quiz?code={{1}}`.
Button variable 1 = quiz code (`HLS12345`), NOT the full URL.
Body and button variables are separate. The application supplies both.
For testing, create a separate invitation template with the testing website URL
and configure that name on the testing backend. Testing codes are not valid in
the production database.

## 1. Pack ready: hls_pack_available

Suggested category: Utility. Env: `WHATSAPP_TEMPLATE_PACK_AVAILABLE`.

```text
Your requested HLS nutrient pack, {{1}}, is ready to view in your account.

Open your dashboard: {{2}}

Sign in to review the pack details.
```

Variables: 1 = pack name (`My nutrient pack`); 2 = full dashboard URL
(`https://hlsnigeria.com/benfek/dashboard`).

Trigger: researcher Select Supplements > Dispatch, or Dispatch All Packs.
This means published to the Benfek catalogue, NOT physically shipped. Each
pack has one job, including bulk dispatch. Draft saves do not notify. Repeating
the same pack's dispatch reuses its job rather than deliberately sending again.
The worker reads the current pack name and recipient contact before sending.
If the pack is no longer dispatched, belongs to a different quiz, or is deleted,
the job is cancelled. Registered users use their current phone/WhatsApp number;
unregistered recipients use their saved invitation phone.

## 2. Assessment received: hls_assessment_completed

Suggested category: Utility. Env: `WHATSAPP_TEMPLATE_ASSESSMENT_COMPLETED`.

```text
Hello {{1}}, your HLS assessment has been submitted successfully.

Our team will review it and notify you when your requested pack is ready.
```

Variable: 1 = Benfek name (`Alex Example`).
Trigger: first completed assessment, after registration links a new user's quiz.

## 3. Payment successful: hls_payment_successful

Suggested category: Utility. Env: `WHATSAPP_TEMPLATE_PAYMENT_SUCCESSFUL`.

```text
Payment confirmed for your HLS order {{1}}.

Amount received: NGN {{2}}.

You can review the order in your HLS account.
```

Variables: 1 = order number (`ORDER-12345`); 2 = numeric NGN amount (`15000`).
Trigger: Paystack verification or signed success webhook settles a pending or
previously failed payment. A WhatsApp job is queued in the settlement transaction;
the minute worker sends it separately from email. Replays do not create another
job or repeat principal credits/stock deductions.

## 4. Payment not completed: hls_payment_failed

Suggested category: Utility. Env: `WHATSAPP_TEMPLATE_PAYMENT_FAILED`.

```text
Payment for your HLS order {{1}} was not completed.

Please review the order in your account. If you were debited, contact HLS support before trying again.
```

Variable: 1 = order number (`ORDER-12345`).
Trigger: verification confirms failed/abandoned. Pending/ongoing statuses do not
trigger a failure notice. A queued failure notice is cancelled if the payment
recovers before the worker sends it. An already-sent notice cannot be recalled;
the later success generates its own success confirmation.

## 5. Order processing: hls_order_processing

Suggested category: Utility. Env: `WHATSAPP_TEMPLATE_ORDER_PROCESSING`.

```text
Your HLS order {{1}} is now being processed.

We will update you when it is dispatched.
```

Variable: 1 = order number (`ORDER-12345`).
Trigger: checker Operations > Orders > Start processing.

## 6. Physical dispatch: hls_order_dispatched

Suggested category: Utility. Env: `WHATSAPP_TEMPLATE_ORDER_DISPATCHED`.

```text
Your HLS order {{1}} has been dispatched.

Delivery address: {{2}}.

Please keep your phone available for delivery updates.
```

Variables: 1 = order number (`ORDER-12345`); 2 = delivery address
(`10 Example Road, Lagos`). Trigger: Operations > Orders > Dispatch order.

## 7. Delivered: hls_order_delivered

Suggested category: Utility. Env: `WHATSAPP_TEMPLATE_ORDER_DELIVERED`.

```text
Your HLS order {{1}} has been marked as delivered.

If anything is missing or damaged, please contact HLS support through your account.
```

Variable: 1 = order number (`ORDER-12345`).
Trigger: Operations > Orders > Mark delivered.

## 8. Cart reminder: hls_cart_reminder

Suggested category: **Marketing**, not Utility.
Env: `WHATSAPP_TEMPLATE_CART_REMINDER`.

```text
You have {{1}} item(s) remaining in your HLS cart.

You can review your cart in your HLS account whenever you are ready.

To stop these reminders, turn off WhatsApp reminders in My Profile.
```

Variable: 1 = total item quantity (`2`). Trigger: reminder-opted-in Benfek's cart
inactive for 24 hours to seven days, without a matching cart checkout created in
the last hour. Stale/unrelated pending payments do not block reminders. Marketing limits
can affect delivery independently of API acceptance. Do not enable this template
for products/services disallowed by Meta's policy.

## 9. Profile completion: hls_profile_incomplete

Suggested category: Utility only where completing the missing information is
necessary to deliver a user-requested service; otherwise select Marketing or
accept Meta's recategorization. Env: `WHATSAPP_TEMPLATE_PROFILE_INCOMPLETE`.

```text
Your HLS account is missing details needed for your requested service: {{1}}.

Please review these details in My Profile on the HLS website.

You can turn off WhatsApp reminders in My Profile.
```

Variable: 1 = missing field labels (`delivery address`). Do not insert field
values. Trigger: opted-in incomplete profile after 24 hours, at most once weekly.

## 10. Assessment reminder: hls_assessment_reminder

Suggested category: Utility for an assessment already requested by the user.
Env: `WHATSAPP_TEMPLATE_ASSESSMENT_REMINDER`.

```text
Hello {{1}}, your requested HLS assessment is still incomplete.

Assessment reference: {{2}}.

Continue here: {{3}}

Please complete it when convenient. You can turn off reminders in My Profile once registered.
```

Variables: 1 = Benfek name (`Alex Example`); 2 = quiz reference (`HLS12345`);
3 = full URL (`https://hlsnigeria.com/quiz?code=HLS12345`). For a registered
Benfek the code supplies `/benfek/my-profile` instead, since their code is used.
Do not describe the assessment reference as a login or authentication OTP.
Trigger: opted-in unfinished assessment after 24 hours to seven days.

## 11. Support received: hls_support_received

Suggested category: Utility. Env: `WHATSAPP_TEMPLATE_SUPPORT_RECEIVED`.

```text
HLS support has received your request: {{1}}.

Our team will review it.

Open support in your HLS dashboard: {{2}}

Sign in to view your request.
```

Variables: 1 = ticket subject (`Delivery enquiry`); 2 = full support history URL
(`https://hlsnigeria.com/principal/support?tab=history`). Trigger: support submission
by a Benfek, principal or wholesaler.
Use a neutral subject; do not include symptoms or private health details.

## 12. Support update: hls_support_reply

Suggested category: Utility. Env: `WHATSAPP_TEMPLATE_SUPPORT_REPLY`.

```text
There is a new HLS support update for your request: {{1}}.

Open support in your HLS dashboard: {{2}}

Sign in to read the reply.
```

Variables: 1 = ticket subject (`Delivery enquiry`); 2 = full support history URL
(`https://hlsnigeria.com/wholesaler/support?tab=history`).
Trigger: checker Operations > Support > Send reply. Reply content stays on-site.

Both support templates now require **two body variables**, not the earlier
subject-only format. If already created/approved, edit and re-submit them or
create new two-variable versions and set their new names in the backend env.
Do not enable the new sender against an old one-variable template. No dynamic
button is used; the code supplies the full clickable URL as body variable 2.

Role links (determined from the current ticket owner's DB role at send time):
- Benfek: `https://hlsnigeria.com/support?tab=history` (dashboard `/benfek/dashboard`).
- Principal: `https://hlsnigeria.com/principal/support?tab=history` (dashboard `/principal`).
- Wholesaler: `https://hlsnigeria.com/wholesaler/support?tab=history` (dashboard `/wholesaler`).

Testing uses the corresponding `https://testing.hlsnigeria.com` URL via
`FRONTEND_BASE_URL`. Signing in from a notification preserves the History tab.
Do not add a fixed-role website button to these shared templates.

## 13. Pharmacy referral: hls_pharmacy_referral

Suggested category: Utility for a consented, confirmed service referral.
Env: `WHATSAPP_TEMPLATE_PHARMACY_REFERRAL`.

```text
A new HLS service referral for {{1}} has been assigned to your pharmacy.

Please contact the HLS team to review the referral through the authorised service channel.
```

Variable: 1 = Benfek name (`Alex Example`). Recipient is the pharmacy, NOT the
Benfek. Trigger: checker approves the current pharmacy request, when a pharmacy
phone exists. Verify the recipient and permission before approval; a Benfek
typing a pharmacy number does not establish that pharmacy's WhatsApp consent.

## 14. Pharmacy accepted: hls_pharmacy_accepted

Suggested category: Utility. Env: `WHATSAPP_TEMPLATE_PHARMACY_ACCEPTED`.

```text
Your selected pharmacy, {{1}}, has been accepted for your HLS account.

Sign in to your HLS dashboard to review your account details.
```

Variable: 1 = pharmacy name (`Example Pharmacy`). Recipient is the Benfek.
Trigger: same checker approval as the pharmacy-referral message.

## 15. Invoice link: hls_invoice

Suggested category: Utility. Env: `WHATSAPP_TEMPLATE_INVOICE`.

```text
Your HLS invoice is ready.

Review your invoice here: {{1}}

Please keep this link private and contact HLS support if you need assistance.
```

Variable: 1 = full protected invoice page URL, for example
`https://hlsnigeria.com/invoices/00000000-0000-4000-8000-000000000000?token=SAMPLE`.
Use a dummy sample, not a real customer's link. The body and one-variable template
structure are unchanged. No image header or dynamic button is required.

Trigger: Benfek nutrient pack > View Invoice > Share > Send invoice. The backend
snapshots the owned pack/order and queues `sendInvoiceLink`, sending to the saved
phone. The invoice page requires its owner to sign in and a signed link valid for
seven days. It offers PDF download. No cloud upload or public image is needed.
Unpaid packs/orders are clearly labelled Proforma invoice. Configure `JWT_SECRET`
and the deployment's `FRONTEND_BASE_URL` on the backend.

## Backend environment values

Add these to the **backend Render service**, separately for testing and
production. Do not expose API keys or secrets in frontend/VITE variables.
Only set names for templates approved in the WABA the backend sends from.

```ini
WHATSAPP_BENFEK_TEMPLATE_NAME=benfek_quiz_invitation
WHATSAPP_BENFEK_TEMPLATE_LANGUAGE=en
WHATSAPP_EVENT_TEMPLATE_LANGUAGE=en
WHATSAPP_TEMPLATE_PACK_AVAILABLE=hls_pack_available
WHATSAPP_TEMPLATE_ASSESSMENT_COMPLETED=hls_assessment_completed
WHATSAPP_TEMPLATE_PAYMENT_SUCCESSFUL=hls_payment_successful
WHATSAPP_TEMPLATE_PAYMENT_FAILED=hls_payment_failed
WHATSAPP_TEMPLATE_ORDER_PROCESSING=hls_order_processing
WHATSAPP_TEMPLATE_ORDER_DISPATCHED=hls_order_dispatched
WHATSAPP_TEMPLATE_ORDER_DELIVERED=hls_order_delivered
WHATSAPP_TEMPLATE_CART_REMINDER=hls_cart_reminder
WHATSAPP_TEMPLATE_PROFILE_INCOMPLETE=hls_profile_incomplete
WHATSAPP_TEMPLATE_ASSESSMENT_REMINDER=hls_assessment_reminder
WHATSAPP_TEMPLATE_SUPPORT_RECEIVED=hls_support_received
WHATSAPP_TEMPLATE_SUPPORT_REPLY=hls_support_reply
WHATSAPP_TEMPLATE_PHARMACY_REFERRAL=hls_pharmacy_referral
WHATSAPP_TEMPLATE_PHARMACY_ACCEPTED=hls_pharmacy_accepted
WHATSAPP_TEMPLATE_INVOICE=hls_invoice
```

Retain the existing `WHATSAPP_PROVIDER=meta`, API URL/key, sender/phone number ID,
WABA ID, `WHATSAPP_VERIFY_TOKEN` and `META_APP_SECRET`. No new credentials are
needed for these templates. Set `FRONTEND_BASE_URL` to
`https://testing.hlsnigeria.com` for testing and `https://hlsnigeria.com` for
production. Pack-ready body URLs follow this setting. Existing invitation
buttons follow the URL approved in Meta, not this environment variable.

Pack-ready jobs fail explicitly if their template name is missing, rather than
silently trying an out-of-window text. Other event helpers retain their legacy
text/image fallback if unset; that fallback is not reliable outside 24 hours.
Configure their approved names before relying on automated delivery.

## Deploy and test pack readiness

1. Back up the target DB. From `api`, run `npx prisma migrate deploy` for the
   `20261118160000_add_notification_workflows` and
   `20261118190000_complete_notification_flows` migrations if unapplied.
   Apply independently to testing and production. This pack addition needs no
   further schema change; NotificationJob already stores a string kind.
2. Deploy backend and frontend builds; add the approved pack template name and
   matching language to Render, then restart/redeploy the backend service.
3. Use an opted-in test recipient with a valid Benfek code/account. Save a draft
   from the researcher app: no pack-ready notification should be created.
4. Select supplements and Dispatch a pack. The pack appears in the catalogue;
   the success toast reports WhatsApp queued, not delivered.
5. Keep the backend running. The worker runs every minute, processes up to 25
   jobs, and retries failures up to three attempts with backoff. A backlog may
   take longer. Checker Operations > Notifications shows `pack_available` and
   pending/processing/accepted/failed/cancelled submission status and the linked
   webhook delivery status. Missing automated templates fail explicitly rather
   than silently falling back to a free-form message.
6. Confirm arrival on WhatsApp and check WhatsAppDelivery/webhook status in the
   backend. `accepted` means Meta accepted the request, not proof of delivery.
   Open the dashboard link, sign in if needed and verify the pack is visible.
7. Repeat the same dispatch request: no new job. Dispatch All Packs queues a
   separate notice for each pack. A physical order dispatch later sends its own
   distinct `hls_order_dispatched` update.
8. Test missing template/invalid provider credentials only in a controlled test
   environment: the pack stays saved, the job retries/fails visibly, and email
   is independent. Restore config before live use. Queue retry does not resend
   email. After the third failure, there is no automatic fourth attempt.

Deduplication is once per persisted pack ID, not per later content edit. This
is at-least-once external dispatch: a crash after Meta acceptance but before
queue acknowledgement can still result in a duplicate attempt. The code does
not create templates, change Render settings, run migrations or send live tests
by itself. See [workflow details](notification-workflows.md).
