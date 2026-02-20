import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import AlertsReport, { type ReportAlert } from '@/lib/pdf/AlertsReport'

export const dynamic = 'force-dynamic'

export async function GET() {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const [{ data: profile }, { data: alerts }] = await Promise.all([
    supabase
      .from('profiles')
      .select('company_name')
      .eq('id', user.id)
      .single<{ company_name: string }>(),

    supabase
      .from('regulatory_alerts')
      .select(
        'id, substance_name, cas_number, source, regulation, reason, echa_url, is_read, created_at, monitored_ingredients(ingredient_name)'
      )
      .eq('user_id', user.id)
      .order('is_read', { ascending: true })
      .order('created_at', { ascending: false })
      .returns<ReportAlert[]>(),
  ])

  const companyName = profile?.company_name ?? user.email ?? 'Unknown Company'
  const now = new Date()
  const date = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const isoDate = now.toISOString().split('T')[0]
  const filename = `ReglementAlert_Report_${isoDate}.pdf`

  // ── Render PDF ─────────────────────────────────────────────────────────────
  try {
    const buffer = await renderToBuffer(
      <AlertsReport alerts={alerts ?? []} companyName={companyName} date={date} />
    )

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed'
    console.error('[export-alerts-pdf]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
