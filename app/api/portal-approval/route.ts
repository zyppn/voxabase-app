// A client approves a delivery or requests changes from the public portal page.
// Clients have no login, so every rule is checked here with the service role:
// the portal must exist, be live, have approvals turned on, belong to an Agency
// owner, and (if it has a password) the password must match.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const portalId = typeof body?.portalId === 'string' ? body.portalId : ''
  const action = body?.action
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 2000) : ''
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!portalId || (action !== 'approve' && action !== 'request_changes')) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (action === 'request_changes' && !note) {
    return NextResponse.json({ error: 'Tell them what you’d like changed.' }, { status: 400 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: portal } = await admin
    .from('portals')
    .select('id, is_active, files_ready, approval_required, portal_password, owner_username')
    .eq('id', portalId)
    .single()
  if (!portal || !portal.is_active || !portal.files_ready || !portal.approval_required) {
    return NextResponse.json({ error: 'Approvals aren’t available for this portal.' }, { status: 404 })
  }
  if (portal.portal_password && password !== portal.portal_password) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: owner } = await admin.from('profiles').select('plan').eq('username', portal.owner_username).single()
  if (owner?.plan !== 'agency') {
    return NextResponse.json({ error: 'Approvals aren’t available for this portal.' }, { status: 404 })
  }

  const at = new Date().toISOString()
  const { error } = await admin.from('portals').update({
    approval_status: action === 'approve' ? 'approved' : 'changes_requested',
    approval_note: action === 'approve' ? null : note,
    approval_name: name || null,
    approval_at: at,
  }).eq('id', portalId)
  if (error) return NextResponse.json({ error: 'Could not save your response. Please try again.' }, { status: 500 })

  return NextResponse.json({ ok: true, at })
}
