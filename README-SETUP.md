# Dar Al Shams ERP — corrected project bundle

## Files
- `index.html`: main application; all existing element IDs retained.
- `studio.js`, `app.js`, `ledger.js`, `services.js`, `state.js`, `ui.js`: existing workflows with targeted fixes.
- `config.js`: Firebase client configuration and shared persistence helpers.
- `translator.js`: browser-side caller for a secure server translation endpoint; contains no Gemini key.
- `translation-route.example.js`: Express route example for deployment on your server.
- `ledger.html`: forwards to the full Accounts Ledger tab in `index.html`.

## Run
Serve this folder from a local/web server (not by opening `index.html` as a `file://` URL). Sign-in uses Firebase Authentication (email/password), requires a verified email address, and checks an administrator approval record before loading business data. Firebase Realtime Database rules independently enforce authenticated and approved access; the browser UI is not the security boundary.

### Current access model
- Two fixed administrator UIDs can approve accounts and manage administrator-only controls.
- A verified account with `approvals/{uid} = true` currently receives read/write access to all ERP business collections, including invoices, payments, staff identity data, suppliers and purchases.
- Approval is **not** a role system: do not approve an account unless it is trusted to access and edit all business records. If operators need restricted access (for example, staff may create work records but must not edit invoices or payroll/identity data), implement and test a role matrix in Firebase Rules before approving them.

## Arabic translation endpoint
The browser requests `POST /api/translate-company-name` with `{ "companyName": "..." }`. Deploy `translation-route.example.js` in an authenticated Express server, install `express` and `@google/genai`, set `GEMINI_API_KEY` in the server environment, and mount the route. Add your normal authentication, rate limiting, HTTPS, and CORS policy as appropriate. Until the endpoint is deployed, a basic local phonetic fallback is used and must be reviewed before official/legal use.

## Firebase
`config.js` retains the existing Firebase project settings. The Firebase web API key is a client identifier, not an authorization boundary; restrict it in Google Cloud and secure database access with Firebase Rules. Do not put Gemini/provider secrets in browser files.

## Important testing note
The code was statically reviewed and syntax-checked in this bundle. A live end-to-end test still requires your Firebase project/rules and deployment environment; verify create/edit/delete, payment recording, and PDF generation against a test database before using it for real accounting.
