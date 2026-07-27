# Login Issue Resolution

## Issue: 405 Method Not Allowed Error

### Root Cause
The frontend `.env` file had a **critical typo** in the API base URL:
```
WRONG: https://ttti-ams-backend.kasitetlawrence33.workers.devorkers.dev
RIGHT: https://ttti-ams-backend.kasitetlawrence33.workers.dev
```

This caused all API requests to fail because the URL was incorrect.

### Solution Applied
Fixed the typo in `frontend/.env`:
```env
VITE_API_BASE_URL=https://ttti-ams-backend.kasitetlawrence33.workers.dev
```

### Route Configuration Verification ✅

#### Backend Configuration (Correct)
```typescript
// backend/src/index.ts
app.route('/api/auth', authRoutes);

// backend/src/routes/auth.ts
auth.post('/login', async (c) => { ... });
```
**Results in:** `POST /api/auth/login`

#### Frontend Configuration (Now Correct)
```typescript
// frontend/src/lib/apiClient.ts
const baseURL = import.meta.env.VITE_API_BASE_URL || ''

// frontend/src/api/auth.ts
await api.post('/api/auth/login', { user_type, email, password })
```
**Results in:** `POST https://ttti-ams-backend.kasitetlawrence33.workers.dev/api/auth/login`

### CORS Configuration ✅
Backend allows these origins:
- `http://localhost:5173` (local dev)
- `http://127.0.0.1:5173` (local dev)
- `https://ttti-ams-frontend.pages.dev` (production)
- `https://1cd16e19.ttti-ams-frontend.pages.dev` (deployment preview)

### Next Steps

1. **Redeploy Frontend to Cloudflare Pages**
   ```bash
   cd frontend
   npm run build
   npx wrangler pages deploy dist
   ```

2. **Verify Environment Variables in Cloudflare Pages Dashboard**
   Make sure these are set:
   - `VITE_API_BASE_URL` = `https://ttti-ams-backend.kasitetlawrence33.workers.dev`
   - `VITE_SUPABASE_URL` = `https://kbxaawuxlycetxifltxf.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `[your anon key]`

3. **Test Login**
   - Open: `https://1cd16e19.ttti-ams-frontend.pages.dev`
   - Try logging in with test credentials
   - Check browser Network tab to verify requests go to correct URL

4. **Create Initial Super Admin User** (if needed)
   If no users exist in the database, you'll need to create one:
   ```sql
   -- In Supabase SQL Editor
   INSERT INTO staff (email, role) 
   VALUES ('admin@ttti.ac.ke', 'Super Admin');
   
   -- Then use Supabase Auth to create the user account
   ```

### Request/Response Format

**Login Request:**
```json
POST /api/auth/login
{
  "user_type": "staff",
  "email": "user@ttti.ac.ke",
  "password": "your_password"
}
```

**Login Response (Success):**
```json
{
  "ok": true,
  "user": {
    "id": "...",
    "email": "user@ttti.ac.ke",
    "role": "Super Admin",
    "full_name": "..."
  },
  "home_path": "/super-admin"
}
```

**Login Response (Error):**
```json
{
  "ok": false,
  "error": "Invalid credentials"
}
```

### Authentication Flow

1. **Staff Login:** Uses Supabase Auth (JWT tokens)
   - Validates email/password via Supabase
   - Sets `sb_access_token` and `sb_refresh_token` cookies
   
2. **Student Login:** Uses bcrypt password hash
   - Validates admission_no/password against database
   - Sets `session_token` cookie

### Common Issues Checklist

- ✅ Backend deployed to Workers
- ✅ Frontend environment variables set
- ✅ CORS origins configured
- ✅ Routes match between frontend/backend
- ✅ CSRF handling configured (uses origin validation)
- ⚠️ Database has users (need to verify)
- ⚠️ Supabase environment variables set in Workers (need to verify)

### Testing URLs

- Backend Health: `https://ttti-ams-backend.kasitetlawrence33.workers.dev/health`
- Frontend: `https://1cd16e19.ttti-ams-frontend.pages.dev`
- Login Endpoint: `POST https://ttti-ams-backend.kasitetlawrence33.workers.dev/api/auth/login`

