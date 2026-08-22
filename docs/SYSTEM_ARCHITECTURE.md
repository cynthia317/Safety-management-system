# System Architecture

## Occupational Safety and Health Safety Management System (OSH-SMS)

Status: Draft v1
Last updated: 2026-08-17

---

## 1. Overview

A conventional three-tier web application:

```
+-------------------+        HTTPS/JSON        +--------------------+        SQL         +--------------+
|   React SPA        |  <-------------------->  |  Express API        |  <-------------->  | PostgreSQL   |
|   (Vite, TS,        |                           |  (Node.js, TS)       |    (Prisma ORM)     |              |
|   Tailwind CSS)      |                           |                      |                     |              |
+-------------------+                           +--------------------+                     +--------------+
                                                          |
                                                          v
                                                 Local disk / object
                                                 storage (evidence &
                                                 hazard photos)
```

No microservices, no message queue, no real-time transport in v1. This is
a deliberate choice: the system's scale (single organization, thousands
of records, tens of concurrent users) does not justify that complexity.
Revisit only if a specific requirement (e.g. live dashboards across many
concurrent viewers) demands it.

## 2. Technology Stack

### Frontend
- **React 18** + **TypeScript** — component model, type safety
- **Vite** — dev server & build tool
- **Tailwind CSS** — utility-first styling
- **React Router** — client-side routing
- **A data-fetching layer** — TanStack Query (React Query) recommended
  once backend exists, to handle caching/loading/error state for API
  calls
- **A form library** — React Hook Form + Zod (shared validation schemas
  with backend where practical) recommended once forms are built

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** against **PostgreSQL** (introduced when the database
  phase starts; v1 backend work before that can run against a local
  Postgres instance from day one to avoid a migration later)
- **JWT** for stateless auth (access token; refresh token deferred unless
  needed)
- **Zod** (or similar) for request validation, shared conceptually with
  frontend validation
- **Multer** (or equivalent) for file upload handling (hazard photos,
  evidence)

### Database (introduced in its own phase, see IMPLEMENTATION_PLAN.md)
- **PostgreSQL**
- **Prisma** for schema, migrations, and query building

### Cross-cutting
- **ESLint + Prettier** in both frontend and backend, shared config
  philosophy
- **pnpm workspaces** (recommended) to manage `frontend` and `backend` as
  a monorepo without heavyweight tooling (Nx/Turborepo not needed at this
  scale)

## 3. Recommended Folder Structure

Monorepo with two apps and a shared docs root. Nothing here is created
yet — this is the target structure for when implementation begins.

```
safety-management-system/
├── docs/
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── DATABASE_DESIGN.md
│
├── frontend/
│   ├── src/
│   │   ├── app/                # app shell, router, providers
│   │   ├── modules/
│   │   │   ├── dashboard/
│   │   │   ├── hazards/
│   │   │   ├── inspections/
│   │   │   ├── findings/
│   │   │   ├── corrective-actions/
│   │   │   ├── risk-assessments/
│   │   │   ├── workplaces/
│   │   │   ├── users/
│   │   │   ├── reports/
│   │   │   ├── notifications/
│   │   │   └── audit-history/
│   │   │       # each module: components/, hooks/, api.ts, types.ts
│   │   ├── components/         # shared/reusable UI (buttons, tables, modals)
│   │   ├── lib/                 # api client, auth helpers, utils
│   │   ├── styles/
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── hazards/
│   │   │   ├── inspections/
│   │   │   ├── findings/
│   │   │   ├── corrective-actions/
│   │   │   ├── risk-assessments/
│   │   │   ├── workplaces/
│   │   │   ├── users/
│   │   │   ├── reports/
│   │   │   ├── notifications/
│   │   │   └── audit-history/
│   │   │       # each module: routes.ts, controller.ts, service.ts, schema.ts
│   │   ├── middleware/          # auth, error handling, validation, upload
│   │   ├── lib/                  # prisma client, logger, config
│   │   ├── app.ts                # express app assembly
│   │   └── server.ts             # entrypoint
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── uploads/                  # local dev evidence/photo storage (gitignored)
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                       # (optional, add only if duplication hurts)
│   └── types/                    # types shared between frontend & backend
│
├── .gitignore
├── package.json                  # workspace root
└── pnpm-workspace.yaml
```

Rationale:
- **Module-based, not layer-based** organization inside each app (a
  `hazards/` folder with everything hazard-related) so each of the 11
  planned modules stays self-contained and easy to build/review/remove
  in isolation.
- `shared/` is intentionally listed as optional-add-later: don't
  introduce a shared-types package until duplication actually causes
  bugs. Premature sharing between frontend/backend adds build
  complexity (needs its own tsconfig/build step) that isn't justified on
  day one.

## 4. API Design

- REST, JSON over HTTPS.
- Base path `/api/v1/...` to allow future versioning without breaking
  clients.
- Resource-oriented routes, e.g.:
  - `POST /api/v1/hazard-reports`
  - `GET /api/v1/hazard-reports/:id`
  - `POST /api/v1/findings/:id/corrective-actions`
  - `POST /api/v1/corrective-actions/:id/evidence`
  - `POST /api/v1/corrective-actions/:id/verify`
- Every mutating endpoint that represents a workflow transition (review,
  create finding, assign action, respond, upload evidence, verify, close)
  is a distinct, explicit endpoint rather than a generic `PATCH` — this
  keeps authorization rules (who can do this transition) and audit
  logging straightforward and explicit per action.
- Standard envelope for errors: `{ error: { code, message, details? } }`.
- Pagination via `?page=&pageSize=` on list endpoints from day one (avoids
  a breaking change later).

## 5. Authentication & Authorization

- Email + password login, passwords hashed with bcrypt/argon2.
- JWT access token returned on login, sent as `Authorization: Bearer`.
- Backend middleware:
  - `requireAuth` — validates JWT, attaches `req.user`.
  - `requireRole(...roles)` — checks `req.user.role` against an allowed
    list per route.
- Frontend stores the token in memory + `localStorage` (acceptable for
  v1; revisit httpOnly-cookie approach if XSS surface grows), and a route
  guard hides pages the current role can't use (defense in depth — the
  backend is the real authority).

## 6. File Uploads (Hazard Photos, Evidence)

- v1: files stored on local disk under `backend/uploads/`, referenced by
  path in the database, served via a static/authenticated route.
- Storage access goes through a small internal abstraction
  (`storage.save(file)`, `storage.getUrl(key)`) from the start, so
  swapping to S3-compatible object storage later is a one-file change,
  not a rewrite.

## 7. Notifications

- v1: in-app only. A `Notification` table, created by backend services on
  workflow transitions (e.g. "corrective action assigned to you"),
  fetched by the frontend and shown in a bell/dropdown.
- No background job runner needed yet since notifications are created
  synchronously as part of the same request that causes them.

## 8. Environments & Configuration

- `.env` per app (`frontend/.env`, `backend/.env`), never committed;
  `.env.example` committed instead.
- Backend config centralized in `backend/src/lib/config.ts`, reading from
  `process.env` with validation at startup (fail fast if a required var
  is missing).

## 9. Deployment (Later Concern, Noted Now)

Not needed for MVP, but the architecture should not preclude:
- Frontend as static build (Vite `dist/`) on any static host/CDN.
- Backend as a single Node process behind a reverse proxy, or containerized.
- PostgreSQL as a managed instance.

No deployment work happens until the MVP is functionally complete
locally.

## 10. Testing Strategy (Introduced Incrementally)

- Backend: unit tests for services (business rules like "cannot close a
  finding with open corrective actions"), integration tests for critical
  workflow routes.
- Frontend: component tests for complex interactive pieces (forms,
  workflow status widgets); full E2E is a post-MVP nice-to-have.
- Testing tooling choice deferred to IMPLEMENTATION_PLAN.md phase when
  backend scaffolding begins, to avoid picking tools before there's code
  to test.
