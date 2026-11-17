# Changelog

Notable changes to the Élan Fine Jewellery platform are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Cashfree payment gateway integration (UPI, credit/debit cards, and net banking) with server-side price verification
- Public `/checkout` and `/checkout/return` routes plus `POST /api/webhook/cashfree` HMAC-SHA256 webhook handler
- Admin `/admin/orders` view for tracking customer orders and payment statuses
- Server-side enquiry rate limiting, cooldown enforcement, and honeypot validation (`public.enquiry_rate_limits`)
- GitHub Actions CI workflow for linting, testing, and TypeScript checks
- Local mock catalogue fallback when the database is unreachable in development
- Initial storefront catalogue, collections, lookbook, client-side wishlist, and admin CMS panel

### Security

- Enforced `security_invoker = true` and revoked anonymous access on `public.admin_orders`
- Restricted Supabase storage buckets (`products`, `collections`, `lookbook`) to private signed URLs with `private.is_staff` write policies

## Version history

| Version | Date       | Notes           |
| ------- | ---------- | --------------- |
| 0.1.0   | 2026-05-19 | Initial release |

_Copyright © 2026 Mrinal Prakash. All rights reserved._
