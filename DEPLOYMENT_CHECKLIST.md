# TTTI AMS - Deployment Checklist

## ✅ Completed Steps

### 1. Backend Architecture
- ✅ Migrated from Flask to Hono (Cloudflare Workers)
- ✅ Created route modules for all 16 roles
- ✅ Implemented authentication middleware
- ✅ Configured CORS for frontend origins
- ✅ Set up rate limiting and security headers
- ✅ Deployed to: `https://ttti-ams-backend.kasitetlawrence33.workers.dev`

### 2. Frontend Architecture
- ✅ Migrated from Jinja2 templates to React + TypeScript
- ✅ Configured Vite build system
- ✅ Created API client with axios
- ✅ Implemented login flow
- ✅ Deployed to: `https://1cd16e19.ttti-ams-frontend.pages.dev`

### 3. Configuration Files
- ✅ Fixed `frontend/.env` typo (removed duplicate "orkers" from URL)
- ✅ Updated `wrangler.toml` with nodejs_compat flag
- ✅ Created `.cfignore` to exclude old files

## ⚠️ Required Actions

### Backend: Set Cloudflare Workers Secrets

The backend requires these secrets to be set via Wrangler CLI or Cloudflare Dashboard:

```bash
cd backend

# Set Supabase credentials
wrangler secret put SUPABASE_URL
# Enter: https://kbxaawuxlycetxifltxf.supabase.co

wrangler secret put SUPABASE_ANON_KEY
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtieGFhd3V4bHljZXR4aWZsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njk4MDIsImV4cCI6MjA5NTE0NTgwMn0.8hjud3kF3WyLWpZy9R1f88DbyiRx37zAs4yLx4UUUAg

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtieGFhd3V4bHljZXR4aWZsdHhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU2OTgwMiwiZXhwIjoyMDk1MTQ1ODAyfQ.X2wIKIfOB7ZACRDKipbjm6YbCiWb0FHNNb6URIsMvH8

# Set authentication secrets (generate random strings)
wrangler secret put JWT_SECRET
# Enter: (generate a random 32+ character string)

wrangler secret put CSRF_SECRET
# Enter: (generate a random 32+ character string)
```

**Alternative: Set via Cloudflare Dashboard**
1. Go to: https://dash.cloudflare.com
2. Navigate to: Workers & Pages → ttti-ams-backend → Settings → Variables
3. Add the secrets listed above

### Frontend: Verify Cloudflare Pages Environment Variables

Ensure these are set in Cloudflare Pages dashboard:

1. Go to: https://dash.cloudflare.com
2. Navigate to: Workers & Pages → ttti-ams-frontend → Settings → Environment Variables
3. Verify these variables exist:

```
VITE_API_BASE_URL = https://ttti-ams-backend.kasitetlawrence33.workers.dev
VITE_SUPABASE_URL = https://kbxaawuxlycetxifltxf.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtieGFhd3V4bHljZXR4aWZsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njk4MDIsImV4cCI6MjA5NTE0NTgwMn0.8hjud3kF3WyLWpZy9R1f88DbyiRx37zAs4yLx4UUUAg
```

### Database: Create Initial Super Admin User

If no users exist, create a super admin account:

**Option 1: Via Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/kbxaawuxlycetxifltxf
2. Navigate to: Authentication → Users
3. Click "Add User"
4. Create user with email (e.g., `admin@ttti.ac.ke`)
5. Set password
6. Go to SQL Editor and run:
   ```sql
   INSERT INTO staff (id, email, role, full_name) 
   VALUES (
     '[copy the user UUID from Auth]',
     'admin@ttti.ac.ke',
     'Super Admin',
     'System Administrator'
   );
   ```

**Option 2: Via SQL (if staff table auto-creates via trigger)**
1. Go to SQL Editor
2. Create auth user first via dashboard
3. Staff record should auto-create via database trigger

## 🚀 Deployment Commands

### Deploy Backend
```bash
cd backend
npm install
npx wrangler deploy
```

### Deploy Frontend
```bash
cd frontend
npm install
npm run build
npx wrangler pages deploy dist
```

Or use GitHub Actions (already configured):
```bash
git add .
git commit -m "Fix frontend environment variable typo"
git push origin main
```

## 🧪 Testing

### 1. Test Backend Health
```bash
curl https://ttti-ams-backend.kasitetlawrence33.workers.dev/health
```
Expected response:
```json
{
  "ok": true,
  "service": "ttti-ams-backend",
  "timestamp": "2026-07-27T..."
}
```

### 2. Test Login Endpoint
```bash
curl -X POST https://ttti-ams-backend.kasitetlawrence33.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://1cd16e19.ttti-ams-frontend.pages.dev" \
  -d '{
    "user_type": "staff",
    "email": "admin@ttti.ac.ke",
    "password": "your_password"
  }'
```

### 3. Test Frontend
1. Open: https://1cd16e19.ttti-ams-frontend.pages.dev
2. Open browser DevTools → Network tab
3. Try logging in
4. Verify:
   - ✅ Request goes to: `https://ttti-ams-backend.kasitetlawrence33.workers.dev/api/auth/login`
   - ✅ Status code: 200 (not 405)
   - ✅ Response contains user object

## 📋 Troubleshooting

### Issue: 405 Method Not Allowed
**Cause:** URL mismatch between frontend and backend
**Solution:** ✅ Fixed typo in `frontend/.env`

### Issue: CORS Error
**Cause:** Frontend origin not in allowed list
**Solution:** ✅ Added Pages URLs to CORS config

### Issue: 401 Unauthorized
**Possible Causes:**
- Secrets not set in Workers dashboard
- Invalid credentials
- User doesn't exist in database

### Issue: Network Error
**Possible Causes:**
- Backend not deployed
- Frontend environment variable not set
- DNS/routing issue

## 📊 Current Status Summary

| Component | Status | URL |
|-----------|--------|-----|
| Backend | ✅ Deployed | https://ttti-ams-backend.kasitetlawrence33.workers.dev |
| Frontend | ✅ Deployed | https://1cd16e19.ttti-ams-frontend.pages.dev |
| Backend Secrets | ⚠️ Need Verification | Set via `wrangler secret put` |
| Frontend Env Vars | ⚠️ Need Verification | Set via Cloudflare Dashboard |
| Database Users | ⚠️ Need Creation | Create super admin user |
| Route Configuration | ✅ Correct | POST /api/auth/login |
| CORS Configuration | ✅ Correct | Includes Pages URLs |

## 🎯 Next Immediate Steps

1. **Set backend secrets** (5 minutes)
2. **Verify frontend environment variables** in Cloudflare Dashboard (2 minutes)
3. **Create super admin user** in Supabase (3 minutes)
4. **Redeploy frontend** with fixed `.env` file (2 minutes)
5. **Test login** (1 minute)

Total time to completion: ~15 minutes

