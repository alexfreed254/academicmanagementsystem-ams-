# TTTI AMS - Quick Reference

## 🔗 Important URLs

| Service | URL |
|---------|-----|
| **Frontend (Production)** | https://1cd16e19.ttti-ams-frontend.pages.dev |
| **Backend API** | https://ttti-ams-backend.kasitetlawrence33.workers.dev |
| **Backend Health Check** | https://ttti-ams-backend.kasitetlawrence33.workers.dev/health |
| **GitHub Repository** | https://github.com/alexfreed254/academicmanagementsystem-ams- |
| **GitHub Actions** | https://github.com/alexfreed254/academicmanagementsystem-ams-/actions |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/kbxaawuxlycetxifltxf |
| **Cloudflare Dashboard** | https://dash.cloudflare.com |

## 🔐 Credentials & Keys

### Supabase
- **Project URL:** `https://kbxaawuxlycetxifltxf.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtieGFhd3V4bHljZXR4aWZsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njk4MDIsImV4cCI6MjA5NTE0NTgwMn0.8hjud3kF3WyLWpZy9R1f88DbyiRx37zAs4yLx4UUUAg`
- **Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtieGFhd3V4bHljZXR4aWZsdHhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU2OTgwMiwiZXhwIjoyMDk1MTQ1ODAyfQ.X2wIKIfOB7ZACRDKipbjm6YbCiWb0FHNNb6URIsMvH8`

## 📦 API Endpoints

### Authentication
```
POST /api/auth/login         - Login (staff or student)
POST /api/auth/logout        - Logout
GET  /api/auth/me            - Get current user profile
```

### Request Format (Login)
```json
// Staff Login
POST /api/auth/login
{
  "user_type": "staff",
  "email": "user@ttti.ac.ke",
  "password": "password"
}

// Student Login
POST /api/auth/login
{
  "user_type": "student",
  "admission_no": "TTI/XXX/YYYY",
  "password": "password"
}
```

### Response Format (Success)
```json
{
  "ok": true,
  "user": {
    "id": "...",
    "email": "...",
    "role": "Super Admin",
    "full_name": "..."
  },
  "home_path": "/super-admin"
}
```

## 🛠️ Common Commands

### Backend Deployment
```bash
cd backend
npm install
npx wrangler deploy
```

### Frontend Deployment
```bash
cd frontend
npm install
npm run build
npx wrangler pages deploy dist
```

### Set Backend Secret
```bash
cd backend
wrangler secret put SECRET_NAME
# Then paste the secret value
```

### Test Backend Health
```bash
curl https://ttti-ams-backend.kasitetlawrence33.workers.dev/health
```

### View Logs (Backend)
```bash
cd backend
npx wrangler tail
```

## 📋 Environment Variables

### Backend (Cloudflare Workers Secrets)
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
CSRF_SECRET
```

### Frontend (Cloudflare Pages Variables)
```
VITE_API_BASE_URL=https://ttti-ams-backend.kasitetlawrence33.workers.dev
VITE_SUPABASE_URL=https://kbxaawuxlycetxifltxf.supabase.co
VITE_SUPABASE_ANON_KEY=[anon key]
```

## 🎯 Role Home Paths

| Role | Home Path |
|------|-----------|
| Super Admin | `/super-admin` |
| Admin Oversight | `/admin-oversight` |
| Dept Admin | `/dept-admin` |
| Trainer | `/trainer` |
| Exam Officer | `/exam-officer` |
| Internal Verifier | `/internal-verifier` |
| CDACC Verifier | `/cdacc-verifier` |
| Industry Mentor | `/industry-mentor` |
| Liaison Officer | `/liaison-officer` |
| Workshop Tech | `/workshop-tech` |
| Service Dept | `/service-dept` |
| Student | `/student` |

## 🚨 Troubleshooting Quick Reference

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| 405 Method Not Allowed | URL mismatch | Check API base URL in env vars |
| 401 Unauthorized | Missing credentials or secrets | Set backend secrets |
| CORS Error | Origin not allowed | Verify CORS config in backend |
| Network Error | Backend not responding | Check health endpoint |
| 403 Forbidden | Missing permissions | Check user role in database |
| 500 Internal Error | Backend issue | Check Wrangler logs |

## 📱 Browser DevTools Checklist

When testing login, check:
1. **Network Tab:**
   - Request URL: `https://ttti-ams-backend.kasitetlawrence33.workers.dev/api/auth/login`
   - Status: 200
   - Request Method: POST
   - Request Body: Has user_type, email/admission_no, password

2. **Console Tab:**
   - No CORS errors
   - No network errors

3. **Application Tab → Cookies:**
   - `sb_access_token` (for staff)
   - `session_token` (for students)

## ⚡ Quick Setup (New Machine)

```bash
# Clone repo
git clone https://github.com/alexfreed254/academicmanagementsystem-ams-.git
cd academicmanagementsystem-ams-

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Set up environment variables (see above sections)

# Deploy
cd backend && npx wrangler deploy && cd ..
cd frontend && npm run build && npx wrangler pages deploy dist
```

## 📊 Project Structure

```
ACADEMIC MANAGEMENT SYSTEM/
├── backend/                 # Hono API (Cloudflare Workers)
│   ├── src/
│   │   ├── routes/         # 16 role-specific route modules
│   │   ├── middleware/     # Auth, rate-limiting, error handling
│   │   ├── lib/            # Auth helpers, database types
│   │   └── index.ts        # Main entry point
│   └── wrangler.toml       # Cloudflare config
│
├── frontend/               # React + TypeScript (Cloudflare Pages)
│   ├── src/
│   │   ├── api/            # API client functions
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   └── lib/            # API client, utilities
│   └── vite.config.ts      # Vite config
│
├── .github/workflows/      # GitHub Actions CI/CD
└── [migration files]       # Database migration SQL files
```

## 🎓 User Roles

**Staff Roles (Supabase Auth):**
- Super Admin
- Admin Oversight
- Department Admin
- Trainer
- Exam Officer
- Internal Verifier
- CDACC Verifier
- Industry Mentor
- Liaison Officer
- Workshop Tech
- Service Department

**Student Role (Password Hash):**
- Student (uses admission number instead of email)

