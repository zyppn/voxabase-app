// Runs before every request.
// 1. White-label domains: a request to a customer's domain (files.harborcoffee.com/brand-refresh)
//    is served from their portal (/harborcoffee/brand-refresh). Nothing else in the app is
//    reachable there: no dashboard, no settings.
// 2. Two-step verification gate: an account with an authenticator set up must enter
//    its code before private pages or account APIs work (a password alone is not enough).
// 3. Signed in already: the sign-in and signup pages go straight to the dashboard, and
//    a small "signed in" hint cookie on .voxabase.com lets the marketing site show a
//    Dashboard button instead of Sign in / Get started. The hint holds nothing else.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DOMAIN_HEADER, OWN_HOST } from '@/lib/domainHeader'


const PROTECTED = [
  '/dashboard', '/settings', '/stripe-setup',
  '/api/billing-portal', '/api/subscription', '/api/stripe-connect', '/api/verify-password',
  '/api/team', '/api/domains', '/api/files',
]

const AUTH_PAGES = ['/login', '/signup']

// Read by voxabase.com (not httpOnly). Only a yes/no, refreshed whenever the
// app checks who's signed in, so it can't grant anything.
const HINT_COOKIE = 'vb_signed_in'
function setHint(response: NextResponse, host: string, signedIn: boolean) {
  if (!/(^|\.)voxabase\.com$/.test(host)) return
  const base = { domain: '.voxabase.com', path: '/', sameSite: 'lax' as const, secure: true }
  if (signedIn) response.cookies.set(HINT_COOKIE, '1', { ...base, maxAge: 60 * 60 * 24 * 7 })
  else response.cookies.set(HINT_COOKIE, '', { ...base, maxAge: 0 })
}

// Domain → username, cached briefly per server instance
const cache = new Map<string, { username: string | null; until: number }>()

async function usernameFor(host: string): Promise<string | null> {
  const hit = cache.get(host)
  if (hit && hit.until > Date.now()) return hit.username
  let username: string | null = null
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/portal_username_for_domain`, {
      method: 'POST',
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ d: host }),
      cache: 'no-store',
    })
    if (res.ok) username = (await res.json()) || null
    else return null // don't cache errors
  } catch {
    return null
  }
  cache.set(host, { username, until: Date.now() + (username ? 60_000 : 15_000) })
  return username
}

// The app's own icons. On a customer's domain they'd put the Voxabase logo in
// their client's browser tab, so the browser shows its plain default instead.
const APP_ICONS = new Set(['/favicon.ico', '/icon.svg', '/apple-icon.png'])

async function customDomain(request: NextRequest, host: string) {
  const { pathname } = request.nextUrl
  if (APP_ICONS.has(pathname)) return new NextResponse(null, { status: 404 })
  const headers = new Headers(request.headers)
  headers.set(DOMAIN_HEADER, host)
  // The after-payment page works as-is, told it's on the customer's domain
  if (pathname === '/payment-success') return NextResponse.next({ request: { headers } })
  // Assets and the portal's own API calls work as-is
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') || /\.[a-z0-9]+$/i.test(pathname)) {
    return NextResponse.next()
  }
  const username = await usernameFor(host)
  if (!username) return new NextResponse('Not found', { status: 404, headers: { 'content-type': 'text/plain' } })

  const url = request.nextUrl.clone()
  // /slug → /username/slug (and /username/slug is accepted too)
  const first = pathname.split('/')[1]
  if (first !== username) url.pathname = `/${username}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url, { request: { headers } })
}

export async function proxy(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  if (host && !OWN_HOST.test(host)) return customDomain(request, host)

  const { pathname } = request.nextUrl
  // The white-label marker only ever comes from the rewrite above
  const cleanHeaders = new Headers(request.headers)
  cleanHeaders.delete(DOMAIN_HEADER)
  const authPage = AUTH_PAGES.includes(pathname)
  if (!authPage && !PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next({ request: { headers: cleanHeaders } })
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  setHint(response, host, !!user)
  if (!user) return response

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const needsCode = !!aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2'
  if (authPage) {
    // Signed in: skip the form, unless it's for the two-step code or a team
    // invite (?next=), which the page handles itself
    const q = request.nextUrl.searchParams
    if (needsCode || q.has('next') || q.has('mfa')) return response
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }
  if (needsCode) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Enter your two-step verification code first.' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = '?mfa=1'
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  // favicon.ico included so customer domains don't serve the Voxabase icon
  matcher: ['/((?!_next/static|_next/image).*)'],
}
