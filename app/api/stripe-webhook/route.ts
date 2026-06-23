import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

export async function POST(request: Request) {
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
    const plan = session.metadata?.plan

    if (userId && plan && session.mode === 'subscription') {
      // Fetch subscription to get period end date
      const subscriptionId = session.subscription as string
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

      await supabase.from('profiles').update({
        plan,
        subscription_id: subscriptionId,
        subscription_period_end: periodEnd,
      }).eq('id', userId)
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
    const status = subscription.status
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

    if (status === 'active') {
      const priceId = subscription.items.data[0]?.price.id
      const proPrice = process.env.STRIPE_PRO_PRICE_ID
      const agencyPrice = process.env.STRIPE_AGENCY_PRICE_ID
      const plan = priceId === agencyPrice ? 'agency' : priceId === proPrice ? 'pro' : 'free'

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await supabase.from('profiles').update({
          plan,
          subscription_period_end: periodEnd,
        }).eq('id', profile.id)
      }
    }
  }

  return NextResponse.json({ received: true })
}