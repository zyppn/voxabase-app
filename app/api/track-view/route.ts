import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Counts a client opening a portal. Server-side, since portals aren't publicly readable.
export async function POST(request: Request) {
  try {
    const { portalId } = await request.json()
    if (typeof portalId !== 'string' || !portalId) return NextResponse.json({ ok: false })

    const admin = supabaseAdmin()
    const { data: portal } = await admin.from('portals').select('id').eq('id', portalId).eq('is_active', true).maybeSingle()
    if (!portal) return NextResponse.json({ ok: false })

    await admin.from('portal_views').insert({
      portal_id: portalId,
      viewed_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
