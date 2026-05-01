# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (`main`) | ✅ Yes |
| Previous releases | ❌ No |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in this project, please report it responsibly:

1. **Email**: Send details to `mrinalprakashfsd@gmail.com`
2. **Subject**: `[SECURITY] Élan — <brief description>`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### Response Timeline

- **Acknowledgement**: Within 48 hours of receipt
- **Initial assessment**: Within 5 business days
- **Fix & disclosure**: Coordinated with the reporter; typically within 30 days

We appreciate responsible disclosure and will credit reporters (with permission) in release notes.

---

## Security Considerations

### Authentication & Authorization

- All admin routes are guarded by `loadAdminSession` in `src/lib/admin/session.ts`
- Authorization is enforced at the database level via Supabase RLS policies
- UI permission checks in `src/lib/admin/permissions.ts` are **UI-only** — do not rely on them as a security boundary
- Staff roles are granted only via trusted server tooling; no client write policy exists on `user_roles`

### Data & Storage

- Supabase Row-Level Security (RLS) is the authoritative security gate for all data
- Image storage references use object URL form for compatibility with private buckets
- Audit logs for admin actions are written by database triggers and cannot be bypassed

### Environment Variables

- Never commit `.env` files — they are excluded by `.gitignore`
- Rotate credentials immediately if accidentally exposed
- Use `VITE_` prefix only for variables that must be publicly accessible (non-sensitive)

### Dependencies

- Dependencies are locked via `bun.lock`
- A minimum release age of 24 hours is enforced via `bunfig.toml` for supply-chain protection

---

*Copyright © 2026 Mrinal Prakash. All rights reserved.*
