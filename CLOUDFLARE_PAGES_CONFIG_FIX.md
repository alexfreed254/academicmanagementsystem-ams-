# Cloudflare Pages Configuration Fix

## Issue
The Cloudflare Pages build failed with error:
```
✘ [ERROR] Missing Pages project name. Use --project-name <name>
```

## Root Cause
The Cloudflare Pages build configuration has an incorrect deploy command that doesn't match the build directory structure.

## Solution

### Option 1: Use GitHub Actions (Recommended) ✅

**Disable Cloudflare Pages automatic builds** and let GitHub Actions handle deployments instead.

#### Steps:

1. **Go to Cloudflare Pages Dashboard:**
   - Navigate to: https://dash.cloudflare.com
   - Go to: Workers & Pages → ttti-ams-frontend → Settings → Builds & deployments

2. **Disable Automatic Deployments:**
   - Scroll to "Build configurations"
   - Click "Edit configuration"
   - **Disable "Automatic deployments"** or set "Build command" to empty

3. **Set GitHub Secrets:**
   Go to: https://github.com/alexfreed254/academicmanagementsystem-ams-/settings/secrets/actions
   
   Add these secrets:
   - `CLOUDFLARE_API_TOKEN` = [Your Cloudflare API token]
   - `CLOUDFLARE_ACCOUNT_ID` = [Your Cloudflare account ID]
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtieGFhd3V4bHljZXR4aWZsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njk4MDIsImV4cCI6MjA5NTE0NTgwMn0.8hjud3kF3WyLWpZy9R1f88DbyiRx37zAs4yLx4UUUAg`

   **Note:** The `VITE_API_BASE_URL` and `VITE_SUPABASE_URL` are now hardcoded in the workflow, so you don't need to add them as secrets.

4. **Trigger New Deployment:**
   ```bash
   git add .
   git commit -m "Fix Cloudflare Pages deployment configuration"
   git push origin main
   ```

   GitHub Actions will now handle the deployment automatically.

---

### Option 2: Fix Cloudflare Pages Build Configuration

If you prefer to keep using Cloudflare Pages automatic builds:

1. **Go to Cloudflare Pages Dashboard:**
   - Navigate to: Workers & Pages → ttti-ams-frontend → Settings → Builds & deployments

2. **Update Build Configuration:**
   
   **Build command:**
   ```bash
   cd frontend && npm install && npm run build
   ```
   
   **Build output directory:**
   ```
   frontend/dist
   ```
   
   **Root directory:**
   ```
   /
   ```

3. **Environment Variables (Production):**
   Make sure these are set under "Environment variables":
   - `VITE_API_BASE_URL` = `https://ttti-ams-backend.kasitetlawrence33.workers.dev`
   - `VITE_SUPABASE_URL` = `https://kbxaawuxlycetxifltxf.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `[your anon key]`

4. **Retry Deployment:**
   - Go to "Deployments" tab
   - Click "Retry deployment" on the failed build

---

## What I Fixed

### 1. Created `frontend/wrangler.toml`
Added proper Cloudflare Pages configuration with project name.

### 2. Updated GitHub Actions Workflow
Changed the workflow to:
- Hardcode environment URLs (not sensitive)
- Use correct project name: `ttti-ams-frontend`
- Build with proper environment variables

### 3. Deploy Command Fix
The workflow now uses:
```bash
npx wrangler pages deploy dist --project-name=ttti-ams-frontend
```

---

## Current Deployment Status

| Method | Status | Action Required |
|--------|--------|-----------------|
| GitHub Actions | ✅ Fixed | Set GitHub secrets |
| Cloudflare Pages Auto | ❌ Failed | Disable or fix config |

---

## Recommendation

**Use GitHub Actions (Option 1)** because:
1. ✅ Better control over environment variables
2. ✅ Consistent CI/CD pipeline (both backend and frontend)
3. ✅ Build logs in GitHub (easier to debug)
4. ✅ Can run tests before deployment
5. ✅ Can deploy backend and frontend together

---

## Next Steps

### If Using GitHub Actions (Recommended):

1. **Set GitHub Secrets** (see above)
2. **Disable Cloudflare Pages auto-builds** (optional but recommended)
3. **Push the latest code:**
   ```bash
   git add .
   git commit -m "Fix deployment configuration"
   git push origin main
   ```
4. **Monitor deployment:** https://github.com/alexfreed254/academicmanagementsystem-ams-/actions

### If Using Cloudflare Pages:

1. **Update build configuration** in Cloudflare dashboard (see Option 2)
2. **Verify environment variables** are set
3. **Retry the failed deployment**

---

## Testing After Deployment

Once deployment succeeds:

```bash
# Test frontend loads
curl -I https://1cd16e19.ttti-ams-frontend.pages.dev

# Test backend health
curl https://ttti-ams-backend.kasitetlawrence33.workers.dev/health

# Test in browser
# Open: https://1cd16e19.ttti-ams-frontend.pages.dev
# Try logging in
```

---

## Troubleshooting

### Error: "CLOUDFLARE_API_TOKEN not found"
→ Add the secret in GitHub repository settings

### Error: "Project not found"
→ Project name might be different. Check Cloudflare Pages dashboard for actual project name

### Build succeeds but deployment fails
→ Check that CLOUDFLARE_ACCOUNT_ID matches your Cloudflare account

### Frontend loads but API calls fail
→ Check that backend secrets are set (see `README_NEXT_STEPS.md`)

