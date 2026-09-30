// Starts a Stripe Checkout for a portal's invoice. Everything that matters
// (amount, name, where the money goes) is read from the database; the browser
// only says which portal. The invoice is marked paid by the Stripe webhook.
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { assertStripeEnv } from '@/lib/stripe-guard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canOpenPortal } from '@/lib/portalAccess'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

const OWN_HOST = /(^|\.)voxabase\.com$|\.vercel\.app$|^localhost$|^127\.0\.0\.1$/

export async function POST(request: Request) {
  try {
    assertStripeEnv()
    const body = await request.json().catch(() => null)
    const portalId = typeof body?.portalId === 'string' ? body.portalId : ''
    if (!portalId) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

    const admin = supabaseAdmin()
    const { data: portal } = await admin
      .from('portals')
      .select('id, user_id, name, slug, owner_username, invoice_amount, invoice_paid, is_active, password_protected')
      .eq('id', portalId)
      .single()

    const amount = Number(portal?.invoice_amount)
    if (!portal || !portal.is_active || !(amount > 0)) {
      return NextResponse.json({ error: 'There’s no invoice to pay on this portal.' }, { status: 404 })
    }
    if (portal.invoice_paid) return NextResponse.json({ error: 'This invoice has already been paid.' }, { status: 400 })
    if (!(await canOpenPortal(admin, portal))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete, plan')
      .eq('id', portal.user_id)
      .single()
    if (!profile?.stripe_account_id || !profile?.stripe_onboarding_complete) {
      return NextResponse.json({ error: 'This freelancer has not connected their Stripe account yet.' }, { status: 400 })
    }

    // Send the client back to the domain they paid from if it's the owner's
    // live white-label domain; otherwise to the app.
    const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(':')[0].toLowerCase()
    let base = process.env.NEXT_PUBLIC_APP_URL
    let portalPath = `/${portal.owner_username}/${portal.slug}`
    if (host && !OWN_HOST.test(host)) {
      const { data: domain } = await admin.from('custom_domains')
        .select('domain').eq('owner_id', portal.user_id).eq('domain', host).eq('verified', true).maybeSingle()
      if (domain) { base = `https://${domain.domain}`; portalPath = `/${portal.slug}` }
    }

    const cents = Math.round(amount * 100)
    // Voxabase's fee: 2% on the Free plan, none on Pro or Agency
    const onPaidPlan = profile.plan === 'pro' || profile.plan === 'agency'
    const platformFeeAmount = onPaidPlan ? 0 : Math.round(cents * 0.02)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: portal.name,
              description: 'Invoice payment via Voxabase',
            },
            unit_amount: cents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${base}/payment-success?portal_id=${portal.id}&username=${encodeURIComponent(portal.owner_username)}&slug=${encodeURIComponent(portal.slug)}`,
      cancel_url: `${base}${portalPath}`,
      payment_intent_data: {
        ...(platformFeeAmount > 0 ? { application_fee_amount: platformFeeAmount } : {}),
        transfer_data: {
          destination: profile.stripe_account_id,
        },
      },
      metadata: {
        kind: 'invoice',
        portal_id: portal.id,
        expected_cents: String(cents),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    // The owner's Stripe account can't receive payouts yet (onboarding unfinished or under review)
    if ((error as { code?: string })?.code === 'insufficient_capabilities_for_transfer') {
      return NextResponse.json({ error: 'Payments aren’t set up for this portal yet. Please let the sender know.' }, { status: 400 })
    }
    console.error('[checkout] failed', error)
    return NextResponse.json({ error: 'We could not start the payment. Please try again.' }, { status: 500 })
  }
}
