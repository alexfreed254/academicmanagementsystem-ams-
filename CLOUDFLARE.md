# Cloudflare Workers Builds / Pages — monorepo note
#
# This repo is NOT a Python Worker. Ignore requirements.txt / runtime.txt /
# Procfile for Cloudflare builds. Use the Node build below.
#
# For the EXISTING project "academic-management-system254", set in the dashboard:
#
#   Root directory:     /          (repo root — leave blank)
#   Build command:      npm run build
#   Deploy command:     npx wrangler deploy
#   Build watch paths:  frontend/**
#
# Optional build variables:
#   VITE_API_BASE_URL = https://ttti-ams-api.<account>.workers.dev
#   VITE_LEGACY_ORIGIN = <flask-url-if-any>
#
# For the API, create a SECOND Workers project with:
#   Root directory:     workers
#   Build command:      npm ci
#   Deploy command:     npx wrangler deploy
