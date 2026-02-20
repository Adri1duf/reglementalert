'use client'

import { useTransition, useState, useRef } from 'react'
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

type Toast = { message: string; type: 'success' | 'error' } | null

export default function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set())
  const [checking, setChecking] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unreadCount = alerts.filter((a) => !a.is_read).length

  function showToast(message: string, type: 'success' | 'error') {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  async function handleCheck() {
    setChecking(true)
    try {
      const res = await fetch('/api/check-regulations', { method: 'POST' })
      const data: CheckResult & { error?: string } = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      if (data.alertsCreated > 0) {
        showToast(
          `${data.alertsCreated} new alert${data.alertsCreated !== 1 ? 's' : ''} found`,
          'success'
        )
        router.refresh()
      } else {
        showToast(
          `No new matches — ${data.ingredientsChecked} ingredients checked against ${data.svhcCount} SVHCs`,
          'success'
        )
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Check failed', 'error')
    } finally {
      setChecking(false)
    }
  }

  async function handleExportPDF() {
    setExporting(true)
    try {
      const res = await fetch('/api/export-alerts-pdf')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ReglementAlert_Report_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error')
    } finally {
      setExporting(false)
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
    <>
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white max-w-sm ${
            toast.type === 'success' ? 'bg-teal-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      <div className="space-y-4">
        {/* ── Section header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <h2 className="text-base font-semibold text-neutral-900">Regulatory alerts</h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50 text-neutral-600 text-sm font-medium transition-colors"
              >
                {exporting ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-neutral-300 border-t-neutral-600 animate-spin" />
                    Exporting…
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleCheck}
              disabled={checking}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-teal-400 text-white text-sm font-medium transition-colors"
            >
              {checking ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Check ECHA now
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Alert list ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-neutral-900">No alerts yet</p>
              <p className="mt-1 text-xs text-neutral-400 max-w-xs">
                Click &ldquo;Check ECHA now&rdquo; to cross-reference your ingredients against
                the SVHC Candidate List.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className={`flex gap-4 px-5 py-4 transition-colors ${
                    !alert.is_read
                      ? 'bg-red-50/50 border-l-[3px] border-l-red-400'
                      : 'border-l-[3px] border-l-transparent hover:bg-neutral-50'
                  }`}
                >
                  {/* Severity dot */}
                  <div className="pt-1 shrink-0">
                    <span
                      className={`block h-2 w-2 rounded-full mt-1 ${
                        !alert.is_read ? 'bg-red-500' : 'bg-neutral-300'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900 leading-snug">
                        {alert.substance_name}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-amber-100 text-amber-700 uppercase tracking-wide">
                        ECHA SVHC
                      </span>
                      {!alert.is_read && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-red-100 text-red-600 uppercase tracking-wide">
                          New
                        </span>
                      )}
                    </div>

                    {alert.monitored_ingredients && (
                      <p className="text-xs text-neutral-500">
                        Matched:{' '}
                        <span className="font-medium text-neutral-700">
                          {alert.monitored_ingredients.ingredient_name}
                        </span>
                      </p>
                    )}

                    {alert.cas_number && (
                      <p className="text-xs font-mono text-neutral-400">CAS {alert.cas_number}</p>
                    )}

                    {alert.reason && (
                      <p className="text-xs text-neutral-500 leading-relaxed">{alert.reason}</p>
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
                        className="text-[11px] text-teal-600 hover:text-teal-700 font-medium"
                      >
                        View on ECHA ↗
                      </a>
                    </div>
                  </div>

                  {/* Mark read */}
                  {!alert.is_read && (
                    <div className="shrink-0 pt-0.5">
                      <button
                        onClick={() => handleMarkAsRead(alert.id)}
                        disabled={markingIds.has(alert.id)}
                        title="Mark as read"
                        className="h-7 w-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-teal-600 hover:bg-teal-50 disabled:opacity-40 transition-colors"
                      >
                        {markingIds.has(alert.id) ? (
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-neutral-300 border-t-transparent animate-spin" />
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
