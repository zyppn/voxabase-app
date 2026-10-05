// Moves files uploaded before the switch from Supabase Storage to B2, a few at
// a time (the storage page keeps calling until none are left). Each file is
// copied, checked, and its record switched over before the Supabase copy is
// removed, so a failure part-way leaves the file where it was, still working.
// GET: how many are left. POST: move the next batch.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { B2_CAP_BYTES, b2Configured, deleteObject, headObject, newObjectKey, presign } from '@/lib/b2'
import { hasThumbnail, storageSafeName } from '@/lib/files'

export const maxDuration = 60
// Stop starting new files after this long, to finish inside the time limit
const BUDGET_MS = 40_000

type OldFile = { id: string; portal_id: string; user_id: string; name: string; file_path: string; file_size: number | null; file_type: string | null }

async function signedIn() {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}

async function remaining(admin: SupabaseClient) {
  const { data } = await admin.from('files').select('file_size').eq('storage', 'supabase')
  return { files: data?.length ?? 0, bytes: (data || []).reduce((n, f) => n + Number(f.file_size || 0), 0) }
}

export async function GET() {
  if (!(await signedIn())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await remaining(supabaseAdmin()))
}

export async function POST() {
  if (!(await signedIn())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!b2Configured()) return NextResponse.json({ error: 'Backblaze isn’t set up yet.' }, { status: 400 })
  const admin = supabaseAdmin()
  const started = Date.now()
  const { data: batch } = await admin.from('files')
    .select('id, portal_id, user_id, name, file_path, file_size, file_type')
    .eq('storage', 'supabase').order('created_at').limit(20)

  let moved = 0
  const failed: string[] = []
  for (const file of (batch || []) as OldFile[]) {
    if (Date.now() - started > BUDGET_MS) break
    const result = await moveOne(admin, file)
    if (result === 'cap_full') {
      return NextResponse.json({ moved, failed, ...(await remaining(admin)), error: 'Backblaze storage is full (9.5 GB cap). The rest stay in Supabase.' })
    }
    if (result === 'ok') moved++
    else failed.push(file.name)
  }
  return NextResponse.json({ moved, failed, ...(await remaining(admin)) })
}

async function moveOne(admin: SupabaseClient, file: OldFile): Promise<'ok' | 'failed' | 'cap_full'> {
  const { data: used } = await admin.rpc('b2_storage_bytes')
  if (Number(used || 0) + Number(file.file_size || 0) > B2_CAP_BYTES) return 'cap_full'

  const { data: blob, error } = await admin.storage.from('deliverables').download(file.file_path)
  if (error || !blob) {
    console.error('[migrate] download failed', file.id, error?.message)
    return 'failed'
  }
  const key = newObjectKey(file.user_id, file.portal_id, storageSafeName(file.name))
  const put = await fetch(presign('PUT', key, { expires: 600, contentLength: blob.size }), { method: 'PUT', body: blob }).catch(() => null)
  const stored = put?.ok ? await headObject(key) : null
  if (!stored || stored.size !== blob.size) {
    console.error('[migrate] upload failed', file.id, put?.status)
    if (stored) await deleteObject(key, stored.version)
    return 'failed'
  }

  // The preview, while Supabase can still make one
  let thumb: string | null = null
  if (hasThumbnail(file)) {
    const { data: signed } = await admin.storage.from('deliverables')
      .createSignedUrl(file.file_path, 60, { transform: { width: 96, height: 96, resize: 'cover' } })
    const res = signed?.signedUrl ? await fetch(signed.signedUrl).catch(() => null) : null
    const type = res?.headers.get('content-type') || ''
    if (res?.ok && /^image\/(webp|jpeg|png)$/.test(type)) {
      const bytes = Buffer.from(await res.arrayBuffer())
      if (bytes.length < 40_000) thumb = `data:${type};base64,${bytes.toString('base64')}`
    }
  }

  // Switch the record over only if it still points at the old copy
  const { data: updated, error: updError } = await admin.from('files')
    .update({ storage: 'b2', file_path: key, file_size: blob.size, storage_version: stored.version })
    .eq('id', file.id).eq('file_path', file.file_path).eq('storage', 'supabase')
    .select('id')
  if (updError || !updated?.length) {
    console.error('[migrate] record update failed', file.id, updError?.message)
    await deleteObject(key, stored.version)
    return 'failed'
  }
  if (thumb) await admin.from('file_thumbs').upsert({ file_id: file.id, data: thumb })
  await admin.storage.from('deliverables').remove([file.file_path])
  return 'ok'
}
