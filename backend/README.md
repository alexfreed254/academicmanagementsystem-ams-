# TTTI AMS Backend - Cloudflare Workers

Hono-based API backend for the Thika Technical Training Institute Academic Management System.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (Express-like API for edge computing)
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth + bcrypt (dual auth system)
- **Storage**: Supabase Storage
- **Language**: TypeScript

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The API will be available at `http://localhost:8787`

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- `JWT_SECRET` - Secret for JWT token generation (min 32 chars)
- `CSRF_SECRET` - Secret for CSRF token generation (min 32 chars)

## Project Structure

```
src/
├── index.ts                 # Main entry point, app configuration
├── middleware/              # Custom middleware
│   ├── auth.ts             # Authentication & authorization
│   ├── rate-limiter.ts     # Rate limiting
│   └── error-handler.ts    # Global error handling
├── routes/                  # API route modules
│   ├── auth.ts             # Login, logout, profile
│   ├── student.ts          # Student portal routes
│   ├── trainer.ts          # Trainer portal routes
│   ├── dept-admin.ts       # Department admin routes
│   ├── super-admin.ts      # Super admin routes
│   └── ...                 # Other role-specific routes
├── lib/                     # Shared utilities
│   ├── auth.ts             # Auth helpers
│   ├── supabase.ts         # Supabase client factory
│   ├── validators.ts       # Zod validation schemas
│   └── utils.ts            # General utilities
└── durable-objects/         # Durable Objects for real-time features
    └── biometric-session.ts # Biometric attendance sessions
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/login` - Login (staff or student)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset

### Student (`/api/student`)
- `GET /api/student/dashboard` - Dashboard data
- `GET /api/student/attendance` - Attendance records
- `GET /api/student/marks` - Marks/grades
- `POST /api/student/assessments` - Upload assessment
- `GET /api/student/exam-bookings` - Exam bookings
- `POST /api/student/exam-bookings` - Book exam
- And more...

### Trainer (`/api/trainer`)
- `GET /api/trainer/dashboard` - Dashboard data
- `POST /api/trainer/attendance` - Mark attendance
- `GET /api/trainer/assessments` - Student assessments
- `POST /api/trainer/assessments/:id/review` - Review assessment
- `GET /api/trainer/marks-entry` - Marks entry page
- `POST /api/trainer/marks-entry/save-mark` - Save mark
- And more...

### Other Roles
- `/api/dept-admin/*` - Department admin routes
- `/api/super-admin/*` - Super admin routes
- `/api/exam-officer/*` - Examination officer routes
- `/api/industry-mentor/*` - Industry mentor routes
- `/api/internal-verifier/*` - Internal verifier routes
- `/api/liaison-officer/*` - Liaison officer routes
- `/api/cdacc-verifier/*` - CDACC verifier routes
- `/api/workshop-tech/*` - Workshop technician routes
- `/api/admin-oversight/*` - Admin oversight routes
- `/api/service-dept/*` - Service department routes
- `/api/clearance/*` - Clearance workflow routes
- `/api/biometric/*` - Biometric attendance routes
- `/api/notifications/*` - Notifications routes

## Authentication

Dual authentication system:

### Staff Users (Email + Password via Supabase Auth)
- super_admin, dept_admin, trainer, examination_officer, etc.
- JWT tokens stored in httpOnly cookies
- Auto-refresh before expiry

### Students (Admission Number + Password Hash)
- Password hash stored in `user_profiles.password_hash`
- Session token in httpOnly cookie
- No Supabase Auth integration

## Authorization

Role-based access control (RBAC) with 16 roles:

```typescript
// Example: Protect routes by role
trainer.use('*', roleRequired('trainer'));

trainer.get('/dashboard', async (c) => {
  const user = getCurrentUser(c);
  // ... only accessible to trainers
});
```

## Rate Limiting

Automatic rate limiting on sensitive endpoints:
- Auth endpoints: 5 requests/minute
- General API: 100 requests/minute

## Deployment

### Staging
```bash
npm run deploy:staging
```

### Production
```bash
npm run deploy:production
```

## Testing

```bash
npm test
```

## Type Checking

```bash
npm run type-check
```

## Database Types

Generate TypeScript types from Supabase schema:

```bash
npx supabase gen types typescript --project-id your-project-id > src/lib/database.types.ts
```

## Security

- All passwords hashed with bcrypt
- JWT tokens for session management
- CSRF protection on all mutations
- Rate limiting on sensitive endpoints
- RLS (Row Level Security) at database level
- Department isolation enforced
- Audit logging for all significant actions
- Input validation with Zod schemas

## Performance

- Edge computing (runs close to users globally)
- Sub-50ms response times (typical)
- Automatic scaling
- No cold starts
- KV storage for session state

## Monitoring

Configure Cloudflare Workers analytics:
- Request volume
- Error rates
- Response times
- CPU usage

## Support

For issues or questions, contact the development team or refer to:
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Documentation](https://hono.dev/)
- [Supabase JS Docs](https://supabase.com/docs/reference/javascript/)
