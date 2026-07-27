# Final Deployment Steps - Fix 405 Error

## ✅ What I Just Fixed

1. **Updated frontend API routes**: Changed `/api/v1/auth/login` → `/api/auth/login`
2. **Fixed request body format**: Changed `login_type` → `user_type`
3. **Fixed response format**: Changed `data.data.user` → `data.user`

## 🚀 Now Complete These Steps

### Step 1: Commit and Push Changes

```bash
cd "C:\Users\user\Desktop\ACADEMIC MANAGEMENT SYSTEM"

git add .
git commit -m "Fix API routes and request format for Hono backend"
git push
```

### Step 2: Add Environment Variable to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → `ttti-ams-frontend`
3. Go to **Settings** → **Environment variables**
4. Click **Add variable**
5. Add:
   ```
   Variable name: VITE_API_BASE_URL
   Value: https://ttti-ams-backend.kasitetlawrence33.workers.dev
   ```
6. Click **Save**

### Step 3: Redeploy Frontend

After saving environment variables:
1. Go to **Deployments** tab
2. Click the **three dots (...)** on the latest deployment
3. Click **Retry deployment**

OR just push again (GitHub will trigger rebuild):
```bash
git push
```

### Step 4: Deploy Backend (If Not Already Done)

```bash
cd backend

# Install dependencies
npm install

# Deploy
npx wrangler deploy
```

If you get errors about missing secrets, set them:
```bash
npx wrangler secret put SUPABASE_URL
# Enter: https://kbxaawuxlycetxifltxf.supabase.co

npx wrangler secret put SUPABASE_ANON_KEY
# Get from Supabase Dashboard → Project Settings → API

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Get from Supabase Dashboard → Project Settings → API

# Generate random secrets (run this in PowerShell):
# [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

npx wrangler secret put JWT_SECRET
# Paste generated secret

npx wrangler secret put CSRF_SECRET
# Generate and paste another secret
```

### Step 5: Verify Backend is Working

```bash
curl https://ttti-ams-backend.kasitetlawrence33.workers.dev/health
```

Expected response:
```json
{"ok":true,"service":"ttti-ams-backend","timestamp":"2025-..."}
```

### Step 6: Test Login

1. Open: https://1cd16e19.ttti-ams-frontend.pages.dev
2. Open browser DevTools (F12) → Console tab
3. Try to login
4. Check the console for any errors

## 🎯 Expected Result

After all steps complete:
- ✅ Frontend calls correct API endpoint: `/api/auth/login`
- ✅ Backend responds with user data
- ✅ Login successful, redirects to dashboard
- ✅ No CORS errors
- ✅ No 405 errors

## 🔍 Still Getting 405?

If you still get 405 after completing all steps:

1. **Check browser console** - what URL is it calling?
2. **Check Network tab** - look at the request details
3. **Verify backend URL** - make sure environment variable is correct
4. **Clear browser cache** - Hard refresh with Ctrl+Shift+R

## 📊 Deployment Checklist

- [ ] Frontend changes committed and pushed
- [ ] Backend deployed to Workers
- [ ] Secrets set in backend (5 secrets)
- [ ] Environment variable added to Pages (VITE_API_BASE_URL)
- [ ] Frontend redeployed with new env var
- [ ] Backend health check returns 200 OK
- [ ] Login page loads without errors
- [ ] Login request goes to correct URL
- [ ] Login succeeds and redirects

---

**After completing all steps, login should work! 🎉**
