# Company and Staff Expiry Notifications

Daily scheduler: 06:00 UTC / 10:00 UAE time. It reads existing Firebase Realtime Database `clients` and `staff` records and does not rewrite those records.

## Reminder schedule
- 30, 15, 7 and 1 calendar days before expiry.
- Overdue: one alert on day 1, then weekly (days 7, 14, 21, ...).
- Duplicate protection is per record, document field, expiry date, reminder window, channel and recipient.
- Changing an expiry date starts a new reminder series; old history remains.

## Recipients
- Company documents: company email and WhatsApp number.
- Staff documents: staff email and explicit staff WhatsApp number, plus the linked company's email/WhatsApp copy.
- A generic staff contact number is not assumed to be WhatsApp.
- Missing contacts and unconfigured providers are recorded in Notification Center.

## GitHub Actions secrets
Required Firebase secrets:
- `FIREBASE_SERVICE_ACCOUNT_JSON`: service-account JSON for Firebase project `dar-al-shams`.
- `FIREBASE_DATABASE_URL`: `https://dar-al-shams-default-rtdb.firebaseio.com`.

Email (Gmail SMTP — preferred for the requested Gmail delivery):
- `GMAIL_USER`: the Gmail mailbox that sends the reminders.
- `GMAIL_APP_PASSWORD`: a Google App Password for that mailbox (requires 2-Step Verification; never use the normal Gmail password).
- `REMINDER_FROM_EMAIL`: optional sender display address; defaults to `GMAIL_USER`.

Resend is supported as an alternative if Gmail SMTP is not used:
- `RESEND_API_KEY`
- `REMINDER_FROM_EMAIL`: verified sender address.

WhatsApp Cloud API (optional; email still runs without it):
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TEMPLATE_NAME`: Meta-approved template with five body text parameters in this order: person/company name, company name, document type, expiry date, days until expiry.
- `WHATSAPP_TEMPLATE_LANGUAGE`: template language code (e.g. `en`).
- `WHATSAPP_GRAPH_API_VERSION`: optional, defaults to `v23.0`.

Meta must approve the template before proactive WhatsApp reminders can be sent. The scheduler sends only individual WhatsApp messages; it never sends to groups.

## Manual group messages
Notification Center prepares a message containing name, document type and expiry date only. The user copies it and opens the saved group link to send manually. Passport, Emirates ID and other document numbers are excluded.

## Testing and operation
- Daily schedule becomes active after the workflow is merged/enabled on the default branch.
- Actions → Scheduled Company and Staff Expiry Reminders → Run workflow with `dry_run=true` previews without writes or sends.
- A live run requires the Firebase and provider secrets above. Add them under GitHub Settings → Secrets and variables → Actions.
- Delivery internals remain server-only in Firebase; approved ERP users can read sanitized event history.
