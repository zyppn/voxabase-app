// A client approves a delivery or requests changes from the public portal page.
// Clients have no login, so every rule is checked here with the service role:
// the portal must exist, be live, have approvals turned on, belong to an Agency
// owner, and (if it has a password) the visitor must have unlocked it.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canOpenPortal } from '@/lib/portalAccess'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const portalId = typeof body?.portalId === 'string' ? body.portalId : ''
  const action = body?.action
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 2000) : ''
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : ''

  if (!portalId || (action !== 'approve' && action !== 'request_changes')) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (action === 'request_changes' && !note) {
    return NextResponse.json({ error: 'Tell them what you’d like changed.' }, { status: 400 })
  }

  const admin = supabaseAdmin()

  const { data: portal } = await admin
    .from('portals')
    .select('id, user_id, is_active, files_ready, approval_required, password_protected, owner_username')
    .eq('id', portalId)
    .single()
  if (!portal || !portal.is_active || !portal.files_ready || !portal.approval_required) {
    return NextResponse.json({ error: 'Approvals aren’t available for this portal.' }, { status: 404 })
  }
  if (!(await canOpenPortal(admin, portal))) {
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
