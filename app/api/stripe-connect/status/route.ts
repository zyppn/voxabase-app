// Asks Stripe whether the signed-in user's connected account can actually
// receive client payments (onboarding submitted and transfers active), and
// stores the answer. Returning from Stripe's onboarding page doesn't mean it's done.
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { assertStripeEnv } from '@/lib/stripe-guard'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

export async function GET() {
  try {
    assertStripeEnv()
    const supabase = createClient(await cookies())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('stripe_account_id, stripe_onboarding_complete').eq('id', user.id).single()
    if (!profile?.stripe_account_id) return NextResponse.json({ status: 'idle' })

    const account = await stripe.accounts.retrieve(profile.stripe_account_id)
    const ready = account.details_submitted === true && account.capabilities?.transfers === 'active'
      && account.capabilities?.card_payments === 'active'

    if (profile.stripe_onboarding_complete !== ready) {
      // Billing columns are server-only (see *_profiles_protect_billing.sql)
      await supabaseAdmin().from('profiles').update({ stripe_onboarding_complete: ready }).eq('id', user.id)
    }
    return NextResponse.json({
      status: ready ? 'connected' : 'incomplete',
      // Submitted but Stripe is still checking, vs. details still missing
      verifying: !ready && account.details_submitted === true && (account.requirements?.currently_due?.length ?? 0) === 0,
    })
  } catch (error) {
    console.error('[stripe-connect/status] failed', error)
    return NextResponse.json({ error: 'Could not check your Stripe account.' }, { status: 500 })
  }
}
