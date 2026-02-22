import Stripe from 'stripe'
import { stripe, planFromPriceId } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Raw body required for Stripe signature verification
export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return new Response(`Webhook error: ${(err as Error).message}`, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      // ── Checkout completed ──────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.userId
        const plan = session.metadata?.plan
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        if (!userId) {
          console.error('[webhook] checkout.session.completed: missing userId in metadata')
          break
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const firstItem = subscription.items.data[0]
        const resolvedPlan = plan ?? planFromPriceId(firstItem?.price.id)
        // In Stripe v20, current_period_end moved to SubscriptionItem
        const periodEnd = firstItem?.current_period_end

        await admin
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_plan: resolvedPlan,
            subscription_status: subscription.status,
            subscription_ends_at: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
          .eq('id', userId)

        console.log(`[webhook] checkout.session.completed: user ${userId} subscribed to ${resolvedPlan}`)
        break
      }

      // ── Subscription updated (renewal, plan change, etc.) ───────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const firstItem = subscription.items.data[0]
        const priceId = firstItem?.price.id
        const plan = planFromPriceId(priceId)
        const periodEnd = firstItem?.current_period_end

        const update: Record<string, string | null> = {
          subscription_status: subscription.status,
          subscription_ends_at: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        }
        if (plan) update.subscription_plan = plan

        await admin
          .from('profiles')
          .update(update)
          .eq('stripe_customer_id', customerId)

        console.log(`[webhook] subscription.updated: customer ${customerId} → ${subscription.status}`)
        break
      }

      // ── Subscription deleted (canceled) ────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const periodEnd = subscription.items.data[0]?.current_period_end

        await admin
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            subscription_ends_at: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
          .eq('stripe_customer_id', customerId)

        console.log(`[webhook] subscription.deleted: customer ${customerId}`)
        break
      }

      // ── Payment failed ──────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await admin
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)

        console.log(`[webhook] payment_failed: customer ${customerId}`)
        break
      }

      default:
        // Unhandled event — not an error
        break
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err)
    return new Response('Internal server error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
