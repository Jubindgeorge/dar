# Dar Al Shams ERP — corrected project bundle

## Files
- `index.html`: main application; all existing element IDs retained.
- `studio.js`, `app.js`, `ledger.js`, `services.js`, `state.js`, `ui.js`: existing workflows with targeted fixes.
- `config.js`: Firebase client configuration and shared persistence helpers.
- `translator.js`: browser-side caller for a secure server translation endpoint; contains no Gemini key.
- `translation-route.example.js`: Express route example for deployment on your server.
- `ledger.html`: forwards to the full Accounts Ledger tab in `index.html`.

## Run
Serve this folder from a local/web server (not by opening `index.html` as a `file://` URL). Ensure Firebase Realtime Database rules allow only authenticated, authorized users to read/write production data. The current login form in the original project is a visual gate, not real authentication; it must not be treated as security.

## Arabic translation endpoint
The browser requests `POST /api/translate-company-name` with `{ "companyName": "..." }`. Deploy `translation-route.example.js` in an authenticated Express server, install `express` and `@google/genai`, set `GEMINI_API_KEY` in the server environment, and mount the route. Add your normal authentication, rate limiting, HTTPS, and CORS policy as appropriate. Until the endpoint is deployed, a basic local phonetic fallback is used and must be reviewed before official/legal use.

## Firebase
`config.js` retains the existing Firebase project settings. The Firebase web API key is a client identifier, not an authorization boundary; restrict it in Google Cloud and secure database access with Firebase Rules. Do not put Gemini/provider secrets in browser files.

## Important testing note
The code was statically reviewed and syntax-checked in this bundle. A live end-to-end test still requires your Firebase project/rules and deployment environment; verify create/edit/delete, payment recording, and PDF generation against a test database before using it for real accounting.
