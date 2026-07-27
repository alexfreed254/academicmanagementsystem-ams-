# Cloudflare Deployment Fix

## Issue

The Cloudflare Pages automatic deployment was failing because:
1. It detected Python (from archived Flask files) and tried to install Python dependencies
2. It ran `npx wrangler deploy` from the **root** directory
3. The old `wrangler.toml` had deprecated `node_compat` setting (Wrangler v4+ incompatible)

## Solution

### 1. ✅ Fixed `wrangler.toml` Configuration

**Before (deprecated)**:
```toml
node_compat = true
```

**After (Wrangler v4 compatible)**:
```toml
compatibility_flags = ["nodejs_compat"]
```

### 2. ✅ Moved `wrangler.toml` to Backend Folder

- **Old location**: Root `/wrangler.toml` (causing confusion)
- **New location**: `/backend/wrangler.toml` (proper structure)
- **Reason**: Workers should deploy from backend folder only

### 3. ✅ Added `.cfignore` File

Created `.cfignore` to prevent uploading unnecessary files to Workers:
- Old Flask archive
- Frontend files (deployed separately)
- Python files
- Documentation
- SQL migrations

### 4. ✅ Created Proper Deployment Instructions

Added **[DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md)** with:
- Step-by-step backend deployment
- Step-by-step frontend deployment
- Secret management
- Custom domain setup
- Troubleshooting guide

## Correct Deployment Process

### Option 1: Deploy via Cloudflare Pages Dashboard (Recommended for Frontend)

**Frontend Only**:
1. Connect GitHub repo to Cloudflare Pages
2. Set build command: `cd frontend && npm install && npm run build`
3. Set build output: `frontend/dist`
4. Add environment variables in Pages dashboard
5. Auto-deploys on every push to `main`

**Backend Not Deployed via Pages** - Use Wrangler CLI instead (see below)

### Option 2: Deploy via Wrangler CLI (Recommended for Backend)

**Backend**:
```bash
cd backend

# First time setup
npm install
wrangler login
wrangler kv:namespace create SESSIONS

# Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put JWT_SECRET
wrangler secret put CSRF_SECRET

# Deploy
npm run deploy:production
```

**Frontend** (alternative to Pages dashboard):
```bash
cd frontend
npm install
npm run build
wrangler pages deploy dist --project-name=ttti-ams-frontend
```

### Option 3: Use GitHub Actions (CI/CD)

Already configured in `.github/workflows/deploy.yml`:
1. Add secrets to GitHub repo:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - Environment variables
2. Push to `main` → Auto-deploy both backend and frontend

## Project Structure

```
/
├── backend/                    # Deploy to Workers
│   ├── src/
│   ├── package.json
│   └── wrangler.toml          # ✅ Workers config here
│
├── frontend/                   # Deploy to Pages
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── old-flask-archive/          # ❌ Don't deploy (archived)
├── .cfignore                   # ✅ Tells Workers what to ignore
└── wrangler.toml               # ❌ Removed (was causing issues)
```

## What Changed

1. ✅ **Removed** root `wrangler.toml`
2. ✅ **Created** `backend/wrangler.toml` with correct v4 settings
3. ✅ **Added** `.cfignore` to exclude old Flask files
4. ✅ **Updated** `compatibility_flags = ["nodejs_compat"]` (v4 compatible)
5. ✅ **Commented out** KV namespace and Durable Objects (setup later)
6. ✅ **Created** `DEPLOYMENT_INSTRUCTIONS.md` guide
7. ✅ **Updated** README with deployment links

## Verification

After fixing, you can verify:

```bash
# 1. Check backend config
cd backend
cat wrangler.toml  # Should show nodejs_compat flag

# 2. Test local backend
npm install
npm run dev  # Should start on localhost:8787

# 3. Deploy backend
npm run deploy:production

# 4. Test deployment
curl https://your-worker-url.workers.dev/health
# Should return: {"ok":true,"service":"ttti-ams-backend","timestamp":"..."}
```

## Next Steps

1. **Setup Cloudflare Pages** for frontend:
   - Go to Pages dashboard
   - Connect GitHub repo
   - Configure build settings
   - Add environment variables

2. **Deploy Backend via Wrangler**:
   ```bash
   cd backend
   npm run deploy:production
   ```

3. **Update CORS** in backend:
   - Add your Pages URL to allowed origins
   - Redeploy backend

4. **Test End-to-End**:
   - Open frontend URL
   - Try logging in
   - Check API calls in Network tab

## Troubleshooting

**Issue**: "node_compat is deprecated"  
**Fix**: ✅ Already fixed - using `compatibility_flags = ["nodejs_compat"]`

**Issue**: "Cannot find module src/index.ts"  
**Fix**: ✅ Already fixed - deploying from `backend/` folder

**Issue**: "Python dependencies found"  
**Fix**: ✅ Already fixed - `.cfignore` excludes Python files

**Issue**: "Missing binding SESSIONS"  
**Fix**: Create KV namespace or comment out in wrangler.toml (already commented)

---

**All issues fixed and pushed to GitHub** ✅

Repository: https://github.com/alexfreed254/academicmanagementsystem-ams-
