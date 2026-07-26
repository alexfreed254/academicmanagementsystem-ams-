# Migration Map — Academic Management System

**Phase:** 1 — Full project audit (read-only)  
**Date:** 2026-07-26  
**Rule:** This document is the source of truth for Phase 2+. Do not delete Jinja templates or Python business logic until the mapped Worker + SPA path is verified.

---

## 0. Architecture (approved target)

```
Browser
  → Cloudflare Pages / Worker Assets (React + Vite SPA)
  → Hono API on Cloudflare Workers (/api/v1/*)
  → Supabase Auth + PostgreSQL + Storage
```

| Layer | Current Cloudflare path | Legacy (reference only) |
|-------|-------------------------|-------------------------|
| UI | `frontend/` React SPA | `templates/` Jinja (design + logic reference) |
| API | `workers/` Hono | `routes/*.py` Flask |
| DB/Auth/Storage | Supabase | Same Supabase project |
| PDF (ReportLab) | Browser print `/print/*` subset | Flask until replaced |
| Excel (openpyxl) | Not on Workers | Flask until client-side or Queue |
| Biometric device API | Stub SPA | Keep Flask device host |

**Critical UI rule:** Existing Jinja dashboards are the visual source of truth. SPA pages must reproduce layout, sidebar, colors, forms, tables, and workflows — not generic placeholders.

---

## 1. Inventory counts

| Asset | Count |
|-------|------:|
| Jinja templates (`templates/**/*.html`) | 209 |
| Flask route modules (`routes/*.py`) | 22 |
| Flask route handlers (approx., all blueprints) | ~319 |
| Worker HTTP handlers (`workers/src/routes`) | ~241 |
| SPA `<Route>` entries (`AppRouter.tsx`) | ~100+ (incl. redirects) |
| Roles (`STAFF_ROLES` + `student`) | 20 |

---

## 2. Role inventory (verified)

From `auth_utils.py` / `workers/src/types.ts`:

| Role | Home path | Flask blueprint | SPA portal |
|------|-----------|-----------------|------------|
| `super_admin` | `/super-admin` | `super_admin` | Yes |
| `dept_admin` | `/dept-admin` | `dept_admin` | Yes |
| `trainer` | `/trainer` | `trainer` | Yes |
| `student` | `/student` | `student` | Yes |
| `examination_officer` | `/examination-officer` | `examination_officer` | Yes |
| `industry_mentor` | `/industry-mentor` | `industry_mentor` | Yes |
| `internal_verifier` | `/internal-verifier` | `internal_verifier` | Yes |
| `liaison_officer` | `/liaison-officer` | `liaison_officer` | Yes |
| `cdacc_verifier` | `/cdacc-verifier` | `cdacc_verifier` | Yes |
| `workshop_technician` | `/workshop-technician` | `workshop_technician` | Yes |
| `registrar` | `/admin-oversight/registrar` | `admin_oversight` | Yes |
| `deputy_principal` | `/admin-oversight/deputy-principal` | `admin_oversight` | Yes |
| `quality_assurance_officer` | `/admin-oversight/quality-assurance` | `admin_oversight` | Yes |
| `library_hod` | `/service-dept` | `service_dept` | Yes |
| `sports_hod` | `/service-dept` | `service_dept` | Yes |
| `service_clearance_officer` | `/service-dept` / clearance | `service_dept` + `clearance` | Yes |
| `environment_hod` | `/clearance/approver` | `clearance` | Yes |
| `dean_students` | `/clearance/approver` | `clearance` | Yes |
| `finance_officer` | `/clearance/approver` | `clearance` | Yes |
| `employer` | — | **None** | **None** (vestigial in STAFF_ROLES) |

Shared modules (not role homes): `auth`, `main`, `notifications`, `academic_trips`, `summative`, `biometric`, `clearance`, `api_v1`.

---

## 3. Status legend

| Status | Meaning |
|--------|---------|
| **DONE** | Dedicated SPA page + Worker API covering core Jinja workflow |
| **PARTIAL** | Routed SPA exists but is thinner than Jinja (ApiTable shell, missing mutations, or incomplete UX) |
| **MISSING** | No usable SPA/Worker parity |
| **PDF-ONLY** | ReportLab / binary PDF — keep Flask or browser-print subset |
| **EXCEL-ONLY** | openpyxl — keep Flask or port later |
| **BIOMETRIC** | Device API / in-memory sessions — keep Flask host |
| **LEGACY-OK** | Layout chrome only (`base.html`, partials) |
| **N/A** | Redirect / utility / public verify |

---

## 4. Template folder inventory (209)

| Folder | Files | Notes |
|--------|------:|-------|
| `super_admin/` | 40 | Admin CRUD + reports + biometric scanners |
| `dept_admin/` | 35 | Department-scoped admin |
| `student/` | 25–28 | Trainee portal (primary migration focus) |
| `trainer/` | 17–18 | Trainer portal |
| `cdacc_verifier/` | 11 | External verifier |
| `liaison_officer/` | 10–11 | Industrial liaison |
| `admin_oversight/` | 9 | Registrar / DP / QA |
| `industry_mentor/` | 8 | Mentor portal |
| `summative/` | 8 | Summative hub (+ partials) |
| `clearance/` | 7 | Multi-role clearance |
| `examination_officer/` | 7 | Exam office |
| `internal_verifier/` | 7 | IV portal |
| `auth/` | 5 | Login / profile / register |
| `main/` | 5 | Public site |
| `academic_trips/` | 4 | Trips |
| `errors/` | 4 | 400–500 |
| `partials/` | 4 | Shared includes |
| `workshop_technician/` | 4 | Workshop |
| `service_dept/` | 2 | Lost & found / service |
| `notifications/` | 1 | Inbox |
| `shared/` | 1 | Unit attendance PDF |

---

## 5. Student portal map (priority)

| Old template | Flask route | Flask function | SPA route | Worker API | Status |
|--------------|-------------|----------------|-----------|------------|--------|
| `student/dashboard_enhanced.html` | GET `/student/dashboard` | `dashboard` | `/student/dashboard` | GET `/api/v1/student/dashboard` | **DONE** |
| `student/units.html` | GET `/student/units` | `my_units` | `/student/units` | GET `/student/units` | **DONE** |
| `student/attendance.html` | GET `/student/attendance` | `attendance` | `/student/attendance` | GET `/student/attendance` | **DONE** |
| `student/marks.html` | GET `/student/marks` | `marks` | `/student/marks` | GET `/student/marks` | **PARTIAL** (PDF slip → legacy) |
| `student/unit_report_pdf.html` | GET `/student/unit-report-pdf` | `unit_report_pdf` | `/student/unit-report/print` | GET `/print/student-unit-report` | **PARTIAL** |
| `student/exam_booking_new.html` | GET `/student/exam-booking-form` | `exam_booking_form` | `/student/exam-booking-form` | GET form + POST `/student/exam-bookings` | **DONE** (Form 1A UX) |
| `student/exam_bookings.html` | GET `/student/exam-bookings` | `exam_bookings` | `/student/exam-bookings` | GET `/student/exam-bookings` | **DONE** (grouped list) |
| — | POST `/student/exam-booking-submit` | `exam_booking_submit` | (form submit) | POST `/student/exam-bookings` | **DONE** |
| — | GET `/student/exam-bookings/<id>/download` | `download_exam_booking` | Print button | Browser print | **PARTIAL** (ReportLab PDF still Flask) |
| `student/my_documents.html` | GET\|POST `/student/documents` | `my_documents` | `/student/documents` | GET docs + POST profile/upload | **DONE** |
| `student/industrial_attachment.html` | GET `/student/industrial-attachment` | `industrial_attachment` | `/student/industrial-attachment` | GET + request/delete/check-in/out | **DONE** |
| — | POST `/student/industrial-attachment/request` | `request_attachment` | (form) | POST `/student/industrial-attachment/request` | **DONE** |
| — | POST `/student/check-in` / `check-out` | `check_in` / `check_out` | (GPS UI) | POST `/student/check-in` / `check-out` | **DONE** |
| `student/logbook.html` | GET `/student/logbook` | `logbook` | `/student/logbook` | GET + POST `/student/logbook` | **DONE** |
| `student/assessments.html` | GET `/student/assessments` | `assessments` | `/student/assessments` | GET `/student/assessments` | **PARTIAL** (ApiTable) |
| `student/upload_assessment.html` | GET\|POST upload | `upload_assessment` | `/student/assessments/upload` | POST upload | **PARTIAL** |
| `student/add_evidence.html` | GET\|POST evidence | `add_evidence` | `/student/assessments/:id/evidence` | POST evidence | **PARTIAL** |
| `student/upload_poe.html` | GET\|POST POE | `upload_poe` / `poe_upload` | `/student/upload-poe` | POST upload-poe | **PARTIAL** |
| `student/portfolio.html` | GET `/student/portfolio` | `portfolio` | `/student/portfolio` | GET portfolio | **PARTIAL** |
| `student/portfolio_view.html` | GET `/student/portfolio-view` | `portfolio_view` | `/student/portfolio-view` | GET portfolio-view | **PARTIAL** |
| `student/unit_detail.html` | GET `/student/unit-detail` | `unit_detail` | `/student/units/:unitId` | GET `/student/units/:unit_id` | **PARTIAL** |
| `student/my_files.html` | GET `/student/my-files` | `my_files` | `/student/my-files` | GET my-files | **PARTIAL** |
| `student/summative.html` | GET `/student/summative` | `summative_competence` | `/student/summative` | GET summative | **PARTIAL** |
| `student/attachment_marks.html` | GET `/student/attachment-marks` | `my_attachment_marks` | `/student/attachment-marks` | GET | **PARTIAL** |
| `student/mentoring_tool.html` | GET\|POST mentoring | `mentoring_tool` | `/student/mentoring-tool` | GET (upload MISSING) | **PARTIAL** |
| `student/employment_status.html` | GET\|POST employment | `employment_status` | `/student/employment-status` | GET + POST | **PARTIAL** |
| `student/employment_projects.html` | GET\|POST projects | `employment_projects` | `/student/employment-projects` | GET + POST | **PARTIAL** |
| `student/profile.html` | GET\|POST `/student/profile` | `profile` | `/auth/profile` | GET/PATCH profile | **DONE** |
| `student/base.html` | — | — | `PortalShell` | — | **LEGACY-OK** |
| Clearance student | `/clearance/` | clearance_bp | `/clearance/` | GET + POST start | **PARTIAL** |

---

## 6. Trainer portal map

| Old template | Flask route | Function | SPA route | Worker API | Status |
|--------------|-------------|----------|-----------|------------|--------|
| `trainer/dashboard_enhanced.html` | GET `/trainer/dashboard` | `dashboard` | `/trainer/dashboard` | GET `/trainer/dashboard` | **DONE** |
| `trainer/attendance.html` | GET\|POST `/trainer/attendance` | `attendance` | `/trainer/attendance` | GET + POST submit | **DONE** |
| `trainer/assessments.html` | GET `/trainer/assessments` | `assessments` | `/trainer/assessments` | GET assessments | **DONE** |
| `trainer/review_assessment.html` | GET\|POST review | `review_assessment` | `/trainer/assessments/:id/review` | GET + POST review | **DONE** |
| `trainer/marks_entry.html` | GET marks-entry + POSTs | `marks_entry` / save / add | `/trainer/marks-entry` | GET + save/add | **DONE** |
| `trainer/attendance_history.html` | GET history | `attendance_history` | `/trainer/attendance-history` | GET history | **PARTIAL** |
| `trainer/view_session.html` | GET view-session | `view_session` | `/trainer/view-session` | GET view-session | **PARTIAL** |
| `trainer/portfolio.html` | GET\|POST portfolio | `portfolio` | `/trainer/portfolio` | GET (upload thin) | **PARTIAL** |
| `trainer/marks_import.html` | GET\|POST import | `marks_import` | `/trainer/marks-import` | GET stub | **EXCEL-ONLY** |
| `trainer/marks_pdf.html` | GET marks PDF | `marks_pdf` | `/trainer/marks/print` | GET `/print/trainer/marks` | **PARTIAL** |
| `trainer/session_pdf.html` | GET session-pdf | `session_pdf` | `/trainer/session/print` | GET `/print/session` | **PARTIAL** |
| `shared/unit_attendance_pdf.html` | GET unit-attendance-pdf | `unit_attendance_pdf` | `/trainer/attendance/print` | GET `/print/unit-attendance` | **PARTIAL** |
| `trainer/biometric_attendance.html` | `/biometric/` | biometric_bp | `/biometric/*` | — | **BIOMETRIC** |
| `trainer/biometric_session.html` | `/biometric/<sid>` | biometric_bp | `/biometric/*` | — | **BIOMETRIC** |
| Weekly Excel export | GET weekly-export | `attendance_weekly_export` | — | — | **EXCEL-ONLY** |

---

## 7. Super Admin / Dept Admin (condensed)

Both portals have rich Jinja UIs. SPA mostly uses `InteractiveTablePage` / `ApiTablePage` against Worker list + mutation endpoints.

| Area | Templates (examples) | Flask prefix | SPA prefix | Worker | Status |
|------|----------------------|--------------|------------|--------|--------|
| Dashboard | `welcome` / `dashboard_enhanced` | `/super-admin`, `/dept-admin` | same | GET `*/dashboard` | **PARTIAL** |
| Users / credentials | `users`, `edit_user`, `credentials` | CRUD | SPA CRUD | mutations + shared GET | **PARTIAL** |
| Structure | depts, courses, classes, units | CRUD | SPA tables | mutations | **PARTIAL** |
| Trainees / trainers | students, trainers, assign-units | CRUD | SPA | shared + mutations | **PARTIAL** |
| Exam bookings | `exam_bookings.html` | approve/reject/export | SPA Interactive | GET + approve/reject | **PARTIAL** (Excel export Flask) |
| Marks / attendance | marks, attendance, PDFs | list + PDF | SPA + print | GET + `/print/*` | **PARTIAL** |
| Documents / POE | trainees_documents, trainer_poe | verify | SPA detail | GET + some POST | **PARTIAL** |
| Attachments / GIS / logbooks | attachments, gis_tracking, logbooks | list + export | SPA tables | GET lists | **PARTIAL** (GIS export Excel Flask) |
| Notices | notices | send/delete | SPA | mutations | **PARTIAL** |
| Import | import.html | Excel import | SPA | GET returns empty | **EXCEL-ONLY** / **MISSING** |
| Biometric scanners | biometric_scanners | register/update | SPA | mutations | **PARTIAL** (device still BIOMETRIC) |
| Fingerprint enroll (dept) | fingerprint_registration | enroll API | SPA list | GET list | **BIOMETRIC** |
| System logs | system_logs | GET | SPA | GET logs | **PARTIAL** |

---

## 8. Other role portals (condensed)

| Role | Key templates | SPA | Worker | Status |
|------|---------------|-----|--------|--------|
| Examination officer | dashboard, exam_bookings, view_booking, marks | Yes | roles + confirm + print | **PARTIAL** |
| Industry mentor | dashboard, logbook, competency, trainees, location, weekly_attendance | Yes | roles + approve/reject | **PARTIAL** |
| Liaison officer | dashboard, periods, attachments, grade, companies, logbooks | Yes | roles + approve/grade | **PARTIAL** |
| CDACC verifier | dashboard, marks, trainees, POE, logbook, mentoring | Yes | roles GETs | **PARTIAL** |
| Internal verifier | dashboard, competency, attachments, reports | Yes | roles + verify | **PARTIAL** |
| Workshop technician | dashboard, inventory, clearances | Yes | inventory CRUD | **PARTIAL** |
| Service dept | dashboard | Yes | GET dashboard | **PARTIAL** |
| Registrar / DP / QA | admin_oversight/* | Yes | roles GETs | **PARTIAL** |
| Clearance (multi) | student/approver/service/certificate/verify | Yes | shared + approve/reject | **PARTIAL** |
| Summative | hub, entry, analysis, reports, graduation | Yes | overview + entry | **PARTIAL** (Excel/PDF Flask) |
| Academic trips | index, view, upload, add_media | Yes | CRUD + media | **PARTIAL** |
| Auth / public | login, apply, forgot, register | Yes | auth + public | **DONE** |
| Notifications | notifications/index | Yes | recent/count only | **MISSING** (full inbox/mark-all) |

---

## 9. Python → Worker backend map (modules)

| Python file | Purpose | New Worker home | Notes |
|-------------|---------|-----------------|-------|
| `routes/auth.py` | Login, logout, profile, register, change password | `workers/src/routes/auth.ts` | Student hash + staff GoTrue |
| `routes/api_v1.py` | Early JSON SPA API (18 endpoints) | Merged into trainer/student/auth | Superseded |
| `routes/student.py` | Trainee portal | `student.ts` + `mutations.ts` | Core DONE; some deletes/PDF left |
| `routes/trainer.py` | Trainer portal | `trainer.ts` + mutations | Core DONE; Excel/biometric left |
| `routes/super_admin.py` | Institute admin | `admin.ts` + `shared.ts` + mutations | List/CRUD PARTIAL |
| `routes/dept_admin.py` | Department admin | `shared.ts` + `roles.ts` + mutations | Dept isolation required |
| `routes/examination_officer.py` | Exam office | `roles.ts` | Confirm DONE; PDF PARTIAL |
| `routes/liaison_officer.py` | Placement | `roles.ts` + mutations | Grade/approve PARTIAL |
| `routes/industry_mentor.py` | Mentor | `roles.ts` + mutations | Approve logbook DONE |
| `routes/cdacc_verifier.py` | CDACC | `roles.ts` | Mostly GET |
| `routes/internal_verifier.py` | IV | `roles.ts` | Verify PARTIAL |
| `routes/clearance.py` | Clearance workflow | `shared.ts` + mutations | Multi-stage PARTIAL |
| `routes/admin_oversight.py` | Registrar/DP/QA | `roles.ts` | Read PARTIAL |
| `routes/workshop_technician.py` | Inventory | `roles.ts` + mutations | CRUD PARTIAL |
| `routes/service_dept.py` | Lost items | `roles.ts` | PARTIAL |
| `routes/academic_trips.py` | Trips | mutations + shared | PARTIAL |
| `routes/summative.py` | Summative/graduation | mutations + print | PARTIAL |
| `routes/biometric.py` | Device scan/enroll | — | **Keep Flask** |
| `routes/notifications.py` | Inbox | `notifications.ts` | **MISSING** full API |
| `routes/attachment_helpers.py` | Placement helpers | `workers/src/lib/attachmentHelpers.ts` | Ported subset |
| `auth_utils.py` | Roles, session | `middleware/auth.ts`, `types.ts` | Must stay identical |
| `db.py` / Supabase client | DB access | `lib/supabase.ts` | Service role on Worker only |
| ReportLab helpers | PDFs | `print.ts` + React print | Binary PDF still Flask |
| openpyxl helpers | Excel | — | Still Flask |

---

## 10. Cannot run on Workers (explicit)

| Capability | Flask location | Cloudflare strategy |
|------------|----------------|---------------------|
| ReportLab PDFs | Many `*_pdf` routes | Browser print first; optional PDF service later; keep Flask PDF host until cutover |
| openpyxl Excel | Marks import/export, GIS, exam export, summative | Client XLSX later or Flask until ported |
| Biometric scan/enroll sessions | `routes/biometric.py` | Durable Objects later OR keep Flask device host |
| Local filesystem uploads | Legacy paths | Supabase Storage only |
| Flask-Limiter memory | Login rate limit | Cloudflare WAF / Worker middleware |

---

## 11. Asset / design inventory

| Asset | Location | SPA reuse |
|-------|----------|-----------|
| Logo | `frontend/public/THIKATTILOGO.jpg`, `ttti-logo.jpg` | In use |
| Coat of arms | `frontend/public/KENYACOATOFARMS.png` | In use |
| Portal CSS / theme | `frontend/src` CSS + Tailwind | PortalShell mirrors Jinja base |
| Jinja CSS/JS | `static/` + inline `{% block extra_style %}` | Ported per-page CSS for Form 1A, documents, bookings, attachment, logbook |
| Fonts | Inter / Poppins in SPA | Match Jinja portals |
| Nav structure | Each `templates/*/base.html` | `frontend/src/config/navigation.ts` |

**Design rule for Phase 4:** When upgrading a PARTIAL page, copy structure from the matching Jinja template (sections, labels, tables, banners) before inventing new UI.

---

## 12. API response convention (current Workers)

Workers currently use Flask-compatible envelopes:

```json
{ "ok": true, "data": { } }
```

```json
{ "ok": false, "error": "Human-readable error", "code": "OPTIONAL" }
```

Phase 2+ may add aliases (`success` / `message`) without breaking existing SPA clients.

---

## 13. Phase plan (do not skip)

### Phase 1 — Audit ✅ (this document)
- [x] Template inventory
- [x] Flask route inventory
- [x] Role inventory
- [x] SPA / Worker parity status
- [x] Migration map written to `docs/MIGRATION_MAP.md`

### Phase 2 — Migration map maintenance
- Keep this file updated as each row moves PARTIAL → DONE
- Do not delete Python/Jinja until row is DONE and tested

### Phase 3 — Backend (Hono) — module order
1. Notifications inbox (MISSING gap)
2. Student remaining stubs (mentoring upload, attachment marks UX, deletes)
3. Trainer portfolio upload + attendance correction
4. Clearance multi-stage parity
5. Dept/Super admin Interactive fidelity (still ApiTable-heavy)
6. Exam officer / liaison / mentor / CDACC / IV mutation gaps
7. Summative Excel/PDF strategy
8. Biometric host decision (Flask retain vs DO)

### Phase 4 — Frontend (preserve Jinja design)
1. Replace each ApiTablePage with template-faithful page (role by role)
2. Student first → trainer → clearance → admin → others
3. Pixel-close CSS from Jinja `extra_style` blocks

### Phase 5 — Testing
- Every role login + home redirect
- Every nav item loads real data
- Permissions enforced on Worker
- No secrets in frontend
- Deploy: Pages + Worker Assets + secrets

---

## 14. Cutover blockers (honest)

1. **Biometric** still requires Flask (or future Durable Objects).
2. **ReportLab / openpyxl** still require Flask or browser replacements.
3. Many staff portals are **PARTIAL table shells** — not pixel-faithful Jinja yet.
4. **Notifications** SPA expects endpoints Workers do not fully implement.
5. Do **not** cut production DNS until student + trainer + clearance critical paths are DONE and staff PARTIAL accepted or finished.

---

## 15. Related docs

| File | Role |
|------|------|
| `MIGRATION_INVENTORY.md` | Earlier inventory (some sections stale vs current SPA) |
| `docs/MIGRATION_MAP.md` | **This file — living migration map** |
| `DEPLOYMENT.md` / `CLOUDFLARE_BUILDS.md` | Deploy commands |
| `ACADEMIC_TRIPS_IMPLEMENTATION.md` | Trips module notes |

---

## 16. Verification checklist (Phase 1)

- [x] Every template folder identified (209 HTML files)
- [x] Every major Flask blueprint mapped
- [x] Roles verified from code (not invented)
- [x] Student/trainer status matrix complete
- [x] Worker vs Flask gaps called out (PDF/Excel/biometric/notifications)
- [x] No application code deleted in Phase 1
- [x] No Jinja templates deleted in Phase 1

**Next step when Phase 2/3 authorized:** implement notifications Worker routes, then continue template-faithful ports of remaining student PARTIAL pages (attachment marks, mentoring tool, employment), then trainer portfolio — without redesigning dashboards.
