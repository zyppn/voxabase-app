// Removes B2 objects nothing points to anymore: files whose record was deleted
// or replaced, and uploads that were handed out but never finished.
// Server-only. Safe to run any time and more than once.
import type { SupabaseClient } from '@supabase/supabase-js'
import { b2Configured, deleteObject } from '@/lib/b2'

// An upload link lasts an hour; after this long an unfinished upload is abandoned
const STALE_UPLOAD_MS = 6 * 60 * 60 * 1000

export async function sweepB2(admin: SupabaseClient, limit = 25) {
  if (!b2Configured()) return
  const { data: gone } = await admin.from('storage_deletions').select('key, version').order('queued_at').limit(limit)
  for (const row of gone || []) {
    if (await deleteObject(row.key, row.version)) await admin.from('storage_deletions').delete().eq('key', row.key)
  }
  const cutoff = new Date(Date.now() - STALE_UPLOAD_MS).toISOString()
  const { data: stale } = await admin.from('pending_uploads').select('key').lt('created_at', cutoff).limit(limit)
  for (const row of stale || []) {
    if (await deleteObject(row.key)) await admin.from('pending_uploads').delete().eq('key', row.key)
  }
}
