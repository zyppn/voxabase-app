// Called after files or portals are deleted: removes their stored copies from B2.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sweepB2 } from '@/lib/b2Sweep'

export async function POST() {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await sweepB2(supabaseAdmin())
  return NextResponse.json({ ok: true })
}
