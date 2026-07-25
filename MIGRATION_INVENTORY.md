# TTTI AMS — Cloudflare Migration Inventory

Prepared before any code changes, per the migration rule. Sources: full read-only audits of the
Flask backend, the React SPA, and the SQL schema/migrations.

---

## 1. Current architecture

```
Browsers
  ├── Jinja portals (all 20 roles)  ──► Flask HTML routes (~230 routes, 20 blueprints)
  └── React + Vite SPA (frontend/)  ──► Flask /api/v1/* (JSON, session cookie)
                        │
                        ▼
        Render — gunicorn → Flask (app.py)
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
  Supabase Auth   Supabase Postgres   Supabase Storage
  (staff JWT)     (~55 tables + RLS)  (5 buckets)
```

## 2. Flask route inventory (summary)

| Blueprint | Prefix | Routes | Notes |
|---|---|---|---|
| `main` | `/` | 2 | Public landing + course application |
| `auth` | `/auth` | 6 | Dual login, logout, password, profile |
| `api_v1` | `/api/v1` | **20** | **JSON API consumed by the React SPA — the Workers migration target** |
| `super_admin` | `/super-admin` | ~45 | CRUD, oversight, PDFs, imports |
| `dept_admin` | `/dept-admin` | ~60 | Dept-scoped admin, PDFs, biometric enrol |
| `trainer` | `/trainer` | ~25 | Attendance, marks, POE, PDFs/Excel |
| `student` | `/student` | ~40 | Self-service, uploads, attachment, logbook |
| `clearance` | `/clearance` | ~15 | Multi-stage clearance + public verify |
| 12 other role blueprints | various | ~55 | Oversight, mentors, verifiers, services |

Full per-route detail lives in the audit transcripts; the `/api/v1` surface is reproduced 1:1 in
`workers/src/routes/`.

## 3. `/api/v1` endpoints (the SPA contract — migrated to Workers)

| Method | Path | Role |
|---|---|---|
| GET | `/api/v1/csrf-token` | public (legacy compatibility) |
| POST | `/api/v1/auth/login` | public (staff = Supabase Auth; student = password hash) |
| POST | `/api/v1/auth/logout` | any |
| GET | `/api/v1/auth/me` | any |
| GET | `/api/v1/notifications/recent` | authenticated |
| GET | `/api/v1/notifications/count` | authenticated |
| GET | `/api/v1/trainer/dashboard` | trainer |
| GET | `/api/v1/trainer/marks-entry` | trainer |
| POST | `/api/v1/trainer/marks-entry/save-mark` | trainer |
| POST | `/api/v1/trainer/marks-entry/add-assessment` | trainer |
| GET | `/api/v1/trainer/assessments` | trainer |
| POST | `/api/v1/trainer/assessments/:id/review` | trainer |
| GET | `/api/v1/trainer/attendance` | trainer |
| POST | `/api/v1/trainer/attendance/submit` | trainer |
| GET | `/api/v1/student/dashboard` | student |
| GET | `/api/v1/student/attendance` | student |
| GET | `/api/v1/student/units` | student |
| GET | `/api/v1/student/marks` | student |

## 4. Database tables (~55)

Core (`supabase_schema.sql`): departments, courses, classes, units, user_profiles, class_units,
trainer_units, enrollments, attendance, class_events, formative_assessments, formative_marks,
assessments, evidence, employers, employer_verifications, job_postings, job_applications,
system_logs, notifications, exam_bookings, marks, trainer_documents, trainee_documents,
student_personal_documents, companies, mentors, industrial_attachments, location_logs,
digital_logbook, competency_tracking, clearance_departments, clearance_stages, clearance_requests,
clearance_approvals, admission_requests, admission_documents, course_applications,
employment_tracking, employment_projects.

Migration SQL adds: summative_competences, academic_trips, academic_trip_media, attachment_periods,
attachment_period_eligibility, attachment_weekly_attendance, attachment_grading_config,
attachment_grades, mentoring_tool_uploads, clearance_lost_items, biometric_scanners,
biometric_sessions, workshop_inventory, dept_notices.

DB functions/triggers that must exist in the Supabase project: `set_updated_at`,
`update_updated_at_column`, `calculate_grade`, `set_grade`, `current_user_role()`,
`current_user_dept()`, `current_user_active()` + ~25 `updated_at` triggers.

## 5. Authentication flows

| Actor | Identifier | Credential store | Session (Flask today) | Session (Workers) |
|---|---|---|---|---|
| Staff (19 roles) | email | Supabase Auth (GoTrue) | Flask cookie + stored SB JWT pair | Signed HS256 session JWT (Bearer) |
| Student | admission number | Werkzeug hash in `user_profiles.password_hash` (pbkdf2/scrypt) | Flask cookie only | Signed HS256 session JWT (Bearer) |
| Biometric device | — | `BIOMETRIC_DEVICE_SECRET` shared secret | n/a | stays on legacy Flask |

`must_change_password` blocks all endpoints except logout/me/csrf until changed — preserved in
Workers middleware.

## 6. RBAC rules

- 20 roles (`auth_utils.py STAFF_ROLES` + `student`). Role checks are decorator-enforced per route.
- Department isolation: `dept_isolation_check` — super_admin any dept, others own dept only.
- Trainer scoping: assigned units = `trainer_units ∪ class_units` rows for the trainer.
- Service clearance desks: `SERVICE_DEPT_ROLES` category → role map.
- **Runtime reality:** nearly all Flask queries use the service-role key, so Supabase RLS is
  defined but bypassed; Python is the only enforcement layer. The Workers API keeps the same
  model (service key server-side only + code-level RBAC) and RLS remains defence-in-depth for
  any client that ever holds a user JWT.

## 7. Storage operations

Buckets: `assessment-scripts`, `assessment-evidence`, `application-documents`, `trip-media`,
`mentoring-tools`. Operations: upload, download+re-upload (rename flow), remove, public URL,
signed URL (1h, when `PRIVATE_STORAGE=true`). Upload validation: extension allow-list + 5 MB cap.
File upload endpoints are all on legacy Jinja routes (none in `/api/v1` yet).

## 8. PDF / Excel generation

ReportLab + openpyxl + Pillow — **not portable to Workers** (CPython native deps). All PDF/Excel
routes remain on the legacy Flask service until re-implemented; the SPA links out to them via
`VITE_LEGACY_ORIGIN`. Affected: transcripts, Form 1A exam booking, attendance registers, clearance
certificates, marks exports, GIS exports, summative/graduation exports.

## 9. Payments

None anywhere in the codebase (no M-Pesa/Stripe/etc.). Fee handling is manual checklists.

## 10. Biometric integration

BioEntry W scanners POST to `/biometric/api/scan` and `/biometric/api/enroll` with a shared
secret. Live sessions are held in **in-process Python dicts + threading locks** — incompatible
with stateless Workers. Stays on legacy Flask; future port needs Durable Objects or the (already
existing, unused) `biometric_sessions` table.

## 11. Background / scheduled tasks

No cron/Celery. Only fire-and-forget `threading.Thread` audit writes on logout — replaced in
Workers by `ctx.waitUntil()`.

## 12. External APIs

None. The only outbound calls are to Supabase (PostgREST, GoTrue, Storage). GPS check-in stores
browser geolocation; maps render client-side.

## 13. Frontend API calls (React SPA)

All via one Axios instance (`frontend/src/lib/apiClient.ts`): the 18 authenticated endpoints in
section 3. No Supabase JS client, no fetch(), no uploads in the SPA yet. Legacy links (PDFs,
biometric, clearance, trips, summative, profile, notifications page) open the Flask origin via
`VITE_LEGACY_ORIGIN`.

## 14. Migration blockers identified (and how they are handled)

| Blocker | Resolution |
|---|---|
| Python/WSGI runtime | New `workers/` Hono + TypeScript API |
| `supabase-py`/`gotrue` SDKs | `@supabase/supabase-js` (Workers-compatible) |
| Werkzeug password hashes | WebCrypto PBKDF2 + `scrypt-js` verifier (hash format preserved — no student resets needed) |
| Server-side session cookie | Stateless signed JWT (Bearer), 24 h expiry |
| `threading.Thread` audit | `ctx.waitUntil()` |
| In-memory rate limiter | Cloudflare WAF rate-limiting rules (edge) |
| ReportLab/openpyxl/Pillow | Stay on legacy Flask origin (phase 2: JS PDF lib or render service) |
| Biometric in-memory sessions | Stay on legacy Flask (phase 2: Durable Objects) |
| Jinja HTML portals (~210 routes) | Incremental SPA migration continues; legacy origin retained |
| Local filesystem logo reads | Not needed in Workers (no PDF generation there) |

## 15. Target architecture (implemented)

```
Users
  ↓
Cloudflare (DNS, SSL/TLS, CDN, WAF, DDoS, rate limiting)
  ↓
Cloudflare Pages ── React + Vite + TypeScript (frontend/)
  ↓ HTTPS  Authorization: Bearer <session JWT>
Cloudflare Workers ── Hono + TypeScript + Zod (workers/)
  │   auth · RBAC (20 roles) · dept isolation · audit logs · business logic
  ↓ service-role key (secret, server-side only)
Supabase ── PostgreSQL (+RLS) · Auth (GoTrue) · Storage
```
