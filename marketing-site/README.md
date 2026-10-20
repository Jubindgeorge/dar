# Dar Al Shams Public Marketing Website

This application is isolated under `marketing-site/` on the `feature/public-marketing-site` branch. It does not replace or modify the existing ERP entry points, Firebase data, ledger code, invoice templates, or PDF generation.

## Stack
- React + TypeScript + Vite
- Express + TypeScript API
- MongoDB for lead storage
- English/Arabic language switch and RTL layout
- WhatsApp click-to-chat using the verified company phone from the ERP invoice header
- Marketing events are consent-aware and must be configured with approved Google Analytics / Google Ads IDs before production.

## Run locally
1. `cd marketing-site/client && npm install && npm run dev`
2. `cd marketing-site/server && cp .env.example .env && npm install && npm run dev`
3. Set `VITE_API_BASE_URL=http://localhost:4000` in the client environment if the API is running locally.

## Before public launch
- The current scaffold loads the existing `LOGO.png` from the repository as a temporary development reference. Before production, copy the approved logo into `client/public/brand/dar-al-shams-logo.png` and change the image reference to this local asset so the site does not depend on GitHub hotlinking.
- Service cards in `client/src/content.ts` are initial drafts inferred from the ERP workflow and must be approved by management before advertising.
- Confirm phone, email, location, legal business name, Arabic company name, service descriptions, offers, terms and privacy notice.
- Set a strong admin authentication provider before enabling admin lead-management routes. This starter deliberately does not expose unauthenticated lead-list or update endpoints.
- Configure MongoDB, HTTPS hosting, spam protection, privacy/consent controls, backups, monitoring, Google Search Console, Analytics and Ads conversion actions.
- Domain availability and ownership have not been checked or registered.
- WhatsApp click-to-chat opens a prepared message; it does not confirm message delivery. For verified conversation events, connect the approved WhatsApp Business Platform.

## ERP protection
Do not merge this branch into production until the pull request is reviewed. The new files live only in `marketing-site/`. No existing ERP files or database records are changed by this branch.
