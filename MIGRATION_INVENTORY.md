# TTTI AMS — Cloudflare Migration Inventory

Canonical inventory for the Cloudflare migration. Update this file in place when the
surface changes. Do not invent parallel inventory docs.

Sources: Flask blueprints, React SPA (`frontend/`), Workers API (`workers/`), SQL schema.

---

## 1. Source architecture (pre-migration / Flask)

```
Browsers
  ├── Jinja portals (templates/, ~210 HTML) ──► Flask HTML (~230 routes, 20 blueprints)
  └── React + Vite SPA (frontend/)           ──► Flask /api/v1/* (session cookie)
                        │
                        ▼
              gunicorn → Flask (app.py)
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
  Supabase Auth   Supabase Postgres   Supabase Storage
```

## 2. Target / production architecture (implemented)

**Cloudflare-native topology:** one Worker serves SPA assets + Hono API (Worker Assets =
Pages-equivalent static hosting). Same origin for UI and `/api/*`.

```
Users
  ↓
Cloudflare (DNS · SSL/TLS · CDN · WAF · DDoS)
  ↓
Cloudflare Worker  (repo-root wrangler.jsonc → academic-management-system254)
  ├─ /api/*     → Hono + TypeScript (workers/src)  Authorization: Bearer <session JWT>
  └─ /*         → React SPA (frontend/dist)  SPA not_found_handling
  ↓ service-role key (runtime secret only)
Supabase — PostgreSQL (+RLS) · Auth (GoTrue) · Storage
```

Authoritative deploy: `npm run deploy` from repo root.  
Do **not** deploy `frontend/wrangler.jsonc` or `workers/wrangler.toml` (retired leftovers).

Diagrams that show “Pages + separate API Worker” are historical only.

---

## 3. Flask route inventory (source system)

| Blueprint | Prefix | ~Routes | Notes |
|---|---|---|---|
| `main` | `/` | 2 | Public landing + course application |
| `auth` | `/auth` | 6 | Dual login, logout, password, profile |
| `api_v1` | `/api/v1` | ~20 (original SPA contract) | Migrated + greatly expanded on Workers |
| `super_admin` | `/super-admin` | ~45 | CRUD, oversight, PDFs, imports |
| `dept_admin` | `/dept-admin` | ~60 | Dept-scoped admin, PDFs, biometric enrol |
| `trainer` | `/trainer` | ~25 | Attendance, marks, POE, PDFs/Excel |
| `student` | `/student` | ~40 | Self-service, uploads, attachment, logbook |
| `clearance` | `/clearance` | ~15 | Multi-stage clearance + public verify |
| `biometric_attendance` | `/biometric` | device APIs | **Still Flask-only** (in-memory sessions) |
| Other role blueprints | various | ~55 | Oversight, mentors, verifiers, services |

Jinja UI under `templates/` is **legacy reference**. Runtime UI is React TypeScript.

---

## 4. Workers `/api/v1` surface (Cloudflare)

Mounted from `workers/src/index.ts`. Approx **~238** endpoints across modules:

| Module | Role |
|---|---|
| `auth.ts` | Login, logout, me, csrf, profile, password, forgot-password, student register |
| `notifications.ts` | Recent / count / mark read |
| `trainer.ts` | Dashboard, marks-entry, assessments, attendance, session detail |
| `student.ts` | Dashboard, units, marks, portfolio, uploads form data, employment |
| `admin.ts` | Super / dept dashboards |
| `roles.ts` | Specialist role portal GETs (+ some POSTs) |
| `shared.ts` | Admin/list GETs, clearance queues, academic trips detail |
| `mutations.ts` | Writes, CRUD, uploads (base64 → Storage), meta helpers |
| `public.ts` | Public departments + course apply |
| `print.ts` | Browser-print JSON payloads (marks, attendance, graduation, etc.) |

Plus `GET /api/health` (secrets readiness).

---

## 5. Database tables (~55+)

Core (`supabase_schema.sql`): departments, courses, classes, units, user_profiles, class_units,
trainer_units, enrollments, attendance, class_events, formative_assessments, formative_marks,
assessments, evidence, employers, employer_verifications, job_postings, job_applications,
system_logs, notifications, exam_bookings, marks, trainer_documents, trainee_documents,
student_personal_documents, companies, mentors, industrial_attachments, location_logs,
digital_logbook, competency_tracking, clearance_departments, clearance_stages, clearance_requests,
clearance_approvals, admission_requests, admission_documents, course_applications,
employment_tracking, employment_projects.

Migrations add: summative_competences, academic_trips, academic_trip_media, attachment_periods,
attachment_period_eligibility, attachment_weekly_attendance, attachment_grading_config,
attachment_grades, mentoring_tool_uploads, clearance_lost_items, biometric_scanners,
biometric_sessions, workshop_inventory, dept_notices.

DB helpers: `set_updated_at`, `calculate_grade`, `set_grade`, `current_user_role()`,
`current_user_dept()`, `current_user_active()` + updated_at triggers.

---

## 6. Authentication flows

| Actor | Identifier | Credential store | Cloudflare session |
|---|---|---|---|
| Staff (19 roles) | email | Supabase Auth (GoTrue) | Signed HS256 session JWT (Bearer), 24h |
| Student | admission no. | `user_profiles.password_hash` (Werkzeug pbkdf2/scrypt) | Same JWT; WebCrypto / scrypt-js verify |
| Biometric device | shared secret | `BIOMETRIC_DEVICE_SECRET` | **Not on Workers** — Flask device host |

`must_change_password` blocks all API except logout/me/csrf/change-password (Workers middleware).

---

## 7. RBAC

- 20 roles (`STAFF_ROLES` + `student`); enforced in Workers middleware/route handlers.
- Department isolation: `deptIsolationCheck` — super_admin any dept; others own dept.
- Trainer scoping: `trainer_units ∪ class_units`.
- Service clearance desks: category → role map.
- Service-role key server-side only; RLS is defence-in-depth (same model as Flask).

---

## 8. Storage (ported to Workers)

Buckets: `assessment-scripts`, `assessment-evidence`, `application-documents`, `trip-media`,
`mentoring-tools`.

Workers upload paths (base64 / multipart → Supabase Storage): public course apply, student
assessment/POE/evidence, trip media, employment docs. Validation: extension allow-list + size cap.

---

## 9. PDF / Excel

| Kind | Cloudflare status |
|---|---|
| Browser print reports | **Ported** — `print.ts` + `PrintReportPages.tsx` (`/.../print`) |
| ReportLab binary PDFs | Not on Workers (CPython). Prefer browser print; optional `VITE_LEGACY_ORIGIN` |
| openpyxl Excel export/import | **Not ported** — optional legacy Flask only |

---

## 10. Payments

None (no M-Pesa/Stripe). Fees are manual checklists.

---

## 11. Biometric

BioEntry W → `POST /biometric/api/scan` + `/enroll` with shared secret. Live sessions used
in-process Python dicts + locks — **incompatible with Workers**. Remains on optional Flask
device host until Durable Objects / `biometric_sessions` table port.

SPA: scanner registration list + manual attendance work on Cloudflare; live device POST does not.

---

## 12. Background / scheduled tasks

No Celery/cron. Audit writes use `executionCtx.waitUntil()` on Workers.

---

## 13. External APIs

None beyond Supabase (PostgREST, GoTrue, Storage). Geolocation is client-side.

---

## 14. Frontend API usage (React SPA)

- Axios (`frontend/src/lib/apiClient.ts`): empty `VITE_API_BASE_URL` → same-origin `/api/v1`.
- Auth: Bearer JWT in `sessionStorage`.
- No Supabase JS client in the browser.
- Portals: React Router + PortalShell; Jinja templates are not served in production.

---

## 15. Migration blockers (status)

| Blocker | Status |
|---|---|
| Python/WSGI | Replaced by Workers Hono |
| Werkzeug password hashes | WebCrypto + scrypt-js (format preserved) |
| Session cookie | Stateless Bearer JWT |
| `threading.Thread` audit | `waitUntil()` |
| In-memory rate limit | Cloudflare WAF rate rules |
| Jinja portals | Replaced by React SPA on Worker assets |
| File uploads | Ported to Workers + Storage |
| Browser-printable reports | Ported |
| Excel openpyxl | Optional Flask legacy |
| Biometric live sessions | Optional Flask / future Durable Objects |

---

## 16. Cloudflare compatibility checklist

- [x] Root `wrangler.jsonc` with `nodejs_compat`, assets SPA, `run_worker_first: ["/api/*"]`
- [x] Runtime secrets: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`
- [x] No `fs` / native modules in Workers source
- [x] SPA uses `import.meta.env` only (no Node `process.env` in browser bundle)
- [x] Unified CI deploy (`.github/workflows/deploy.yml`)
- [ ] Optional: custom domain on Worker + DNS/WAF in Cloudflare dashboard
- [ ] Optional: Excel + biometric device host if those features remain required
