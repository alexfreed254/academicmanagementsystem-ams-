/**
 * Cloudflare Workers Builds / local deploy:
 * 1) Install Worker deps at repo root (hono, supabase, …)
 * 2) Install + build React SPA → frontend/dist
 * 3) wrangler deploy (SPA Assets + Hono /api)
 *
 * Dashboard Deploy command MUST be: npm run deploy
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const frontend = join(root, 'frontend')
const workers = join(root, 'workers')

function run(cmd, args, cwd = root) {
  console.log(`\n> ${cmd} ${args.join(' ')}  (cwd: ${cwd})`)
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true, env: process.env })
  if (r.status !== 0) {
    process.exit(r.status ?? 1)
  }
}

function npmInstall(cwd) {
  const lock = join(cwd, 'package-lock.json')
  if (existsSync(lock)) {
    run('npm', ['ci', '--no-fund', '--no-audit'], cwd)
  } else {
    run('npm', ['install', '--no-fund', '--no-audit'], cwd)
  }
}

// Root deps: hono / supabase / zod / scrypt-js (wrangler bundles from repo root)
console.log('\nInstalling Worker API dependencies (repo root)...')
npmInstall(root)

// Also install workers/ so local `cd workers && wrangler` keeps working
if (existsSync(join(workers, 'package.json'))) {
  console.log('\nInstalling workers/ package dependencies...')
  npmInstall(workers)
}

if (!existsSync(join(frontend, 'package.json'))) {
  console.error('frontend/package.json not found')
  process.exit(1)
}

console.log('\nBuilding React SPA...')
npmInstall(frontend)
run('npm', ['run', 'build'], frontend)

const distIndex = join(frontend, 'dist', 'index.html')
if (!existsSync(distIndex)) {
  console.error('Build failed: frontend/dist/index.html missing')
  process.exit(1)
}

console.log('\nfrontend/dist ready — deploying Worker (SPA + API)...')
run('npx', ['wrangler', 'deploy'], root)
