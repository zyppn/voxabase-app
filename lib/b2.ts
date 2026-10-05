// Delivered files live in a private Backblaze B2 bucket (S3-compatible API).
// The server signs short-lived links for each request after its own checks
// (sign-in, team access, password, paid invoice); nothing is public.
// Server-only: the secret key never leaves the server.
import { createHash, createHmac, randomBytes } from 'crypto'

// Total stored across every account, kept under B2's 10 GB free allowance.
// Uploads that would pass this are refused before they start.
export const B2_CAP_BYTES = 9_500_000_000

// One upload (a single signed PUT); S3 allows up to 5 GB
export const B2_MAX_FILE_BYTES = 1024 * 1024 * 1024

export function b2Configured() {
  const e = process.env
  return !!(e.B2_KEY_ID && e.B2_APPLICATION_KEY && e.B2_BUCKET && e.B2_ENDPOINT && e.B2_REGION)
}

function config() {
  const e = process.env
  return {
    keyId: e.B2_KEY_ID!,
    secret: e.B2_APPLICATION_KEY!,
    bucket: e.B2_BUCKET!,
    // "s3.us-east-005.backblazeb2.com" or the full https:// address
    host: e.B2_ENDPOINT!.replace(/^https?:\/\//, '').replace(/\/+$/, ''),
    // https, unless the address says otherwise (a local test server)
    scheme: e.B2_ENDPOINT!.startsWith('http://') ? 'http' : 'https',
    region: e.B2_REGION!,
  }
}

// RFC 3986 encoding, as AWS Signature V4 expects
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const hmac = (key: Buffer | string, s: string) => createHmac('sha256', key).update(s).digest()

/**
 * A signed link to one object (AWS Signature V4, query-string form).
 * `contentLength` is signed too, so a PUT must send exactly that many bytes.
 */
export function presign(method: 'GET' | 'PUT' | 'HEAD' | 'DELETE', key: string, opts: {
  expires?: number
  contentLength?: number
  query?: Record<string, string>
} = {}) {
  const c = config()
  const now = new Date()
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const day = amzDate.slice(0, 8)
  const scope = `${day}/${c.region}/s3/aws4_request`
  const path = `/${enc(c.bucket)}/${key.split('/').map(enc).join('/')}`

  const headers: Record<string, string> = { host: c.host }
  if (opts.contentLength !== undefined) headers['content-length'] = String(opts.contentLength)
  const signedHeaders = Object.keys(headers).sort().join(';')

  const params: Record<string, string> = {
    ...opts.query,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${c.keyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(opts.expires ?? 300),
    'X-Amz-SignedHeaders': signedHeaders,
  }
  const query = Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join('&')
  const canonicalHeaders = Object.keys(headers).sort().map((h) => `${h}:${headers[h]}\n`).join('')
  const canonical = [method, path, query, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n')
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n')
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${c.secret}`, day), c.region), 's3'), 'aws4_request')
  const signature = createHmac('sha256', signingKey).update(toSign).digest('hex')
  return `${c.scheme}://${c.host}${path}?${query}&X-Amz-Signature=${signature}`
}

/** Where a new upload goes: "<owner>/<portal>/<time>-<random>-<name>" */
export function newObjectKey(ownerId: string, portalId: string, safeName: string) {
  return `${ownerId}/${portalId}/${Date.now()}-${randomBytes(4).toString('hex')}-${safeName}`
}

/** Size and version of a stored object, or null if it isn't there. */
export async function headObject(key: string): Promise<{ size: number; version: string | null } | null> {
  const res = await fetch(presign('HEAD', key, { expires: 60 }), { method: 'HEAD', cache: 'no-store' })
  if (!res.ok) return null
  return { size: Number(res.headers.get('content-length') || 0), version: res.headers.get('x-amz-version-id') }
}

/**
 * Removes an object for good. B2 keeps old versions of a file, so a plain
 * delete would only hide it (and still count toward the bill): delete the
 * exact version. Missing objects count as deleted.
 */
export async function deleteObject(key: string, version?: string | null): Promise<boolean> {
  const v = version ?? (await headObject(key))?.version
  if (!v) return (await headObject(key)) === null
  const res = await fetch(presign('DELETE', key, { expires: 60, query: { versionId: v } }), { method: 'DELETE', cache: 'no-store' })
  return res.ok || res.status === 404
}

/** A short-lived link that downloads the object under its saved file name. */
export function downloadUrl(key: string, fileName: string, expires = 120) {
  return presign('GET', key, {
    expires,
    query: { 'response-content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}` },
  })
}
