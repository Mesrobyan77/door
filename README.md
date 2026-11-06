# White Shop

Armenian e-commerce storefront + admin (Next.js App Router modular monolith).

## Stack

- Next.js 16 / React 19 / TypeScript strict
- PostgreSQL (Neon) + Drizzle ORM
- Auth sessions in DB, Argon2id passwords
- Redis adapter (memory locally; Upstash-ready)
- COD payments; online providers deferred (`OPEN-002`)

## Local setup

```bash
pnpm install
cp .env.example .env   # fill DATABASE_URL + AUTH_SECRET at minimum
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000/en`.

### Useful scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm typecheck` | TypeScript |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |
| `pnpm build` | Production build |
| `pnpm db:migrate` | Apply SQL migrations |
| `pnpm db:seed` | Idempotent seed |

## Documentation

| Doc | Role |
|---|---|
| [`docs/TECH_CARD.md`](docs/TECH_CARD.md) | Approved stack decisions |
| [`docs/01-ARCHITECTURE.md`](docs/01-ARCHITECTURE.md) | System boundaries |
| [`docs/08-IMPLEMENTATION-PLAN.md`](docs/08-IMPLEMENTATION-PLAN.md) | Phases 0–11 |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Delivery status |
| [`docs/ops/RELEASE-CHECKLIST.md`](docs/ops/RELEASE-CHECKLIST.md) | Launch / rollback |

## Phases

Implementation follows `docs/08-IMPLEMENTATION-PLAN.md`. Production deploy and production DB migrations require **explicit approval**.

## License

MIT — see `LICENSE`.
# door
