// Rate limits kept in the database (rate_limits), so they hold across every
// server instance. Server-only.
import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/** The visitor's IP, hashed (only used as a counter key, never stored raw). */
export function visitorKey(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || request.headers.get('x-real-ip') || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

/**
 * Counts one hit on `key` and says whether it's within `max` per `windowSeconds`.
 * If the check itself fails, it allows the request rather than lock everyone out.
 */
export async function allow(admin: SupabaseClient, key: string, max: number, windowSeconds: number) {
  const { data, error } = await admin.rpc('rate_limit_hit', { p_key: key, p_max: max, p_window_seconds: windowSeconds })
  if (error) {
    console.error('[rate-limit] check failed', error.message)
    return true
  }
  return data === true
}

export async function clearLimit(admin: SupabaseClient, key: string) {
  await admin.rpc('rate_limit_clear', { p_key: key })
}
