# DAR ERP Company, Staff & Client Expiry Notifications

The scheduled workflow runs daily at 06:00 UTC (10:00 UAE time). It reads existing Firebase Realtime Database records under `clients`, `staff`, and `companyClients`. It does not rewrite those source records.

## Reminder schedule
- 30, 15, 7 and 1 calendar days before expiry.
- Overdue: one alert on day 1, then weekly (days 7, 14, 21, ...).
- Duplicate protection is per record, document field, expiry date, reminder window, channel and recipient.
- Changing an expiry date starts a new reminder series; old history remains.

## Recipients
- Company documents: company email and WhatsApp number.
- Staff and linked-client documents: person's email and explicit WhatsApp number, plus a copy to the linked company's contacts when available.
- A generic phone number is not assumed to be WhatsApp.
- Missing contacts and unconfigured providers are shown as needs-configuration in Notification Center.
- WhatsApp group links are manual only; automated reminders are individual messages only.

## GitHub Actions secrets
Already confirmed in the repository setup:
- `FIREBASE_SERVICE_ACCOUNT_JSON`: service-account JSON for Firebase project `dar-al-shams`.
- `FIREBASE_DATABASE_URL`: `https://dar-al-shams-default-rtdb.firebaseio.com`.
- `GMAIL_USER`: sender Gmail mailbox.

Still required to activate Gmail delivery:
- `GMAIL_APP_PASSWORD`: Google App Password for the sending mailbox (requires 2-Step Verification; never use the normal Gmail password).
- `REMINDER_FROM_EMAIL` is optional; if omitted, the workflow uses `GMAIL_USER`.

Create the App Password in the Google Account under Security → 2-Step Verification → App Passwords, then add it directly as a GitHub Actions secret. Do not paste it into the ERP or chat.

Resend is an alternative to Gmail SMTP:
- `RESEND_API_KEY`
- `REMINDER_FROM_EMAIL` (verified sender address).

WhatsApp Cloud API is optional:
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TEMPLATE_NAME` (Meta-approved template with five body text parameters: person/company name, company name, document type, expiry date, days until expiry).
- `WHATSAPP_TEMPLATE_LANGUAGE` (defaults to `en`).
- `WHATSAPP_GRAPH_API_VERSION` (defaults to `v23.0`).

Meta must approve the template before proactive WhatsApp reminders can be sent. The scheduler sends only individual messages; it never sends to groups.

## Manual test
Actions → Scheduled Company, Staff & Client Expiry Reminders → Run workflow with `dry_run=true`.
Dry-run reads expiry records but performs **no outbound messages and no Firebase writes**. The default manual-run input is dry-run. Scheduled production runs use live mode.

## Notification history and privacy
- Client-visible event history is stored under `expiryNotificationEvents`; Firebase rules permit only approved, verified ERP users to read it.
- Delivery idempotency records are stored under `expiryReminderDeliveries`; client reads and writes are denied.
- Passport, Emirates ID, visa and other document numbers are never copied into group messages or delivery history.
