# Deployment Instructions

## Important Note

This repository contains **both old Flask code (archived) and new Cloudflare-native code**:
- **Old Flask Backend**: Archived in `old-flask-archive/` (for reference only)
- **New Backend**: `backend/` - Hono on Cloudflare Workers
- **Frontend**: `frontend/` - React + Vite on Cloudflare Pages

## Prerequisites

1. **Cloudflare Account** - [Sign up](https://dash.cloudflare.com/sign-up)
2. **Wrangler CLI** - Install globally: `npm install -g wrangler`
3. **Node.js 18+** - [Download](https://nodejs.org/)

## Backend Deployment (Cloudflare Workers)

### First-Time Setup

```bash
# 1. Navigate to backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Login to Cloudflare
wrangler login

# 4. Create KV namespace for sessions
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create SESSIONS --preview

# Copy the IDs and update backend/wrangler.toml:
# [[kv_namespaces]]
# binding = "SESSIONS"
# id = "paste-production-id-here"
# preview_id = "paste-preview-id-here"

# 5. Set secrets
wrangler secret put SUPABASE_URL
# Enter your Supabase URL when prompted

wrangler secret put SUPABASE_ANON_KEY
# Enter your Supabase anon key

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Enter your Supabase service role key

wrangler secret put JWT_SECRET
# Enter a secure random string (min 32 chars)

wrangler secret put CSRF_SECRET
# Enter another secure random string (min 32 chars)
```

### Deploy

```bash
cd backend

# Deploy to production
npm run deploy:production

# Or deploy to staging
npm run deploy:staging

# Or just deploy (uses default environment)
npm run deploy
```

### Verify Deployment

After deployment, Wrangler will show you the Worker URL:
```
Published ttti-ams-backend (0.xx sec)
  https://ttti-ams-backend.your-subdomain.workers.dev
```

Test the health endpoint:
```bash
curl https://ttti-ams-backend.your-subdomain.workers.dev/health
```

Expected response:
```json
{
  "ok": true,
  "service": "ttti-ams-backend",
  "timestamp": "2025-01-27T14:30:00.000Z"
}
```

## Frontend Deployment (Cloudflare Pages)

### Via GitHub (Recommended)

1. **Connect Repository to Cloudflare Pages**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **Pages**
   - Click **Create a project** → **Connect to Git**
   - Select your repository: `academicmanagementsystem-ams-`
   - Configure build settings:
     - **Build command**: `cd frontend && npm install && npm run build`
     - **Build output directory**: `frontend/dist`
     - **Root directory**: `/` (leave empty)

2. **Environment Variables**:
   - Go to Settings → Environment variables
   - Add:
     - `VITE_API_BASE_URL` = Your Workers URL (e.g., `https://ttti-ams-backend.your-subdomain.workers.dev`)
     - `VITE_SUPABASE_URL` = Your Supabase URL
     - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

3. **Deploy**:
   - Pages will auto-deploy on every push to `main`
   - Or manually trigger deployment from dashboard

### Via Wrangler (Manual)

```bash
cd frontend

# Install dependencies
npm install

# Build
npm run build

# Deploy to Cloudflare Pages
npm run deploy

# Or with custom project name
wrangler pages deploy dist --project-name=ttti-ams-frontend
```

## Update CORS Settings

After deploying, update the backend CORS settings to include your production URLs:

1. Open `backend/src/index.ts`
2. Update the `origin` array in the CORS configuration:
```typescript
origin: (origin) => {
  const allowed = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://ttti-ams.pages.dev', // Your Pages preview
    'https://your-custom-domain.com', // Your production domain
  ];
  return allowed.includes(origin) ? origin : allowed[0];
},
```
3. Redeploy backend

## Custom Domain Setup

### For Backend (Workers)

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker: `ttti-ams-backend`
3. Go to **Triggers** tab
4. Click **Add Custom Domain**
5. Enter your domain (e.g., `api.yourdomain.com`)
6. Cloudflare will automatically create DNS records

### For Frontend (Pages)

1. Go to Cloudflare Dashboard → Pages
2. Select your project
3. Go to **Custom domains** tab
4. Click **Set up a custom domain**
5. Enter your domain (e.g., `ams.yourdomain.com`)
6. Follow DNS configuration instructions

## Monitoring & Logs

### View Logs

```bash
# Real-time logs
wrangler tail

# Or in the dashboard
# Workers & Pages → Your Worker → Logs
```

### Analytics

- Go to your Worker/Pages project in dashboard
- Navigate to **Analytics** tab
- View:
  - Requests per second
  - Error rates
  - CPU usage
  - Response times

## Rollback

If something goes wrong:

```bash
# List deployments
wrangler deployments list

# Rollback to previous deployment
wrangler rollback
```

## Troubleshooting

### Backend Won't Deploy

**Error**: `node_compat is deprecated`
- **Fix**: Update `wrangler.toml` to use `compatibility_flags = ["nodejs_compat"]`

**Error**: `Cannot find module`
- **Fix**: Run `npm install` in `backend/` folder
- **Fix**: Check `main = "src/index.ts"` path in `wrangler.toml`

**Error**: `Missing binding SESSIONS`
- **Fix**: Create KV namespace and update `wrangler.toml`
- Or comment out KV namespace section if not using sessions yet

### Frontend Build Fails

**Error**: `VITE_API_BASE_URL is not defined`
- **Fix**: Set environment variables in Cloudflare Pages dashboard

**Error**: `Module not found`
- **Fix**: Clear `node_modules`: `rm -rf node_modules && npm install`

### CORS Errors

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`
- **Fix**: Update CORS origins in `backend/src/index.ts`
- **Fix**: Ensure `credentials: true` in frontend API client

## CI/CD (GitHub Actions)

The repository includes GitHub Actions workflow (`.github/workflows/deploy.yml`).

### Setup:

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `CLOUDFLARE_API_TOKEN` - Create at [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
   - `CLOUDFLARE_ACCOUNT_ID` - Found in Workers & Pages → Account ID
   - `VITE_API_BASE_URL` - Your Workers URL
   - `VITE_SUPABASE_URL` - Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

3. Push to `main` branch → Auto-deploy!

## Cost Estimation

### Free Tier Limits

**Cloudflare Workers**:
- ✅ 100,000 requests/day
- ✅ 10ms CPU time per request
- ✅ Unlimited workers

**Cloudflare Pages**:
- ✅ 500 builds/month
- ✅ Unlimited requests
- ✅ Unlimited bandwidth

**Supabase**:
- ✅ 500MB database
- ✅ 1GB file storage
- ✅ 2GB bandwidth

**Estimated Cost**: $0/month for small to medium usage

### Paid Plans

If you exceed free tier:
- **Workers Bundled**: $5/month (10M requests)
- **Pages Pro**: $20/month (5,000 builds)
- **Supabase Pro**: $25/month (8GB database)

## Support

- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/
- **Discord**: Cloudflare Developers Discord

---

**Last Updated**: January 27, 2025
