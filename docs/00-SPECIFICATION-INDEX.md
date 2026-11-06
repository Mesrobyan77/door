# White Shop — specification index

**Կարգավիճակ.** Implementation complete (Phases 0–11); production deploy pending approval
**Տարբերակ.** 1.0
**Ամսաթիվ.** 2026-07-18

Այս պանակի փաստաթղթերը White Shop-ի implementation source of truth-ն են։ Kickoff approval-ը փակված է 2026-07-18-ին documented defaults-ով (`TECH_CARD.md`, `DECISIONS.md`)։

## Փաստաթղթերի քարտեզ

| Փաստաթուղթ | Նպատակ | Հիմնական լսարան |
|---|---|---|
| [`BRIEF.md`](./BRIEF.md) | Product նպատակը, դերերը, scope-ը և invariants-ը | Product, engineering |
| [`TECH_CARD.md`](./TECH_CARD.md) | Stack և operational որոշումների approval record | Tech lead, owner |
| [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md) | Համակարգի կառուցվածքը, boundaries և runtime flows | Engineering |
| [`02-FUNCTIONAL-SPECIFICATION.md`](./02-FUNCTIONAL-SPECIFICATION.md) | Storefront, profile և admin behavior/acceptance criteria | Product, QA, engineering |
| [`03-DATA-MODEL.md`](./03-DATA-MODEL.md) | Entities, relations, constraints, indexes և lifecycle | Backend, DB, QA |
| [`04-ROUTES-AND-CONTRACTS.md`](./04-ROUTES-AND-CONTRACTS.md) | Routes, mutations, validation և error contract | Frontend, backend, QA |
| [`05-SECURITY-AND-PRIVACY.md`](./05-SECURITY-AND-PRIVACY.md) | Threat controls, authorization, audit և privacy | Engineering, security |
| [`06-I18N-SEO-PERFORMANCE-A11Y.md`](./06-I18N-SEO-PERFORMANCE-A11Y.md) | Locale, currency, discoverability, performance և accessibility | Frontend, SEO, QA |
| [`07-TESTING-AND-QUALITY.md`](./07-TESTING-AND-QUALITY.md) | Test strategy, quality gates և Definition of Done | Engineering, QA |
| [`08-IMPLEMENTATION-PLAN.md`](./08-IMPLEMENTATION-PLAN.md) | Dependency-aware delivery phases և milestone exit criteria | Delivery team |
| [`DECISIONS.md`](./DECISIONS.md) | Հաստատված, առաջարկվող և բաց որոշումներ | Owner, tech lead |

## Requirement conventions

- **MUST** — պարտադիր launch requirement։
- **SHOULD** — պետք է իրականացվի, եթե հակառակ որոշումը ADR-ով հիմնավորված չէ։
- **MAY** — optional/extension capability։
- Requirement ID-երը կայուն են և կիրառվում են task-երում, tests-ում և PR description-ներում։
- Money field-երի suffix-ը `_amount`; դրանք integer են և իմաստավորվում են համապատասխան currency code-ով։
- Date/time-երը database-ում UTC են, UI-ում locale-aware են։
- Delete-ը financial/audit domain-ում նշանակում է archive/anonymize, ոչ hard delete։

## Approval gate

Implementation-ը սկսելուց առաջ հաստատել՝

1. `TECH_CARD.md`-ի project size/layout և hosting/runtime-ը։
2. `DECISIONS.md`-ի `OPEN-*` կետերի owner-ը և due milestone-ը։
3. P0/P1 scope-ի launch boundary-ն։
4. Payment-ի v1 սահմանը՝ միայն COD, թե նաև online provider։
5. Tax, refund, retention և legal policy-ները։

Unresolved ոչ blocking հարցերը կարող են ունենալ documented default, բայց չեն կարող լուռ փոխել business behavior-ը։

## Change control

- Public routes, database schema, role model, money rules կամ checkout invariants փոխելիս թարմացվում են բոլոր ազդված specification-ները։
- Architecture/stack մեծ փոփոխության համար ստեղծվում է ADR և թարմացվում `TECH_CARD.md`։
- Requirement-ը չի համարվում իրականացված միայն UI-ի առկայությամբ. persistence, permission, states, translations և tests-ը նույն requirement-ի մաս են։
