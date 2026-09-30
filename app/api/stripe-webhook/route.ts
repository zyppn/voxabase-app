import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { assertStripeEnv } from '@/lib/stripe-guard'
import { planForPrice } from '@/lib/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

// Stripe reports the billing period on the subscription item (API 2025-03-31
// and later); fall back to the old top-level field just in case.
function periodEndOf(subscription: Stripe.Subscription): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = subscription.items.data[0]?.current_period_end ?? (subscription as any).current_period_end
  return raw ? new Date(raw * 1000).toISOString() : null
}

export async function POST(request: Request) {
  assertStripeEnv()
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.supabase_user_id

    // A client paid a portal invoice. Only Stripe can mark an invoice paid, and
    // only for the full amount the portal asked for when checkout started.
    const portalId = session.metadata?.portal_id
    if (session.mode === 'payment' && portalId && session.payment_status === 'paid') {
      const { data: portal } = await supabase.from('portals').select('id, invoice_amount').eq('id', portalId).single()
      const expected = Math.round(Number(portal?.invoice_amount) * 100)
      if (portal && (session.amount_total ?? 0) >= expected) {
        await supabase.from('portals').update({ invoice_paid: true }).eq('id', portalId)
      } else {
        console.error(`[stripe-webhook] Invoice payment for portal ${portalId} was ${session.amount_total}, expected ${expected}; not marked paid.`)
      }
    }

    if (userId && session.mode === 'subscription' && session.subscription) {
      const subscriptionId = session.subscription as string
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      // The price actually bought (monthly or annual) decides the plan.
      const plan = planForPrice(subscription.items.data[0]?.price.id)

      if (plan) {
        await supabase.from('profiles').update({
          plan,
          subscription_id: subscriptionId,
          subscription_period_end: periodEndOf(subscription),
        }).eq('id', userId)
      } else {
        console.error(`[stripe-webhook] Subscription ${subscriptionId} uses a price that isn't configured; plan left unchanged.`)
      }
    }
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (profile) {
      await supabase.from('profiles').update({
        plan: 'free',
        subscription_id: null,
        subscription_period_end: null,
      }).eq('id', profile.id)
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string

    if (subscription.status === 'active') {
      // Monthly and annual prices both map to their plan. A price that isn't
      // configured never downgrades anyone; only the renewal date is updated.
      const plan = planForPrice(subscription.items.data[0]?.price.id)
      const periodEnd = periodEndOf(subscription)

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await supabase.from('profiles').update(
          plan ? { plan, subscription_period_end: periodEnd } : { subscription_period_end: periodEnd }
        ).eq('id', profile.id)
      }
    }
  }

  return NextResponse.json({ received: true })
}