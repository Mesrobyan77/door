# White Shop — release checklist

**Status.** Prepared for launch readiness (Phase 11).  
**Deployment.** Requires explicit authorization — do not deploy from this checklist alone.

## Pre-production

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` green on release commit
- [ ] Neon production DB provisioned; app role is not owner; migrations reviewed
- [ ] Restore drill documented (Neon PITR / backup retention / RPO/RTO)
- [ ] Upstash Redis, R2, Resend (or stubs replaced) credentials in hosting env only
- [ ] `AUTH_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL` set per environment
- [ ] Production env inventory recorded (owner + rotation notes)
- [ ] Security headers verified (CSP/HSTS hosting-aware; HSTS only behind HTTPS)
- [ ] Maintenance mode tested (storefront blocked, admin bypass)
- [ ] COD checkout + order status transitions smoke-tested
- [ ] Review moderation + currency switch smoke-tested
- [ ] Analytics CSV export authorized-only
- [ ] Legal pages replaced with approved copy (OPEN-014) before public launch
- [ ] Online payments still deferred unless OPEN-002 approved

## Rollback

1. Revert hosting deployment to previous successful build.
2. Do **not** reverse-migrate production schema without a written plan.
3. If a forward migration is unsafe, restore DB from Neon point-in-time backup.
4. Disable maintenance mode / feature flags as needed after recovery.

## Incident basics

- Capture correlation IDs from structured logs.
- Revoke sessions for compromised accounts via DB `sessions` table.
- Rotate leaked secrets immediately; never commit `.env`.
- Provider outages: COD remains available; FX falls back to stale cached rates.

## Post-deploy

- [ ] Health check homepage + `/admin` login
- [ ] Place test COD order in staging/production sandbox
- [ ] Confirm audit_logs rows for admin mutations
- [ ] Monitor error rate / latency for 24h
