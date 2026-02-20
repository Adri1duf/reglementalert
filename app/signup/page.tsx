'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { acceptInvitationForCurrentUser } from '@/app/dashboard/actions'

// useSearchParams must be wrapped in Suspense
function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()

  const token = searchParams.get('token')
  const companyName = searchParams.get('company') ?? ''
  const isInvited = Boolean(token)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const payload: Record<string, string> = {
        id: data.user.id,
        company_name: name,
        email: data.user.email ?? email,
      }

      const { error: profileError } = await supabase.from('profiles').insert(payload)

      if (profileError) {
        setError(
          `Profile insert failed — ${profileError.message}` +
            (profileError.code ? ` (code: ${profileError.code})` : '') +
            (profileError.hint ? ` — hint: ${profileError.hint}` : '')
        )
        setLoading(false)
        return
      }

      // If invited, accept the invitation to join the company
      if (token) {
        const result = await acceptInvitationForCurrentUser(token)
        if (result.error) {
          // Profile was created; warn but proceed to dashboard
          setError(`Account created but invitation could not be accepted: ${result.error}`)
          setLoading(false)
          return
        }
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 px-8 py-10 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-800">
        <div className="text-center">
          {isInvited ? (
            <>
              <h1 className="text-3xl font-bold text-foreground">Join the team</h1>
              <p className="mt-2 text-sm text-neutral-500">
                Create your account to join{' '}
                <strong className="text-neutral-700">{companyName || 'the team'}</strong>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground">Create account</h1>
              <p className="mt-2 text-sm text-neutral-500">Start monitoring regulations today</p>
            </>
          )}
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              {isInvited ? 'Your name' : 'Company name'}
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isInvited ? 'Your name' : 'Acme Corp'}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-neutral-400">Minimum 6 characters</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? (isInvited ? 'Joining…' : 'Creating account…') : (isInvited ? 'Create account and join' : 'Create account')}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link
            href={token ? `/login?from=${encodeURIComponent(`/invite/accept?token=${token}`)}` : '/login'}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
