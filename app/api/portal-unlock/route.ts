// A client enters a portal's password. On success the server sets an httpOnly
// cookie for that portal; the page then reloads with its contents.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sameSecret, storedPassword, unlockCookieName, unlockToken } from '@/lib/portalAccess'

// Slow down password guessing (best effort, per server instance)
const attempts = new Map<string, { n: number; reset: number }>()
const MAX_TRIES = 10
const WINDOW_MS = 10 * 60_000

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const portalId = typeof body?.portalId === 'string' ? body.portalId : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!portalId || !password) return NextResponse.json({ error: 'Enter the password.' }, { status: 400 })

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const key = `${ip}:${portalId}`
  const now = Date.now()
  const rec = attempts.get(key)
  if (rec && rec.reset > now && rec.n >= MAX_TRIES) {
    return NextResponse.json({ error: 'Too many attempts. Wait a few minutes and try again.' }, { status: 429 })
  }

  const admin = supabaseAdmin()
  const { data: portal } = await admin.from('portals').select('id, is_active, password_protected').eq('id', portalId).maybeSingle()
  const stored = portal?.is_active && portal.password_protected ? await storedPassword(admin, portalId) : null

  if (!stored || !sameSecret(password, stored)) {
    attempts.set(key, rec && rec.reset > now ? { n: rec.n + 1, reset: rec.reset } : { n: 1, reset: now + WINDOW_MS })
    return NextResponse.json({ error: 'That password is not right. Check with the person who sent you this link.' }, { status: 401 })
  }

  attempts.delete(key)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(unlockCookieName(portalId), unlockToken(portalId, stored), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
