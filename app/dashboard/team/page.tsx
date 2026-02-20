import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TeamPanel, { type TeamMember, type PendingInvitation } from './TeamPanel'

export default async function TeamPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, role, company_id')
    .eq('id', user.id)
    .single<{ company_name: string; role: string; company_id: string | null }>()

  if (!profile) redirect('/dashboard')

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
