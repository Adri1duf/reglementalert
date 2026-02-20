import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import IngredientsPanel, { type Ingredient } from './IngredientsPanel'
import AlertsPanel, { type Alert } from './AlertsPanel'

type Profile = {
  company_name: string
  sector: string | null
  created_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: ingredients }, { data: alerts }] = await Promise.all([
    supabase
      .from('profiles')
      .select('company_name, sector, created_at')
      .eq('id', user.id)
      .single<Profile>(),

    supabase
      .from('monitored_ingredients')
      .select('id, ingredient_name, cas_number, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .returns<Ingredient[]>(),

    supabase
      .from('regulatory_alerts')
      .select(
        'id, substance_name, cas_number, source, regulation, reason, echa_url, is_read, created_at, monitored_ingredients(ingredient_name)'
      )
      .eq('user_id', user.id)
      .order('is_read', { ascending: true })
      .order('created_at', { ascending: false })
      .returns<Alert[]>(),
  ])

  const ingredientList = ingredients ?? []
  const alertList = alerts ?? []
  const unreadCount = alertList.filter((a) => !a.is_read).length

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
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

          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {unreadCount} alert{unreadCount !== 1 ? 's' : ''}
              </span>
            )}
            <form action="/logout" method="POST">
              <button
                type="submit"
                className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* ── Welcome ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {profile ? `Welcome, ${profile.company_name}` : 'Dashboard'}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
          </div>
          {/* Stats pills */}
          <div className="flex items-center gap-3">
            <Stat
              label="Ingredients"
              value={ingredientList.length}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082" />
                </svg>
              }
            />
            <Stat
              label="Unread alerts"
              value={unreadCount}
              urgent={unreadCount > 0}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              }
            />
          </div>
        </div>

        {/* ── Account cards ───────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-sm space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Account</p>
            </div>
            <p className="text-sm font-medium text-neutral-900">{user.email}</p>
            <p className="text-xs text-neutral-400">
              Member since {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {profile && (
            <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-sm space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Company</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">{profile.company_name}</p>
              {profile.sector ? (
                <p className="text-xs text-neutral-400">{profile.sector}</p>
              ) : (
                <p className="text-xs text-neutral-300 italic">No sector set</p>
              )}
            </div>
          )}
        </div>

        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        <AlertsPanel alerts={alertList} />

        {/* ── Ingredients ─────────────────────────────────────────────────── */}
        <IngredientsPanel ingredients={ingredientList} />
      </main>
    </div>
  )
}

function Stat({
  label,
  value,
  icon,
  urgent = false,
}: {
  label: string
  value: number
  icon: React.ReactNode
  urgent?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${
        urgent
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-white border-neutral-200 text-neutral-600'
      }`}
    >
      <span className={urgent ? 'text-red-500' : 'text-neutral-400'}>{icon}</span>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  )
}
