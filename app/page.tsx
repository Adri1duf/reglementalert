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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-foreground">ReglementAlert</span>
          <Link
            href="/login"
            className="text-sm text-neutral-500 hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto px-6 py-24 w-full">
          <div className="max-w-2xl space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight tracking-tight">
                Know when your ingredients hit a restricted list
              </h1>
              <p className="text-lg text-neutral-500 leading-relaxed">
                ReglementAlert monitors the ECHA SVHC Candidate List and other regulatory
                databases, then alerts you the moment a substance you use appears. No more
                manual checks — stay compliant automatically.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-foreground font-medium rounded-lg transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="mt-20 grid gap-6 sm:grid-cols-3">
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
              <p className="text-sm font-semibold text-foreground">ECHA SVHC monitoring</p>
              <p className="text-sm text-neutral-500">
                Automatically cross-referenced against the REACH Candidate List of substances of
                very high concern.
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
              <p className="text-sm font-semibold text-foreground">Instant alerts</p>
              <p className="text-sm text-neutral-500">
                Get notified as soon as a match is found — by CAS number for precision or by
                ingredient name.
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
              <p className="text-sm font-semibold text-foreground">Your ingredient list</p>
              <p className="text-sm text-neutral-500">
                Add the substances you use and we track them. Delete any time. No spreadsheets
                required.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-neutral-400">© {new Date().getFullYear()} ReglementAlert</p>
          <p className="text-xs text-neutral-400">Regulatory monitoring for chemical compliance</p>
        </div>
      </footer>
    </div>
  )
}
