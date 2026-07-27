# Thika Technical Training Institute — Academic Management System (TTTI AMS)

A modern full-stack web application for managing academic operations at Thika Technical Training Institute. Built with Cloudflare-native architecture for global performance and scalability.

---

## 🚀 Technology Stack (v2.0 - Cloudflare Native)

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS | **Cloudflare Pages** |
| Backend | Hono + TypeScript | **Cloudflare Workers** |
| Database | PostgreSQL + Row Level Security | Supabase |
| Auth | JWT + bcrypt (dual auth system) | Supabase Auth |
| Storage | File uploads (PDFs, images, documents) | Supabase Storage |
| Real-time | WebSocket + Durable Objects | Cloudflare |

---

## 📁 Project Structure

```
/
├── backend/                    # Cloudflare Workers (Hono API)
│   ├── src/
│   │   ├── index.ts           # Main entry point
│   │   ├── middleware/        # Auth, CSRF, rate limiting
│   │   ├── routes/            # API route modules (16 roles)
│   │   ├── lib/               # Utilities
│   │   └── durable-objects/   # Real-time features
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml          # Cloudflare Workers config
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── pages/             # All role pages (60+ pages)
│   │   ├── components/        # Reusable UI components
│   │   ├── api/               # API client functions
│   │   ├── lib/               # Utilities
│   │   └── layouts/           # Portal shells
│   ├── package.json
│   └── vite.config.ts
│
├── .env.example               # Environment variables template
├── README.md                  # This file
└── MIGRATION_GUIDE.md         # Migration documentation
```

---

## 🎯 System Features

### 16 User Roles
- **super_admin** - Full system access
- **dept_admin** - Department management
- **trainer** - Attendance, assessments, marks
- **student** - View records, upload POE, exam booking
- **examination_officer** - Exam approvals
- **industry_mentor** - Attachment supervision
- **internal_verifier** - Competency verification
- **liaison_officer** - Attachment coordination
- **cdacc_verifier** - External assessment verification
- **workshop_technician** - Equipment management
- **registrar** - Enrollment oversight
- **deputy_principal** - Academic oversight
- **quality_assurance_officer** - Quality monitoring
- **service_clearance_officer** - Service dept clearances
- **library_hod** / **sports_hod** - Specialized clearances
- **Biometric scanner** - Hardware integration

### Core Modules
- **Attendance Management** - Biometric + manual marking, GPS tracking
- **Assessment Management** - Portfolio of Evidence (POE) uploads and review
- **Marks Entry & Tracking** - Formative and summative assessments
- **Exam Booking** - Multi-stage approval workflow
- **Student Clearance** - 2-stage parallel + sequential clearance process
- **Industrial Attachment** - Company placements, logbook, competencies
- **Employment Tracking** - TVET graduate employment status
- **Notifications** - Real-time in-app notifications
- **Audit Logging** - Complete system activity tracking
- **Multi-Department** - Full department isolation with RLS

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Cloudflare account (free tier works)
- Supabase project
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/alexfreed254/academicmanagementsystem-ams-.git
cd academicmanagementsystem-ams-
```

### 2. Backend Setup
```bash
cd backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your Supabase credentials and secrets
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# JWT_SECRET (min 32 chars), CSRF_SECRET (min 32 chars)

# Start development server
npm run dev
# Backend runs on http://localhost:8787
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Copy environment file
cp .env.example .env

# Edit .env
# VITE_API_BASE_URL=http://localhost:8787
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# Start development server
npm run dev
# Frontend runs on http://localhost:5173
```

### 4. Database Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema (if you have `supabase_schema.sql`)
3. Create Storage buckets:
   - `assessment-scripts`
   - `assessment-evidence`
   - `documents`
   - `application-documents`
4. Set up RLS policies (Row Level Security)

### 5. Initial Super Admin
```sql
-- In Supabase SQL Editor, create a super admin user
-- First create the user in Auth > Users, then:
INSERT INTO user_profiles (id, full_name, role, is_active)
VALUES ('UUID-FROM-AUTH', 'Super Admin', 'super_admin', TRUE)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin', is_active = TRUE;
```

---

## 🚢 Deployment

### Backend (Cloudflare Workers)
```bash
cd backend

# Login to Cloudflare (first time only)
npx wrangler login

# Create KV namespace for sessions
npx wrangler kv:namespace create SESSIONS

# Update wrangler.toml with the namespace ID

# Set secrets
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put JWT_SECRET
npx wrangler secret put CSRF_SECRET

# Deploy
npm run deploy:production
```

### Frontend (Cloudflare Pages)
```bash
cd frontend

# Build
npm run build

# Deploy (first time - follow prompts to connect Git)
npx wrangler pages deploy dist --project-name ttti-ams

# Or via GitHub Actions (automatic on push)
# See .github/workflows/deploy.yml
```

---

## 🔒 Security

- **Authentication**: Dual system (Staff: Supabase JWT | Students: bcrypt password hash)
- **Authorization**: Role-based access control (RBAC) with 16 roles
- **Row Level Security**: Database-level access control via Supabase RLS
- **CSRF Protection**: Token-based CSRF prevention on all mutations
- **Rate Limiting**: 5 req/min on auth, 100 req/min on general API
- **Secure Cookies**: HttpOnly, Secure, SameSite
- **Audit Logging**: All significant actions logged to `system_logs`
- **Input Validation**: Zod schemas on all inputs
- **File Upload Security**: Type and size validation

---

## 📊 Performance

- **Edge Computing**: API runs on Cloudflare's global network (275+ cities)
- **Response Times**: Sub-50ms typical
- **Scalability**: Auto-scaling, handles millions of requests
- **CDN**: Static assets cached globally
- **Database**: Supabase with connection pooling
- **Storage**: Supabase Storage with CDN

---

## 📖 API Documentation

### Authentication
- `POST /api/auth/login` - Login (staff or student)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Student
- `GET /api/student/dashboard` - Dashboard data
- `GET /api/student/attendance` - Attendance records
- `GET /api/student/marks` - Marks/grades
- `POST /api/student/assessments` - Upload assessment

### Trainer
- `GET /api/trainer/dashboard` - Dashboard data
- `POST /api/trainer/attendance` - Mark attendance
- `GET /api/trainer/assessments` - Student assessments
- `POST /api/trainer/marks-entry/save-mark` - Save mark

[See MIGRATION_GUIDE.md for complete API reference]

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

---

## 📝 License

Proprietary - Thika Technical Training Institute

---

## 👥 Contributors

- Development Team - Thika Technical Training Institute
- Migration to Cloudflare - 2025

---

## 📞 Support

For issues, questions, or feature requests:
- Create an issue on GitHub
- Contact IT Department: [email protected]
- Documentation: See `/docs` folder

---

## 🗺️ Roadmap

- [x] Backend migration to Cloudflare Workers
- [x] Frontend setup with React + Vite
- [ ] Complete API route implementation (17 weeks planned)
- [ ] Mobile app (React Native)
- [ ] Offline support (PWA)
- [ ] Advanced analytics dashboard
- [ ] AI-powered insights

---

## 📚 Additional Documentation

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Detailed migration documentation
- [backend/README.md](./backend/README.md) - Backend-specific documentation
- [frontend/README.md](./frontend/README.md) - Frontend-specific documentation

---

**Built with ❤️ for Thika Technical Training Institute**
