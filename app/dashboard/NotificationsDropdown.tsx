'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markAlertAsRead, markAllAlertsAsRead } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotifAlert = {
  id: string
  substance_name: string
  source: string
  created_at: string
}

type Props = {
  initialAlerts: NotifAlert[]
  initialUnreadCount: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function SourceBadge({ source }: { source: string }) {
  if (source === 'EUR_LEX') {
    return (
      <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-100 text-blue-700 uppercase tracking-wide">
        EUR-Lex
      </span>
    )
  }
  if (source === 'ANSM') {
    return (
      <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-100 text-rose-700 uppercase tracking-wide">
        ANSM
      </span>
    )
  }
  return (
    <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-700 uppercase tracking-wide">
      ECHA
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsDropdown({ initialAlerts, initialUnreadCount }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [isOpen, setIsOpen] = useState(false)
  const [alerts, setAlerts] = useState<NotifAlert[]>(initialAlerts)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())

  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sync with fresh server data after router.refresh()
  useEffect(() => {
    setAlerts(initialAlerts)
    setUnreadCount(initialUnreadCount)
  }, [initialAlerts, initialUnreadCount])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  function fadeOutThenRemove(id: string, callback?: () => void) {
    setFadingIds((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id))
      setFadingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setUnreadCount((prev) => Math.max(0, prev - 1))
      callback?.()
    }, 220)
  }

  function handleMarkAsRead(id: string) {
    fadeOutThenRemove(id, () => {
      startTransition(async () => {
        await markAlertAsRead(id)
        router.refresh()
      })
    })
  }

  function handleMarkAllAsRead() {
    const ids = alerts.map((a) => a.id)
    ids.forEach((id) =>
      setFadingIds((prev) => new Set(prev).add(id))
    )
    setTimeout(() => {
      setAlerts([])
      setFadingIds(new Set())
      setUnreadCount(0)
      startTransition(async () => {
        await markAllAlertsAsRead()
        router.refresh()
      })
    }, 220)
  }

  const displayCount = unreadCount > 99 ? '99+' : unreadCount

  return (
    <div ref={wrapperRef} className="relative">
      {/* ── Bell button ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={`Notifications — ${unreadCount} unread`}
        className="relative flex items-center justify-center h-8 w-8 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
            {displayCount}
          </span>
        )}
      </button>

      {/* ── Dropdown ─────────────────────────────────────────────────────── */}
      <div
        className={[
          'absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)]',
          'bg-white rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-900/10',
          'origin-top-right transition-all duration-150',
          'z-50',
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none',
        ].join(' ')}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900">Notifications</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Alert list */}
        <div className="max-h-[320px] overflow-y-auto overscroll-contain">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-700">All caught up</p>
              <p className="mt-0.5 text-xs text-neutral-400">No unread alerts</p>
            </div>
          ) : (
            <ul>
              {alerts.map((alert, i) => (
                <li
                  key={alert.id}
                  className={[
                    'transition-opacity duration-200',
                    fadingIds.has(alert.id) ? 'opacity-0' : 'opacity-100',
                    i < alerts.length - 1 ? 'border-b border-neutral-50' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 group transition-colors">
                    {/* Unread dot */}
                    <span className="mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-red-500" />

                    {/* Content — clicking scrolls to alerts and marks as read */}
                    <a
                      href="#alerts"
                      onClick={() => { handleMarkAsRead(alert.id); setIsOpen(false) }}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-neutral-900 truncate leading-snug">
                        {alert.substance_name}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <SourceBadge source={alert.source} />
                        <span className="text-[10px] text-neutral-400">{timeAgo(alert.created_at)}</span>
                      </div>
                    </a>

                    {/* Per-item mark-as-read button */}
                    <button
                      onClick={() => handleMarkAsRead(alert.id)}
                      title="Mark as read"
                      className="shrink-0 mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-neutral-300 hover:text-teal-600 hover:bg-teal-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-100">
          <a
            href="#alerts"
            onClick={() => setIsOpen(false)}
            className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            View all alerts ↓
          </a>
          {alerts.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-medium text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
