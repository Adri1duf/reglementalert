import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isActiveSubscription } from '@/lib/stripe/server'
import TeamPanel, { type TeamMember, type PendingInvitation } from './TeamPanel'

export default async function TeamPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, role, company_id, subscription_plan, subscription_status')
    .eq('id', user.id)
    .single<{
      company_name: string
      role: string
      company_id: string | null
      subscription_plan: string | null
      subscription_status: string | null
    }>()

  if (!profile) redirect('/dashboard')

  // Team management requires Pro plan
  const isPro =
    profile.subscription_plan === 'pro' &&
    isActiveSubscription(profile.subscription_status)

  if (!isPro) {
    return <ProUpgradeGate companyName={profile.company_name} />
  }

  const myCompanyId = profile.company_id ?? user.id

  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, company_name, email, role, created_at')
      .or(`company_id.eq.${myCompanyId},id.eq.${myCompanyId}`)
      .order('created_at', { ascending: true })
      .returns<TeamMember[]>(),

    supabase
      .from('team_invitations')
      .select('id, email, role, created_at, expires_at')
      .eq('company_id', myCompanyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .returns<PendingInvitation[]>(),
  ])

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
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
          </div>

          <form action="/logout" method="POST">
            <button
              type="submit"
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* ── Page title ───────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Team</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {profile.company_name} · {members?.length ?? 1} {(members?.length ?? 1) === 1 ? 'member' : 'members'}
          </p>
        </div>

        <TeamPanel
          members={members ?? []}
          invitations={invitations ?? []}
          currentUserId={user.id}
          currentRole={profile.role as 'owner' | 'admin' | 'member'}
        />
      </main>
    </div>
  )
}

// ── Pro upgrade gate ───────────────────────────────────────────────────────────

function ProUpgradeGate({ companyName }: { companyName: string }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08z" clipRule="evenodd" />
            </svg>
            <span className="text-base font-bold text-neutral-900">ReglementAlert</span>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="max-w-md mx-auto text-center py-16 space-y-6">
          <div className="h-16 w-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Team management is a Pro feature</h1>
            <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
              Upgrade to Pro to invite colleagues to {companyName}&apos;s workspace and collaborate on regulatory monitoring.
            </p>
          </div>
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
          >
            Upgrade to Pro — 499€/month
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link href="/dashboard" className="block text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
            Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
