import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { acceptInvitationForCurrentUser } from '@/app/dashboard/actions'

type Invitation = {
  id: string
  company_id: string
  role: 'admin' | 'member'
  status: string
  expires_at: string
}

type CompanyProfile = {
  company_name: string
}

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', member: 'Member' }

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error: urlError } = await searchParams

  if (!token) {
    return <ErrorPage message="No invitation token found. Please use the link from your email." />
  }

  const admin = createAdminClient()

  // Look up invitation (admin client bypasses RLS — the invitee has no session yet)
  const { data: invitation } = await admin
    .from('team_invitations')
    .select('id, company_id, role, status, expires_at')
    .eq('token', token)
    .single<Invitation>()

  if (!invitation) {
    return <ErrorPage message="This invitation link is invalid. Please ask your team owner to send a new one." />
  }
  if (invitation.status === 'accepted') {
    return <ErrorPage message="This invitation has already been accepted." />
  }
  if (invitation.status === 'cancelled') {
    return <ErrorPage message="This invitation has been cancelled. Please ask your team owner to send a new one." />
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return <ErrorPage message="This invitation has expired. Please ask your team owner to send a new one." />
  }

  // Get company name
  const { data: company } = await admin
    .from('profiles')
    .select('company_name')
    .eq('id', invitation.company_id)
    .single<CompanyProfile>()

  const companyName = company?.company_name ?? 'your team'
  const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role

  // Check if the user is logged in
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const encodedAcceptUrl = encodeURIComponent(`/invite/accept?token=${token}`)

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg overflow-hidden">
          {/* Top accent */}
          <div className="h-1.5 bg-teal-600" />

          <div className="px-8 py-8 space-y-6">
            {/* Brand */}
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

            {/* Invite details */}
            <div>
              <h1 className="text-xl font-bold text-neutral-900">You have been invited</h1>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Join <strong>{companyName}</strong> on ReglementAlert as <strong>{roleLabel}</strong> to
                collaborate on regulatory monitoring.
              </p>
            </div>

            {urlError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                {urlError}
              </p>
            )}

            {user ? (
              /* ── Logged in: show accept form ──────────────────────────── */
              <AcceptForm token={token} companyName={companyName} />
            ) : (
              /* ── Not logged in: offer sign up / sign in ───────────────── */
              <div className="space-y-3">
                <Link
                  href={`/signup?token=${token}&company=${encodeURIComponent(companyName)}`}
                  className="flex items-center justify-center w-full px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
                >
                  Create an account to accept
                </Link>
                <Link
                  href={`/login?from=${encodedAcceptUrl}`}
                  className="flex items-center justify-center w-full px-5 py-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-sm font-medium transition-colors"
                >
                  Sign in to an existing account
                </Link>
              </div>
            )}

            <p className="text-xs text-neutral-400 text-center">
              Invitation expires {new Date(invitation.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Accept form (logged-in path) ───────────────────────────────────────────────

async function AcceptForm({ token, companyName }: { token: string; companyName: string }) {
  async function handleAccept(formData: FormData) {
    'use server'
    const t = formData.get('token') as string
    const result = await acceptInvitationForCurrentUser(t)
    if (result.error) {
      redirect(`/invite/accept?token=${t}&error=${encodeURIComponent(result.error)}`)
    } else {
      redirect('/dashboard')
    }
  }

  return (
    <form action={handleAccept}>
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        className="w-full px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
      >
        Accept and join {companyName}
      </button>
    </form>
  )
}

// ── Error page ─────────────────────────────────────────────────────────────────

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-neutral-900">Invalid invitation</h1>
        <p className="text-sm text-neutral-500">{message}</p>
        <Link
          href="/login"
          className="inline-block px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  )
}
