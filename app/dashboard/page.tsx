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
      .order('is_read', { ascending: true })   // unread first
      .order('created_at', { ascending: false })
      .returns<Alert[]>(),
  ])

  const unreadCount = (alerts ?? []).filter((a) => !a.is_read).length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-semibold text-foreground">ReglementAlert</span>
          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <form action="/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-neutral-500 hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-neutral-500">Welcome back, {user.email}</p>
        </div>

        {/* Account / Company */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-1">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Account</p>
            <p className="text-sm font-medium text-foreground">{user.email}</p>
            <p className="text-xs text-neutral-400">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>

          {profile && (
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-1">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Company</p>
              <p className="text-sm font-medium text-foreground">{profile.company_name}</p>
              {profile.sector && (
                <p className="text-xs text-neutral-400">{profile.sector}</p>
              )}
            </div>
          )}
        </div>

        {/* Alerts */}
        <AlertsPanel alerts={alerts ?? []} />

        {/* Monitored ingredients */}
        <IngredientsPanel ingredients={ingredients ?? []} />
      </main>
    </div>
  )
}
