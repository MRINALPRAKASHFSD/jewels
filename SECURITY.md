# Security Policy

## Supported versions

| Version           | Supported |
| ----------------- | --------- |
| Latest (`main`)   | Yes       |
| Previous releases | No        |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

If you find a security issue in this project, report it privately:

1. Email `mrinalprakashfsd@gmail.com`
2. Use the subject line `[SECURITY] Élan: <brief description>`
3. Include a description of the issue, steps to reproduce, potential impact, and any suggested fix.

### Response timeline

- Acknowledgement within 48 hours of receipt
- Initial assessment within 5 business days
- Fix and coordinated disclosure typically within 30 days

We credit reporters in release notes with their permission.

## Security architecture

### Authentication and authorization

- Admin routes are guarded on the client by `loadAdminSession` in `src/lib/admin/session.ts`.
- Database authorization is enforced by Supabase Row-Level Security (RLS) policies and `private.is_staff(auth.uid())`.
- Role checks in `src/lib/admin/permissions.ts` only hide UI controls and are never treated as a security boundary.
- Staff roles (`admin`, `editor`) are granted only through server-side tooling; `user_roles` has no client write policy.

### Data, views, and storage

- Supabase RLS governs all table and view access, including `security_invoker = true` on `public.admin_orders`.
- Product, collection, and lookbook images are stored in private buckets and accessed through signed URLs.
- Public enquiries enforce server-side Zod validation, honeypot checks, and database-backed rate limiting using salted SHA-256 abuse keys rather than raw IP addresses.
- Cashfree order amounts are looked up from published database records on the server, and webhook notifications verify HMAC-SHA256 signatures with `crypto.timingSafeEqual`.
- Admin activity logs are written by database triggers so they cannot be skipped by client code.

### Environment variables and dependencies

- Never commit `.env` files.
- Only prefix browser-safe public variables with `VITE_`. Keep `SUPABASE_SERVICE_ROLE_KEY` and `CASHFREE_SECRET_KEY` server-only.
- Dependencies are locked in `bun.lock` with a 24-hour minimum release age configured in `bunfig.toml`.

_Copyright © 2026 Mrinal Prakash. All rights reserved._
