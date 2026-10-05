// Zips every file in a portal the visitor is allowed to open.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canOpenPortal, isOwnerOrTeam, viewerId } from '@/lib/portalAccess'
import { awaitingPayment } from '@/lib/paywall'
import { presign } from '@/lib/b2'

export async function GET(request: Request) {
  const portalId = new URL(request.url).searchParams.get('portalId')
  if (!portalId) return NextResponse.json({ error: 'Missing portalId' }, { status: 400 })

  const admin = supabaseAdmin()
  const { data: portal } = await admin
    .from('portals').select('*').eq('id', portalId).maybeSingle()
  if (!portal) return NextResponse.json({ error: 'No files found' }, { status: 404 })

  const viewer = await viewerId()
  const team = await isOwnerOrTeam(admin, viewer, portal.user_id)
  if (!team && (!portal.files_ready || !(await canOpenPortal(admin, portal, viewer)))) {
    return NextResponse.json({ error: 'No files found' }, { status: 404 })
  }
  if (!team && awaitingPayment(portal)) {
    return NextResponse.json({ error: 'Pay the invoice to unlock these files' }, { status: 402 })
  }

  const { data: files } = await admin.from('files').select('name, file_path, storage').eq('portal_id', portalId).order('sort_order')
  if (!files || files.length === 0) return NextResponse.json({ error: 'No files found' }, { status: 404 })

  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const used = new Set<string>()
  await Promise.all(files.map(async (file) => {
    const data = file.storage === 'b2'
      ? await fetch(presign('GET', file.file_path, { expires: 300 })).then((r) => (r.ok ? r.blob() : null)).catch(() => null)
      : (await admin.storage.from('deliverables').download(file.file_path)).data
    if (!data) return
    // Two files with the same name would overwrite each other in the zip
    let name = file.name, n = 2
    while (used.has(name)) name = file.name.replace(/(\.[^.]*)?$/, ` (${n++})$1`)
    used.add(name)
    zip.file(name, await data.arrayBuffer())
  }))

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  const safe = (portal.name || 'deliverables').replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'deliverables'
  return new Response(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safe}-files.zip"`,
    },
  })
}
