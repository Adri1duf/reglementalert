'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis as XAxisH,
  YAxis as YAxisH,
} from 'recharts'

// ── Colours ────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  ECHA_SVHC: '#F59E0B',
  EUR_LEX: '#3B82F6',
  ANSM: '#F43F5E',
}

const SOURCE_LABELS: Record<string, string> = {
  ECHA_SVHC: 'ECHA SVHC',
  EUR_LEX: 'EUR-Lex',
  ANSM: 'ANSM',
}

const TEAL = '#14B8A6'

// ── Types ──────────────────────────────────────────────────────────────────

export type TrendPoint = {
  month: string
  ECHA_SVHC: number
  EUR_LEX: number
  ANSM: number
}

export type SourceSlice = {
  name: string
  value: number
}

export type SubstanceBar = {
  name: string
  count: number
}

export type Stats = {
  totalAlerts: number
  unreadAlerts: number
  monitoredIngredients: number
  documentsStored: number
}

type Props = {
  stats: Stats
  trendData: TrendPoint[]
  sourceData: SourceSlice[]
  topSubstances: SubstanceBar[]
  hasData: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={`p-5 rounded-2xl border shadow-sm space-y-3 ${
        accent
          ? 'bg-red-50 border-red-200'
          : 'bg-white border-neutral-200'
      }`}
    >
      <div className={`inline-flex p-2 rounded-xl ${accent ? 'bg-red-100 text-red-500' : 'bg-neutral-100 text-neutral-500'}`}>
        {icon}
      </div>
      <div>
        <p className={`text-3xl font-bold tracking-tight ${accent ? 'text-red-700' : 'text-neutral-900'}`}>
          {fmt(value)}
        </p>
        <p className={`text-sm mt-0.5 ${accent ? 'text-red-500' : 'text-neutral-400'}`}>{label}</p>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg
        className="h-16 w-16 text-neutral-200 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
        />
      </svg>
      <p className="text-base font-medium text-neutral-400">No data to display yet</p>
      <p className="text-sm text-neutral-300 mt-1 max-w-xs">
        Start monitoring ingredients to see analytics and regulatory trends here.
      </p>
    </div>
  )
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────

function LineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-neutral-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-neutral-500">{p.name}:</span>
          <span className="font-semibold text-neutral-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number }[]
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-lg px-4 py-2 text-sm">
      <span className="font-semibold text-neutral-800">{p.name}: </span>
      <span className="text-neutral-600">{fmt(p.value)} alerts</span>
    </div>
  )
}

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-lg px-4 py-2 text-sm">
      <p className="font-medium text-neutral-700 mb-1">{label}</p>
      <span className="font-semibold text-teal-700">{payload[0].value} alerts</span>
    </div>
  )
}

// ── Chart card wrapper ─────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Pie legend ─────────────────────────────────────────────────────────────

function PieLegend({ data }: { data: SourceSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="flex flex-col gap-2 mt-4">
      {data.map((d) => (
        <div key={d.name} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ background: SOURCE_COLORS[d.name] ?? '#94A3B8' }}
            />
            <span className="text-neutral-600">{SOURCE_LABELS[d.name] ?? d.name}</span>
          </div>
          <span className="text-neutral-400 font-medium">
            {total > 0 ? `${Math.round((d.value / total) * 100)}%` : '0%'}
            <span className="text-neutral-300 ml-1.5 text-xs">({fmt(d.value)})</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

export default function AnalyticsCharts({
  stats,
  trendData,
  sourceData,
  topSubstances,
  hasData,
}: Props) {
  const activeSources = (['ECHA_SVHC', 'EUR_LEX', 'ANSM'] as const).filter(
    (src) => trendData.some((d) => d[src] > 0)
  )

  return (
    <div className="space-y-6">
      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total alerts"
          value={stats.totalAlerts}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          }
        />
        <StatCard
          label="Unread alerts"
          value={stats.unreadAlerts}
          accent={stats.unreadAlerts > 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
            </svg>
          }
        />
        <StatCard
          label="Monitored ingredients"
          value={stats.monitoredIngredients}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082" />
            </svg>
          }
        />
        <StatCard
          label="Documents stored"
          value={stats.documentsStored}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
        />
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!hasData ? (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
          <EmptyState />
        </div>
      ) : (
        <>
          {/* ── Alert trend line chart ─────────────────────────────────── */}
          <ChartCard
            title="Alert trends"
            subtitle="Regulatory alerts received per month, by source"
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<LineTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                />
                {(activeSources.length === 0
                  ? (['ECHA_SVHC', 'EUR_LEX', 'ANSM'] as const)
                  : activeSources
                ).map((src) => (
                  <Line
                    key={src}
                    type="monotone"
                    dataKey={src}
                    name={SOURCE_LABELS[src] ?? src}
                    stroke={SOURCE_COLORS[src]}
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ── Bottom row: Pie + Bar ──────────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Source breakdown */}
            <ChartCard
              title="Alerts by source"
              subtitle="Distribution across all time"
            >
              {sourceData.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {sourceData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={SOURCE_COLORS[entry.name] ?? '#94A3B8'}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieLegend data={sourceData} />
                </>
              )}
            </ChartCard>

            {/* Top 5 substances */}
            <ChartCard
              title="Top substances"
              subtitle="Most frequently alerted substances"
            >
              {topSubstances.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    layout="vertical"
                    data={topSubstances}
                    margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                  >
                    <XAxisH
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxisH
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: '#F9FAFB' }} />
                    <Bar dataKey="count" fill={TEAL} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
