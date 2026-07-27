# TTTI AMS - Quick Start Guide

Get the TTTI Academic Management System running in under 10 minutes.

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- Git ([download](https://git-scm.com/))
- Cloudflare account (free tier: [signup](https://dash.cloudflare.com/sign-up))
- Supabase project ([create one](https://supabase.com/dashboard))

## Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/alexfreed254/academicmanagementsystem-ams-.git
cd academicmanagementsystem-ams-
```

## Step 2: Backend Setup (Cloudflare Workers)

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
```

Edit `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=generate-a-32-char-secret-here
CSRF_SECRET=generate-a-32-char-secret-here
ENVIRONMENT=development
```

**Generate secrets**:
```bash
# On Unix/Mac/Linux
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Start backend:
```bash
npm run dev
```

✅ Backend running at **http://localhost:8787**

## Step 3: Frontend Setup (React + Vite)

Open a new terminal:

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8787
VITE_SOCKET_URL=ws://localhost:8787
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Start frontend:
```bash
npm run dev
```

✅ Frontend running at **http://localhost:5173**

## Step 4: Database Setup (Supabase)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to **SQL Editor**
4. Run your schema file (`supabase_schema.sql`) or create the tables manually
5. Go to **Storage** → Create buckets:
   - `assessment-scripts` (public)
   - `assessment-evidence` (public)
   - `documents` (private)
   - `application-documents` (private)

## Step 5: Create Super Admin

In Supabase dashboard:

1. Go to **Authentication** → **Users** → **Add user**
   - Email: `admin@ttti.ac.ke`
   - Password: (set a strong password)
   - Confirm Email: Yes

2. Copy the user's UUID

3. Go to **SQL Editor** and run:
```sql
INSERT INTO user_profiles (id, full_name, email, role, is_active)
VALUES ('paste-uuid-here', 'Super Admin', 'admin@ttti.ac.ke', 'super_admin', TRUE)
ON CONFLICT (id) DO UPDATE 
SET role = 'super_admin', is_active = TRUE;
```

## Step 6: Test Login

1. Open browser: **http://localhost:5173**
2. Click **Staff Login**
3. Enter:
   - Email: `admin@ttti.ac.ke`
   - Password: (the password you set)
4. Click **Login**

✅ You should see the Super Admin dashboard!

## Troubleshooting

### "Cannot connect to database"
- Check `SUPABASE_URL` is correct
- Verify `SUPABASE_ANON_KEY` is correct
- Ensure your Supabase project is not paused

### "CORS error"
- Check `VITE_API_BASE_URL` matches your backend URL
- Ensure backend is running on port 8787
- Clear browser cache

### "Invalid JWT secret"
- Ensure `JWT_SECRET` is at least 32 characters
- Don't use spaces or special characters that need escaping
- Regenerate if unsure

### Backend won't start
```bash
# Clear node_modules and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Frontend won't start
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Next Steps

### Development
- **Backend**: Add more routes in `backend/src/routes/`
- **Frontend**: Create pages in `frontend/src/pages/`
- **Documentation**: See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

### Deployment
- **Backend**: `cd backend && npm run deploy:production`
- **Frontend**: `cd frontend && npm run deploy`
- **CI/CD**: Push to GitHub (automatic deployment via Actions)

## Common Tasks

### Add a new API endpoint
```typescript
// backend/src/routes/student.ts
student.get('/my-endpoint', async (c) => {
  const user = getCurrentUser(c);
  // ... your logic
  return c.json({ ok: true, data: {} });
});
```

### Add a new React page
```tsx
// frontend/src/pages/student/MyPage.tsx
export default function MyPage() {
  return <div>My New Page</div>;
}

// frontend/src/App.tsx - add route
<Route path="/student/my-page" element={<MyPage />} />
```

### Query the database
```typescript
const client = getUserClient(env, accessToken);
const { data, error } = await client
  .from('your_table')
  .select('*')
  .eq('column', value);
```

## Support

- 📖 Full docs: [README.md](./README.md)
- 🔧 Migration guide: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- 💬 Issues: [GitHub Issues](https://github.com/alexfreed254/academicmanagementsystem-ams-/issues)

---

**Happy coding! 🚀**
