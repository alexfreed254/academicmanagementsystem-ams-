# TTTI AMS — Cloudflare Migration Inventory

**Status:** Inventory complete. **Phase 1 in progress** (Workers API scaffold + existing `/api/v1` endpoints + Pages wiring).  
**Date:** 2026-07-26  
**Architecture decisions (approved by default on proceed):** Pages + separate API Worker · Flask kept for biometric · browser-print PDFs / Flask for Excel.  
**Rule:** Do not change business rules without documenting. Do not cut over production until parity gates pass.

Canonical inventory for the Cloudflare migration. Update this file in place when the surface changes. Do not invent parallel inventory docs.

**Source of truth (unchanged by Cloudflare hosting):**

| Concern | Authoritative location |
|---|---|
| Design / UI | `templates/` (+ `static/`) |
| System functionality | `routes/` (+ `app.py`, `auth_utils.py`, `db.py`, …) |

Cloudflare Containers run this Flask app unmodified. React under `frontend/` is optional (`/spa`), not a silent replacement of Jinja portals.

Sources inspected: `app.py`, all `routes/*.py`, `auth_utils.py`, `db.py`, `security_utils.py`, `notifications.py`, PDF/Excel helpers, `supabase_schema.sql` + `*_migration.sql`, `frontend/` SPA, `README.md`, `SYSTEM_DOCUMENTATION.md`, `render.yaml`.

---

## 0. Current working tree vs prior Cloudflare work

| Fact | Detail |
|---|---|
| **Current production stack** | Flask + Gunicorn on **Render** (`render.yaml`, `Procfile`) |
| **Database / Auth / Storage** | Supabase (unchanged; remains in target architecture) |
| **UI** | Dual: **Jinja2 portals** (~209 HTML templates) + **partial React SPA** (`frontend/`) |
| **SPA API** | Flask `routes/api_v1.py` — **18** JSON endpoints under `/api/v1` |
| **Prior Workers/Pages code** | Present in git history (`workers/`, root `wrangler.jsonc`, expanded SPA) but **absent from the working tree** |
| **Inventory purpose** | Describe the **working Flask system** that must be preserved; define the Cloudflare target and phased port |

**Critical migration rule:** Preserve all working features. Port business logic endpoint-by-endpoint. Do not rewrite blindly. Do not cut over production until parity gates pass.

---

## 1. Source architecture (as running today)

```
Browsers
  ├── Jinja portals (templates/, ~209 HTML) ──► Flask HTML routes (~313 route handlers)
  └── React + Vite SPA (frontend/)           ──► Flask /api/v1/* (session cookie + CSRF)
                        │
                        ▼
              Render: gunicorn → Flask (app.py)
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
  Supabase Auth   Supabase Postgres   Supabase Storage
                  (+ RLS policies)
```

| Layer | Technology |
|---|---|
| Backend | Python · Flask 3 · Gunicorn · Flask-WTF CSRF · Flask-Limiter |
| Database | Supabase PostgreSQL + RLS |
| Auth | Staff: Supabase Auth (JWT). Students: `user_profiles.password_hash` (Werkzeug) |
| Storage | Supabase Storage buckets |
| Hosting | Render |
| Frontend (new) | React 18 + Vite + TypeScript + Tailwind 4 + Axios + React Router |
| Frontend (legacy) | Jinja2 + Tailwind CDN + static JS |
| PDF | ReportLab (+ some browser-print HTML templates) |
| Excel | openpyxl |

---

## 2. Target architecture (approved)

```
Users
  ↓
Cloudflare (DNS · SSL/TLS · CDN · WAF · DDoS · rate limiting)
  ↓
Cloudflare Pages  (React + Vite + TypeScript SPA)
  ↓ HTTPS /api/*
Cloudflare Workers  (Hono + TypeScript)
  ↓ service-role / anon keys as Worker secrets only
Supabase  (PostgreSQL + Auth + Storage + RLS)
```

**Constraints for Workers:**

- No CPython / ReportLab / openpyxl / Flask / Werkzeug in the Worker runtime.
- No in-process `threading.Lock` session maps (biometric live sessions).
- Service role key **never** in the browser.
- Roles always resolved server-side from `user_profiles` — never trust frontend role claims.
- Prefer same-origin API (`VITE_API_BASE_URL=""`) or explicit CORS allow-list for Pages origin.

---

## 3. Project structure inventory

### 3.1 Backend (Flask — keep until ported)

| Path | Role |
|---|---|
| `app.py` | App factory, CORS, CSRF, ProxyFix, blueprint registration, template globals |
| `db.py` | Supabase anon / service / user-JWT clients |
| `auth_utils.py` | Dual login, RBAC decorators, password reset, audit log helper |
| `security_utils.py` | Session-safe profile, upload validation, service-desk role map |
| `extensions.py` | Limiter + CSRFProtect |
| `notifications.py` | Create / recall / unread helpers |
| `grading_utils.py` | Grade calculation |
| `stats_utils.py` | Dashboard counters |
| `report_utils.py` | PDF letterhead / Excel signature blocks |
| `academic_result_transcript.py` | Transcript PDF builder |
| `exam_booking_form1a.py` | Exam booking PDF Form 1A |
| `unit_attendance_register.py` | Unit attendance PDF data |
| `routes/*.py` | All HTML + JSON route blueprints |
| `templates/` | ~209 Jinja pages (legacy UI source of truth for design) |
| `static/` | Assets / client JS for Jinja portals |
| `requirements.txt` | Python deps |
| `render.yaml` / `Procfile` | Current deploy |

### 3.2 Frontend (React SPA — expand; deploy to Pages)

| Path | Role |
|---|---|
| `frontend/src/lib/apiClient.ts` | Axios, CSRF, optional Bearer, credentials |
| `frontend/src/api/auth.ts` | `/api/v1/auth/*` |
| `frontend/src/api/trainer.ts` | Trainer dashboard / marks / assessments / attendance |
| `frontend/src/api/student.ts` | Student dashboard / attendance / units / marks |
| `frontend/src/providers/AuthProvider.tsx` | Session state |
| `frontend/src/routes/AppRouter.tsx` | Routes (trainer + student live; others placeholders) |
| `frontend/src/pages/trainer/*` | 4 live pages |
| `frontend/src/pages/student/*` | 4 live pages |
| `frontend/src/pages/shared/FeaturePlaceholder.tsx` | Points unfinished menus back to Flask paths |
| `frontend/vite.config.ts` | Dev proxy → Flask `:5000` |

### 3.3 Database / SQL

| Path | Role |
|---|---|
| `supabase_schema.sql` | Core tables, RLS, helpers |
| `*_migration.sql` | Incremental tables/columns (trips, biometric, clearance, workshop, etc.) |

---

## 4. Flask blueprint & route inventory

**Total route decorators counted:** ~313 across 19 blueprints (including `api_v1`).

| Blueprint | Prefix | ~Routes | Primary responsibilities |
|---|---|---|---|
| `main` | `/` | 2 | Landing, public course application + document upload |
| `auth` | `/auth` | 6 | Login, logout, forgot/change password, student register, profile |
| `api_v1` | `/api/v1` | 18 | SPA JSON contract (see §5) |
| `super_admin` | `/super-admin` | 53 | Institute-wide CRUD, oversight, PDFs/Excel, scanners, notices |
| `dept_admin` | `/dept-admin` | 63 | Dept CRUD, attendance, exams, attachment, fingerprint enrol, notices |
| `trainer` | `/trainer` | 25 | Attendance, POE review, marks entry/import, portfolio, PDFs/Excel |
| `student` | `/student` | 42 | Profile/docs, assessments, exams, marks, attachment, logbook, employment |
| `clearance` | `/clearance` | 17 | Multi-stage clearance, certificates, public verify |
| `examination_officer` | `/examination-officer` | 6 | Booking confirm, marks PDF |
| `industry_mentor` | `/industry-mentor` | 10 | Logbook, competency, weekly attendance, location |
| `internal_verifier` | `/internal-verifier` | 6 | Competency verify, attachment reports |
| `liaison_officer` | `/liaison-officer` | 15 | Attachment workflow, periods, grading, exports |
| `cdacc_verifier` | `/cdacc-verifier` | 13 | External CDACC verification views |
| `admin_oversight` | `/admin-oversight` | 8 | Registrar / DP / QA read-only (+ QA approvals) |
| `service_dept` | `/service-dept` | 3 | Service desk + lost items |
| `workshop_technician` | `/workshop-technician` | 3 | Inventory + clearances |
| `notifications` | `/notifications` | 7 | List / read / delete / counts |
| `biometric_attendance` | `/biometric` | 8 | Live sessions + device `/api/scan` + `/api/enroll` |
| `academic_trips` | `/academic-trips` | 8 | Trip CRUD, media, review |
| `summative` | `/summative` | 13 | Competence entry, analysis, Excel/PDF exports, graduation |

### 4.1 Full route list (by blueprint)

#### `main` (`/`)
- `GET /`
- `GET|POST /apply`

#### `auth` (`/auth`)
- `GET|POST /login`
- `GET /logout`
- `GET|POST /forgot-password`
- `GET|POST /change-password`
- `GET|POST /student/register`
- `GET|POST /profile`

#### `api_v1` (`/api/v1`) — see §5 for detail
- Auth: `csrf-token`, `auth/login`, `auth/logout`, `auth/me`
- Notifications: `notifications/recent`, `notifications/count`
- Trainer: `trainer/dashboard`, `marks-entry` (+ save/add), `assessments` (+ review), `attendance` (+ submit)
- Student: `student/dashboard`, `attendance`, `units`, `marks`

#### `super_admin` (`/super-admin`)
- Setup: `/setup-profile`
- Dashboards: `/`, `/dashboard`, `/dashboard/live`
- CRUD: `/departments`, `/users`, `/users/<id>/edit`, `/users/<id>/delete`, `/credentials`, `/classes`, `/units`, `/courses`
- Oversight: `/logs`, `/attendance`, `/assessments`, `/marks`, `/clearances`, `/service-clearance`, `/companies`, `/attachments`, `/logbooks`, `/gis-tracking`, `/gis-tracking/export`
- Notices: `/notices`, `/notices/send`, `/notices/<id>/delete`
- Reports: `/class-list`, `/class-list/pdf`, `/trainee-search`, `/trainee-report-pdf`, `/assessment-sheet`, `/assessment-sheet/pdf`, `/unit-attendance-pdf`
- Exams: `/exam-bookings`, approve/reject/batch-approve, `/export`, `/trainee/<id>/approved-pdf`
- Documents: `/trainees-documents`, verify; `/trainer-poe`, `/trainer-documents`, `/trainer-document-view/<id>`
- Import: `/import`
- Biometric scanners: list/register/update/delete
- Attachment marks + mentoring tools

#### `dept_admin` (`/dept-admin`)
- Dashboard/welcome; courses/classes/units/trainers/students; trainer-units/assign-units
- Attendance + PDFs; assessments; unit report download
- Exam bookings (approve/reject/batch/export/approved-pdf)
- Marks + PDF; trainer documents/view; trainee POE; trainee documents + verify
- Class list / trainee search / assessment sheet (+ PDFs)
- Credentials; import; companies CRUD; applications review
- Logbooks review; attachments review; GIS tracking + export
- Notices; fingerprint registration (assign/remove/enroll/status/cancel)
- Attachment marks; mentoring tools

#### `trainer` (`/trainer`)
- Dashboard; attendance (GET/POST); assessments; review/delete assessment
- Attendance history; view-session; correct record; weekly-export; session-pdf; unit-attendance-pdf
- Marks entry (+ add/delete/save assessment, marks-pdf, export-excel)
- Marks import (+ template + upload)
- Portfolio (+ upload/view/delete)

#### `student` (`/student`)
- Dashboard; profile; documents; assessments (+ upload/delete/evidence)
- My files; attendance; units; unit-detail; unit-report-pdf
- Portfolio-view; upload-poe; poe-upload; portfolio (+ upload/delete)
- Exam bookings (+ form/submit/download/delete)
- Marks; summative; download-result-slip
- Industrial attachment (+ request/delete); check-in/out; logbook (+ add)
- Employment status/projects; attachment-marks; mentoring-tool

#### `clearance` (`/clearance`)
- `/`, initiate, stop; service-dept; approver
- approve/reject/return-correction/resubmit/waive-trainer
- certificate (+ pdf); verify (+ serial); clearance-form; issue-certificate; manage-trainers

#### Other role portals
- **examination_officer:** dashboard, exam-bookings (+ confirm/view), marks (+ pdf)
- **industry_mentor:** dashboard, logbook approve/reject, competency assess, trainees, location, weekly-attendance (+ mark)
- **internal_verifier:** dashboard, competency verify, attachments/view, reports
- **liaison_officer:** dashboard, attachments (review/assign/approve/grade/export), companies, logbooks, periods, attachment-marks, mentoring-tools
- **cdacc_verifier:** dashboard, assessments verify, trainer-documents, filter-options, marks, trainee-poe, trainees detail, attachment-marks, mentoring-tools, digital-logbook
- **admin_oversight:** registrar (+ clearances), deputy-principal (+ academic/clearances), quality-assurance (+ reports/approvals)
- **service_dept:** `/`, lost-items add/remove
- **workshop_technician:** dashboard, inventory, clearances
- **notifications:** `/`, unread, read, mark-all-read, delete, count, recent
- **biometric:** `/`, session UI, status/mark/save/cancel, **device** `/api/scan`, `/api/enroll`
- **academic_trips:** list/detail/upload/add-media/delete-media/review/delete, `api/classes/<dept>`
- **summative:** entry/save/analysis/reports, Excel/PDF exports, graduation list (+ exports), `api/units/<class>`

---

## 5. JSON API surface used by the React SPA (today)

All under `/api/v1`. Auth uses **Flask session cookie** (`withCredentials: true`) + CSRF header for mutating methods. Optional `Authorization: Bearer` header is already read by the Axios client for future Workers JWT sessions.

| Method | Path | Roles | SPA consumer |
|---|---|---|---|
| GET | `/csrf-token` | public | `apiClient` |
| POST | `/auth/login` | public (rate-limited 8/min) | `auth.ts` |
| POST | `/auth/logout` | session | `auth.ts` |
| GET | `/auth/me` | session | `AuthProvider` |
| GET | `/notifications/recent` | session | `trainer.ts` |
| GET | `/notifications/count` | session | (available) |
| GET | `/trainer/dashboard` | trainer | Trainer dashboard |
| GET | `/trainer/marks-entry` | trainer | Marks entry |
| POST | `/trainer/marks-entry/save-mark` | trainer | Marks entry |
| POST | `/trainer/marks-entry/add-assessment` | trainer | Marks entry |
| GET | `/trainer/assessments` | trainer | Assessments |
| POST | `/trainer/assessments/<id>/review` | trainer | Assessments |
| GET | `/trainer/attendance` | trainer | Attendance |
| POST | `/trainer/attendance/submit` | trainer | Attendance |
| GET | `/student/dashboard` | student | Student dashboard |
| GET | `/student/attendance` | student | Student attendance |
| GET | `/student/units` | student | Student units |
| GET | `/student/marks` | student | Student marks |

**Gap:** Most Jinja features have **no** `/api/v1` equivalent yet. Cloudflare Workers must grow the JSON API to cover every portal feature that remains in production use (or keep a temporary Flask legacy origin for unported endpoints).

---

## 6. Database tables

### 6.1 Core (`supabase_schema.sql`)

departments, courses, classes, units, user_profiles, class_units, trainer_units, enrollments, attendance, class_events, formative_assessments, formative_marks, assessments, evidence, employers, employer_verifications, job_postings, job_applications, system_logs, notifications, exam_bookings, marks, trainer_documents, trainee_documents, student_personal_documents, companies, mentors, industrial_attachments, location_logs, digital_logbook, competency_tracking, clearance_departments, clearance_stages, clearance_requests, clearance_approvals, admission_requests, admission_documents, course_applications, employment_tracking, employment_projects.

### 6.2 Added by migrations

| Migration file | Tables / changes |
|---|---|
| `summative_competence_migration.sql` | `summative_competences` |
| `academic_trips_migration.sql` | `academic_trips`, `academic_trip_media` |
| `attachment_workflow_migration.sql` | `attachment_periods`, `attachment_period_eligibility`, `attachment_weekly_attendance`, `attachment_grading_config`, `attachment_grades`, `mentoring_tool_uploads` |
| `clearance_*_migration.sql` | Clearance stage/cancel/lost-items columns & `clearance_lost_items` |
| `biometric_*_migration.sql` | `biometric_scanners`, `biometric_sessions`, `user_profiles.biometric_id` |
| `workshop_inventory_migration.sql` | `workshop_inventory` |
| `dept_notices_migration.sql` | `dept_notices` |
| `new_roles_migration.sql` | Extra roles |
| `migration_student_documents.sql` | Student document fields |
| Other `*_migration.sql` | FK fixes, acceptance letter, trainer documents, notifications sender |

### 6.3 DB helpers / RLS

- Helpers: `set_updated_at`, `calculate_grade`, `set_grade`, `current_user_role()`, `current_user_dept()`, `current_user_active()`
- **RLS enabled** on core academic / auth / attachment / clearance-related tables (defence in depth)
- Flask/Workers typically use **service-role** for privileged ops and enforce RBAC in application code — **must continue** on Workers; do not expose service role to the browser

---

## 7. Authentication flows

| Actor | Identifier | Credential store | Current session | Workers target |
|---|---|---|---|---|
| Staff (19 roles in `STAFF_ROLES`) | email | Supabase Auth (GoTrue) | Flask session: profile + access/refresh JWT | Signed session JWT (Bearer) or HttpOnly cookie; refresh via GoTrue |
| Student | admission number | `user_profiles.password_hash` (Werkzeug pbkdf2/scrypt) | Flask session (no GoTrue JWT required) | Same Bearer/cookie session after server-side hash verify (WebCrypto / scrypt-js; **preserve hash format**) |
| Unverified employer | email | Supabase Auth | Blocked with sentinel `_unverified_employer` | Preserve rule |
| Biometric device | shared secret | `BIOMETRIC_DEVICE_SECRET` | CSRF-exempt device POSTs | See §11 — special case |

Additional rules to preserve:

- `is_active` must be true
- `must_change_password` blocks all routes except logout / me / csrf / change-password
- JWT refresh in `@app.before_request` for staff tokens
- Login rate limit: 8/min on `/api/v1/auth/login`
- Audit via `system_logs` (best-effort; never fail the request)

---

## 8. Authorization / RBAC

### 8.1 Roles (`auth_utils.ALL_ROLES`)

`super_admin`, `dept_admin`, `trainer`, `student`, `employer`, `examination_officer`, `industry_mentor`, `internal_verifier`, `sports_hod`, `environment_hod`, `dean_students`, `library_hod`, `finance_officer`, `registrar`, `deputy_principal`, `quality_assurance_officer`, `workshop_technician`, `liaison_officer`, `cdacc_verifier`, `service_clearance_officer`

### 8.2 Enforcement layers (must keep both)

1. **Application decorators** — `login_required`, `role_required`, `*_required`, `api_role_required`, `dept_isolation_check`
2. **Supabase RLS** — department / ownership policies

### 8.3 Scoping rules

| Rule | Behaviour |
|---|---|
| Department isolation | `super_admin` → any dept; others → own `department_id` |
| Trainer scope | Units/classes via `trainer_units` ∪ `class_units` |
| Student scope | Own rows only (attendance, marks, documents, attachment) |
| Service clearance desks | `SERVICE_DEPT_ROLES` category → role map in `security_utils.py` |
| QA / registrar / DP | Mostly read-only oversight; QA has approval routes |
| Never trust SPA role | Role always from server profile after auth |

---

## 9. Storage / file upload & download

### 9.1 Buckets in use

| Bucket | Used for |
|---|---|
| `assessment-scripts` | Assessment scripts, mentoring tool PDFs, some POE paths |
| `assessment-evidence` | Evidence photos/videos, passport/docs, logbook media |
| `application-documents` | Public course application uploads |
| `trip-media` | Academic trip photos/media |
| `documents` | Referenced in some dept_admin downloads (legacy path) |

Optional: `PRIVATE_STORAGE=true` → signed URLs via service client (`app.py` `storage_url`).

### 9.2 Upload operations (preserve validation)

- Max request body: 25 MB (`app.py`); typical upload helper cap: 5 MB (`security_utils.allowed_upload`)
- Allowed extensions (default): pdf, jpg, jpeg, png, webp (some flows allow video/audio for logbook)
- Upload sites: course apply, student assessments/evidence/POE/documents, trainer portfolio, trip media, mentoring tools, attachment acceptance letters, employment project files

Workers replacement: multipart or base64 → Supabase Storage REST with service role; same allow-lists and size caps.

---

## 10. PDF generation processes

| Generator | Used by | Workers note |
|---|---|---|
| ReportLab (`report_utils`, `academic_result_transcript`, `exam_booking_form1a`, dept/trainer/summative/clearance) | Binary PDF downloads | **Not runnable on Workers.** Options: (A) browser-print React pages, (B) keep temporary Flask PDF host, (C) later PDF Worker with WASM (not required for phase 1) |
| Jinja “print” HTML templates (`*_pdf.html`) | Class lists, marks, assessment sheets, graduation | Port to React print routes |
| Excel openpyxl | Marks export/import, exam booking export, GIS, summative, attachment exports | **Not on Workers** — browser CSV/XLSX client lib or legacy Flask until ported |

**Inventory of notable PDF/Excel endpoints:** trainer session/unit/marks PDFs + Excel; student unit-report / exam booking / result slip; dept_admin attendance matrix PDF + many report PDFs; super_admin GIS/attachment/exam exports; clearance certificate PDF; summative class/graduation PDF + Excel; liaison attachment export.

---

## 11. Biometric integration

| Piece | Detail |
|---|---|
| Device API | `POST /biometric/api/scan`, `POST /biometric/api/enroll` |
| Auth | Shared secret `BIOMETRIC_DEVICE_SECRET` (CSRF exempt) |
| Live sessions | **In-memory** `_sessions` dict + `threading.Lock` |
| Enrolment | In-memory `active_enrollment` shared with dept_admin fingerprint UI |
| Persistence | Attendance rows written on save; scanners in `biometric_scanners`; optional `biometric_sessions` table |
| SPA links | Trainer nav still points to Flask `/biometric/` as external |

**Cloudflare blocker:** Live device sessions are process-local. Workers are ephemeral/multi-isolate.  
**Phased approach:** Keep biometric device host on Flask (or Durable Objects / Durable KV later). Do not break scanners during SPA/API migration.

---

## 12. Payments

**None.** No M-Pesa, Stripe, Pesapal, or payment gateway. Exam fee language is a **manual checklist** on Form 1A only.

---

## 13. Background / scheduled tasks

| Kind | Present? | Notes |
|---|---|---|
| Celery / cron / APScheduler | **No** | |
| Socket.IO server | **No** (SPA has unused `useSocket.ts` client stub) | Do not require Workers WebSockets for MVP |
| Background threads | Audit log on logout / some API paths (`threading.Thread`) | Replace with `ctx.waitUntil()` on Workers |
| Biometric session GC | Implicit in-memory only | N/A on Workers until redesign |

---

## 14. External API integrations

| Integration | Status |
|---|---|
| Supabase PostgREST | Primary data plane |
| Supabase GoTrue Auth | Staff login / admin user create / password reset |
| Supabase Storage | Uploads / downloads / signed URLs |
| Maps / geocoding providers | **None** — GPS check-in uses client coordinates stored in `location_logs` |
| Email/SMS gateways | Forgot-password uses Supabase Auth email; no SendGrid/Twilio in app code |

---

## 15. Business logic modules (preserve behaviour)

| Domain | Key rules (summary) |
|---|---|
| Attendance | Class/unit/week/lesson sessions; trainer mark present/absent; history correction; weekly export; biometric save path |
| Formative marks | Oral/Practical/Theory assessments; max marks; grade helpers; import Excel |
| Summative | Competence NYC/C; analysis; graduation list |
| Assessments / POE | Student upload scripts+evidence; trainer approve/reject; CDACC verify |
| Exam bookings | Student Form 1A PDF; dept approve/reject; exam officer confirm |
| Clearance | Multi-stage approvals; service desks; certificate serial verify; trainer waive |
| Industrial attachment | Request + acceptance letter; liaison/dept approve; mentor logbook; GIS check-in/out; weekly attendance; grading; mentoring tool |
| Academic trips | Upload + media + dept review |
| Workshop inventory | Technician CRUD + clearance linkage |
| Notices | Dept/system broadcast → notifications rows; recall on delete |
| Users / credentials | Staff via GoTrue admin API; students via password_hash; temp password + must_change_password |
| Course applications | Public apply + document upload + dept review |

---

## 16. Frontend API / route coverage (React)

### 16.1 Implemented SPA pages

- Auth: Login
- Trainer: Dashboard, Attendance, Assessments, Marks Entry
- Student: Dashboard, Units, Attendance, Marks

### 16.2 Placeholder routes (still depend on Flask Jinja)

Most other trainer/student menu items + **all** other roles (super_admin, dept_admin, clearance, liaison, etc.) — `FeaturePlaceholder` or external links to Flask paths (`/biometric/`, `/summative/`, `/academic-trips`, `/auth/profile`, …).

### 16.3 Frontend env

```
VITE_API_BASE_URL=   # empty → same origin or Vite proxy in dev
VITE_SOCKET_URL=     # unused in production path
```

---

## 17. Environment variables & secrets

### 17.1 Flask / Render (current)

| Variable | Sensitivity | Purpose |
|---|---|---|
| `SECRET_KEY` | secret | Flask session / CSRF |
| `SUPABASE_URL` | config | Project URL |
| `SUPABASE_ANON_KEY` | restricted | GoTrue client / RLS client |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | Bypass RLS — server only |
| `BIOMETRIC_DEVICE_SECRET` | secret | Device POSTs |
| `SETUP_PROFILE_TOKEN` | secret | One-time super_admin bootstrap |
| `PRIVATE_STORAGE` | config | Signed URLs |
| `ALLOW_STUDENT_SELF_REGISTER` | config | Public student register gate |
| `SPA_ORIGINS` / `SPA_CROSS_SITE` / `SESSION_COOKIE_*` | config | Cross-site SPA cookies |
| `FLASK_ENV` / `PORT` / `RENDER` | config | Runtime |

### 17.2 Cloudflare Workers secrets (target)

| Secret / var | Notes |
|---|---|
| `SUPABASE_URL` | Plain var OK |
| `SUPABASE_ANON_KEY` | Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret — never to Pages |
| `SESSION_SECRET` | Secret — signs SPA session JWT (replaces Flask `SECRET_KEY` for API) |
| `BIOMETRIC_DEVICE_SECRET` | Only on biometric host (may stay Flask) |
| `ALLOW_STUDENT_SELF_REGISTER` | Optional flag |
| `PRIVATE_STORAGE` | Optional |
| Pages: `VITE_API_BASE_URL` | Build-time; prefer empty for same-origin reverse-proxy or set Worker URL |

---

## 18. Cloudflare configuration to create (when migration begins)

> **Do not create these until inventory approval.** Listed here for planning only.

| Artifact | Purpose |
|---|---|
| `workers/wrangler.toml` (or root `wrangler.toml`) | Workers project, `nodejs_compat`, routes `/api/*`, secrets bindings |
| Pages project (or Worker Assets) | Serve `frontend/dist` |
| Cloudflare DNS | Custom domain apex/www + `api.` if split |
| SSL/TLS | Full (strict) to origins if any; Cloudflare-managed certs |
| WAF + Rate limiting | Especially `/api/v1/auth/login`, device endpoints |
| GitHub Actions deploy | Build frontend + `wrangler deploy` |
| CORS | Same-origin preferred; else Pages origin allow-list + credentials |

**Recommended topology options:**

1. **Pages + separate API Worker** (matches user target diagram)  
2. **Single Worker with Assets** (SPA + `/api` same origin — simpler cookies/CORS)

Choose one before coding; document the choice in `DEPLOYMENT.md` (to be written in a later phase).

---

## 19. Migration blockers & compatibility matrix

| Item | Flask today | Cloudflare strategy |
|---|---|---|
| WSGI / Flask / Jinja | Full portals | Replace UI with React; replace API with Hono |
| Session cookie + CSRF | Working | Prefer Bearer JWT (or dual-support during cutover) |
| Werkzeug password hashes | Students | Verify with WebCrypto/scrypt-js — **do not rehash mass passwords** |
| ReportLab PDFs | Many downloads | Browser print first; optional legacy Flask PDF host |
| openpyxl Excel | Export/import | Client-side XLSX or legacy Flask |
| In-memory biometric sessions | Live device flow | Keep Flask device host **or** Durable Objects later |
| Flask-Limiter (memory) | Login rate limit | Cloudflare WAF rate rules + Worker middleware |
| `threading.Thread` audit | Fire-and-forget | `executionCtx.waitUntil()` |
| Service role key | Server only | Worker secret only |
| Dual UI during transition | Jinja + SPA | Keep Render Flask until SPA parity; cut DNS gradually |

---

## 20. Recommended phased migration plan (no code yet)

| Phase | Scope | Exit criteria |
|---|---|---|
| **0** | This inventory + architecture decision (Pages+Worker vs Assets) | Stakeholder sign-off |
| **1** | Scaffold Workers Hono + wrangler; port **existing 18** `/api/v1` endpoints only; deploy SPA to Pages against Worker | Trainer + student SPA works on Cloudflare without Flask for those APIs |
| **2** | Auth parity (login/logout/me/csrf/change-password/forgot/register) + notifications | No Flask session required for SPA |
| **3** | Port remaining trainer/student JSON APIs + React pages (remove placeholders) | Student/trainer fully off Jinja |
| **4** | Port admin / dept / clearance / attachment / summative / trips APIs + React | Role portals off Jinja |
| **5** | Reports: browser-print parity for critical PDFs | Staff can print without ReportLab for day-1 reports |
| **6** | Excel strategy (client or legacy) | Documented; marks import still works |
| **7** | Biometric: leave on Flask device host **or** redesign | Scanners uninterrupted |
| **8** | DNS cutover, WAF, monitoring, decommission Render | Rollback plan tested |

**Non-negotiables each phase:** no secret leakage; RBAC server-side; feature parity checklist; rollback to Render.

---

## 21. Explicit non-goals (this inventory phase)

- Do **not** delete Flask routes or templates yet  
- Do **not** change business rules silently  
- Do **not** expose `SUPABASE_SERVICE_ROLE_KEY` to Vite  
- Do **not** migrate everything in one PR  
- Do **not** break production Render until Cloudflare parity is proven  

---

## 22. Sign-off checklist (before coding)

- [x] Inventory reviewed against production usage  
- [x] Topology chosen: **Pages + separate API Worker**  
- [x] Biometric strategy chosen: **Keep Flask device host**  
- [x] PDF strategy chosen: **Browser print first; Flask temporarily for Excel**  
- [x] Excel strategy chosen: **Legacy Flask until client-side port**  
- [ ] Cutover / rollback owner assigned  
- [x] Phase 1 scaffold restored (`workers/`, Pages workflows, Bearer SPA wiring)

---

## 23. Phase 1–2 status (current)

| Deliverable | Status |
|---|---|
| **Root Cloudflare Containers layout** | `Dockerfile` + `wrangler.toml` + `src/index.ts` — React Assets + Flask Container, one Worker |
| Deploy guide | `CONTAINERS.md` (CLI order, CORS, limitations) |
| `workers/` Hono API | Optional alternate path (still in repo) |
| Bearer session JWT (`SESSION_SECRET`) | Hono path only |
| **Jinja `templates/` → React `frontend/src/pages/`** | **Done** |
| Frontend same-origin Flask cookies + CSRF | Done (for Containers layout) |
| Flask Jinja templates on disk | Kept inside Docker image for Flask HTML/static if proxied |
| Production DNS cutover | **Not started** |

Local smoke test:

```bash
cd workers && cp .dev.vars.example .dev.vars   # fill secrets
npm ci && npm run check && npx wrangler dev   # :8787
cd ../frontend && npm ci && npm run dev       # :5173 proxies /api → Worker
```

*End of inventory. Further phases expand the Worker API and React portals without deleting Flask until parity.*
