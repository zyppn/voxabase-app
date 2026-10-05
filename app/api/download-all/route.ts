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

  const { data: files } = await admin.from('files').select('name, file_path, storage, created_at').eq('portal_id', portalId).order('sort_order')
  if (!files || files.length === 0) return NextResponse.json({ error: 'No files found' }, { status: 404 })

  // Streamed: the zip is sent as each file arrives from storage, one at a
  // time, so the download starts at once and nothing big is held in memory.
  // Files are stored as-is (most are already compressed: images, video, zips).
  const used = new Set<string>()
  async function* entries() {
    for (const file of files!) {
      let url: string | null
      if (file.storage === 'b2') url = presign('GET', file.file_path, { expires: 600 })
      else url = (await admin.storage.from('deliverables').createSignedUrl(file.file_path, 600)).data?.signedUrl ?? null
      const res = url ? await fetch(url).catch(() => null) : null
      if (!res?.ok || !res.body) {
        console.error('[download-all] skipped a file that could not be read', file.file_path, res?.status)
        continue
      }
      // Two files with the same name would overwrite each other in the zip
      let name = file.name, n = 2
      while (used.has(name)) name = file.name.replace(/(\.[^.]*)?$/, ` (${n++})$1`)
      used.add(name)
      yield { name, input: res, lastModified: file.created_at ? new Date(file.created_at) : new Date() }
    }
  }

  const safe = (portal.name || 'deliverables').replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'deliverables'
  return new Response(downloadZip(entries()).body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safe}-files.zip"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
