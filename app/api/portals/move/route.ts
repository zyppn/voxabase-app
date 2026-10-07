// A teammate moves one of their own personal portals into the Team they belong
// to. The portal (and its files, password and invoice) now belongs to the Team
// owner: its link changes and invoice payments go to the owner's Stripe.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hasTeams } from '@/lib/workspace'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const portalId = typeof body?.portalId === 'string' ? body.portalId : ''
  const toOwner = typeof body?.toOwnerId === 'string' ? body.toOwnerId : ''
  if (!portalId || !toOwner) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (toOwner === user.id) return NextResponse.json({ error: 'That’s already your workspace.' }, { status: 400 })

  const admin = supabaseAdmin()
  const { data: portal } = await admin.from('portals').select('id, user_id, slug').eq('id', portalId).maybeSingle()
  if (!portal || portal.user_id !== user.id) return NextResponse.json({ error: 'You can only move your own portals.' }, { status: 403 })

  const { data: seatOk } = await admin.rpc('team_seat_ok', { p_owner: toOwner, p_member: user.id })
  const { data: owner } = await admin.from('profiles').select('username, plan').eq('id', toOwner).maybeSingle()
  if (seatOk !== true || !hasTeams(owner?.plan) || !owner?.username) {
    return NextResponse.json({ error: 'You’re not on that team anymore.' }, { status: 403 })
  }

  // The slug must be free under the owner's address
  let slug = portal.slug
  const { data: clash } = await admin.from('portals').select('id').eq('owner_username', owner.username).eq('slug', slug).maybeSingle()
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  // Copy stored files into the owner's folder first; only then switch the records over
  const bucket = admin.storage.from('deliverables')
  const { data: files } = await admin.from('files').select('id, file_path, storage').eq('portal_id', portalId)
  const moved: { id: string; from: string; to: string }[] = []
  // Files in B2 stay where they are (access is checked by the server, not by
  // folder); only Supabase Storage files move into the owner's folder
  for (const f of (files || []).filter((f) => f.storage !== 'b2')) {
    const to = `${toOwner}/${portalId}/${f.file_path.split('/').pop()}`
    const { error } = await bucket.copy(f.file_path, to)
    if (error) {
      if (moved.length) await bucket.remove(moved.map((m) => m.to))
      console.error('[portals/move] copy failed', error.message)
      return NextResponse.json({ error: 'Could not move the files. Nothing was changed; please try again.' }, { status: 500 })
    }
    moved.push({ id: f.id, from: f.file_path, to })
  }

  const { error: portalError } = await admin.from('portals')
    .update({ user_id: toOwner, owner_username: owner.username, slug, team_shared: true }).eq('id', portalId)
  if (portalError) {
    if (moved.length) await bucket.remove(moved.map((m) => m.to))
    console.error('[portals/move] update failed', portalError.message)
    return NextResponse.json({ error: 'Could not move the portal. Nothing was changed; please try again.' }, { status: 500 })
  }
  await Promise.all(moved.map((m) => admin.from('files').update({ user_id: toOwner, file_path: m.to }).eq('id', m.id)))
  await admin.from('files').update({ user_id: toOwner }).eq('portal_id', portalId).eq('storage', 'b2')
  await admin.from('portal_passwords').update({ user_id: toOwner }).eq('portal_id', portalId)
  if (moved.length) await bucket.remove(moved.map((m) => m.from))

  return NextResponse.json({ ok: true, username: owner.username, slug })
}
