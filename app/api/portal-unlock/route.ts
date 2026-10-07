// A client enters a portal's password. On success the server sets an httpOnly
// cookie for that portal; the page then reloads with its contents.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { storedPassword, unlockCookieName, unlockToken } from '@/lib/portalAccess'
import { allow, clearLimit, visitorKey } from '@/lib/rateLimit'

// Guessing limits, kept in the database so they hold on every server:
// 10 tries per visitor per portal every 10 minutes, and 100 an hour per portal
// from everyone together (slows guessing spread across many addresses)
const PER_VISITOR = 10, VISITOR_WINDOW = 10 * 60
const PER_PORTAL = 100, PORTAL_WINDOW = 60 * 60

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const portalId = typeof body?.portalId === 'string' ? body.portalId : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!portalId || !password || password.length > 200) return NextResponse.json({ error: 'Enter the password.' }, { status: 400 })

  const admin = supabaseAdmin()
  const visitor = `unlock:${portalId}:${visitorKey(request)}`
  if (!(await allow(admin, visitor, PER_VISITOR, VISITOR_WINDOW)) || !(await allow(admin, `unlock:${portalId}`, PER_PORTAL, PORTAL_WINDOW))) {
    return NextResponse.json({ error: 'Too many attempts. Wait a few minutes and try again.' }, { status: 429 })
  }

  const { data: portal } = await admin.from('portals').select('id, is_active, password_protected').eq('id', portalId).maybeSingle()
  const { data: correct } = portal?.is_active && portal.password_protected
    ? await admin.rpc('check_portal_password', { p_portal: portalId, p_password: password })
    : { data: false }
  // The cookie holds a hash of the stored (hashed) password, so changing the
  // password locks everyone out again
  const stored = correct === true ? await storedPassword(admin, portalId) : null
  if (!stored) {
    return NextResponse.json({ error: 'That password is not right. Check with the person who sent you this link.' }, { status: 401 })
  }

  await clearLimit(admin, visitor)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(unlockCookieName(portalId), unlockToken(portalId, stored), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
