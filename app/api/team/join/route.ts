// GET  ?token=…  → who the invite is from and which email it's for (shown on /join).
// POST {token}   → the signed-in person joins the team, if the invite's email is theirs.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { WS_COOKIE, hasTeams, seatsFor } from '@/lib/workspace'

async function findInvite(token: string) {
  if (!token || token.length > 100) return null
  const admin = supabaseAdmin()
  const { data } = await admin
    .from('team_members')
    .select('id, owner_id, owner_label, email, status, member_id')
    .eq('token', token)
    .maybeSingle()
  if (!data) return null
  const { data: owner } = await admin.from('profiles').select('plan').eq('id', data.owner_id).single()
  return { ...data, ownerOnAgency: hasTeams(owner?.plan), seats: seatsFor(owner?.plan) }
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  const invite = await findInvite(token)
  if (!invite || !invite.ownerOnAgency) return NextResponse.json({ error: 'This invite link isn’t valid anymore.' }, { status: 404 })
  return NextResponse.json({ ownerLabel: invite.owner_label, email: invite.email, status: invite.status })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''

  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const invite = await findInvite(token)
  if (!invite || !invite.ownerOnAgency) return NextResponse.json({ error: 'This invite link isn’t valid anymore.' }, { status: 404 })
  if (invite.owner_id === user.id) return NextResponse.json({ error: 'This is your own team.' }, { status: 400 })
  if (invite.status === 'active' && invite.member_id !== user.id) {
    return NextResponse.json({ error: 'This invite has already been used.' }, { status: 409 })
  }
  if ((user.email || '').toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ error: `This invite is for ${invite.email}. Sign in with that email to accept it.`, wrongAccount: true }, { status: 403 })
  }

  if (invite.status !== 'active') {
    // After a downgrade the team can already be full of people who joined
    // earlier; an old pending invite doesn't get a seat on top of them.
    const { count } = await supabaseAdmin().from('team_members').select('id', { count: 'exact', head: true })
      .eq('owner_id', invite.owner_id).eq('status', 'active')
    if ((count || 0) >= invite.seats) {
      return NextResponse.json({ error: 'This team has no free seats right now. Ask the team owner to make room or upgrade.' }, { status: 409 })
    }
    const { error } = await supabaseAdmin().from('team_members').update({
      member_id: user.id, status: 'active', joined_at: new Date().toISOString(),
    }).eq('id', invite.id).eq('status', 'pending')
    if (error) return NextResponse.json({ error: 'Could not join the team. Please try again.' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true, ownerLabel: invite.owner_label })
  res.cookies.set(WS_COOKIE, invite.owner_id, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === 'production' })
  return res
}
