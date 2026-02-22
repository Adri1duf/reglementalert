import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isActiveSubscription } from '@/lib/stripe/server'
import { CheckoutButton, ManageButton } from './CheckoutButton'
import { SubscriptionBanner } from './SubscriptionBanner'

// ── Types ─────────────────────────────────────────────────────────────────────

type SubscriptionProfile = {
  company_name: string
  subscription_status: string | null
  subscription_plan: 'starter' | 'pro' | null
  subscription_ends_at: string | null
  stripe_customer_id: string | null
}

// ── Plan config ───────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '299',
    description: 'For small teams monitoring EU cosmetics compliance.',
    features: [
      'Up to 50 monitored ingredients',
      'ECHA SVHC, EUR-Lex & ANSM alerts',
      'Email notifications',
      'PDF export reports',
      'Dashboard access',
    ],
    highlighted: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '499',
    description: 'For larger teams that need unlimited scale and collaboration.',
    features: [
      'Unlimited monitored ingredients',
      'Everything in Starter',
      'Team management (invite colleagues)',
      'Priority support',
    ],
    highlighted: true,
  },
]

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  active:   { label: 'Active',    style: 'bg-teal-50 text-teal-700 border border-teal-200' },
  trialing: { label: 'Trial',     style: 'bg-blue-50 text-blue-700 border border-blue-200' },
  past_due: { label: 'Past due',  style: 'bg-amber-50 text-amber-700 border border-amber-200' },
  canceled: { label: 'Canceled',  style: 'bg-red-50 text-red-700 border border-red-200' },
  inactive: { label: 'Inactive',  style: 'bg-neutral-100 text-neutral-500 border border-neutral-200' },
}

const PLAN_DISPLAY: Record<string, string> = { starter: 'Starter', pro: 'Pro' }

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SubscriptionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, subscription_status, subscription_plan, subscription_ends_at, stripe_customer_id')
    .eq('id', user.id)
    .single<SubscriptionProfile>()

  if (!profile) redirect('/dashboard')

  const isActive = isActiveSubscription(profile.subscription_status)
  const statusInfo = STATUS_LABELS[profile.subscription_status ?? 'inactive'] ?? STATUS_LABELS.inactive

  const renewalDate = profile.subscription_ends_at
    ? new Date(profile.subscription_ends_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-base font-bold text-neutral-900">ReglementAlert</span>
            </div>
          </div>

          <form action="/logout" method="POST">
            <button
              type="submit"
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* ── Page title ───────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Subscription</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your ReglementAlert plan for {profile.company_name}
          </p>
        </div>

        {/* ── Success / canceled banners ───────────────────────────────────── */}
        <SubscriptionBanner />

        {/* ── Current plan card ────────────────────────────────────────────── */}
        {isActive && profile.subscription_plan && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Current plan</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusInfo.style}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">
                  {PLAN_DISPLAY[profile.subscription_plan]} Plan
                </p>
                {renewalDate && (
                  <p className="text-sm text-neutral-500">
                    {profile.subscription_status === 'canceled'
                      ? `Access until ${renewalDate}`
                      : `Renews on ${renewalDate}`}
                  </p>
                )}
              </div>
              {profile.stripe_customer_id && (
                <ManageButton className="shrink-0 pt-1" />
              )}
            </div>
          </div>
        )}

        {/* ── Pricing cards ────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-semibold text-neutral-900 mb-5">
            {isActive ? 'Available plans' : 'Choose a plan to get started'}
          </h2>

          <div className="grid sm:grid-cols-2 gap-5">
            {PLANS.map((plan) => {
              const isCurrent = isActive && profile.subscription_plan === plan.id
              const isOtherActive = isActive && profile.subscription_plan !== plan.id

              return (
                <div
                  key={plan.id}
                  className={[
                    'relative bg-white rounded-2xl border shadow-sm flex flex-col',
                    plan.highlighted && !isCurrent
                      ? 'border-teal-300 shadow-teal-100'
                      : 'border-neutral-200',
                    isCurrent ? 'ring-2 ring-teal-500' : '',
                  ].join(' ')}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-px left-6 right-6 h-0.5 rounded-b bg-teal-500" />
                  )}

                  <div className="p-6 flex-1 flex flex-col gap-5">
                    {/* Plan header */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-neutral-900">{plan.name}</h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                            Current plan
                          </span>
                        )}
                        {plan.highlighted && !isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-neutral-900">{plan.price}€</span>
                        <span className="text-sm text-neutral-400">/month</span>
                      </div>
                      <p className="mt-2 text-xs text-neutral-500 leading-relaxed">{plan.description}</p>
                    </div>

                    {/* Feature list */}
                    <ul className="flex-1 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-neutral-600">
                          <svg
                            className="h-4 w-4 shrink-0 mt-0.5 text-teal-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full px-5 py-2.5 rounded-lg border border-neutral-200 text-sm font-semibold text-neutral-400 cursor-default"
                      >
                        Current plan
                      </button>
                    ) : isOtherActive ? (
                      // Already subscribed → portal handles plan changes
                      <ManageButton className="w-full" />
                    ) : (
                      <CheckoutButton
                        plan={plan.id}
                        label={`Subscribe to ${plan.name}`}
                        variant={plan.highlighted ? 'primary' : 'outline'}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── FAQ / note ───────────────────────────────────────────────────── */}
        <div className="text-center space-y-1.5">
          <p className="text-xs text-neutral-400">
            All plans are billed monthly. Cancel anytime via the customer portal.
          </p>
          <p className="text-xs text-neutral-400">
            Payments are processed securely by Stripe. VAT may apply.
          </p>
        </div>
      </main>
    </div>
  )
}
