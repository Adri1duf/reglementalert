import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single<{ stripe_customer_id: string | null }>()

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: 'No Stripe customer found' }, { status: 404 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${siteUrl}/dashboard/subscription`,
  })

  return Response.json({ url: portalSession.url })
}
