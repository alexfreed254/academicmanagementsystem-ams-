# Workers source layout (Hono + TypeScript)

Target folder map requested for the Cloudflare migration. Existing route files
are reused — not blindly rewritten. Prefer importing from `services/` and
`middleware/` in new code.

```
src/
├── index.ts                 # Worker entry → exports app
├── app.ts                   # Hono app, CORS, mounts /api/v1/*
├── middleware/
│   ├── auth.ts              # requireAuth (+ re-exports RBAC)
│   ├── rbac.ts              # requireRole, deptIsolationCheck
│   └── error-handler.ts
├── routes/                  # Existing Flask-ported handlers (~235)
│   ├── auth.ts
│   ├── notifications.ts
│   ├── trainer.ts           # attendance, marks entry, assessments, units…
│   ├── student.ts           # marks, POE, bookings, clearance self-service…
│   ├── admin.ts
│   ├── roles.ts             # per-role dashboards / lists
│   ├── shared.ts            # cross-role reads
│   ├── mutations.ts         # POSTs (clearance, attachment, trips, …)
│   ├── public.ts
│   └── print.ts             # browser-print JSON payloads
├── services/
│   ├── supabase.ts
│   ├── storage.ts
│   └── notifications.ts
├── lib/                     # Implementation helpers (session, passwords, print…)
├── schemas.ts               # Zod / shared validators
└── types.ts
```

| Desired module name | Current home |
|---|---|
| students | `routes/student.ts` + shared/mutations |
| trainers | `routes/trainer.ts` |
| attendance | `routes/trainer.ts`, `routes/mutations.ts` |
| marks | `routes/trainer.ts`, `routes/student.ts`, `routes/print.ts` |
| poe | `routes/student.ts`, `routes/mutations.ts` |
| exams | `routes/shared.ts`, `routes/mutations.ts`, `routes/roles.ts` |
| clearance | `routes/mutations.ts`, `routes/roles.ts`, `routes/shared.ts` |
| industrial-attachment | `routes/mutations.ts`, `routes/roles.ts` |
| payments | **N/A** — no payment integration in Flask |
| admin | `routes/admin.ts`, `routes/roles.ts` |

Still on Flask (legacy origin): biometric live device API, ReportLab PDFs, openpyxl Excel.
