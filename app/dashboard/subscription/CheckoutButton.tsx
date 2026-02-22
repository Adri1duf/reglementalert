'use client'

import { useState } from 'react'

// ── Subscribe button ───────────────────────────────────────────────────────────

export function CheckoutButton({
  plan,
  label,
  variant = 'primary',
  className = '',
}: {
  plan: 'starter' | 'pro'
  label: string
  variant?: 'primary' | 'outline'
  className?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const base =
    'inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60'
  const styles = {
    primary: `${base} bg-teal-600 hover:bg-teal-700 text-white`,
    outline: `${base} border border-neutral-300 hover:bg-neutral-50 text-neutral-700`,
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={loading}
        className={styles[variant]}
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 rounded-full border-2 border-current/40 border-t-current animate-spin" />
            Redirecting…
          </>
        ) : (
          label
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}

// ── Manage (portal) button ─────────────────────────────────────────────────────

export function ManageButton({ className = '' }: { className?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/create-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Something went wrong.')
        setLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 disabled:opacity-60 transition-colors"
      >
        {loading ? (
          <>
            <span className="h-3 w-3 rounded-full border-2 border-teal-600/40 border-t-teal-600 animate-spin" />
            Opening…
          </>
        ) : (
          <>
            Manage subscription
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </>
        )}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
