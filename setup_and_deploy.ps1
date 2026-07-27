# Complete setup and deployment script for TTTI AMS
# This script initializes Git, archives old files, and pushes to GitHub

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "TTTI AMS - Setup and Deploy" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Archive old Flask files
Write-Host "[1/5] Archiving old Flask files..." -ForegroundColor Green
& .\archive_old_files.ps1
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "❌ Failed to archive files" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Initialize Git (if not already)
Write-Host "[2/5] Initializing Git repository..." -ForegroundColor Green
if (-not (Test-Path ".git")) {
    git init
    Write-Host "  ✓ Git initialized" -ForegroundColor Gray
} else {
    Write-Host "  ✓ Git already initialized" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Create README.md if it doesn't exist
Write-Host "[3/5] Checking README.md..." -ForegroundColor Green
if (-not (Test-Path "README.md")) {
    Write-Host "# academicmanagementsystem-ams-" | Out-File -FilePath "README.md" -Encoding UTF8
    Write-Host "  ✓ README.md created" -ForegroundColor Gray
} else {
    Write-Host "  ✓ README.md exists" -ForegroundColor Gray
}
Write-Host ""

# Step 4: Stage and commit
Write-Host "[4/5] Staging and committing files..." -ForegroundColor Green
git add .
git commit -m "Migrate to Cloudflare-native architecture (Hono + React + Vite)

- Added Hono backend for Cloudflare Workers
- Enhanced React frontend with TypeScript
- Preserved Supabase database, auth, and storage
- Migrated from Flask + Jinja2 to modern stack
- Added comprehensive documentation and migration guide
- Archived old Flask files for reference"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Files committed" -ForegroundColor Gray
} else {
    Write-Host "  ℹ Nothing to commit or commit failed" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Push to GitHub
Write-Host "[5/5] Pushing to GitHub..." -ForegroundColor Green
git branch -M main
git remote remove origin 2>$null  # Remove if exists
git remote add origin https://github.com/alexfreed254/academicmanagementsystem-ams-.git

Write-Host "  Pushing to remote..." -ForegroundColor Gray
git push -u origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Pushed to GitHub successfully" -ForegroundColor Gray
} else {
    Write-Host "  ⚠ Push failed - you may need to authenticate or check repository access" -ForegroundColor Yellow
    Write-Host "    Run: git push -u origin main" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repository: https://github.com/alexfreed254/academicmanagementsystem-ams-" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Setup environment variables (see QUICK_START.md)"
Write-Host "  2. Install dependencies:"
Write-Host "     cd backend && npm install"
Write-Host "     cd frontend && npm install"
Write-Host "  3. Start development servers:"
Write-Host "     Backend:  cd backend && npm run dev"
Write-Host "     Frontend: cd frontend && npm run dev"
Write-Host "  4. Deploy to Cloudflare:"
Write-Host "     Backend:  cd backend && npm run deploy:production"
Write-Host "     Frontend: cd frontend && npm run deploy"
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  📖 Quick Start:    QUICK_START.md"
Write-Host "  📖 Full Docs:      README.md"
Write-Host "  📖 Migration:      MIGRATION_GUIDE.md"
Write-Host ""
