# Implementation Plan

## Occupational Safety and Health Safety Management System (OSH-SMS)

Status: Draft v1
Last updated: 2026-08-17

---

## 1. Guiding Principles

- Build the **full workflow thin, end to end, before going wide**. A
  hazard report that can travel all the way to a verified, closed
  corrective action (even with ugly UI) is worth more early than five
  polished but disconnected modules.
- Stand up the database schema early (even if PostgreSQL/Prisma was
  listed as "later" — in practice, defining the MVP tables up front
  avoids throwaway in-memory scaffolding). "Later" in the original scope
  means *later than frontend/backend skeleton*, not *last*.
- No module is "done" until: API routes exist, are role-protected, have
  basic validation, and the frontend screen for it actually calls the
  real API (no long-lived mock data).
- Each phase ends in something demoable.

## 2. Phase Order

### Phase 0 — Project Scaffolding (no feature code)
- Initialize monorepo (`pnpm` workspaces), root configs (ESLint,
  Prettier, `.gitignore`, `tsconfig.base.json`).
- Scaffold `frontend/` (Vite + React + TS + Tailwind), confirm it runs.
- Scaffold `backend/` (Express + TS), confirm a health-check route runs.
- Set up local PostgreSQL + Prisma, `schema.prisma` with the MVP tables
  from DATABASE_DESIGN.md, run first migration, add seed script.
- **Demo**: frontend loads a blank page that successfully calls a
  backend `/health` route which confirms DB connectivity.

### Phase 1 — Auth, Users & Roles, Workplaces & Departments
- Backend: `User` CRUD (admin-only), login endpoint, JWT issuance,
  `requireAuth`/`requireRole` middleware. `Workplace`/`Department` CRUD.
- Frontend: login page, auth context/route guards, a bare admin screen
  to manage users, workplaces, and departments.
- **Why first**: every other module depends on "who is logged in, what
  role do they have, and which workplace/department does this record
  belong to." Building this first avoids hardcoding a fake user
  everywhere and re-plumbing auth later.
- **Demo**: log in as seeded users of each role; admin can create a
  workplace, a department, and a new user.

### Phase 2 — Hazard Reporting
- Backend: `HazardReport` CRUD, photo upload endpoint, status field
  (`SUBMITTED` initially).
- Frontend: "Report a Hazard" form (any logged-in user), "My Reports"
  list, safety-officer "All Reports" list.
- **Why now**: it's the entry point of the core workflow and the
  simplest module (no state machine yet beyond submit) — a good second
  module to validate the upload pipeline and role-based visibility
  patterns before the more complex workflow modules.
- **Demo**: an employee submits a hazard report with a photo; a safety
  officer sees it in a queue.

### Phase 3 — Findings + Corrective Actions + Evidence (the core workflow)
This is the largest phase and the heart of the MVP — build it as one
phase since the three entities are only meaningful together.
- Backend: safety officer review action on `HazardReport`
  (accept/reject) that creates a `Finding`; `Finding` CRUD; standalone
  finding creation (stand-in for inspections, per PRD 5.1); corrective
  action endpoints for each transition (assign, respond, upload
  evidence, verify/reject); enforce the business rules from
  DATABASE_DESIGN.md Section 4 in the service layer.
- Frontend: finding detail page showing linked corrective actions and
  their statuses; forms for each transition, gated by role; a visible
  "status timeline" component reused across hazard report / finding /
  corrective action detail pages.
- **Why now**: this is the payoff of Phases 1–2 and the module every
  later module (dashboard, reports, notifications, audit) reports on.
  Sequencing it before Dashboard/Notifications/Audit means those modules
  have real data and real transitions to hook into instead of being
  built against guesses.
- **Demo**: full workflow, hazard report -> finding -> corrective action
  -> response -> evidence -> verification -> closure, done by
  role-switching between a reporter, safety officer, and responsible
  person.

### Phase 4 — Audit History
- Backend: write an `AuditLog` row inside the same transaction as every
  transition built in Phases 2–3 (retrofit those endpoints); `GET`
  endpoint to fetch history for an entity.
- Frontend: "History" tab/panel on hazard report, finding, and
  corrective action detail pages.
- **Why after Phase 3, not before**: audit logging has nothing to record
  until the transitions it logs exist. Building it right after Phase 3
  (not deferred further) keeps the retrofit small — only one phase of
  endpoints to go back and add logging calls to.
- **Demo**: open any finding, see a chronological log of every status
  change with who did it and when.

### Phase 5 — Notifications (in-app)
- Backend: `Notification` creation hooked into the same transition
  points as Phase 4's audit logging (e.g. assigning a corrective action
  notifies the responsible person); list/mark-read endpoints.
- Frontend: notification bell with unread count, dropdown list, link to
  the relevant entity.
- **Why now**: like audit history, it piggybacks on transitions that
  already exist; doing it right after audit history means both
  cross-cutting concerns are wired into the workflow endpoints in the
  same pass instead of two separate retrofits.
- **Demo**: assign a corrective action to a user, log in as that user,
  see the notification.

### Phase 6 — Dashboard
- Backend: aggregate endpoints (counts by status, overdue corrective
  actions, recent activity feed — can query directly off existing
  tables, no new entities needed).
- Frontend: dashboard page with summary cards + recent activity list.
- **Why last among the MVP modules**: the dashboard is a read-only view
  over data produced by every prior phase. Building it last means there
  is real, varied data (multiple statuses, some overdue, some closed) to
  build and sanity-check the aggregation queries against, instead of
  guessing at query shapes against an empty database.
- **Demo**: dashboard numbers visibly change as items move through the
  workflow.

### Phase 7 — Reports (basic)
- Backend: 1–2 canned report endpoints (open items by workplace, overdue
  corrective actions) with CSV export.
- Frontend: reports page, table view + "Export CSV" button.
- **Why last**: reports are a thin export layer over Phase 6's
  aggregation logic; sequencing it last reuses that work directly.
- **Demo**: export a CSV of overdue corrective actions.

### Phase 8 — MVP Hardening
- Fill test coverage gaps on the business rules from DATABASE_DESIGN.md
  Section 4.
- Error states, empty states, loading states across all screens.
- Basic accessibility pass (labels, focus states, keyboard nav on forms).
- Review role-based access on every route (backend is source of truth;
  confirm frontend guards match).
- **Demo**: MVP considered feature-complete and demo-ready end to end.

## 3. Explicitly Post-MVP (Next Phases, Not Detailed Yet)

Only sequenced at a high level; detailed planning happens when reached.

- **Phase 9 — Workplace Inspections** (templates, checklists, scheduling;
  `Finding.inspectionId` added per DATABASE_DESIGN.md Section 5).
- **Phase 10 — Risk Assessments** (likelihood x severity matrix).
- **Phase 11 — Notification channels** (email at minimum).
- **Phase 12 — Reporting expansion** (configurable filters, more report
  types, charts).

## 4. Module Build Order — Summary Table

| Order | Module | Phase |
|---|---|---|
| 1 | Users & Roles, Workplaces & Departments | 1 |
| 2 | Hazard Reporting | 2 |
| 3 | Inspection Findings (as "Findings") | 3 |
| 3 | Corrective Actions | 3 |
| 4 | Audit History | 4 |
| 5 | Notifications | 5 |
| 6 | Dashboard | 6 |
| 7 | Reports | 7 |
| — | Workplace Inspections (full module) | Post-MVP (9) |
| — | Risk Assessments | Post-MVP (10) |

Note: "Workplace Inspections" and "Inspection Findings" from the original
11-module list are split deliberately — the MVP builds **Findings** (the
record of a confirmed issue) without the full **Inspections** module
(scheduling, templates, checklists) around it, per the MVP scope in
PRODUCT_REQUIREMENTS.md Section 5.

## 5. Definition of Done (per module)

A module is done when all of the following hold:
1. Prisma schema for its tables is migrated.
2. Backend routes exist, are role-protected, and validate input.
3. Frontend screens call the real backend (no mock data left in place).
4. The relevant business rules (if any, per DATABASE_DESIGN.md Section 4)
   have at least one automated test.
5. It's been manually walked through in the running app, not just typed
   and assumed correct.
