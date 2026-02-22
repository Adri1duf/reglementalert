import { loadStripe } from '@stripe/stripe-js'

// Singleton — loadStripe returns the same instance on repeated calls
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)
