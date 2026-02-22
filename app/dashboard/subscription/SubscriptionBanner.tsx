'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function Banner() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  if (success) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800">
        <svg className="h-5 w-5 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold">Subscription activated!</p>
          <p className="text-xs text-teal-700 mt-0.5">Your plan is now active. Enjoy full access to ReglementAlert.</p>
        </div>
      </div>
    )
  }

  if (canceled) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-700">
        <svg className="h-5 w-5 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm">Checkout canceled — no charges were made.</p>
      </div>
    )
  }

  return null
}

export function SubscriptionBanner() {
  return (
    <Suspense>
      <Banner />
    </Suspense>
  )
}
