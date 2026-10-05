// Locked previews for one portal (owner and team only).
// GET ?portalId=: which files already have one. POST: save one made in the
// browser for a file uploaded before previews existed.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isOwnerOrTeam } from '@/lib/portalAccess'
import { validPreview } from '@/lib/previewData'

async function userId() {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(request: Request) {
  const uid = await userId()
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const portalId = new URL(request.url).searchParams.get('portalId') || ''
  const admin = supabaseAdmin()
  const { data: portal } = await admin.from('portals').select('id, user_id').eq('id', portalId).maybeSingle()
  if (!portal || !(await isOwnerOrTeam(admin, uid, portal.user_id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: files } = await admin.from('files').select('id').eq('portal_id', portal.id)
  const ids = (files || []).map((f) => f.id)
  const { data: have } = ids.length ? await admin.from('file_previews').select('file_id').in('file_id', ids) : { data: [] }
  return NextResponse.json({ ids: (have || []).map((p) => p.file_id) })
}

export async function POST(request: Request) {
  const uid = await userId()
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const fileId = typeof body?.fileId === 'string' ? body.fileId : ''
  if (!fileId || !validPreview(body?.data)) return NextResponse.json({ error: 'Invalid preview.' }, { status: 400 })
  const admin = supabaseAdmin()
  const { data: file } = await admin.from('files').select('id, user_id').eq('id', fileId).maybeSingle()
  if (!file || !(await isOwnerOrTeam(admin, uid, file.user_id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { error } = await admin.from('file_previews').upsert({ file_id: file.id, data: body.data })
  if (error) return NextResponse.json({ error: 'Couldn’t save the preview.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
