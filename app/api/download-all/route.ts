// Zips every file in a portal the visitor is allowed to open.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canOpenPortal, isOwnerOrTeam, viewerId } from '@/lib/portalAccess'
import { awaitingPayment } from '@/lib/paywall'
import { presign } from '@/lib/b2'
import { downloadZip } from 'client-zip'

// Big deliveries take a while to send
export const maxDuration = 60

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

  const { data: files } = await admin.from('files').select('name, file_path, file_size, storage, created_at').eq('portal_id', portalId).order('sort_order')
  if (!files || files.length === 0) return NextResponse.json({ error: 'No files found' }, { status: 404 })

  // Streamed: the zip is sent as each file arrives from storage, one at a
  // time, so the download starts at once and nothing big is held in memory.
  // Files are stored as-is (most are already compressed: images, video, zips).
  const used = new Set<string>()
  const plan = files.map((file) => {
    // Two files with the same name would overwrite each other in the zip
    // A name like "../../x" or "a/b" would land outside the folder when unzipped
    const base = file.name.replace(/[\\/]+/g, '-').replace(/^\.+/, '') || 'file'
    let name = base, n = 2
    while (used.has(name)) name = base.replace(/(\.[^.]*)?$/, ` (${n++})$1`)
    used.add(name)
    return { file, name, size: Number(file.file_size), lastModified: file.created_at ? new Date(file.created_at) : new Date() }
  })
  // B2 sizes were checked against storage at upload, so the zip's exact size
  // can be sent up front and the browser shows real progress ("12 MB of 56 MB").
  // Older files' sizes weren't checked: then the size stays unknown.
  const exact = plan.every((p) => p.file.storage === 'b2' && Number.isSafeInteger(p.size) && p.size >= 0)

  async function* entries() {
    for (const p of plan) {
      const url = p.file.storage === 'b2'
        ? presign('GET', p.file.file_path, { expires: 600 })
        : (await admin.storage.from('deliverables').createSignedUrl(p.file.file_path, 600)).data?.signedUrl ?? null
      const res = url ? await fetch(url).catch(() => null) : null
      if (!res?.ok || !res.body) {
        console.error('[download-all] could not read a file', p.file.file_path, res?.status)
        // With the size promised up front, a missing file would leave a broken
        // zip: stop, and the browser reports the download as failed
        if (exact) throw new Error('A file could not be read')
        continue
      }
      yield { name: p.name, input: res, lastModified: p.lastModified, ...(exact ? { size: p.size } : {}) }
    }
  }

  const zip = downloadZip(entries(), exact ? { metadata: plan.map((p) => ({ name: p.name, size: p.size, lastModified: p.lastModified })) } : {})
  const length = zip.headers.get('content-length')
  const safe = (portal.name || 'deliverables').replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'deliverables'
  return new Response(zip.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safe}-files.zip"`,
      'Cache-Control': 'private, no-store',
      ...(length ? { 'Content-Length': length } : {}),
    },
  })
}
