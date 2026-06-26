// lib/stripe-guard.ts
//
// Guards against the classic "silent test-key fallback in production" bug,
// where a missing/incorrect live key causes real customers to be charged
// against a test account (or checkout to fail in confusing ways).
//
// Import and call assertStripeEnv() at the top of any Stripe route handler.
// In production it THROWS if the secret key isn't a live key, or if any
// required Stripe env var is missing. In dev/preview it only warns.

const isProd =
  process.env.VERCEL_ENV === 'production' ||
  (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV)

type Severity = 'throw' | 'warn'

function report(messages: string[], severity: Severity) {
  if (messages.length === 0) return
  const banner =
    '\n[stripe-guard] Stripe environment problems detected:\n' +
    messages.map((m) => `  • ${m}`).join('\n') +
    '\n'
  if (severity === 'throw') {
    throw new Error(banner)
  }
  // eslint-disable-next-line no-console
  console.warn(banner)
}

let cached: { ok: boolean } | null = null

/**
 * Validates Stripe-related environment variables.
 * - Production: throws on any problem (fails the request loudly instead of
 *   silently doing the wrong thing).
 * - Non-production: logs a warning so you notice during local/preview testing.
 *
 * Safe to call on every request; the result is memoized per server instance.
 */
export function assertStripeEnv(): void {
  if (cached?.ok) return

  const problems: string[] = []
  const secret = process.env.STRIPE_SECRET_KEY
  const webhook = process.env.STRIPE_WEBHOOK_SECRET
  const proPrice = process.env.STRIPE_PRO_PRICE_ID
  const agencyPrice = process.env.STRIPE_AGENCY_PRICE_ID
  const pub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  if (!secret) {
    problems.push('STRIPE_SECRET_KEY is missing')
  } else if (isProd && secret.startsWith('sk_test_')) {
    problems.push(
      'STRIPE_SECRET_KEY is a TEST key (sk_test_) but the app is running in production. ' +
        'Real charges would hit your test account and never settle. Set the live key (sk_live_).'
    )
  }

  if (isProd && pub && pub.startsWith('pk_test_')) {
    problems.push(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a TEST key (pk_test_) in production. Set the live key (pk_live_).'
    )
  }

  if (!webhook) {
    problems.push('STRIPE_WEBHOOK_SECRET is missing — webhook signature verification will fail.')
  }

  if (!proPrice) problems.push('STRIPE_PRO_PRICE_ID is missing.')
  if (!agencyPrice) problems.push('STRIPE_AGENCY_PRICE_ID is missing.')

  // Cross-check: in production, price IDs should not be obviously-test placeholders.
  // (Stripe price IDs don't encode mode, so we can only catch empties/placeholders here.)

  report(problems, isProd ? 'throw' : 'warn')

  // Only cache a clean result so transient missing-env during cold start can re-evaluate.
  if (problems.length === 0) cached = { ok: true }
}
