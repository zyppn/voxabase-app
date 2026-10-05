// One-time Backblaze bucket setup, done from the app because the bucket's own
// key isn't allowed to change bucket settings:
// - CORS: lets the app's pages upload straight to the bucket
// - Lifecycle: keeps only the latest version of each file, so a deleted or
//   replaced file stops counting toward storage
// GET reports whether it's done; POST applies it with the account's master
// key, which is used for this one request and never stored or logged.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { b2Configured } from '@/lib/b2'
import { APP_HOST } from '@/lib/appHost'

const RULE_NAME = 'voxabaseUploads'

type Auth = { accountId: string; apiUrl: string; authorizationToken: string }
type Bucket = { bucketId: string; bucketName: string; corsRules?: { corsRuleName: string }[]; lifecycleRules?: { daysFromHidingToDeleting?: number | null }[] }

async function authorize(keyId: string, key: string): Promise<Auth | null> {
  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { authorization: 'Basic ' + Buffer.from(`${keyId}:${key}`).toString('base64') },
    cache: 'no-store',
  }).catch(() => null)
  return res?.ok ? res.json() : null
}

async function call<T>(auth: Auth, op: string, body: object): Promise<T | null> {
  const res = await fetch(`${auth.apiUrl}/b2api/v2/${op}`, {
    method: 'POST',
    headers: { authorization: auth.authorizationToken, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => null)
  if (!res?.ok) {
    console.error(`[storage-setup] ${op} failed`, res?.status, await res?.text().catch(() => ''))
    return null
  }
  return res.json()
}

async function findBucket(auth: Auth): Promise<Bucket | null> {
  const list = await call<{ buckets: Bucket[] }>(auth, 'b2_list_buckets', {
    accountId: auth.accountId,
    bucketName: process.env.B2_BUCKET,
  })
  return list?.buckets.find((b) => b.bucketName === process.env.B2_BUCKET) ?? null
}

const describe = (b: Bucket) => ({
  uploads: !!b.corsRules?.some((r) => r.corsRuleName === RULE_NAME),
  versions: !!b.lifecycleRules?.some((r) => r.daysFromHidingToDeleting === 1),
})

async function signedIn() {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}

export async function GET() {
  if (!(await signedIn())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!b2Configured()) return NextResponse.json({ configured: false })
  const auth = await authorize(process.env.B2_KEY_ID!, process.env.B2_APPLICATION_KEY!)
  if (!auth) return NextResponse.json({ configured: true, keyWorks: false })
  const bucket = await findBucket(auth)
  if (!bucket) return NextResponse.json({ configured: true, keyWorks: true, bucketFound: false })
  return NextResponse.json({ configured: true, keyWorks: true, bucketFound: true, ...describe(bucket) })
}

export async function POST(request: Request) {
  if (!(await signedIn())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!b2Configured()) return NextResponse.json({ error: 'Add the B2 settings in Vercel first.' }, { status: 400 })
  const body = await request.json().catch(() => null)
  const keyId = typeof body?.keyId === 'string' ? body.keyId.trim() : ''
  const key = typeof body?.key === 'string' ? body.key.trim() : ''
  if (!keyId || !key) return NextResponse.json({ error: 'Enter the keyID and applicationKey.' }, { status: 400 })

  const auth = await authorize(keyId, key)
  if (!auth) return NextResponse.json({ error: 'Backblaze didn’t accept that key. Check both values and try again.' }, { status: 400 })
  const bucket = await findBucket(auth)
  if (!bucket) return NextResponse.json({ error: `Couldn’t find the bucket “${process.env.B2_BUCKET}” with that key.` }, { status: 400 })

  const origins = new Set([`https://${APP_HOST}`])
  const origin = request.headers.get('origin')
  if (origin && /^https:\/\//.test(origin)) origins.add(origin)
  const updated = await call<Bucket>(auth, 'b2_update_bucket', {
    accountId: auth.accountId,
    bucketId: bucket.bucketId,
    corsRules: [{
      corsRuleName: RULE_NAME,
      allowedOrigins: [...origins],
      allowedOperations: ['s3_put'],
      allowedHeaders: ['*'],
      exposeHeaders: ['etag', 'x-amz-version-id'],
      maxAgeSeconds: 3600,
    }],
    // "Keep only the last version": a deleted or replaced file is gone a day later
    lifecycleRules: [{ fileNamePrefix: '', daysFromHidingToDeleting: 1, daysFromUploadingToHiding: null }],
  })
  if (!updated) {
    return NextResponse.json({ error: 'Backblaze refused the change. Use the Master Application Key (it can change bucket settings).' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, ...describe(updated) })
}
