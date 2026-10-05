// Hands out a link to upload one file straight to storage (B2), after checking
// the uploader may add files to this portal and that the file fits: under the
// per-file limit, the owner's plan, and the hard cap on total B2 storage.
// Without B2 set up, the app keeps uploading to Supabase Storage.
import { NextResponse, after } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isOwnerOrTeam } from '@/lib/portalAccess'
import { B2_CAP_BYTES, B2_MAX_FILE_BYTES, b2Configured, newObjectKey, presign } from '@/lib/b2'
import { sweepB2 } from '@/lib/b2Sweep'
import { storageSafeName } from '@/lib/files'
import { storageLimitFor } from '@/lib/storageLimits'

// The per-file limit the editor shows (and checks before uploading)
export async function GET() {
  return NextResponse.json({ provider: b2Configured() ? 'b2' : 'supabase', maxBytes: b2Configured() ? B2_MAX_FILE_BYTES : 50 * 1024 * 1024 })
}

export async function POST(request: Request) {
  if (!b2Configured()) return NextResponse.json({ provider: 'supabase' })

  const body = await request.json().catch(() => null)
  const portalId = typeof body?.portalId === 'string' ? body.portalId : ''
  const name = typeof body?.name === 'string' ? body.name : ''
  const size = Number(body?.size)
  if (!portalId || !name || !Number.isSafeInteger(size) || size < 0) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: portal } = await admin.from('portals').select('id, user_id').eq('id', portalId).maybeSingle()
  if (!portal || !(await isOwnerOrTeam(admin, user.id, portal.user_id))) {
    return NextResponse.json({ error: 'Portal not found.' }, { status: 404 })
  }
  if (size > B2_MAX_FILE_BYTES) return NextResponse.json({ error: 'too_large', maxBytes: B2_MAX_FILE_BYTES }, { status: 413 })

  const { data: owner } = await admin.from('profiles').select('plan').eq('id', portal.user_id).maybeSingle()
  const key = newObjectKey(portal.user_id, portal.id, storageSafeName(name))
  const { data: result, error } = await admin.rpc('reserve_b2_upload', {
    p_key: key, p_owner: portal.user_id, p_portal: portal.id, p_size: size,
    p_plan_limit: storageLimitFor(owner?.plan), p_cap: B2_CAP_BYTES,
  })
  if (error) {
    console.error('[upload-url] reserve failed', error.message)
    return NextResponse.json({ error: 'Couldn’t start the upload. Please try again.' }, { status: 500 })
  }
  if (result === 'plan_full') return NextResponse.json({ error: 'plan_full' }, { status: 409 })
  if (result === 'cap_full') return NextResponse.json({ error: 'cap_full' }, { status: 507 })

  // Clear out anything left over from earlier deletes, after answering
  after(() => sweepB2(admin))

  // The size is part of the signature: B2 refuses a different-sized upload
  return NextResponse.json({ provider: 'b2', key, url: presign('PUT', key, { expires: 3600, contentLength: size }) })
}
