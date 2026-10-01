// Opens one delivered file. Checks access, then redirects to a short-lived
// signed link (the storage bucket is private).
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canOpenPortal, isOwnerOrTeam, viewerId } from '@/lib/portalAccess'
import { hasThumbnail } from '@/lib/files'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = supabaseAdmin()
  const { data: file } = await admin.from('files').select('id, portal_id, file_path, name, file_type').eq('id', id).maybeSingle()
  if (!file) return new NextResponse('Not found', { status: 404 })
  const { data: portal } = await admin
    .from('portals').select('id, user_id, is_active, files_ready, password_protected').eq('id', file.portal_id).maybeSingle()
  if (!portal) return new NextResponse('Not found', { status: 404 })

  const viewer = await viewerId()
  const team = await isOwnerOrTeam(admin, viewer, portal.user_id)
  if (!team && (!portal.files_ready || !(await canOpenPortal(admin, portal, viewer)))) {
    return new NextResponse('Not found', { status: 404 })
  }

  const search = new URL(request.url).searchParams
  // Small preview for the file lists (images only). Storage resizes it, so a
  // big photo isn't downloaded just to fill a 40px square.
  if (search.get('thumb') === '1') {
    if (!hasThumbnail(file)) return new NextResponse('Not found', { status: 404 })
    const { data, error } = await admin.storage.from('deliverables')
      .createSignedUrl(file.file_path, 600, { transform: { width: 96, height: 96, resize: 'cover' } })
    if (error || !data?.signedUrl) return new NextResponse('Preview unavailable', { status: 404 })
    const res = NextResponse.redirect(data.signedUrl, 302)
    // The signed link lasts 10 minutes; the browser can reuse it for 5
    res.headers.set('Cache-Control', 'private, max-age=300')
    return res
  }

  const inline = search.get('view') === '1'
  const { data, error } = await admin.storage.from('deliverables')
    .createSignedUrl(file.file_path, 120, inline ? undefined : { download: file.name })
  if (error || !data?.signedUrl) return new NextResponse('File unavailable', { status: 404 })
  return NextResponse.redirect(data.signedUrl, 302)
}
