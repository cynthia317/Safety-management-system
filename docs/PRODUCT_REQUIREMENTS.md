# Product Requirements Document (PRD)

## Occupational Safety and Health Safety Management System (OSH-SMS)

Status: Draft v1
Last updated: 2026-08-17

---

## 1. Purpose

A web-based system that lets organizations report workplace hazards, run
inspections, track findings through corrective action to closure, manage
risk assessments, and give safety officers and management visibility into
the state of workplace safety through dashboards and reports.

The system formalizes and enforces this workflow:

```
Hazard Report
  -> Safety Officer Review
  -> Finding
  -> Corrective Action
  -> Responsible Person Response
  -> Evidence Upload
  -> Safety Officer Verification
  -> Closure
  -> Dashboard Update
```

## 2. Users / Roles (v1)

| Role | Description | Typical actions |
|---|---|---|
| **Employee / Reporter** | Any staff member who can report a hazard | Submit hazard report, view own reports |
| **Safety Officer** | Reviews hazards, runs inspections, verifies fixes | Review reports, create findings, assign corrective actions, verify evidence, close items |
| **Responsible Person** | Owns a corrective action (e.g. department supervisor, maintenance lead) | Respond to corrective action, upload evidence |
| **Admin** | Manages users, roles, workplaces/departments, system config | Full access, user management |
| **Viewer / Management** | Read-only access to dashboards and reports | View dashboards, export reports |

A user may hold more than one role. Roles are scoped per workplace in later
versions; v1 treats roles as global (see Section 6, Out of Scope).

## 3. Core Modules (Full Vision)

1. Dashboard
2. Hazard Reporting
3. Workplace Inspections
4. Inspection Findings
5. Corrective Actions
6. Risk Assessments
7. Workplaces and Departments
8. Users and Roles
9. Reports
10. Notifications
11. Audit History

## 4. Primary Workflow (Detailed)

1. **Hazard Report** — A reporter submits a hazard: title, description,
   location (workplace/department), category, severity estimate, optional
   photo.
2. **Safety Officer Review** — A safety officer triages the report:
   accept, reject (with reason), or merge with an existing item.
3. **Finding** — If accepted, the safety officer records a formal finding
   (may originate from a hazard report OR directly from a workplace
   inspection).
4. **Corrective Action** — The safety officer creates one or more
   corrective actions against the finding, each assigned to a
   responsible person with a due date and priority.
5. **Responsible Person Response** — The responsible person acknowledges
   the action and records what was/will be done.
6. **Evidence Upload** — The responsible person uploads evidence (photo,
   document, note) that the corrective action was completed.
7. **Safety Officer Verification** — The safety officer reviews the
   evidence and either verifies (closes) or rejects (sends back to
   Responsible Person Response) the action.
8. **Closure** — Once all corrective actions tied to a finding are
   verified, the finding (and, if applicable, the originating hazard
   report) is closed.
9. **Dashboard Update** — Closure and every state transition above
   updates dashboard metrics (open hazards, overdue actions, mean time
   to close, etc.) and writes an audit history entry.

Every state transition in this workflow must produce an **audit history**
record (who, what, when, from-state, to-state) and, where relevant, a
**notification** to the next responsible party.

## 5. MVP Definition (v1)

The MVP delivers **one complete, working slice of the full workflow** for
a single organization, without multi-tenant, advanced reporting, or
real-time features. It must be usable end-to-end by a real safety team.

### 5.1 In scope for MVP

- **Users & Roles** — login, the 4 core roles (Reporter is implicit: any
  authenticated user can report), basic CRUD for users (Admin only).
- **Workplaces & Departments** — simple CRUD, needed to locate hazards
  and scope inspections. Flat structure (Workplace -> Departments), no
  nested hierarchies.
- **Hazard Reporting** — create/list/view hazard reports, single photo
  attachment, status tracking.
- **Findings** — create a finding from a hazard report or standalone
  (representing a manual inspection finding), linked to a workplace/
  department.
- **Corrective Actions** — create, assign, respond, upload evidence,
  verify, close. This is the heart of the MVP.
- **Dashboard** — a single page with counts (open hazards, open findings,
  overdue corrective actions, closed this month) and a recent-activity
  list. No customizable widgets.
- **Audit History** — append-only log of state transitions, viewable per
  record (e.g. "history" tab on a finding).
- **Notifications** — in-app only (a notification bell + list). No email/
  SMS in v1.
- **Basic Reports** — one or two canned reports (e.g. "open items by
  workplace", "overdue corrective actions") exportable as CSV.

### 5.2 Explicitly deferred past MVP

- **Workplace Inspections** as a full standalone scheduling/checklist
  module (v1 lets a finding be created "manually" to stand in for an
  inspection result; a real inspection module with checklists/templates
  and scheduling comes in v2).
- **Risk Assessments** module (matrix-based risk scoring, likelihood x
  severity) — v2.
- Email/SMS notifications, digest emails.
- Multi-tenant / multi-organization support.
- Fine-grained, per-workplace role scoping (v1 roles are global).
- File storage on cloud object storage (v1 can use local/disk storage
  behind an abstraction that allows swapping later).
- Advanced analytics / configurable report builder.
- Mobile app (web is responsive but no native app).
- SSO / third-party auth providers (v1 uses email + password with JWT).

## 6. Out of Scope (v1, revisit later)

- Multi-language / i18n
- Offline support
- Real-time collaboration (websockets) — dashboard refresh is
  poll/reload-based in v1
- Regulatory-body specific compliance templates (e.g. OSHA 300 log
  generation) — noted as a strong v2/v3 candidate

## 7. Non-Functional Requirements

- **Security**: password hashing (bcrypt/argon2), JWT auth, role-based
  authorization on every API route, input validation on client and
  server.
- **Auditability**: every workflow transition is immutable once written;
  audit log is append-only.
- **Usability**: must be usable on desktop and tablet (inspections often
  happen on-site); mobile-responsive layout, not necessarily mobile-first
  in v1.
- **Data integrity**: corrective actions cannot be closed without
  verification; findings cannot close with open corrective actions.
- **Performance**: dashboard loads in <2s for a data set of a few
  thousand records (single organization scale, not internet scale).
- **Maintainability**: strict TypeScript across frontend and backend,
  shared types where practical.

## 8. Success Criteria for MVP

- A safety officer can take a hazard report from submission to a closed,
  verified corrective action entirely within the system.
- Every transition in that path is visible in the audit history.
- The dashboard accurately reflects counts after each transition.
- An admin can create workplaces, departments, and users with roles.

## 9. Glossary

- **Hazard Report**: raw, unverified observation submitted by any user.
- **Finding**: a confirmed issue requiring correction, created by a
  safety officer (from a hazard report or an inspection).
- **Corrective Action**: a concrete task assigned to fix a finding.
- **Responsible Person**: the user assigned to execute a corrective
  action.
- **Verification**: safety officer's confirmation that evidence
  satisfies the corrective action.
- **Closure**: terminal state once all corrective actions for a finding
  are verified.
