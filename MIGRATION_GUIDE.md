# TTTI AMS - Cloudflare Migration Guide

## Overview
This guide documents the migration from Flask + Jinja2 to Cloudflare-native architecture:
- **Frontend**: React + Vite + TypeScript → Cloudflare Pages
- **Backend**: Hono + TypeScript → Cloudflare Workers
- **Database**: Supabase (unchanged)
- **Storage**: Supabase Storage (unchanged)
- **Auth**: Supabase Auth (unchanged)

## Project Structure

```
/
├── backend/                    # Cloudflare Workers (Hono API)
│   ├── src/
│   │   ├── index.ts           # Main entry point
│   │   ├── middleware/        # Auth, CSRF, rate limiting
│   │   ├── routes/            # API route modules
│   │   ├── lib/               # Utilities (auth, supabase, validators)
│   │   └── durable-objects/   # Real-time features
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml          # Cloudflare Workers config
│
├── frontend/                   # React SPA (existing, enhanced)
│   ├── src/
│   │   ├── pages/             # All role pages
│   │   ├── components/        # Reusable UI components
│   │   ├── api/               # API client functions
│   │   ├── lib/               # Utilities
│   │   └── layouts/           # Portal shells
│   ├── package.json
│   └── vite.config.ts
│
├── .env.example               # Environment variables template
├── README.md                  # Updated documentation
└── MIGRATION_GUIDE.md         # This file
```

## Migration Phases

### Phase 1: Infrastructure Setup ✅ (Current)
- [x] Backend project structure
- [x] Hono application scaffold
- [x] Authentication middleware
- [x] Supabase client setup
- [x] Rate limiting
- [x] CORS & CSRF protection
- [ ] Wrangler configuration
- [ ] Environment variables setup

### Phase 2: Core API Migration (Weeks 1-2)
- [ ] Auth routes (login, logout, profile)
- [ ] Student dashboard & profile
- [ ] Trainer dashboard & attendance
- [ ] Department admin core routes
- [ ] Super admin core routes

### Phase 3: Advanced Features (Weeks 3-4)
- [ ] Assessment review workflow
- [ ] Marks entry and import
- [ ] Exam bookings
- [ ] File upload (Storage integration)
- [ ] PDF generation (using Workers)

### Phase 4: Specialized Roles (Weeks 5-6)
- [ ] Exam Officer routes
- [ ] Industry Mentor routes
- [ ] Internal Verifier routes
- [ ] Liaison Officer routes
- [ ] CDACC Verifier routes
- [ ] Workshop Technician routes
- [ ] Admin Oversight routes
- [ ] Service Department routes

### Phase 5: Complex Workflows (Weeks 7-8)
- [ ] Clearance multi-stage workflow
- [ ] Industrial attachment workflow
- [ ] Digital logbook
- [ ] Competency tracking
- [ ] GPS tracking integration
- [ ] Biometric attendance (Durable Objects)

### Phase 6: Frontend Migration (Weeks 9-14)
- [ ] Port all Jinja templates to React components
- [ ] Form components with validation
- [ ] Table components with sorting/filtering
- [ ] File upload UI
- [ ] PDF viewer
- [ ] Charts and analytics
- [ ] Notifications system
- [ ] Real-time features

### Phase 7: Testing & Optimization (Weeks 15-16)
- [ ] Unit tests (Vitest)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing

### Phase 8: Deployment (Week 17)
- [ ] Cloudflare Workers production deploy
- [ ] Cloudflare Pages production deploy
- [ ] Custom domain setup
- [ ] SSL/TLS configuration
- [ ] Monitoring & logging
- [ ] Backup strategy

## Key Differences from Flask

### Authentication
**Flask (before)**:
```python
@login_required
@role_required('trainer')
def trainer_dashboard():
    user = current_user()
    # ...
```

**Hono (after)**:
```typescript
trainer.use('*', roleRequired('trainer'));

trainer.get('/dashboard', async (c) => {
  const user = getCurrentUser(c);
  // ...
});
```

### Database Queries
**Flask (before)**:
```python
svc = get_service_client()
res = svc.table("attendance").select("*").eq("student_id", user_id).execute()
```

**Hono (after)**:
```typescript
const client = getUserClient(env, accessToken);
const { data } = await client
  .from('attendance')
  .select('*')
  .eq('student_id', userId);
```

### File Uploads
**Flask (before)**:
```python
file = request.files['file']
path = f"scripts/{user_id}/{uuid4()}_{file.filename}"
svc.storage.from_("assessment-scripts").upload(path, file.read())
```

**Hono (after)**:
```typescript
const formData = await c.req.formData();
const file = formData.get('file') as File;
const buffer = await file.arrayBuffer();
const path = `scripts/${userId}/${nanoid()}_${file.name}`;
await client.storage.from('assessment-scripts').upload(path, buffer);
```

### Session Management
**Flask (before)**:
```python
session[SESSION_USER] = safe_profile
session[SESSION_ACCESS] = access_token
```

**Hono (after)**:
```typescript
setCookie(c, 'sb_access_token', accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
});
```

## Environment Variables

Create `.env` files for both backend and frontend:

### Backend (`backend/.env`)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
CSRF_SECRET=your-csrf-secret
ENVIRONMENT=development
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8787
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Deployment

### Backend (Cloudflare Workers)
```bash
cd backend
npm install
npm run deploy:production
```

### Frontend (Cloudflare Pages)
```bash
cd frontend
npm install
npm run build
wrangler pages deploy dist
```

## Testing Strategy

### Unit Tests
- Test all utility functions
- Test authentication logic
- Test validation schemas
- Test business logic helpers

### Integration Tests
- Test API endpoints
- Test database interactions
- Test file upload/download
- Test PDF generation

### E2E Tests
- Test complete user workflows
- Test role-based access
- Test multi-step processes (clearance, attachment)
- Test real-time features

## Performance Considerations

### Cloudflare Workers Limits
- CPU time: 50ms (can be increased)
- Memory: 128MB
- Request size: 100MB
- Subrequest limit: 50 per request

### Optimization Strategies
- Use parallel queries (`Promise.all()`)
- Implement pagination (limit 100 items)
- Cache frequently accessed data
- Use Durable Objects for real-time features
- Minimize JSON payload sizes

## Security Checklist

- [x] HTTPS only in production
- [x] HttpOnly cookies for sessions
- [x] CSRF protection on all mutations
- [x] Rate limiting on auth endpoints
- [x] Input validation (Zod schemas)
- [ ] SQL injection prevention (Supabase handles this)
- [ ] XSS prevention (React handles this)
- [ ] File upload validation
- [ ] JWT expiration handling
- [ ] RLS policies (existing)

## Rollback Plan

If critical issues arise:
1. Keep Flask backend running in parallel
2. Use feature flags to switch between old/new frontend
3. Monitor error rates and performance
4. Have database backup ready
5. Document all configuration changes

## Support & Resources

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Hono Documentation: https://hono.dev/
- Supabase JS Client: https://supabase.com/docs/reference/javascript/
- React Query: https://tanstack.com/query/latest

## Timeline

- **Total Duration**: 17 weeks (4 months)
- **Team Size**: 2-3 developers recommended
- **Milestones**:
  - Week 4: Core features operational
  - Week 8: All backend routes migrated
  - Week 14: Frontend migration complete
  - Week 16: Testing complete
  - Week 17: Production deployment

## Next Steps

1. Review and approve this migration plan
2. Set up Cloudflare account and configure Workers
3. Create KV namespaces for session storage
4. Configure wrangler.toml with production values
5. Begin Phase 2: Core API Migration
