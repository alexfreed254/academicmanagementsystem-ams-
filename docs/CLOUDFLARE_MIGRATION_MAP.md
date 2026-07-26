# Cloudflare Migration Map — TTTI Academic Management System

**Phase:** 2 in progress — Hono Worker restored + SPA Bearer wiring  
**Date:** 2026-07-26  
**Status:** Worker `/api/v1` running locally (`wrangler dev` :8787). Flask retained.

---

## 1. Absolute rule (restated)

Keep the existing system’s behavior, UI, roles, workflows, database, auth, and storage exactly as they are.  
Change only the backend runtime/hosting layer so the API can run on Cloudflare Workers (Hono).

This document maps **what exists today** → **what the equivalent Hono API must provide**.  
It does **not** redesign, simplify, or rebuild the product.

---

## 2. Current architecture (as found)

```
Browser
  │
  ├─ React + Vite SPA (`frontend/`) ── Axios (credentials) ──► Flask `/api/v1/*`
  │     (partial: auth + trainer + student core screens)
  │
  └─ Legacy Jinja2 portals (`templates/`) ───────────────────► Flask HTML routes
         │
         ▼
Render (Gunicorn → Flask `app.py`)
  │
  ├── Supabase Auth (staff JWT)
  ├── Supabase PostgreSQL + RLS
  └── Supabase Storage
```

| Layer | Current technology | Must preserve |
|---|---|---|
| Frontend SPA | React 18, Vite 6, TypeScript, React Router 6, Tailwind 4, Framer Motion, Axios, TanStack Query | Yes — do not rebuild |
| Legacy UI | Flask Jinja2 templates + static JS/CSS | Behavior + design until each screen has a verified API equivalent |
| Backend | Python Flask on Render (`gunicorn app:app`) | Source of truth for business logic during migration |
| Auth | Supabase Auth (staff) + `user_profiles.password_hash` (students) + Flask session cookies | Same login rules and roles |
| Database | Supabase PostgreSQL + RLS | Unchanged schema/data/RLS |
| Storage | Supabase Storage buckets | Same buckets/paths/rules |
| Hosting (today) | Render web service (`render.yaml`) | Keep until Hono is fully verified |

**Worker status:** `workers/` Hono API has been restored and is the Phase 2 target. **Flask remains** as reference/fallback and for Jinja / PDF / Excel / biometric until fully verified.

---

## 3. Repository inventory

### 3.1 Flask entry & core modules

| Path | Role |
|---|---|
| `app.py` | Flask app, CORS, CSRF, session cookies, blueprint registration, template globals |
| `db.py` | Supabase clients: anon / service-role / user-JWT |
| `auth_utils.py` | Login, session, RBAC decorators, audit log, password rules |
| `security_utils.py` | Profile sanitization, upload allow-list, production checks |
| `notifications.py` | In-app notifications CRUD + domain notify helpers |
| `grading_utils.py` | CDACC grade codes/labels |
| `stats_utils.py` | Count helpers used by dashboards |
| `report_utils.py` | PDF/Excel letterhead & export helpers (ReportLab / openpyxl) |
| `academic_result_transcript.py` | Result slip / transcript PDF logic |
| `exam_booking_form1a.py` | Exam booking PDF Form 1A |
| `unit_attendance_register.py` | Attendance register PDF |
| `extensions.py` | Flask-Limiter + CSRF |
| `requirements.txt` | Python deps (Flask, supabase, reportlab, openpyxl, …) |
| `render.yaml` / `Procfile` | Render deploy |

### 3.2 Flask blueprints (`routes/`)

| Blueprint file | URL prefix | Approx. surface |
|---|---|---|
| `api_v1.py` | `/api/v1` | **JSON API for React SPA** (16 endpoints) |
| `auth.py` | `/auth` | Login/logout/forgot/change-password/register/profile (HTML) |
| `main.py` | `/` | Landing + course apply |
| `super_admin.py` | `/super-admin` | Full system admin |
| `dept_admin.py` | `/dept-admin` | Department admin |
| `trainer.py` | `/trainer` | Trainer portal (HTML) |
| `student.py` | `/student` | Student portal (HTML) |
| `examination_officer.py` | `/examination-officer` | Exam officer |
| `industry_mentor.py` | `/industry-mentor` | Industry mentor |
| `internal_verifier.py` | `/internal-verifier` | Internal verifier |
| `liaison_officer.py` | `/liaison-officer` | Liaison / attachment |
| `cdacc_verifier.py` | `/cdacc-verifier` | CDACC verifier |
| `workshop_technician.py` | `/workshop-technician` | Workshop inventory |
| `admin_oversight.py` | `/admin-oversight` | Registrar / DP / QA |
| `service_dept.py` | `/service-dept` | Service dept + lost items |
| `clearance.py` | `/clearance` | Multi-stage clearance |
| `notifications.py` | `/notifications` | Notification HTML/JSON helpers |
| `biometric_attendance.py` | `/biometric` | Biometric UI + device API |
| `academic_trips.py` | `/academic-trips` | Trip reports + media |
| `summative.py` | `/summative` | Summative competence + exports |
| `attachment_helpers.py` | (helpers) | Shared attachment storage helpers |

**Route count (decorators):** ~**326** Flask routes across all blueprints.

### 3.3 React frontend (`frontend/`)

| Area | Status in working tree |
|---|---|
| Stack | React 18 + Vite + TS + Tailwind 4 + Framer Motion + Axios + TanStack Query |
| API client | `src/lib/apiClient.ts` → `VITE_API_BASE_URL`, `withCredentials: true`, CSRF header, optional Bearer |
| Auth API | `src/api/auth.ts` → `/api/v1/auth/*` |
| Student API | `src/api/student.ts` → dashboard, attendance, units, marks |
| Trainer API | `src/api/trainer.ts` → dashboard, marks-entry, assessments, attendance |
| Implemented pages | Login; Trainer: dashboard, attendance, assessments, marks-entry; Student: dashboard, attendance, units, marks |
| Placeholders | Many student/trainer secondary routes use `FeaturePlaceholder` → legacy Flask path |
| External nav links | Biometric, summative, trips, clearance, profile, notifications still point at Flask HTML |
| Other role portals in SPA | **Not present** in working tree (git shows previously deleted pages for dept_admin, super_admin, etc.) |

**Frontend env**

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API origin (empty locally; Vite proxies `/api` → Flask `:5000`) |
| `VITE_SOCKET_URL` | Optional Socket.IO (not required for core Flask flows) |
| `VITE_LEGACY_ORIGIN` | Documented for not-yet-migrated Flask pages |

### 3.4 Database & storage (unchanged)

**Core tables** (from `supabase_schema.sql` + migration SQL files):  
`departments`, `courses`, `classes`, `units`, `user_profiles`, `class_units`, `trainer_units`, `enrollments`, `attendance`, `class_events`, `formative_assessments`, `formative_marks`, `assessments`, `evidence`, `employers`, `employer_verifications`, `job_postings`, `job_applications`, `system_logs`, `notifications`, `exam_bookings`, `marks`, `trainer_documents`, `trainee_documents`, `student_personal_documents`, `companies`, `mentors`, `industrial_attachments`, `location_logs`, `digital_logbook`, `competency_tracking`, clearance tables, admission/application tables, `employment_tracking`, `employment_projects`, plus migrations: `academic_trips`, `academic_trip_media`, `biometric_*`, `workshop_inventory`, `summative_competences`, `attachment_*`, `mentoring_tool_uploads`, `dept_notices`, `clearance_lost_items`, etc.

**Storage buckets in use**

| Bucket | Used for |
|---|---|
| `assessment-scripts` | POE scripts, trainer docs, attachment letters |
| `assessment-evidence` | Evidence photos/videos, profile docs, logbook media |
| `application-documents` | Public course applications |
| `trip-media` | Academic trip media |
| Mentoring uploads | Mentoring tool files (bucket constant in student routes) |

Optional: `PRIVATE_STORAGE=true` → signed URLs instead of public object URLs.

**Do not change schema, drop tables, reset data, or disable RLS** unless Phase 2+ explicitly requires a justified stop-and-explain.

---

## 4. Roles & authorization (preserve exactly)

Defined in `auth_utils.py`:

| Role | Typical home |
|---|---|
| `super_admin` | `/super-admin` |
| `dept_admin` | `/dept-admin` |
| `trainer` | `/trainer` |
| `student` | `/student` |
| `examination_officer` | `/examination-officer` |
| `industry_mentor` | `/industry-mentor` |
| `internal_verifier` | `/internal-verifier` |
| `liaison_officer` | `/liaison-officer` |
| `cdacc_verifier` | `/cdacc-verifier` |
| `workshop_technician` | `/workshop-technician` |
| `registrar` | `/admin-oversight/registrar` |
| `deputy_principal` | `/admin-oversight/deputy-principal` |
| `quality_assurance_officer` | `/admin-oversight/quality-assurance` |
| `library_hod` / `sports_hod` / `service_clearance_officer` | `/service-dept` |
| `environment_hod` / `dean_students` / `finance_officer` | `/clearance/approver` |
| `employer` | Employer flows (verified flag required) |

**Auth behavior to preserve**

1. **Staff login:** email + password → Supabase Auth `sign_in_with_password`; profile from `user_profiles`; inactive blocked; employers must be verified.
2. **Student login:** admission number + `password_hash` check (Werkzeug) in `user_profiles` — **not** Supabase Auth password.
3. **Session today:** Flask server session cookie (`sb_user`, `sb_access_token`, `sb_refresh_token`); SPA sends cookies (`withCredentials`).
4. **RBAC:** `@login_required` / `@role_required` / per-role decorators **and** Supabase RLS.
5. **Service role:** `get_service_client()` used server-side for many admin/ops queries (bypasses RLS) — Worker must keep this secret and still enforce Python-equivalent authorization in Hono.
6. **Audit:** `write_audit_log` → `system_logs`.
7. **must_change_password:** blocks protected routes until password changed.

---

## 5. Environment variables

### Flask / Worker secrets (never expose to React)

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Flask session/CSRF signing (Workers: session/JWT secret strategy) |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Anon key (RLS-honouring client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — **Worker secret only** |
| `SPA_ORIGINS` | Allowed CORS origins for `/api/*` |
| `SPA_CROSS_SITE` | Cross-site cookie SameSite=None |
| `SESSION_COOKIE_SECURE` | Secure cookie flag |
| `PRIVATE_STORAGE` | Prefer signed Storage URLs |
| `ALLOW_STUDENT_SELF_REGISTER` | Gate trainee self-registration |
| `SETUP_PROFILE_TOKEN` | One-time super-admin bootstrap |
| `BIOMETRIC_DEVICE_SECRET` | Device scan/enroll shared secret |
| `FLASK_ENV` / production detection | Security mode |

### Frontend public

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Point at Cloudflare Worker origin in production |
| `VITE_SOCKET_URL` | Optional |
| `VITE_LEGACY_ORIGIN` | Flask origin while dual-running |

---

## 6. Mapping format

Each row:

```text
Existing Frontend Page
→ Existing API Call
→ Existing Flask Route
→ Existing Python Function
→ Existing Database / Storage Operation
→ New Hono Endpoint
→ Migration Status
```

**Status values used below**

| Status | Meaning |
|---|---|
| `SPA_WIRED` | React already calls this JSON API |
| `JSON_READY` | Exists as `/api/v1` — port first to Hono |
| `HTML_ONLY` | Jinja/HTML + form posts — need JSON equivalent for SPA (or keep Flask until ported) |
| `DEVICE_API` | Hardware callback (shared secret) |
| `NOT_STARTED` | No Hono implementation yet |
| `BLOCKED` | Needs Phase 2 decision (auth session model on Workers) |

---

## 7. Priority map — React SPA ↔ `/api/v1` (Phase 2 first wave)

These are the **only** endpoints the current React SPA calls. Porting them to Hono with identical request/response shapes keeps the existing frontend working with a base-URL change only.

| Existing Frontend Page | Existing API Call | Existing Flask Route | Existing Python Function | Existing DB / Storage Operation | New Hono Endpoint | Migration Status |
|---|---|---|---|---|---|---|
| `/login` (staff) | `POST /api/v1/auth/login` `{login_type:staff,email,password}` | `api_v1.api_login` | `authenticate_staff` → session | `user_profiles` select; Supabase Auth sign-in; `system_logs` insert | `POST /api/v1/auth/login` | `JSON_READY` / `SPA_WIRED` / `NOT_STARTED` (Hono) |
| `/login` (student) | `POST /api/v1/auth/login` `{login_type:student,admission_no,password}` | `api_v1.api_login` | `authenticate_student` → session | `user_profiles` by admission_no + password_hash | `POST /api/v1/auth/login` | same |
| Auth bootstrap | `GET /api/v1/auth/me` | `api_v1.api_me` | `current_user` | session profile | `GET /api/v1/auth/me` | same |
| Logout | `POST /api/v1/auth/logout` | `api_v1.api_logout` | clear session + audit | `system_logs` | `POST /api/v1/auth/logout` | same |
| CSRF bootstrap | `GET /api/v1/csrf-token` | `api_v1.api_csrf_token` | `generate_csrf` | N/A (Flask-WTF) | `GET /api/v1/csrf-token` (or Workers CSRF equivalent) | `SPA_WIRED` / `BLOCKED` (adapt CSRF for Workers) |
| Trainer dashboard notifications | `GET /api/v1/notifications/recent` | `api_v1.api_notifications_recent` | `get_user_notifications`, `get_unread_count` | `notifications` | `GET /api/v1/notifications/recent` | `SPA_WIRED` |
| (available) | `GET /api/v1/notifications/count` | `api_v1.api_notifications_count` | `get_unread_count` | `notifications` | `GET /api/v1/notifications/count` | `JSON_READY` |
| `/trainer/dashboard` | `GET /api/v1/trainer/dashboard` | `api_v1.api_trainer_dashboard` | `_trainer_assigned_unit_ids`, stats helpers | `assessments`, `attendance`, `units`, `academic_trips`, `clearance_approvals` | `GET /api/v1/trainer/dashboard` | `SPA_WIRED` |
| `/trainer/marks-entry` | `GET /api/v1/trainer/marks-entry` | `api_v1.api_trainer_marks_entry` | `_marks_class_unit_data`, `_load_assessments_and_marks` | `class_units`, `classes`, `units`, `enrollments`, `formative_assessments`, `formative_marks` | `GET /api/v1/trainer/marks-entry` | `SPA_WIRED` |
| Marks save | `POST /api/v1/trainer/marks-entry/save-mark` | `api_v1.api_trainer_save_mark` | ownership check + upsert/delete | `formative_assessments`, `formative_marks` | `POST /api/v1/trainer/marks-entry/save-mark` | `SPA_WIRED` |
| Add assessment | `POST /api/v1/trainer/marks-entry/add-assessment` | `api_v1.api_trainer_add_assessment` | `_trainer_owns_class_unit` + insert | `formative_assessments` + audit | `POST /api/v1/trainer/marks-entry/add-assessment` | `SPA_WIRED` |
| `/trainer/assessments` | `GET /api/v1/trainer/assessments` | `api_v1.api_trainer_assessments` | `_trainer_assigned_unit_ids`, `_bulk_formative_marks_for_poe` | `assessments` (+ joins) | `GET /api/v1/trainer/assessments` | `SPA_WIRED` |
| POE review | `POST /api/v1/trainer/assessments/:id/review` | `api_v1.api_trainer_review_assessment` | `_check_unit_access`, `_rename_script_file` | `assessments` update; Storage rename on `assessment-scripts` / evidence | `POST /api/v1/trainer/assessments/:id/review` | `SPA_WIRED` |
| `/trainer/attendance` | `GET /api/v1/trainer/attendance` | `api_v1.api_trainer_attendance_get` | class/unit/student load | `class_units`, `classes`, `enrollments`, `attendance`, `class_events` | `GET /api/v1/trainer/attendance` | `SPA_WIRED` |
| Submit attendance | `POST /api/v1/trainer/attendance/submit` | `api_v1.api_trainer_attendance_submit` | assignment + enrollment checks | `attendance` insert; audit | `POST /api/v1/trainer/attendance/submit` | `SPA_WIRED` |
| `/student/dashboard` | `GET /api/v1/student/dashboard` | `api_v1.api_student_dashboard` | student aggregates | `assessments`, `attendance`, `clearance_requests`, `industrial_attachments`, `digital_logbook`, `competency_tracking`, `notifications` | `GET /api/v1/student/dashboard` | `SPA_WIRED` |
| `/student/attendance` | `GET /api/v1/student/attendance` | `api_v1.api_student_attendance` | list + % | `attendance` | `GET /api/v1/student/attendance` | `SPA_WIRED` |
| `/student/units` | `GET /api/v1/student/units` | `api_v1.api_student_units` | enrollments → class_units → attendance | `enrollments`, `class_units`, `units`, `attendance` | `GET /api/v1/student/units` | `SPA_WIRED` |
| `/student/marks` | `GET /api/v1/student/marks` | `api_v1.api_student_marks` | formative marks matrix | `user_profiles`, `enrollments`, `formative_assessments`, `formative_marks`, `units` | `GET /api/v1/student/marks` | `SPA_WIRED` |

**Frontend change for this wave (Phase 3, after Worker exists):** set `VITE_API_BASE_URL` to the Worker URL. Do **not** rewrite pages.

---

## 8. Full Flask surface map (by module)

For every HTML-only route, the Hono endpoint should expose the **same business rules** as the Python handler. Proposed path convention: keep `/api/v1/...` mirroring the existing portal path where practical (as already done for trainer/student).

### 8.1 Auth (`routes/auth.py` → prefix `/auth`)

| Existing Frontend / UI | Existing Call Pattern | Flask Route | Python | DB / Storage | New Hono Endpoint | Status |
|---|---|---|---|---|---|---|
| Jinja login | Form POST | `GET|POST /auth/login` | login handlers | Auth + `user_profiles` | Prefer SPA: existing `/api/v1/auth/login` | `HTML_ONLY` (legacy) + `JSON_READY` (API) |
| Logout | GET | `/auth/logout` | logout | session clear + audit | `POST /api/v1/auth/logout` | `JSON_READY` |
| Forgot password | Form | `/auth/forgot-password` | reset flow | Supabase Auth reset | `POST /api/v1/auth/forgot-password` | `HTML_ONLY` / `NOT_STARTED` |
| Change password | Form | `/auth/change-password` | password update | Auth or hash update | `POST /api/v1/auth/change-password` | `HTML_ONLY` / `NOT_STARTED` |
| Student register | Form | `/auth/student/register` | `create_student_auth_user` | `user_profiles` (+ flag gate) | `POST /api/v1/auth/student/register` | `HTML_ONLY` / `NOT_STARTED` |
| Profile | Form + upload | `/auth/profile` | profile update | `user_profiles`; Storage `assessment-evidence` | `GET|PATCH /api/v1/auth/profile` | `HTML_ONLY` / `NOT_STARTED` |

### 8.2 Main / public (`routes/main.py`)

| UI | Call | Flask | Python | DB / Storage | New Hono | Status |
|---|---|---|---|---|---|---|
| Landing | GET `/` | `main.index` | render | — | Public Pages (SPA) or static | `HTML_ONLY` |
| Apply | GET\|POST `/apply` | apply | insert application + files | `course_applications`; bucket `application-documents` | `GET|POST /api/v1/public/apply` | `HTML_ONLY` / `NOT_STARTED` |

### 8.3 Student HTML (`routes/student.py` → `/student`) — not yet in SPA API

| Existing UI (Jinja / SPA placeholder) | Flask Route | Key Python / ops | DB / Storage | Proposed Hono | Status |
|---|---|---|---|---|---|
| Dashboard | `/student/dashboard` | dashboard aggregates | assessments, attendance, … | **Already** `GET /api/v1/student/dashboard` | `SPA_WIRED` |
| Profile | `/student/profile` | GET\|POST | `user_profiles` + photo upload | `GET|PATCH /api/v1/student/profile` | `HTML_ONLY` |
| Documents | `/student/documents` | upload personal docs | `student_personal_documents` + Storage | `GET|POST /api/v1/student/documents` | `HTML_ONLY` |
| Assessments list/upload/delete/evidence | `/student/assessments*` | POE upload/review evidence | `assessments`, `evidence`; scripts/evidence buckets | `/api/v1/student/assessments...` | `HTML_ONLY` |
| Attendance / units / unit detail / PDF | `/student/attendance`, `/units`, `/unit-detail`, `/unit-report-pdf` | attendance + PDF | `attendance`, enrollments; ReportLab | partial API done; PDF still HTML | Mixed |
| Marks + result slip | `/student/marks`, `/marks/download-result-slip` | marks + PDF | formative_*; transcript utils | marks API done; PDF `NOT_STARTED` | Mixed |
| Exam bookings | `/student/exam-bookings*` | book/submit/download/delete | `exam_bookings` + PDF Form1A | `/api/v1/student/exam-bookings...` | `HTML_ONLY` |
| Portfolio | `/student/portfolio*` | upload/delete | trainer/student docs + Storage | `/api/v1/student/portfolio...` | `HTML_ONLY` |
| Industrial attachment | `/student/industrial-attachment*` | request/delete/check-in/out | `industrial_attachments`, `location_logs` + Storage letter | `/api/v1/student/industrial-attachment...` | `HTML_ONLY` |
| Logbook | `/student/logbook*` | add entries + media | `digital_logbook` + evidence bucket | `/api/v1/student/logbook...` | `HTML_ONLY` |
| Employment | `/student/employment-*` | status/projects | `employment_tracking`, `employment_projects` | `/api/v1/student/employment...` | `HTML_ONLY` |
| Attachment marks / mentoring tool | `/student/attachment-marks`, `/mentoring-tool*` | view/upload | attachment grades; mentoring uploads + Storage | `/api/v1/student/...` | `HTML_ONLY` |
| Summative view | `/student/summative` | student summative | `summative_competences` | `/api/v1/student/summative` | `HTML_ONLY` |

### 8.4 Trainer HTML (`routes/trainer.py` → `/trainer`)

| UI | Flask | Ops | Proposed Hono | Status |
|---|---|---|---|---|
| Dashboard / attendance / assessments / marks-entry core | HTML + **mirrored in api_v1** | see §7 | keep `/api/v1/trainer/...` | `SPA_WIRED` for core |
| Attendance history / correct / weekly export / session PDF / unit PDF | `/trainer/attendance-history`, `/view-session`, correct, exports | `attendance`; Excel/PDF | `/api/v1/trainer/attendance-history...` + download routes | `HTML_ONLY` |
| Marks delete assessment / marks PDF / Excel / import | `/trainer/marks-entry/*`, `/marks-import*` | formative_*; openpyxl | `/api/v1/trainer/marks-entry/...` | `HTML_ONLY` (beyond SPA) |
| Portfolio upload/view/delete | `/trainer/portfolio*` | `trainer_documents` + Storage | `/api/v1/trainer/portfolio...` | `HTML_ONLY` |
| Assessment delete (HTML) | `/trainer/assessment/:id/delete` | assessments + Storage cleanup | `/api/v1/trainer/assessments/:id` DELETE | `HTML_ONLY` |

### 8.5 Super Admin (`routes/super_admin.py` → `/super-admin`)

Large HTML surface (~40+ routes): dashboard/live, departments, users CRUD, credentials, classes, units, courses, logs, attendance (+ PDF), assessments, marks, clearances, service-clearance, companies, attachments, logbooks, GIS tracking (+ export), notices, class-list/PDF, trainee-search/report, assessment-sheet/PDF, exam-bookings (approve/reject/batch/export/PDF), trainees-documents verify, trainer POE/docs, import, biometric scanners CRUD, attachment-marks, mentoring-tools, setup-profile.

| Pattern | Flask examples | DB | Proposed Hono pattern | Status |
|---|---|---|---|---|
| Dashboard | `/super-admin/dashboard`, `/dashboard/live` | multi-table counts | `GET /api/v1/super-admin/dashboard` | `HTML_ONLY` / `NOT_STARTED` |
| CRUD catalogs | departments, users, classes, units, courses | respective tables | `/api/v1/super-admin/{resource}` | `HTML_ONLY` |
| Reports/PDF/Excel | many `*-pdf`, `export` | ReportLab/openpyxl | `/api/v1/super-admin/.../export` | `HTML_ONLY` |
| Exam bookings admin | approve/reject/batch | `exam_bookings` | `/api/v1/super-admin/exam-bookings...` | `HTML_ONLY` |
| Biometric scanners | register/update/delete | `biometric_scanners` | `/api/v1/super-admin/biometric-scanners...` | `HTML_ONLY` |
| Setup bootstrap | `/setup-profile` | token-gated | keep guarded; Worker secret | `HTML_ONLY` |

### 8.6 Department Admin (`routes/dept_admin.py` → `/dept-admin`)

Dashboard/live, courses/classes/units/trainers/students, assign units, attendance (+ PDFs), assessments, exam-bookings, marks (+ PDF), trainer/trainee documents & verify, class-list, trainee-search, assessment-sheet, credentials, import, companies CRUD, applications review, logbooks, attachments review, GIS + export, notices, fingerprint registration (enroll status/device), attachment-marks, mentoring-tools.

| Status | `HTML_ONLY` / `NOT_STARTED` for all → proposed `/api/v1/dept-admin/...` mirroring paths |

### 8.7 Examination Officer

| UI | Flask | Ops | Proposed Hono | Status |
|---|---|---|---|---|
| Dashboard | `/examination-officer/dashboard` | booking stats | `GET /api/v1/examination-officer/dashboard` | `HTML_ONLY` |
| Exam bookings confirm/view | `/exam-bookings*` | `exam_bookings` | `/api/v1/examination-officer/exam-bookings...` | `HTML_ONLY` |
| Marks + PDF | `/marks`, `/marks/download-pdf` | marks tables + PDF | `/api/v1/examination-officer/marks...` | `HTML_ONLY` |

### 8.8 Industry Mentor

Dashboard, logbook approve/reject, competency assess, trainees, location, weekly attendance mark → tables `digital_logbook`, `competency_tracking`, `industrial_attachments`, `attachment_weekly_attendance`, `location_logs`.  
Proposed: `/api/v1/industry-mentor/...` — `HTML_ONLY` / `NOT_STARTED`.

### 8.9 Internal Verifier

Dashboard, competency verify, attachments view, reports → `competency_tracking`, attachments.  
Proposed: `/api/v1/internal-verifier/...` — `HTML_ONLY` / `NOT_STARTED`.

### 8.10 Liaison Officer

Dashboard, attachments review/assign/approve, companies, logbooks, export, periods, grade, attachment-marks, mentoring-tools → attachment_* tables, companies, logbooks.  
Proposed: `/api/v1/liaison-officer/...` — `HTML_ONLY` / `NOT_STARTED`.

### 8.11 CDACC Verifier

Dashboard, assessments verify, trainer-documents, filter-options, marks, trainee-poe, trainees, attachment-marks, mentoring-tools, digital-logbook.  
Proposed: `/api/v1/cdacc-verifier/...` — `HTML_ONLY` / `NOT_STARTED`.

### 8.12 Workshop Technician

Dashboard, inventory GET|POST, clearances → `workshop_inventory`, clearance.  
Proposed: `/api/v1/workshop-technician/...` — `HTML_ONLY` / `NOT_STARTED`.

### 8.13 Admin Oversight

Registrar / Deputy Principal / Quality Assurance dashboards + clearances/reports/approvals (mostly read-only).  
Proposed: `/api/v1/admin-oversight/...` — `HTML_ONLY` / `NOT_STARTED`.

### 8.14 Service Department

Dashboard + lost-items add/remove → `clearance_lost_items` / service clearance.  
Proposed: `/api/v1/service-dept/...` — `HTML_ONLY` / `NOT_STARTED`.

### 8.15 Clearance (`routes/clearance.py` → `/clearance`)

Initiate, stop, service-dept, approver queue, approve/reject, return-correction, resubmit, waive-trainer, certificate (+ PDF), verify, clearance-form, issue-certificate, manage-trainers.

| DB | `clearance_requests`, `clearance_approvals`, `clearance_stages`, `clearance_departments`, … |
| Proposed | `/api/v1/clearance/...` |
| Status | `HTML_ONLY` / `NOT_STARTED` |

### 8.16 Notifications (`routes/notifications.py`)

HTML list + mark read/delete/count/recent. Partial JSON already under `/api/v1/notifications/*`.  
Remaining: `/api/v1/notifications/:id/read`, mark-all-read, delete — `NOT_STARTED`.

### 8.17 Biometric (`routes/biometric_attendance.py`)

| UI / Device | Flask | Auth | DB | Proposed Hono | Status |
|---|---|---|---|---|---|
| Session UI | `/biometric/`, `/:id`, status, mark, save, cancel | trainer session | `biometric_sessions`, `attendance` | `/api/v1/biometric/...` | `HTML_ONLY` |
| Device scan | `POST /biometric/api/scan` | `BIOMETRIC_DEVICE_SECRET` (CSRF exempt) | sessions / attendance | `POST /api/v1/biometric/device/scan` | `DEVICE_API` |
| Device enroll | `POST /biometric/api/enroll` | device secret | fingerprint registration | `POST /api/v1/biometric/device/enroll` | `DEVICE_API` |

### 8.18 Academic Trips (`/academic-trips`)

List/detail/upload/add-media/delete media/review/delete + `GET /api/classes/:department_id`.  
DB: `academic_trips`, `academic_trip_media`; Storage: `trip-media`.  
Proposed: `/api/v1/academic-trips/...` — `HTML_ONLY` / `NOT_STARTED`.

### 8.19 Summative (`/summative`)

Entry/save/analysis/reports, Excel/PDF exports, graduation list exports, `GET /api/units/:class_id`.  
DB: `summative_competences` (+ enrollments/units).  
Proposed: `/api/v1/summative/...` — `HTML_ONLY` / `NOT_STARTED`.  
**Workers note:** PDF/Excel generation must be re-implemented with Workers-compatible libraries or deferred to a compatible approach — **behavior must match**, not drop exports.

---

## 9. Shared services to port (not routes)

| Python module | Responsibility | Hono target |
|---|---|---|
| `db.py` | Supabase clients | `worker/src/lib/supabase.ts` (anon + service; user JWT when needed) |
| `auth_utils.py` | Auth + RBAC + audit | `middleware/auth.ts`, `services/auth.ts` |
| `security_utils.py` | Upload validation, safe redirects | `lib/security.ts` |
| `notifications.py` | Notification helpers | `services/notifications.ts` |
| `stats_utils.py` | Dashboard counts | `lib/stats.ts` |
| `grading_utils.py` | CDACC grades | `lib/grading.ts` |
| `report_utils.py` + PDF modules | PDF/Excel | `services/reports/` (Workers-compatible) |
| `routes/trainer.py` helpers | `_trainer_assigned_unit_ids`, ownership, POE rename | shared trainer service used by HTML logic + api_v1 |
| `routes/attachment_helpers.py` | Attachment storage helpers | `services/attachments.ts` |

---

## 10. Target Cloudflare architecture (after migration)

```
React + Vite (Cloudflare Pages)
        │  Axios / Fetch (same client)
        ▼
Hono API (Cloudflare Workers)  ←── secrets: SUPABASE_*, JWT/session, BIOMETRIC_*, …
        │
        ├── Supabase Auth
        ├── Supabase PostgreSQL (+ RLS preserved)
        └── Supabase Storage
```

**CORS:** allow configured Pages origin(s) only (map of today’s `SPA_ORIGINS`). Do not use `*` for credentialed production unless explicitly justified.

**Do not delete Flask** until all mapped APIs are verified in production.

---

## 11. Critical migration decisions (need approval before Phase 2 coding)

These are **not** product redesigns; they are hosting constraints that must be resolved while preserving behavior:

1. **Session model on Workers**  
   Today: Flask signed cookie session + optional Bearer stub.  
   Workers need an equivalent (e.g. encrypted cookie session, or Supabase JWT for staff + custom student token) that keeps SPA `withCredentials` / auth UX working.

2. **CSRF**  
   SPA depends on `/api/v1/csrf-token` + `X-CSRFToken`. Replicate or replace with an equally safe Workers pattern without changing frontend UX more than necessary.

3. **Student auth**  
   Students use `password_hash` in DB, not Supabase Auth. Hono must keep this exact rule.

4. **Service-role usage**  
   Much of Flask uses `get_service_client()` then enforces RBAC in Python. Hono must do the same (RBAC in Worker + keep RLS enabled; do not expose service key to the browser).

5. **PDF / Excel / large uploads**  
   ReportLab/openpyxl/Pillow and up to 25 MB bodies must have Workers-compatible equivalents (or approved Durable Object / R2 / Pages Function approach) **without dropping features**.

6. **Biometric device endpoints**  
   Shared-secret device APIs must remain reachable and CSRF-exempt equivalent.

7. **Dual-run period**  
   Keep Render Flask as fallback; point SPA `VITE_API_BASE_URL` at Worker only after §7 endpoints pass tests.

8. **SPA completeness**  
   Working-tree React covers **trainer + student core** only. Full system still relies on Jinja. Migrating “all modules” means either (a) Hono JSON for every Flask capability while SPA grows, or (b) temporarily serving legacy UI until each portal is wired — **without changing design**. Phase 2 should start with §7 only unless directed otherwise.

---

## 12. Recommended Phase 2 order (after approval)

1. Scaffold `worker/` (Hono + Wrangler) with env/secrets, CORS, health check — **no Flask deletion**.
2. Port auth + CSRF/session strategy preserving login/logout/me.
3. Port remaining §7 `/api/v1` endpoints (notifications, trainer, student) with parity tests against Flask responses.
4. Point local Vite proxy / `VITE_API_BASE_URL` at Worker; regression-test existing SPA pages.
5. Module-by-module: student HTML leftovers → trainer leftovers → clearance → attachment → admin portals → biometric → summative/trips/exports.
6. Deploy Pages + Workers; keep Flask until checklist complete.

---

## 13. Success checklist (from migration brief)

- [ ] Existing React frontend still used  
- [ ] Existing Vite / TypeScript / React Router / Tailwind / Framer Motion / Axios preserved  
- [ ] Existing UI design unchanged  
- [ ] Flask business logic understood and mirrored in Hono  
- [ ] Supabase PostgreSQL / Auth / Storage / RLS unchanged  
- [ ] Roles, permissions, workflows, data preserved  
- [ ] No secrets in frontend  
- [ ] Frontend on Cloudflare Pages  
- [ ] API on Cloudflare Workers  
- [ ] Production verification complete  
- [ ] Flask retained until verification complete  

**Phase 1 complete:** this map only. **No application code was modified for Phase 1.**

---

## 14. Phase 2 progress (2026-07-26)

| Item | Status |
|---|---|
| Restore `workers/` Hono + Wrangler project | Done |
| Auth (staff Supabase Auth + student Werkzeug hash + Bearer JWT) | Done |
| CSRF placeholder for SPA compatibility | Done |
| Notifications `/api/v1/notifications/*` | Done |
| Trainer SPA endpoints (dashboard, marks-entry, assessments, attendance) | Done |
| Student SPA endpoints (dashboard, attendance, units, marks) | Done |
| Typecheck (`npm run check`) | Pass |
| Local health (`GET /api/health`) | Pass |
| Minimal SPA auth wiring (`setAccessToken`, Bearer default) | Done |
| Vite proxy default → Worker `:8787` | Done |
| Flask backend deleted | **No — retained** |
| Database / RLS / Storage changed | **No** |
| UI redesign | **No** |

### Local dual-run

```text
frontend (Vite :5173) ──/api──► workers (wrangler :8787) ──► Supabase
Flask (:5000) still available via VITE_DEV_PROXY + VITE_AUTH_MODE=cookie
```

### Next (Phase 2 continued / Phase 3–4)

1. Deploy Worker secrets + `wrangler deploy`
2. Point Pages `VITE_API_BASE_URL` at Worker
3. End-to-end login + trainer/student dashboard tests against live Supabase
4. Continue porting remaining HTML-only modules; keep Flask until verified
