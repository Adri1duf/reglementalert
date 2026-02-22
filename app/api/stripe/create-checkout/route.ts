import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { plan } = await req.json()
  if (!['starter', 'pro'].includes(plan)) {
    return Response.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const priceId =
    plan === 'pro'
      ? process.env.STRIPE_PRICE_ID_PRO
      : process.env.STRIPE_PRICE_ID_STARTER

  if (!priceId) {
    return Response.json({ error: 'Price ID not configured' }, { status: 500 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, subscription_status')
    .eq('id', user.id)
    .single<{ stripe_customer_id: string | null; subscription_status: string | null }>()

  // If already has an active subscription → use portal instead
  const activeStatuses = ['active', 'trialing']
  if (profile?.subscription_status && activeStatuses.includes(profile.subscription_status)) {
    return Response.json({ error: 'Already subscribed. Use the portal to change plans.' }, { status: 409 })
  }

  const admin = createAdminClient()
  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    })
    customerId = customer.id

    await admin
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${siteUrl}/dashboard/subscription?success=true`,
    cancel_url: `${siteUrl}/dashboard/subscription?canceled=true`,
    allow_promotion_codes: true,
    // Store userId + plan so the webhook can update the profile
    metadata: { plan, userId: user.id },
    subscription_data: {
      metadata: { plan, userId: user.id },
    },
  })

  return Response.json({ url: session.url })
}
