import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { allow, visitorKey } from '@/lib/rateLimit'

// Counts a client opening a portal. Server-side, since portals aren't publicly
// readable. One view per visitor per portal every 30 minutes (reloads and
// repeat requests don't add up), and at most 300 an hour per portal.
export async function POST(request: Request) {
  try {
    const { portalId } = await request.json()
    if (typeof portalId !== 'string' || !portalId) return NextResponse.json({ ok: false })

    const admin = supabaseAdmin()
    const { data: portal } = await admin.from('portals').select('id').eq('id', portalId).eq('is_active', true).maybeSingle()
    if (!portal) return NextResponse.json({ ok: false })

    if (!(await allow(admin, `view:${portalId}:${visitorKey(request)}`, 1, 30 * 60))) return NextResponse.json({ ok: true })
    if (!(await allow(admin, `view:${portalId}`, 300, 60 * 60))) return NextResponse.json({ ok: true })

    await admin.from('portal_views').insert({
      portal_id: portalId,
      viewed_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
