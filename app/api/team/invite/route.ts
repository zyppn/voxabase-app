// An Agency owner invites a teammate by email. Returns a join link the owner
// shares; the teammate must sign in with that same email to accept.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { TEAM_SEATS } from '@/lib/workspace'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email?.toLowerCase() === email) {
    return NextResponse.json({ error: 'That’s your own email. Invite a teammate instead.' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('username, business_name, full_name, plan').eq('id', user.id).single()
  if (profile?.plan !== 'agency' || !profile.username) {
    return NextResponse.json({ error: 'Team seats are part of the Agency plan.' }, { status: 403 })
  }

  const admin = supabaseAdmin()
  const { count } = await admin.from('team_members').select('id', { count: 'exact', head: true }).eq('owner_id', user.id)
  if ((count || 0) >= TEAM_SEATS) {
    return NextResponse.json({ error: `All ${TEAM_SEATS} teammate seats are in use. Remove someone to invite another person.` }, { status: 400 })
  }

  const token = randomBytes(24).toString('base64url')
  const { data: invite, error } = await admin.from('team_members').insert({
    owner_id: user.id,
    owner_username: profile.username,
    owner_label: profile.business_name || profile.full_name || profile.username,
    email,
    token,
  }).select('id, email, status, token, invited_at, joined_at').single()

  if (error) {
    const dup = error.code === '23505'
    return NextResponse.json({ error: dup ? 'That person is already on your team or invited.' : 'Could not create the invite. Please try again.' }, { status: dup ? 409 : 500 })
  }
  return NextResponse.json({ invite })
}
