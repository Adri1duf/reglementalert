import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="border-b border-neutral-100 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold tracking-wide mb-6">
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="6" cy="6" r="6" />
              </svg>
              REACH · ECHA SVHC compliance monitoring
            </span>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-900 leading-tight tracking-tight">
              Know the moment your ingredients hit a restricted list
            </h1>
            <p className="mt-5 text-lg text-neutral-500 leading-relaxed">
              ReglementAlert watches the ECHA SVHC Candidate List for you. Add your substances,
              and we alert you instantly when a match appears — by CAS number or name.
              No more manual compliance spreadsheets.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-sm transition-colors shadow-sm"
              >
                Start monitoring for free
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold text-sm transition-colors"
              >
                Sign in to dashboard
              </Link>
            </div>

            <p className="mt-4 text-xs text-neutral-400">
              Trusted by compliance teams in cosmetics, chemicals &amp; manufacturing
            </p>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────────────── */}
        <section className="bg-neutral-50 border-y border-neutral-100">
          <div className="max-w-5xl mx-auto px-6 py-16 grid gap-8 sm:grid-cols-3">
            <Feature
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 10c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286z" />
                </svg>
              }
              title="ECHA SVHC monitoring"
              description="Automatically cross-referenced against the REACH Candidate List of Substances of Very High Concern — updated twice a year."
            />
            <Feature
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              }
              title="Email alerts"
              description="Instant notifications the moment a match is found — by CAS number for precision or ingredient name. Delivered to your inbox, daily."
            />
            <Feature
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.607L5 14.5m14.8.5l-1.5 5.25M5 14.5l-1.5 5.25m0 0A2.25 2.25 0 005.75 22h12.5a2.25 2.25 0 002.25-2.25v-.107" />
                </svg>
              }
              title="Your ingredient list"
              description="Add the substances your product uses. We monitor them continuously. Remove any time. No spreadsheets, no manual checks."
            />
          </div>
        </section>

        {/* ── Social proof ───────────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 py-14 text-center">
          <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase mb-6">
            Built for regulated industries
          </p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm font-medium text-neutral-400">
            <span>Cosmetics &amp; personal care</span>
            <span className="text-neutral-200">|</span>
            <span>Specialty chemicals</span>
            <span className="text-neutral-200">|</span>
            <span>Pharmaceuticals</span>
            <span className="text-neutral-200">|</span>
            <span>Industrial manufacturing</span>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-100">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Logo small />
          </div>
          <p className="text-xs text-neutral-400">
            Data source: ECHA SVHC Candidate List (REACH Regulation)
          </p>
        </div>
      </footer>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg
        className={`${small ? 'h-4 w-4' : 'h-6 w-6'} text-teal-600 shrink-0`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08z"
          clipRule="evenodd"
        />
      </svg>
      <span
        className={`${small ? 'text-xs text-neutral-400' : 'text-base font-bold text-neutral-900'}`}
      >
        ReglementAlert
      </span>
    </div>
  )
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="space-y-3">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
    </div>
  )
}
