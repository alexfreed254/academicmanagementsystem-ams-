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
├── old-flask-archive/          # Archived Flask files (reference)
├── .github/workflows/          # CI/CD pipelines
├── README.md                   # This file
├── QUICK_START.md              # Get running in <10 minutes
├── MIGRATION_GUIDE.md          # Migration documentation
├── IMPLEMENTATION_STATUS.md    # Current progress tracking
└── DEPLOYMENT_INSTRUCTIONS.md  # Production deployment guide
```

---

## 🚀 Quick Start

See **[QUICK_START.md](./QUICK_START.md)** for detailed setup instructions.

```bash
# 1. Clone repository
git clone https://github.com/alexfreed254/academicmanagementsystem-ams-.git
cd academicmanagementsystem-ams-

# 2. Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev  # http://localhost:8787

# 3. Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev  # http://localhost:5173
```

---

## 🎯 System Features

### 16 User Roles
- super_admin, dept_admin, trainer, student, examination_officer
- industry_mentor, internal_verifier, liaison_officer, cdacc_verifier
- workshop_technician, registrar, deputy_principal, quality_assurance_officer
- library_hod, sports_hod, service_clearance_officer

### Core Modules
- **Attendance Management** - Biometric + manual, GPS tracking
- **Assessment Management** - POE uploads and review
- **Marks Entry & Tracking** - Formative and summative
- **Exam Booking** - Multi-stage approval workflow
- **Student Clearance** - 2-stage parallel + sequential
- **Industrial Attachment** - Company placements, logbook, competencies
- **Employment Tracking** - TVET graduate status
- **Notifications** - Real-time in-app notifications
- **Audit Logging** - Complete activity tracking

---

## 📚 Documentation

- 📖 **[QUICK_START.md](./QUICK_START.md)** - Get running in under 10 minutes
- 📖 **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Detailed 17-week migration roadmap
- 📖 **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Current progress (25% complete)
- 📖 **[DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md)** - Production deployment guide
- 📖 **[backend/README.md](./backend/README.md)** - Backend-specific documentation

---

## 🚢 Deployment

### Backend (Cloudflare Workers)

```bash
cd backend
wrangler login
npm run deploy:production
```

### Frontend (Cloudflare Pages)

```bash
cd frontend
npm run build
npm run deploy
```

See **[DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md)** for complete deployment guide including:
- Environment setup
- Secret management
- Custom domains
- CI/CD configuration
- Monitoring & rollback

---

## 🔒 Security

- **Authentication**: Dual system (Staff: Supabase JWT | Students: bcrypt)
- **Authorization**: RBAC with 16 roles
- **Row Level Security**: Database-level via Supabase RLS
- **CSRF Protection**: Token-based on all mutations
- **Rate Limiting**: 5 req/min auth, 100 req/min general
- **Secure Cookies**: HttpOnly, Secure, SameSite
- **Audit Logging**: All actions logged
- **Input Validation**: Zod schemas

---

## 📊 Performance

- **Edge Computing**: Runs on Cloudflare's 275+ city network
- **Response Times**: Sub-50ms typical
- **Scalability**: Auto-scaling, handles millions of requests
- **Zero Cold Starts**: Instant response, always
- **CDN**: Static assets cached globally

---

## 🗂️ Migration Status

**Current Progress: 25%**

✅ **Complete:**
- Infrastructure (100%)
- Authentication (100%)
- Documentation (100%)

⏳ **In Progress:**
- Backend API Routes (5%)
- Frontend Pages (10%)

🔜 **Upcoming:**
- Complex workflows
- Testing
- Production deployment

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for detailed tracking.

---

## 🧪 Development

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Type checking
npm run type-check
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Open a Pull Request

---

## 📝 License

Proprietary - Thika Technical Training Institute

---

## 📞 Support

- **Repository**: https://github.com/alexfreed254/academicmanagementsystem-ams-
- **Issues**: https://github.com/alexfreed254/academicmanagementsystem-ams-/issues
- **Documentation**: See `/docs` folder and markdown files in root

---

## 🎉 Acknowledgments

- **Development Team** - Thika Technical Training Institute
- **Migration to Cloudflare** - January 2025
- **Powered by**: Cloudflare Workers, Pages, Hono, React, Vite, Supabase

---

**Built with ❤️ for Thika Technical Training Institute**

🌐 **Repository**: https://github.com/alexfreed254/academicmanagementsystem-ams-
