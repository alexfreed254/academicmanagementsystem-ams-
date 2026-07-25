/**
 * Werkzeug-compatible password hash verification.
 *
 * Student passwords were created by Flask with werkzeug.security.generate_password_hash
 * and are stored as either:
 *   pbkdf2:sha256:<iterations>$<salt>$<hex-digest>
 *   scrypt:<N>:<r>:<p>$<salt>$<hex-digest>
 *
 * Supporting both means no student has to reset their password after migration.
 */
import { scrypt } from 'scrypt-js'

const encoder = new TextEncoder()

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return out
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function verifyPbkdf2(
  method: string,
  salt: string,
  expectedHex: string,
  password: string,
): Promise<boolean> {
  // method is like "pbkdf2:sha256:600000" (iterations may be omitted → 260000 default)
  const parts = method.split(':')
  const hashName = (parts[1] ?? 'sha256').toLowerCase()
  const iterations = parts[2] ? parseInt(parts[2], 10) : 260000
  const subtleHash = hashName === 'sha1' ? 'SHA-1' : hashName === 'sha512' ? 'SHA-512' : 'SHA-256'

  const expected = hexToBytes(expectedHex)
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: subtleHash, salt: encoder.encode(salt), iterations },
    key,
    expected.length * 8,
  )
  return timingSafeEqual(new Uint8Array(bits), expected)
}

async function verifyScrypt(
  method: string,
  salt: string,
  expectedHex: string,
  password: string,
): Promise<boolean> {
  // method is like "scrypt:32768:8:1"
  const parts = method.split(':')
  const N = parseInt(parts[1] ?? '32768', 10)
  const r = parseInt(parts[2] ?? '8', 10)
  const p = parseInt(parts[3] ?? '1', 10)
  const expected = hexToBytes(expectedHex)
  const derived = await scrypt(encoder.encode(password), encoder.encode(salt), N, r, p, expected.length)
  return timingSafeEqual(new Uint8Array(derived), expected)
}

/** Equivalent of werkzeug.security.check_password_hash. */
export async function checkWerkzeugHash(storedHash: string, password: string): Promise<boolean> {
  if (!storedHash || !password) return false
  const segments = storedHash.split('$')
  if (segments.length !== 3) return false
  const [method, salt, digest] = segments
  try {
    if (method.startsWith('pbkdf2')) return await verifyPbkdf2(method, salt, digest, password)
    if (method.startsWith('scrypt')) return await verifyScrypt(method, salt, digest, password)
    return false
  } catch {
    return false
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Werkzeug-compatible pbkdf2:sha256 hash for student password updates. */
export async function generateWerkzeugHash(password: string, iterations = 600000): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16))
  const salt = bytesToHex(saltBytes)
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations },
    key,
    256,
  )
  return `pbkdf2:sha256:${iterations}$${salt}$${bytesToHex(new Uint8Array(bits))}`
}
