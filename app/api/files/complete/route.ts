// Finishes a B2 upload: confirms the file arrived at the size that was
// reserved, then adds it to the portal (or swaps it in for the file being
// replaced). Only uploads this server handed out can be finished.
import { NextResponse, after } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isOwnerOrTeam } from '@/lib/portalAccess'
import { deleteObject, headObject } from '@/lib/b2'
import { sweepB2 } from '@/lib/b2Sweep'
import { hasThumbnail } from '@/lib/files'
import { validPreview } from '@/lib/previewData'

// A small image preview made in the browser (about 96px square)
const THUMB_RE = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/
const MAX_THUMB_CHARS = 60_000

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const key = typeof body?.key === 'string' ? body.key : ''
  const name = typeof body?.name === 'string' ? body.name.slice(0, 255) : ''
  const type = typeof body?.type === 'string' ? body.type.slice(0, 255) : ''
  const replaceId = typeof body?.replaceId === 'string' ? body.replaceId : null
  const thumb = typeof body?.thumb === 'string' && body.thumb.length <= MAX_THUMB_CHARS && THUMB_RE.test(body.thumb) ? body.thumb : null
  // The watermarked preview clients see before paying (if one could be made)
  const preview = validPreview(body?.preview) ? body.preview : null
  if (!key || !name) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: pending } = await admin.from('pending_uploads').select('key, user_id, portal_id, size').eq('key', key).maybeSingle()
  if (!pending || !(await isOwnerOrTeam(admin, user.id, pending.user_id))) {
    return NextResponse.json({ error: 'This upload expired. Please try again.' }, { status: 404 })
  }

  const stored = await headObject(key)
  if (!stored || stored.size !== Number(pending.size)) {
    if (stored) await deleteObject(key, stored.version)
    await admin.from('pending_uploads').delete().eq('key', key)
    return NextResponse.json({ error: 'The upload didn’t finish. Please try again.' }, { status: 400 })
  }

  const record = {
    name, file_type: type, file_path: key, file_size: stored.size,
    storage: 'b2', storage_version: stored.version,
  }
  let fileId: string
  if (replaceId) {
    const { data: old } = await admin.from('files').select('id, portal_id, storage, file_path').eq('id', replaceId).maybeSingle()
    if (!old || old.portal_id !== pending.portal_id) {
      await deleteObject(key, stored.version)
      await admin.from('pending_uploads').delete().eq('key', key)
      return NextResponse.json({ error: 'That file was removed. Please refresh.' }, { status: 404 })
    }
    // A B2 original is queued for removal by the database; a Supabase one is removed here
    const { error } = await admin.from('files').update(record).eq('id', replaceId)
    if (error) return failed(error.message)
    if (old.storage !== 'b2') await admin.storage.from('deliverables').remove([old.file_path])
    fileId = replaceId
  } else {
    const { data: last } = await admin.from('files').select('sort_order').eq('portal_id', pending.portal_id)
      .order('sort_order', { ascending: false }).limit(1).maybeSingle()
    const { data: created, error } = await admin.from('files').insert({
      ...record, portal_id: pending.portal_id, user_id: pending.user_id, sort_order: (last?.sort_order ?? 0) + 1,
    }).select('id').single()
    if (error || !created) return failed(error?.message)
    fileId = created.id
  }
  await admin.from('pending_uploads').delete().eq('key', key)

  if (thumb && hasThumbnail({ file_type: type })) {
    await admin.from('file_thumbs').upsert({ file_id: fileId, data: thumb })
  } else {
    await admin.from('file_thumbs').delete().eq('file_id', fileId)
  }
  if (preview) await admin.from('file_previews').upsert({ file_id: fileId, data: preview })
  else await admin.from('file_previews').delete().eq('file_id', fileId)
  after(() => sweepB2(admin))
  return NextResponse.json({ ok: true, id: fileId })
}

function failed(message?: string) {
  console.error('[files/complete] save failed', message)
  return NextResponse.json({ error: 'Couldn’t save the file. Please try again.' }, { status: 500 })
}
