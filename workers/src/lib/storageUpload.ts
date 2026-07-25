import type { SupabaseClient } from '@supabase/supabase-js'

/** Decode base64 payload (no data: prefix) to Uint8Array for Supabase Storage upload. */
export function decodeBase64Payload(base64: string): Uint8Array {
  const clean = base64.includes(',') ? base64.split(',').pop()! : base64
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function uploadBytes(
  db: SupabaseClient,
  bucket: string,
  path: string,
  data: Uint8Array,
  contentType: string,
) {
  const { error } = await db.storage.from(bucket).upload(path, data, {
    contentType,
    upsert: false,
  })
  if (error) throw new Error(error.message)
}

export function fileSlug(text: unknown): string {
  return (
    String(text ?? '')
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^[_-]+|[_-]+$/g, '') || 'unknown'
  )
}
