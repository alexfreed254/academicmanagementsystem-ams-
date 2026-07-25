# Thika Technical Training Institute — Academic Management System

**System documentation (complete project reference)**  
**Institution:** Thika Technical Training Institute (TTTI)  
**Product name:** Academic Management System (TTTI AMS)  
**Document version:** 2.0  
**Last updated:** July 2026  

---

## 1. Purpose and scope

TTTI AMS is a full-stack institutional platform that digitises academic and administrative operations at Thika Technical Training Institute. It serves staff, trainees, mentors, verifiers, and service departments through role-based portals.

### What the system covers

| Domain | Capabilities |
|---|---|
| Academic delivery | Classes, units, enrollments, lesson attendance, formative & summative assessment |
| Assessment evidence | Portfolio of Evidence (POE), scripts, evidence files, trainer documents |
| Examinations | Exam bookings, approvals, confirmation, marks and transcripts |
| Clearance | Multi-stage course clearance, certificates, public verification, lost items |
| Industrial attachment | Placement, GPS check-in/out, digital logbook, mentor competency, liaison oversight |
| Operations | Notices, notifications, audit logs, biometric classroom attendance, academic trips |
| Oversight | Registrar, Deputy Principal, Quality Assurance, CDACC external verification |
| Support | Workshop inventory, service-desk clearance |

### Out of scope / incomplete areas

- **Employer job board:** Schema tables exist (`employers`, `job_postings`, `job_applications`); a dedicated employer portal is not fully wired like other roles.
- **Live biometric device POST:** BioEntry hardware scan/enroll needs an optional device host or Durable Objects (in-memory Flask sessions are not Workers-compatible). Scanner registry and manual attendance run on Cloudflare.
- **Excel (openpyxl) bulk import/export:** Optional legacy Flask host via `VITE_LEGACY_ORIGIN`. Browser print/PDF is Cloudflare-native.

---

## 2. System identity

| Item | Detail |
|---|---|
| Repository | `ACADEMIC-MANAGEMENT-SYSTEM254` (`alexfreed254`) |
| Production UI | React 18 + Vite + TypeScript SPA (`frontend/`) |
| Production API | Cloudflare Workers + Hono (`workers/src`) at `/api/v1` |
| Deploy entry | Repo-root `wrangler.jsonc` → Worker `academic-management-system254` |
| Database | Supabase PostgreSQL (+ RLS policies) |
| Auth (staff) | Supabase Auth (email + password) → Worker issues session JWT |
| Auth (trainees) | Admission number + `user_profiles.password_hash` → Worker session JWT |
| File storage | Supabase Storage buckets |
| Hosting | **Cloudflare** (DNS, SSL/TLS, CDN, WAF, DDoS) + Worker Assets (SPA) + Worker API |
| Legacy reference | Flask (`app.py`) + Jinja `templates/` — not required for core SPA production |

Canonical inventory: `MIGRATION_INVENTORY.md`. Deploy cheat sheet: `CLOUDFLARE.md`.

---

## 3. Technology stack

| Layer | Technology |
|---|---|
| Edge / hosting | Cloudflare Workers · Worker Assets · Wrangler 4 |
| API framework | Hono + TypeScript (`workers/`) |
| Validation | Zod (where used) |
| Password verify | WebCrypto PBKDF2 + `scrypt-js` (Werkzeug hash compatible) |
| Session | Signed HS256 JWT (`Authorization: Bearer`), ~24 h |
| Database client | `@supabase/supabase-js` (service role server-side; anon for staff login) |
| Frontend | React 18 · Vite · TypeScript · React Router · TanStack Query · Axios · Tailwind |
| Reports | Browser print pages (`PrintReportPages` + `/api/v1/print/*`) |
| Timezone display | Africa/Nairobi in SPA where formatted |

### Legacy Python stack (optional device / Excel host only)

Flask, Gunicorn, ReportLab, openpyxl, Pillow — retained in-repo for biometric device APIs and Excel exporters if still needed. Not part of the Cloudflare production path.

---

## 4. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browsers                            │
│         React SPA (all roles) — TypeScript portals          │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTPS (same origin)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Worker (`academic-management-system254`)        │
│  /api/*  → Hono (auth · RBAC · business logic · uploads)    │
│  /*      → frontend/dist (SPA, not_found_handling)          │
└─────────────────────────────┬───────────────────────────────┘
                              │ service-role key (runtime secret)
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   Supabase Auth        Supabase DB         Supabase Storage
   (staff GoTrue)       (PostgreSQL+RLS)    (files / media)
```

**Note:** Separate Cloudflare Pages + API Worker is **obsolete**. Worker Assets fulfill the “Pages” role on the same Worker.

### Design principles

1. **Role-based portals** — each role has a URL prefix and React portal shell (sidebar/theme from former Jinja `base.html`).
2. **Department isolation** — dept admins and trainers are scoped to their department / assigned units.
3. **Dual authentication** — staff use Supabase Auth; trainees use local password hashes; both receive Worker session JWTs.
4. **Defence in depth** — Workers middleware RBAC + Supabase RLS + upload validation + audit logs.
5. **Cloudflare-first SPA** — React is production UI; Jinja templates are historical reference.

---

## 5. Application structure

### 5.1 Important production modules

| Path | Role |
|---|---|
| `wrangler.jsonc` | Unified Worker: build SPA, bind assets, `run_worker_first: ["/api/*"]` |
| `workers/src/index.ts` | Hono app, CORS, `/api/health`, mounts `/api/v1` |
| `workers/src/middleware/auth.ts` | `requireAuth` / `requireRole` / password-change gate |
| `workers/src/lib/*` | Supabase clients, session JWT, passwords, audit, print payloads, storage upload |
| `workers/src/routes/*` | auth, notifications, trainer, student, admin, roles, shared, mutations, public, print |
| `frontend/src/routes/AppRouter.tsx` | React Router — all portal routes |
| `frontend/src/config/navigation.ts` | Role themes, sidebars, `getRoleHome` |
| `frontend/src/lib/apiClient.ts` | Axios + Bearer token |

### 5.2 Top-level layout

```
ACADEMIC MANAGEMENT SYSTEM/
├── wrangler.jsonc              # Production Cloudflare config
├── package.json                # npm run deploy | dev | check
├── workers/                    # Hono + TypeScript API
├── frontend/                   # React + Vite SPA
├── templates/                  # Legacy Jinja (reference only)
├── routes/ · app.py · …        # Legacy Flask (optional host)
├── supabase_schema.sql
├── *_migration.sql
├── MIGRATION_INVENTORY.md
├── CLOUDFLARE.md
├── DEPLOYMENT.md
└── SYSTEM_DOCUMENTATION.md     # this file
```

### 5.3 Portal URL map (React SPA)

| Portal | URL prefix | Primary users |
|---|---|---|
| Public | `/`, `/about`, `/apply`, `/contact` | Guests |
| Auth | `/login`, `/auth/*` | All users |
| Super Admin | `/super-admin` | Super Admin |
| Dept Admin | `/dept-admin` | Department Admin |
| Trainer | `/trainer` | Trainer |
| Student | `/student` | Trainee |
| Examination Officer | `/examination-officer` | Examination Officer |
| Industry Mentor | `/industry-mentor` | Industry Mentor |
| Internal Verifier | `/internal-verifier` | Internal Verifier |
| Clearance | `/clearance` | Students + clearance approvers |
| Admin Oversight | `/admin-oversight` | Registrar, DP, QA |
| Notifications | `/notifications` | All authenticated users |
| Liaison Officer | `/liaison-officer` | Liaison Officer |
| CDACC Verifier | `/cdacc-verifier` | CDACC Verifier |
| Workshop Technician | `/workshop-technician` | Workshop Technician |
| Service Dept | `/service-dept` | Library / Sports / Service clearance |
| Academic trips | `/academic-trips` | Trainers / admins |
| Summative | `/summative` | Trainers / Dept Admin / Super Admin |
| Biometric (hub) | `/biometric` | Trainers + scanner registry UI |

API: all JSON under `/api/v1/*` on the same Worker.

---

## 6. Authentication and sessions

### 6.1 Login model

| Portal tab | Identifier | Password store | Session |
|---|---|---|---|
| **Staff / Admin** | Institutional **email only** | Supabase Auth | Worker HS256 session JWT (Bearer) |
| **Trainee** | **Admission number only** | `user_profiles.password_hash` (Werkzeug) | Worker HS256 session JWT (Bearer) |

Login UI: `/login` (split hero; staff vs trainee tabs).

### 6.2 Session

- Token stored in `sessionStorage` (`ttti_access_token`)
- Sent as `Authorization: Bearer <jwt>`
- Lifetime ~1 day; signed with `SESSION_SECRET`
- JWT payload carries safe profile fields (never `password_hash`)

### 6.3 Auth routes

| Route | Method | Purpose |
|---|---|---|
| `/login` | SPA | Dual login UI |
| `/api/v1/auth/login` | POST | Issue session JWT |
| `/api/v1/auth/logout` | POST | Invalidate client session; audit |
| `/api/v1/auth/me` | GET | Current profile |
| `/api/v1/csrf-token` | GET | Compatibility no-op for SPA |
| `/auth/forgot-password` | SPA + API | Staff: Supabase reset email; trainees: contact admin |
| `/auth/change-password` | SPA + API | Forced/optional password change |
| `/auth/profile` | SPA + API | Profile management |
| `/auth/student-register` | SPA + API | Optional (`ALLOW_STUDENT_SELF_REGISTER`) |

### 6.4 Post-login redirects

| Role | Landing |
|---|---|
| `super_admin` | `/super-admin/dashboard` |
| `dept_admin` | `/dept-admin/dashboard` |
| `trainer` | `/trainer/dashboard` |
| `student` | `/student/dashboard` |
| `examination_officer` | `/examination-officer/dashboard` |
| `industry_mentor` | `/industry-mentor/dashboard` |
| `internal_verifier` | `/internal-verifier/dashboard` |
| `liaison_officer` | `/liaison-officer/dashboard` |
| `cdacc_verifier` | `/cdacc-verifier/dashboard` |
| `workshop_technician` | `/workshop-technician/dashboard` |
| `library_hod` / `sports_hod` / `service_clearance_officer` | `/service-dept/dashboard` |
| `environment_hod` / `dean_students` / `finance_officer` | `/clearance/approver` |
| `registrar` | `/admin-oversight/registrar` |
| `deputy_principal` | `/admin-oversight/deputy-principal` |
| `quality_assurance_officer` | `/admin-oversight/quality-assurance` |

### 6.5 Password policy hooks

- `must_change_password` blocks API/portals until `/auth/change-password` succeeds.
- Temporary passwords set by admins should flip this flag.

---

## 7. Authorisation (RBAC)

### 7.1 Roles recognised by the application

**Staff roles (`STAFF_ROLES`):**

`super_admin`, `dept_admin`, `trainer`, `employer`, `examination_officer`, `industry_mentor`, `internal_verifier`, `sports_hod`, `environment_hod`, `dean_students`, `library_hod`, `finance_officer`, `registrar`, `deputy_principal`, `quality_assurance_officer`, `workshop_technician`, `liaison_officer`, `cdacc_verifier`, `service_clearance_officer`

**Trainee role:** `student`

**Hardware:** biometric devices authenticate with `BIOMETRIC_DEVICE_SECRET` on an optional device host (not a user role).

### 7.2 Enforcement layers

1. **Workers middleware** — `requireAuth`, `requireRole(...)`
2. **Query scoping** — department / class / unit ownership in route logic
3. **Supabase RLS** — defence-in-depth (service role used server-side)
4. **Service desks** — category → role maps for clearance

---

## 8. Module reference (functional detail)

### 8.1 Super Admin (`/super-admin`)

Institution-wide control plane:

- Dashboard and system statistics  
- CRUD: departments, classes, units, courses, users  
- Cross-department attendance, assessments, marks  
- Exam booking oversight  
- Clearance and attachment viewers  
- GIS / location views  
- Companies, notices, audit logs (`system_logs`)  
- Data import stubs / tools  
- Biometric scanner registry  

### 8.2 Department Admin (`/dept-admin`)

Department-scoped academic administration:

- Classes, units, trainers, students  
- Attendance and print registers  
- Exam booking approve/reject  
- Marks reports  
- Trainer POE and trainee documents  
- Industrial attachment management and companies  
- Notices to department users  
- Credentials / password reset initiation  
- Fingerprint registration status  

### 8.3 Trainer (`/trainer`)

Teaching delivery for assigned classes/units:

- Dashboard  
- Live lesson attendance (+ browser print session)  
- Assessment review / formative marks entry  
- Marks print; optional Excel via legacy host  
- POE uploads / portfolio  
- Biometric hub → manual attendance  

### 8.4 Trainee / Student (`/student`)

Learner self-service:

- Dashboard  
- Profile and personal documents  
- Units, lesson attendance, marks / print transcript  
- Assessments + evidence upload  
- Exam booking form and history  
- Portfolio of Evidence  
- Industrial attachment (placement, logbook, GPS where enabled)  
- Attachment marks and mentoring tool uploads  
- Employment status / projects  
- Summative competence (read-only view of own results)  
- Course clearance entry point  

### 8.5 Examination Officer (`/examination-officer`)

- Confirm approved exam bookings  
- Read-only marks views / print  

### 8.6 Clearance (`/clearance`)

Multi-stage course clearance workflow:

- Student initiates a request  
- Approvers act by stage and department/service (approve / reject)  
- Certificate (print-friendly)  
- Public verify by serial (`/clearance/verify`)  
- Service-desk queues  

### 8.7 Industrial attachment

| Actor | Actions |
|---|---|
| Trainee | Apply, acceptance letter, GPS/logbook (SPA + API) |
| Liaison Officer | Periods, approvals, companies, grading |
| Industry Mentor | Logbook approve/reject, competency, location |
| Internal Verifier | Verify competencies; reports |
| Dept / Super Admin | Oversight |

### 8.8 Summative assessment (`/summative`)

TVET CDACC competence entry and reporting:

| Level | Meaning |
|---|---|
| Mastery (M) | 80–100% |
| Proficient (P) | 65–79% |
| Competent (C) | 50–64% |
| Not Yet Competent (NYC) | 0–49% |
| CRNM | Course Requirement Not Met |

Features: hub, competence entry, unit performance analysis, reports, graduation list + print.

### 8.9 Biometric attendance (`/biometric`)

- Scanner registry (Super Admin) on Cloudflare  
- Manual class attendance on Cloudflare  
- Device POST scan/enroll: optional non-Worker host until Durable Objects / `biometric_sessions` port  

### 8.10 Academic trips (`/academic-trips`)

- Trip records and media uploads (`trip-media` bucket) via Workers  
- List, upload, detail, media pages in SPA  

### 8.11 Notifications (`/notifications`)

- In-app notifications via `/api/v1/notifications/*`  
- Mark read / counts  

### 8.12 Other portals

| Portal | Focus |
|---|---|
| CDACC Verifier | External verification of assessments, marks, trainer/trainee POE |
| Workshop Technician | Workshop inventory + clearance approvals |
| Service Dept | Library / Sports / service clearance desks |
| Admin Oversight | Registrar, Deputy Principal, QA views |

### 8.13 REST API v1 (`/api/v1`)

Bearer-token API used by the React app (~238 endpoints), including:

- Auth, profile, password, forgot-password, student register  
- Notifications  
- Trainer / student dashboards and workflows  
- Admin + role portal GETs  
- Mutations (CRUD, clearance, exams, attachment, uploads)  
- Public apply + departments  
- Print payloads for browser PDF  

CORS: `ALLOWED_ORIGINS` + same Worker origin.

---

## 9. Grading standard (TVET CDACC)

All formative percentage displays and summative competence align to:

| Marks range | Grade | Code | Meaning |
|---|---|---|---|
| 80–100% | Mastery | M | High mastery, accuracy, independence, consistency |
| 65–79% | Proficient | P | Strong competence with minor improvement areas |
| 50–64% | Competent | C | Minimum required standard met |
| 0–49% | Not Yet Competent | NYC | Further training / reassessment needed |
| — | CRNM | CRNM | Course requirement not met |

Shared rules: `grading_utils.py` (legacy) and Workers/SPA (`printPayloads`, marks helpers, summative entry validation).

---

## 10. Database

### 10.1 Platform

- **Engine:** PostgreSQL via Supabase  
- **Access from Worker:** service-role client for server operations; anon client for staff GoTrue login  
- **Security:** Row Level Security (RLS) in schema + `rls_hardening_migration.sql`

### 10.2 Core tables (base schema)

**Organisation:** `departments`, `courses`, `classes`, `units`, `class_units`, `trainer_units`, `enrollments`  

**People:** `user_profiles`  

**Teaching:** `attendance`, `class_events`, `formative_assessments`, `formative_marks`, `assessments`, `evidence`, `marks`  

**Exams:** `exam_bookings`  

**Documents:** `trainer_documents`, `trainee_documents`, `student_personal_documents`  

**Attachment:** `companies`, `mentors`, `industrial_attachments`, `location_logs`, `digital_logbook`, `competency_tracking` (+ workflow migrations)  

**Clearance:** `clearance_departments`, `clearance_stages`, `clearance_requests`, `clearance_approvals` (+ lost items)  

**Jobs / employment:** `employers`, `employer_verifications`, `job_postings`, `job_applications`, `employment_tracking`, `employment_projects`  

**Ops:** `system_logs`, `notifications`, `dept_notices`, `admission_requests`, `admission_documents`, `course_applications`  

### 10.3 Important migrations

| Migration file | Purpose |
|---|---|
| `new_roles_migration.sql` | Expand allowed `user_profiles.role` values |
| `clearance_migration.sql` | Clearance serial numbers |
| `clearance_stage2_migration.sql` | Parallel stages, return-for-correction |
| `clearance_cancel_migration.sql` | Trainee can cancel/stop clearance |
| `lost_items_migration.sql` | Lost items register |
| `workshop_inventory_migration.sql` | Workshop inventory |
| `biometric_migration.sql` | Biometric sessions + profile biometric id |
| `biometric_attendance_migration.sql` | Fingerprint id support |
| `biometric_scanners_migration.sql` | Scanner device registry |
| `academic_trips_migration.sql` | Academic trips + media |
| `summative_competence_migration.sql` | Summative competence table (CDACC levels) |
| `attachment_workflow_migration.sql` | Attachment periods, weekly attendance, grading, mentoring tools |
| `industrial_attachment_acceptance_letter_migration.sql` | Acceptance letter fields/status |
| `dept_notices_migration.sql` | Department notices |
| `notifications_sender_migration.sql` | Notification sender / notice recall fields |
| `trainer_documents_update_migration.sql` | Extra trainer POE document types |
| `migration_student_documents.sql` | Student personal documents |
| `fix_course_applications_fk_migration.sql` | Course applications FK fix |
| `rls_hardening_migration.sql` | RLS enablement / policy hardening |
| `verify_deployment.sql` | Post-deploy verification queries |

**Base schema file:** `supabase_schema.sql` (run first, then migrations in dependency order).

### 10.4 Storage buckets (typical)

| Bucket | Typical contents |
|---|---|
| `assessment-scripts` | Assessment scripts |
| `assessment-evidence` | Evidence files |
| `application-documents` | Course application uploads |
| `trip-media` | Academic trip photos/media |
| `mentoring-tools` | Mentoring tool uploads |

Optional `PRIVATE_STORAGE=true` uses signed URLs instead of public object URLs.

---

## 11. Frontend

### 11.1 React SPA (`frontend/`) — production UI

| Item | Detail |
|---|---|
| Stack | React 18, Vite, TypeScript, React Router, TanStack Query, Axios, Tailwind |
| API | Same-origin `/api/v1` with Bearer JWT (`VITE_API_BASE_URL` empty) |
| Shells | `PortalShell` + role themes/nav from `navigation.ts` |
| Reports | `/.../print` browser print pages |
| Local | `npm run dev` from repo root (Wrangler serves SPA + API) |

### 11.2 Jinja templates (`templates/`)

Historical reference transcribed into React. Not served by the Cloudflare Worker. Do not treat Jinja as production UI.

---

## 12. Security model

| Control | Implementation |
|---|---|
| Secrets | Worker runtime: `SESSION_SECRET`, Supabase keys — never in SPA |
| Session hygiene | JWT/profile strip password hashes |
| Auth API | Bearer JWT; CSRF token endpoint retained for compatibility |
| Rate limits | Cloudflare WAF rules (edge) for login |
| Uploads | Extension allow-lists, size limits on Worker routes |
| Password gate | `must_change_password` in middleware |
| Biometric API | Shared secret on optional device host |
| Audit | `writeAuditLog` → `system_logs` (`waitUntil`) |

Forgot-password self-service for trainees remains **admin-assisted** (prevents admission-number takeover).

---

## 13. Configuration and deployment

### 13.1 Required Worker runtime secrets

| Variable | Purpose |
|---|---|
| `SUPABASE_ANON_KEY` | Staff GoTrue login |
| `SUPABASE_SERVICE_ROLE_KEY` | Server DB / Storage |
| `SESSION_SECRET` | Signs session JWTs |

### 13.2 Non-secret vars (`wrangler.jsonc`)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL |
| `ALLOWED_ORIGINS` | CORS allow-list (plus same origin) |
| `ENVIRONMENT` | Label in `/api/health` |

### 13.3 Optional

| Variable | Purpose |
|---|---|
| `ALLOW_STUDENT_SELF_REGISTER` | Public trainee registration |
| `PRIVATE_STORAGE` | Prefer signed storage URLs |
| `VITE_API_BASE_URL` | Leave empty for same-origin |
| `VITE_LEGACY_ORIGIN` | Optional Flask for Excel / biometric device |
| `BIOMETRIC_DEVICE_SECRET` | Device host only |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions deploy |

### 13.4 Deploy (Cloudflare)

1. Apply `supabase_schema.sql` + migrations on Supabase; create storage buckets.  
2. Set Worker **runtime** secrets on `academic-management-system254`.  
3. From repo root: `npm run deploy` (or CI `.github/workflows/deploy.yml`).  
4. Verify `GET /api/health` → `ready: true`.  

Local:

```bash
cp workers/.dev.vars.example workers/.dev.vars
npm run check
npm run dev
```

**Do not** deploy `frontend/wrangler.jsonc` or `workers/wrangler.toml`.

---

## 14. Operational workflows (summary)

### Trainee journey

1. Account created by Dept Admin / Super Admin (or optional self-register).  
2. Login with admission number + password.  
3. May be forced to change temporary password.  
4. Use portal for attendance, assessments, exams, POE, attachment, clearance.  

### Teaching journey

1. Dept Admin assigns trainers to class/units.  
2. Trainer marks attendance (manual; biometric device optional host).  
3. Trainer enters formative marks / reviews assessments.  
4. Summative competence entered via `/summative`.  
5. Exam bookings: student → dept approval → examination officer confirmation.  

### Clearance journey

1. Eligible trainee starts clearance.  
2. Approvers act (academic + service desks).  
3. Certificate issued; public verify by serial.  

### Attachment journey

1. Placement period opened by liaison / admin.  
2. Trainee applies + uploads acceptance letter.  
3. Mentors approve logbook and competencies.  
4. GPS/logbook recorded; liaison grades.  

---

## 15. Error pages and UX notes

| Code | SPA | Notes |
|---|---|---|
| 403 | `ErrorPage` | Wrong role / forbidden |
| 404 | `ErrorPage` | Missing route |
| 401 | Session cleared | Redirect toward login |

Login branding: split hero, staff vs trainee tabs. Authenticated `/` redirects to role home; guests see public landing.

---

## 16. Related documents in the repository

| Document | Content |
|---|---|
| `README.md` | Quick start, roles overview |
| `CLOUDFLARE.md` | Workers Builds / secrets cheat sheet |
| `DEPLOYMENT.md` | Full Cloudflare deploy guide |
| `MIGRATION_INVENTORY.md` | Flask → Workers inventory and blockers |
| `frontend/README.md` | SPA notes |
| Migration `*.sql` files | Database change scripts |

This **SYSTEM_DOCUMENTATION.md** is the consolidated reference for architecture, roles, modules, data, security, and deployment.

---

## 17. Glossary

| Term | Meaning |
|---|---|
| AMS | Academic Management System |
| TTTI | Thika Technical Training Institute |
| Trainee / Student | Learner role (`student`) |
| POE | Portfolio of Evidence |
| CDACC | Curriculum Development, Assessment and Certification Council (TVET) |
| RLS | Row Level Security (PostgreSQL/Supabase) |
| JWT | JSON Web Token (Worker session and/or Supabase Auth) |
| SPA | Single Page Application (`frontend/`) |
| NYC / CRNM | Not Yet Competent / Course Requirement Not Met |
| Worker Assets | Cloudflare static SPA hosting on the same Worker as the API |

---

## 18. Document maintenance

When the system changes, update this file for:

1. New roles or portal prefixes  
2. New migrations (add to §10.3)  
3. SPA/API capability changes (update §8 / §11)  
4. New required secrets/vars (update §13)  
5. Security policy changes (update §12)  

**Owners:** Development team maintaining the TTTI AMS GitHub repository and Cloudflare/Supabase deployments.
