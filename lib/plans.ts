// Which paid plan a Stripe price unlocks. Server-side only: checkout accepts no
// other prices, and the webhook uses this to decide what a subscription is for.
// Each plan has a monthly and an annual price. The NEXT_PUBLIC_ names are the
// same IDs the pricing page uses, so each price is only configured once.

export type PaidPlan = 'pro' | 'agency'

const configured = (...ids: (string | undefined)[]) =>
  ids.map((id) => id?.trim()).filter((id): id is string => !!id)

const PRICES: Record<PaidPlan, string[]> = {
  pro: configured(
    process.env.STRIPE_PRO_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID,
  ),
  agency: configured(
    process.env.STRIPE_AGENCY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_AGENCY_ANNUAL_PRICE_ID,
  ),
}

export function planForPrice(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null
  if (PRICES.agency.includes(priceId)) return 'agency'
  if (PRICES.pro.includes(priceId)) return 'pro'
  return null
}
