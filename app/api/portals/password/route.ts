// Sets or removes a portal's password (owner or teammate). Passwords are
// stored hashed by the database, so this is the only way to set one, and
// password protection is a Pro and Agency feature.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isOwnerOrTeam } from '@/lib/portalAccess'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const portalId = typeof body?.portalId === 'string' ? body.portalId : ''
  const password = typeof body?.password === 'string' ? body.password.trim() : ''
  if (!portalId || password.length > 200) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: portal } = await admin.from('portals').select('id, user_id').eq('id', portalId).maybeSingle()
  if (!portal || !(await isOwnerOrTeam(admin, user.id, portal.user_id))) {
    return NextResponse.json({ error: 'Portal not found.' }, { status: 404 })
  }
  // Removing a password is always allowed; setting one needs a paid plan
  if (password) {
    const { data: owner } = await admin.from('profiles').select('plan').eq('id', portal.user_id).maybeSingle()
    if (owner?.plan !== 'pro' && owner?.plan !== 'agency') {
      return NextResponse.json({ error: 'Password protection is part of the Pro plan.' }, { status: 403 })
    }
  }
  const { error } = await admin.rpc('set_portal_password', { p_portal: portal.id, p_password: password })
  if (error) {
    console.error('[portal password] save failed', error.message)
    return NextResponse.json({ error: 'Couldn’t save the password. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, protected: !!password })
}
