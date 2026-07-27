# Archive old Flask files that are being replaced by the Cloudflare-native architecture
# This script moves Flask-specific files to an archive folder for reference

$archiveDir = ".\old-flask-archive"
Write-Host "Creating archive directory: $archiveDir" -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null

# Flask application files
$flaskFiles = @(
    "app.py",
    "extensions.py",
    "auth_utils.py",
    "db.py",
    "security_utils.py",
    "utils.py",
    "grading_utils.py",
    "stats_utils.py",
    "notifications.py",
    "report_utils.py",
    "unit_attendance_register.py",
    "exam_booking_form1a.py",
    "academic_result_transcript.py",
    "add_footer_to_dashboards.py"
)

# Move Flask files
Write-Host "`nArchiving Flask application files..." -ForegroundColor Yellow
foreach ($file in $flaskFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination $archiveDir -Force
        Write-Host "  ✓ Archived: $file" -ForegroundColor Gray
    }
}

# Archive routes folder
if (Test-Path "routes") {
    Write-Host "`nArchiving routes folder..." -ForegroundColor Yellow
    Move-Item -Path "routes" -Destination "$archiveDir\routes" -Force
    Write-Host "  ✓ Archived: routes/" -ForegroundColor Gray
}

# Archive templates folder
if (Test-Path "templates") {
    Write-Host "`nArchiving templates folder..." -ForegroundColor Yellow
    Move-Item -Path "templates" -Destination "$archiveDir\templates" -Force
    Write-Host "  ✓ Archived: templates/" -ForegroundColor Gray
}

# Archive static folder (if not used by frontend)
if (Test-Path "static") {
    Write-Host "`nArchiving static folder..." -ForegroundColor Yellow
    Move-Item -Path "static" -Destination "$archiveDir\static" -Force
    Write-Host "  ✓ Archived: static/" -ForegroundColor Gray
}

# Keep requirements.txt for reference
if (Test-Path "requirements.txt") {
    Copy-Item -Path "requirements.txt" -Destination "$archiveDir\requirements.txt"
    Write-Host "`n  ✓ Copied requirements.txt to archive (for reference)" -ForegroundColor Gray
}

# Keep render.yaml for reference
if (Test-Path "render.yaml") {
    Copy-Item -Path "render.yaml" -Destination "$archiveDir\render.yaml"
    Write-Host "  ✓ Copied render.yaml to archive (for reference)" -ForegroundColor Gray
}

Write-Host "`n✅ Archive complete! Old Flask files moved to: $archiveDir" -ForegroundColor Green
Write-Host "`nNew structure:" -ForegroundColor Cyan
Write-Host "  📁 backend/    - Cloudflare Workers (Hono API)"
Write-Host "  📁 frontend/   - React + Vite SPA"
Write-Host "  📁 $archiveDir/ - Old Flask files (for reference)"
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. cd backend && npm install && npm run dev"
Write-Host "  2. cd frontend && npm install && npm run dev"
Write-Host "  3. See QUICK_START.md for full setup guide"
