'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { markAlertAsRead } from './actions'

export type Alert = {
  id: string
  substance_name: string
  cas_number: string | null
  source: string
  regulation: string
  reason: string | null
  echa_url: string | null
  is_read: boolean
  created_at: string
  monitored_ingredients: { ingredient_name: string } | null
}

type CheckResult = {
  svhcCount: number
  ingredientsChecked: number
  alertsCreated: number
  duplicatesSkipped: number
}

export default function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set())
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)

  const unreadCount = alerts.filter((a) => !a.is_read).length

  async function handleCheck() {
    setChecking(true)
    setCheckResult(null)
    setCheckError(null)
    try {
      const res = await fetch('/api/check-regulations', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setCheckResult(data)
      router.refresh()
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setChecking(false)
    }
  }

  function handleMarkAsRead(id: string) {
    setMarkingIds((prev) => new Set(prev).add(id))
    startTransition(async () => {
      await markAlertAsRead(id)
      setMarkingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Header row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">Regulatory alerts</h2>
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {checkResult && (
            <p className="text-xs text-neutral-500">
              {checkResult.alertsCreated > 0
                ? `${checkResult.alertsCreated} new alert${checkResult.alertsCreated !== 1 ? 's' : ''} found`
                : `No new matches (${checkResult.ingredientsChecked} ingredients vs ${checkResult.svhcCount} SVHCs checked)`}
            </p>
          )}
          {checkError && <p className="text-xs text-red-500">{checkError}</p>}
          <button
            onClick={handleCheck}
            disabled={checking}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {checking ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-neutral-400 border-t-transparent animate-spin" />
                Checking…
              </span>
            ) : (
              'Check ECHA now'
            )}
          </button>
        </div>
      </div>

      {/* ── Alert list ── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {alerts.length === 0 ? (
          <div className="text-center py-12 space-y-1 px-6">
            <p className="text-sm font-medium text-foreground">No alerts yet</p>
            <p className="text-xs text-neutral-400">
              Click &ldquo;Check ECHA now&rdquo; to cross-reference your ingredients against
              the SVHC Candidate List.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={`flex gap-4 p-4 sm:p-5 transition-colors ${
                  !alert.is_read
                    ? 'bg-red-50/60 dark:bg-red-900/10 border-l-4 border-l-red-400'
                    : 'border-l-4 border-l-transparent'
                }`}
              >
                {/* Left: content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {alert.substance_name}
                    </span>
                    <span className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      ECHA SVHC
                    </span>
                    {!alert.is_read && (
                      <span className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                        New
                      </span>
                    )}
                  </div>

                  {alert.monitored_ingredients && (
                    <p className="text-xs text-neutral-500">
                      Matched ingredient:{' '}
                      <span className="font-medium text-foreground">
                        {alert.monitored_ingredients.ingredient_name}
                      </span>
                    </p>
                  )}

                  {alert.cas_number && (
                    <p className="text-xs text-neutral-400">CAS {alert.cas_number}</p>
                  )}

                  {alert.reason && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      {alert.reason}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-0.5">
                    <span className="text-[11px] text-neutral-400">
                      {new Date(alert.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <a
                      href={alert.echa_url ?? 'https://echa.europa.eu/candidate-list-table'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      View on ECHA ↗
                    </a>
                  </div>
                </div>

                {/* Right: mark as read */}
                {!alert.is_read && (
                  <div className="shrink-0 pt-0.5">
                    <button
                      onClick={() => handleMarkAsRead(alert.id)}
                      disabled={markingIds.has(alert.id)}
                      className="text-xs text-neutral-400 hover:text-foreground disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      {markingIds.has(alert.id) ? '…' : 'Mark read'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
