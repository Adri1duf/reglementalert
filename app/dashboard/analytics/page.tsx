import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AnalyticsCharts, {
  type TrendPoint,
  type SourceSlice,
  type SubstanceBar,
} from './AnalyticsCharts'

// ── Helpers ────────────────────────────────────────────────────────────────

function getLast6Months(): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    })
  }
  return months
}

function truncate(s: string, max = 22): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Fetch raw data ─────────────────────────────────────────────────────
  const [alertsRes, ingCountRes, docCountRes] = await Promise.all([
    supabase
      .from('regulatory_alerts')
      .select('source, substance_name, is_read, created_at')
      .order('created_at', { ascending: true })
      .returns<{ source: string; substance_name: string; is_read: boolean; created_at: string }[]>(),

    supabase
      .from('monitored_ingredients')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true }),
  ])

  const alerts = alertsRes.data ?? []

  // ── Stat cards ─────────────────────────────────────────────────────────
  const stats = {
    totalAlerts: alerts.length,
    unreadAlerts: alerts.filter((a) => !a.is_read).length,
    monitoredIngredients: ingCountRes.count ?? 0,
    documentsStored: docCountRes.count ?? 0,
  }

  // ── Alert trend (last 6 months) ────────────────────────────────────────
  const last6Months = getLast6Months()
  const trendMap = new Map<string, TrendPoint>(
    last6Months.map((m) => [
      m.key,
      { month: m.label, ECHA_SVHC: 0, EUR_LEX: 0, ANSM: 0 },
    ])
  )

  for (const alert of alerts) {
    const monthKey = alert.created_at.substring(0, 7)
    const entry = trendMap.get(monthKey)
    if (entry) {
      const src = alert.source
      if (src === 'ECHA_SVHC' || src === 'EUR_LEX' || src === 'ANSM') {
        entry[src]++
      }
    }
  }

  const trendData: TrendPoint[] = last6Months.map((m) => trendMap.get(m.key)!)

  // ── Source breakdown ───────────────────────────────────────────────────
  const sourceCount: Record<string, number> = {}
  for (const alert of alerts) {
    if (alert.source) {
      sourceCount[alert.source] = (sourceCount[alert.source] ?? 0) + 1
    }
  }
  const sourceData: SourceSlice[] = Object.entries(sourceCount)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }))

  // ── Top 5 substances ───────────────────────────────────────────────────
  const substanceCount: Record<string, number> = {}
  for (const alert of alerts) {
    if (alert.substance_name) {
      substanceCount[alert.substance_name] =
        (substanceCount[alert.substance_name] ?? 0) + 1
    }
  }
  const topSubstances: SubstanceBar[] = Object.entries(substanceCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name: truncate(name), count }))

  const hasData = alerts.length > 0

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
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

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/dashboard/documents"
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Documents
            </Link>
            <Link
              href="/dashboard/team"
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              Team
            </Link>
            <Link
              href="/dashboard/subscription"
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              Subscription
            </Link>
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

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-neutral-400">
          <Link href="/dashboard" className="hover:text-neutral-700 transition-colors">
            Dashboard
          </Link>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-neutral-700 font-medium">Analytics</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Analytics</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Regulatory trends and insights for your monitored substances
          </p>
        </div>

        <AnalyticsCharts
          stats={stats}
          trendData={trendData}
          sourceData={sourceData}
          topSubstances={topSubstances}
          hasData={hasData}
        />
      </main>
    </div>
  )
}
