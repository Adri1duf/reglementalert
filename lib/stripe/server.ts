import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
})

// Map price IDs to plan names
export function planFromPriceId(priceId: string | undefined): 'starter' | 'pro' | null {
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_ID_STARTER) return 'starter'
  return null
}

// Max ingredients per plan (null = unlimited)
export function ingredientLimit(
  plan: string | null,
  status: string | null
): number | null {
  const active = status === 'active' || status === 'trialing'
  if (!active) return 0
  if (plan === 'pro') return null
  if (plan === 'starter') return 50
  return 0
}

export function isActiveSubscription(status: string | null): boolean {
  return status === 'active' || status === 'trialing'
}
