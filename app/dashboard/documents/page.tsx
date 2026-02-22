import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { documentLimit } from '@/lib/stripe/server'
import DocumentsClient, { type Document } from './DocumentsClient'

type Ingredient = {
  id: string
  ingredient_name: string
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: documents }, { data: ingredients }] = await Promise.all([
    supabase
      .from('profiles')
      .select('company_name, subscription_plan, subscription_status')
      .eq('id', user.id)
      .single<{ company_name: string; subscription_plan: string | null; subscription_status: string | null }>(),

    supabase
      .from('documents')
      .select(
        'id, file_name, file_path, file_type, file_size, document_type, description, uploaded_at, ingredient_id, monitored_ingredients(ingredient_name)'
      )
      .order('uploaded_at', { ascending: false })
      .returns<Document[]>(),

    supabase
      .from('monitored_ingredients')
      .select('id, ingredient_name')
      .order('ingredient_name', { ascending: true })
      .returns<Ingredient[]>(),
  ])

  const docLimit = documentLimit(
    profile?.subscription_plan ?? null,
    profile?.subscription_status ?? null
  )

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
              href="/dashboard/analytics"
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
              </svg>
              Analytics
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
          <Link href="/dashboard" className="hover:text-neutral-700 transition-colors">Dashboard</Link>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-neutral-700 font-medium">Documents</span>
        </nav>

        <DocumentsClient
          initialDocuments={documents ?? []}
          ingredients={ingredients ?? []}
          docLimit={docLimit}
        />
      </main>
    </div>
  )
}
