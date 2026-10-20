# Admin Dashboard and Production Readiness

## Admin dashboard scope (next implementation slice)
- Sign-in through a company-approved identity provider (MFA recommended).
- Roles: administrator and sales staff; least-privilege access.
- Lead table: created date, name, phone, service, source, status, assigned owner, next follow-up.
- Lead detail: contact history, notes, status changes and follow-up tasks.
- Filters: date range, service, status, owner, campaign and language.
- Promotions CMS: draft/review/publish/expire; no invented discounts or guaranteed outcomes.
- Reports: leads by source/service, response time and confirmed conversions.
- Audit events for reads of sensitive lead detail, exports, assignment and status changes.
- CSV export restricted to authorized roles and logged.

## API contract to implement after authentication is selected
- `GET /api/admin/leads` — authenticated, paginated, filterable.
- `GET /api/admin/leads/:id` — authenticated and role-checked.
- `PATCH /api/admin/leads/:id` — schema-validated updates and audit record.
- `POST /api/admin/leads/:id/followups` — authenticated follow-up task.
- `GET/POST/PATCH /api/admin/promotions` — draft and publish workflow.
- `GET /api/admin/reports` — aggregated lead/campaign metrics only.
- All routes must reject unauthenticated requests and validate the user's role. No admin route should be enabled until this middleware is implemented and tested.

## Content approval required
- The current service cards are provisional labels inferred from existing ERP workflow references (document clearance, visa/residence, Emirates ID, renewals/cancellations). Management must verify the exact service names, scope and eligibility before publishing or using them in ads.
- Phone, email and location were found in the existing invoice/header content: +971 50 791 7947, connectdaralshams@gmail.com, and "Sharjah, Dubai, UAE". Confirm the public contact routing and location wording before launch.
- Official logo currently references the repository's existing `LOGO.png`. For a production build, copy it into the marketing site's own static assets and verify the light/dark variants rather than depending on a raw GitHub URL.

## Launch checklist
- [ ] Approve English and Arabic content and verify native Arabic proofreading.
- [ ] Approve service catalogue, claims, offers, offer dates, FAQs and testimonials.
- [ ] Confirm legal entity name, address, phone, email, WhatsApp number and working hours.
- [ ] Choose a company-branded domain, verify registrar availability/ownership, and configure DNS/HTTPS.
- [ ] Provision production MongoDB with least-privilege credentials, backups, retention and restore drill.
- [ ] Select admin identity provider, configure MFA/roles, and test denial paths.
- [ ] Configure anti-spam controls and privacy/consent notices.
- [ ] Add verified Google Analytics / Google Ads IDs only after account owner approval.
- [ ] Test form validation, persistence, duplicate submissions, mobile, RTL, keyboard accessibility and broken links.
- [ ] Verify real conversion events and deduplication; distinguish WhatsApp clicks from delivered messages and qualified leads.
- [ ] Run dependency/security scans and production build; test staging before DNS switch.
- [ ] Confirm no files outside `marketing-site/` are changed by this branch and ERP invoice regression checks remain green.
