/**
 * Cloudflare Workers Builds / local deploy:
 * 1) Install + build React SPA → frontend/dist
 * 2) wrangler deploy (serves SPA Assets + Hono /api)
 *
 * Dashboard Deploy command MUST be: npm run deploy
 * (plain `npx wrangler deploy` fails — frontend/dist does not exist yet)
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const frontend = join(root, 'frontend')

function run(cmd, args, cwd = root) {
  console.log(`\n> ${cmd} ${args.join(' ')}  (cwd: ${cwd})`)
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true, env: process.env })
  if (r.status !== 0) {
    process.exit(r.status ?? 1)
  }
}

if (!existsSync(join(frontend, 'package.json'))) {
  console.error('frontend/package.json not found')
  process.exit(1)
}

// Prefer npm ci when lockfile exists; fall back to install (CI / bun environments)
const lock = join(frontend, 'package-lock.json')
if (existsSync(lock)) {
  run('npm', ['ci', '--no-fund', '--no-audit'], frontend)
} else {
  run('npm', ['install', '--no-fund', '--no-audit'], frontend)
}

run('npm', ['run', 'build'], frontend)

const distIndex = join(frontend, 'dist', 'index.html')
if (!existsSync(distIndex)) {
  console.error('Build failed: frontend/dist/index.html missing')
  process.exit(1)
}

console.log('\nfrontend/dist ready — deploying Worker (SPA + API)...')
run('npx', ['wrangler', 'deploy'], root)
