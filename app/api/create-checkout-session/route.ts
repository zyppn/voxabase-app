import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

export async function POST(request: Request) {
  try {
    const { portalId, portalName, amount, username, slug } = await request.json()

    // Get the freelancer's Stripe account ID
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('username', username)
      .single()

    if (!profile?.stripe_account_id || !profile?.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: 'This freelancer has not connected their Stripe account yet.' },
        { status: 400 }
      )
    }

    // Platform fee: 2% of the transaction
    const platformFeeAmount = Math.round(amount * 100 * 0.02)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: portalName,
              description: 'Invoice payment via VoxaBase',
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?portal_id=${portalId}&username=${username}&slug=${slug}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${username}/${slug}`,
      payment_intent_data: {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: profile.stripe_account_id,
        },
      },
      metadata: {
        portal_id: portalId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}