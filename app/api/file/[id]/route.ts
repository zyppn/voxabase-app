// Opens one delivered file. Checks access first (the storage bucket is
// private). Downloads and thumbnails redirect to a short-lived signed link;
// viewing streams the file from here so the storage link never shows.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canOpenPortal, isOwnerOrTeam, viewerId } from '@/lib/portalAccess'
import { hasThumbnail, viewContentType } from '@/lib/files'

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

  // Viewing (the preview, or "open in new tab"): sent from this address, so the
  // tab shows the portal's own domain, never the storage link behind it
  if (search.get('view') === '1') {
    const { data, error } = await admin.storage.from('deliverables').createSignedUrl(file.file_path, 60)
    if (error || !data?.signedUrl) return new NextResponse('File unavailable', { status: 404 })
    // Pass Range through so videos can seek
    const range = request.headers.get('range')
    const upstream = await fetch(data.signedUrl, { headers: range ? { range } : {} })
    if (!upstream.ok || !upstream.body) return new NextResponse('File unavailable', { status: 404 })
    const headers = new Headers()
    for (const h of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
      const v = upstream.headers.get(h)
      if (v) headers.set(h, v)
    }
    const type = viewContentType(file)
    headers.set('content-type', type)
    headers.set('content-disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`)
    headers.set('x-content-type-options', 'nosniff')
    headers.set('cache-control', 'private, max-age=300')
    // An SVG opened in a tab could run scripts on this site: shown as a picture only
    if (type === 'image/svg+xml') headers.set('content-security-policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:")
    return new Response(upstream.body, { status: upstream.status, headers })
  }

  // Downloads go straight to storage (no need to pass big files through here)
  const { data, error } = await admin.storage.from('deliverables')
    .createSignedUrl(file.file_path, 120, { download: file.name })
  if (error || !data?.signedUrl) return new NextResponse('File unavailable', { status: 404 })
  return NextResponse.redirect(data.signedUrl, 302)
}
