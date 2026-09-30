// White-label portal domain for the signed-in Agency owner.
// GET: current domain + live status (and marks it live once DNS checks out)
// POST {domain}: connect a domain (replaces any previous one)
// DELETE: disconnect it
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { addDomain, domainStatus, removeDomain, vercelConfigured } from '@/lib/vercelDomains'

const HOST_RE = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/
const RESERVED = /(^|\.)(voxabase\.com|vercel\.app|vercel\.com|localhost)$/

function clean(input: unknown) {
  if (typeof input !== 'string') return ''
  return input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '')
}

async function owner() {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('username, plan').eq('id', user.id).single()
  return { user, profile }
}

async function report(ownerId: string) {
  const admin = supabaseAdmin()
  const { data: row } = await admin.from('custom_domains').select('domain, verified').eq('owner_id', ownerId).maybeSingle()
  if (!row) return { domain: null, live: false, records: [] }
  const status = await domainStatus(row.domain)
  if (status.error === 'not_found') {
    // Removed on Vercel's side: put it back so the customer isn't stuck
    await addDomain(row.domain)
  }
  if (status.live !== row.verified) {
    await admin.from('custom_domains').update({ verified: status.live, verified_at: status.live ? new Date().toISOString() : null }).eq('owner_id', ownerId)
  }
  return { domain: row.domain, live: status.live, records: status.records }
}

export async function GET() {
  const o = await owner()
  if ('error' in o) return o.error
  if (!vercelConfigured()) return NextResponse.json({ available: false })
  return NextResponse.json({ available: true, ...(await report(o.user.id)) })
}

export async function POST(request: Request) {
  const o = await owner()
  if ('error' in o) return o.error
  if (o.profile?.plan !== 'agency' || !o.profile.username) {
    return NextResponse.json({ error: 'Custom domains are part of the Agency plan.' }, { status: 403 })
  }
  if (!vercelConfigured()) return NextResponse.json({ error: 'Custom domains aren’t available yet. Please try again later.' }, { status: 503 })

  const body = await request.json().catch(() => null)
  const domain = clean(body?.domain)
  if (!HOST_RE.test(domain) || RESERVED.test(domain)) {
    return NextResponse.json({ error: 'Enter a domain like files.yourstudio.com' }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const { data: taken } = await admin.from('custom_domains').select('owner_id, verified, created_at').eq('domain', domain).maybeSingle()
  if (taken && taken.owner_id !== o.user.id) {
    if (taken.verified) return NextResponse.json({ error: 'That domain is already connected to another Voxabase account.' }, { status: 409 })
    // Another account is still setting it up. Protect that for 3 days so nobody can
    // grab a domain in the gap between its owner adding DNS and it going live.
    if (Date.now() - new Date(taken.created_at).getTime() < 3 * 86_400_000) {
      return NextResponse.json({ error: 'Another account is setting up that domain. If it’s yours, contact support@voxabase.com.' }, { status: 409 })
    }
    // Abandoned claim (never went live): release it.
    await admin.from('custom_domains').delete().eq('owner_id', taken.owner_id)
  }

  const { data: current } = await admin.from('custom_domains').select('domain').eq('owner_id', o.user.id).maybeSingle()
  if (current && current.domain !== domain) {
    await removeDomain(current.domain)
    await admin.from('custom_domains').delete().eq('owner_id', o.user.id)
  }

  const added = await addDomain(domain)
  if (!added.ok) return NextResponse.json({ error: added.error }, { status: 400 })

  const { error } = await admin.from('custom_domains').upsert({
    owner_id: o.user.id, username: o.profile.username, domain, verified: false, verified_at: null,
  }, { onConflict: 'owner_id' })
  if (error) {
    await removeDomain(domain)
    return NextResponse.json({ error: 'Could not save the domain. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ available: true, ...(await report(o.user.id)) })
}

export async function DELETE() {
  const o = await owner()
  if ('error' in o) return o.error
  const admin = supabaseAdmin()
  const { data: current } = await admin.from('custom_domains').select('domain').eq('owner_id', o.user.id).maybeSingle()
  if (current) {
    if (vercelConfigured()) await removeDomain(current.domain)
    await admin.from('custom_domains').delete().eq('owner_id', o.user.id)
  }
  return NextResponse.json({ ok: true })
}
