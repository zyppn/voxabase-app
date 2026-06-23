import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { portalId } = await request.json()
    if (!portalId) return NextResponse.json({ ok: false })

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    await supabase.from('portal_views').insert({
      portal_id: portalId,
      viewed_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
