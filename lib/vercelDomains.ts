// Thin wrapper around Vercel's REST API for customer domains on this project.
// Needs VERCEL_API_TOKEN and VERCEL_PROJECT_ID (and VERCEL_TEAM_ID if the
// project lives under a team). Server-only: never import into client code.

const API = 'https://api.vercel.com'

export function vercelConfigured() {
  return !!process.env.VERCEL_API_TOKEN && !!process.env.VERCEL_PROJECT_ID
}

function url(path: string, extra: Record<string, string> = {}) {
  const u = new URL(API + path)
  if (process.env.VERCEL_TEAM_ID) u.searchParams.set('teamId', process.env.VERCEL_TEAM_ID)
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v)
  return u.toString()
}

async function call(method: string, path: string, body?: unknown, extra?: Record<string, string>) {
  const res = await fetch(url(path, extra), {
    method,
    headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

const project = () => encodeURIComponent(process.env.VERCEL_PROJECT_ID!)

export type DnsRecord = { type: 'CNAME' | 'A' | 'TXT'; name: string; value: string; purpose: 'point' | 'verify' }
export type DomainStatus = { live: boolean; records: DnsRecord[]; error?: string }

type Verification = { type: string; domain: string; value: string }

/** Add the domain to the project. Adding one that's already there counts as success. */
export async function addDomain(domain: string) {
  const r = await call('POST', `/v10/projects/${project()}/domains`, { name: domain })
  if (r.ok) return { ok: true as const }
  const code = r.data?.error?.code as string | undefined
  if (r.status === 400 && /already|exist/i.test(r.data?.error?.message || '')) return { ok: true as const }
  if (r.status === 409) return { ok: false as const, error: 'That domain is already connected to another Vercel project. Remove it there first, or use a different subdomain.' }
  console.error('[vercel] add domain failed', r.status, code)
  return { ok: false as const, error: 'Could not add that domain. Check the spelling and try again.' }
}

export async function removeDomain(domain: string) {
  const r = await call('DELETE', `/v9/projects/${project()}/domains/${encodeURIComponent(domain)}`)
  return r.ok || r.status === 404
}

/** Where the domain stands, and the DNS records the customer still needs to add. */
export async function domainStatus(domain: string): Promise<DomainStatus> {
  const [pd, cfg] = await Promise.all([
    call('GET', `/v9/projects/${project()}/domains/${encodeURIComponent(domain)}`),
    call('GET', `/v6/domains/${encodeURIComponent(domain)}/config`, undefined, { projectIdOrName: process.env.VERCEL_PROJECT_ID! }),
  ])
  if (!pd.ok) return { live: false, records: [], error: pd.status === 404 ? 'not_found' : 'lookup_failed' }

  let verified = pd.data.verified === true
  // A pending ownership check (TXT) may already be satisfied: ask Vercel to re-check.
  if (!verified && Array.isArray(pd.data.verification) && pd.data.verification.length) {
    const v = await call('POST', `/v9/projects/${project()}/domains/${encodeURIComponent(domain)}/verify`)
    verified = v.ok && v.data?.verified === true
  }

  const apex: string = pd.data.apexName || domain
  const isApex = apex === domain
  const sub = isApex ? '@' : domain.slice(0, -(apex.length + 1))
  const cname = cfg.data?.recommendedCNAME?.find?.((c: { rank: number }) => c.rank === 1)?.value || 'cname.vercel-dns.com'
  const ipv4 = cfg.data?.recommendedIPv4?.find?.((c: { rank: number }) => c.rank === 1)?.value?.[0] || '76.76.21.21'
  const misconfigured = cfg.ok ? cfg.data.misconfigured !== false : true

  const records: DnsRecord[] = []
  if (misconfigured) {
    records.push(isApex
      ? { type: 'A', name: '@', value: ipv4, purpose: 'point' }
      : { type: 'CNAME', name: sub, value: cname.replace(/\.$/, ''), purpose: 'point' })
  }
  if (!verified) {
    for (const v of (pd.data.verification || []) as Verification[]) {
      if (v.type === 'TXT') records.push({ type: 'TXT', name: v.domain.endsWith(apex) ? (v.domain === apex ? '@' : v.domain.slice(0, -(apex.length + 1))) : v.domain, value: v.value, purpose: 'verify' })
    }
  }
  return { live: verified && !misconfigured, records }
}
