import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSVHCList } from '@/lib/echa-scraper'
import { fetchEurLexSubstances } from '@/lib/eurlex-scraper'
import { fetchAnsmSubstances } from '@/lib/ansm-scraper'
import { sendAlertEmail, type AlertEmailData } from '@/lib/email'

// ── Types ─────────────────────────────────────────────────────────────────────

type MonitoredIngredient = {
  id: string
  ingredient_name: string
  cas_number: string | null
}

type ExistingAlert = {
  ingredient_id: string
  substance_name: string
  source: string
}

type NormalizedEntry = {
  name: string
  casNumber: string | null
  reason: string | null
  regulation: string
  url: string | null
  source: 'ECHA_SVHC' | 'EUR_LEX' | 'ANSM'
}

// ── Matching helpers ──────────────────────────────────────────────────────────

function normaliseCas(cas: string): string {
  return cas.trim().toLowerCase()
}

function namesOverlap(a: string, b: string): boolean {
  const la = a.toLowerCase().trim()
  const lb = b.toLowerCase().trim()
  if (la.length < 4 || lb.length < 4) return la === lb
  return la.includes(lb) || lb.includes(la)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 1. Fetch all regulatory sources + user data in parallel ──────────────────
  const [svhcList, eurlexList, ansmList, { data: profile }, { data: ingredients, error: ingError }] =
    await Promise.all([
      fetchSVHCList(),
      fetchEurLexSubstances(),
      fetchAnsmSubstances(),
      supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .single<{ company_name: string }>(),
      supabase
        .from('monitored_ingredients')
        .select('id, ingredient_name, cas_number')
        .eq('user_id', user.id)
        .returns<MonitoredIngredient[]>(),
    ])

  console.log(
    `[check-regulations] Loaded ${svhcList.length} ECHA, ` +
      `${eurlexList.length} EUR-Lex, ${ansmList.length} ANSM substances`
  )

  if (ingError) {
    console.error('[check-regulations] Failed to fetch ingredients:', ingError.message)
    return NextResponse.json({ error: ingError.message }, { status: 500 })
  }

  const ingredientList = ingredients ?? []
  const companyName = profile?.company_name ?? user.email ?? 'your company'
  console.log(
    `[check-regulations] ${ingredientList.length} monitored ingredient(s): ` +
      ingredientList.map((i) => `"${i.ingredient_name}" (CAS: ${i.cas_number ?? 'none'})`).join(', ')
  )

  // Normalize all sources into a single list
  const allEntries: NormalizedEntry[] = [
    ...svhcList.map((s) => ({
      name: s.name,
      casNumber: s.casNumber,
      reason: s.reason,
      regulation: 'REACH Candidate List (SVHC)',
      url: s.echaUrl,
      source: 'ECHA_SVHC' as const,
    })),
    ...eurlexList.map((e) => ({ ...e, source: 'EUR_LEX' as const })),
    ...ansmList.map((e) => ({ ...e, source: 'ANSM' as const })),
  ]

  // ── 2. Batch-fetch all existing alerts for this user (one query) ─────────────
  const { data: existingAlerts } = await supabase
    .from('regulatory_alerts')
    .select('ingredient_id, substance_name, source')
    .eq('user_id', user.id)
    .returns<ExistingAlert[]>()

  const existingKeys = new Set(
    (existingAlerts ?? []).map((a) => `${a.ingredient_id}::${a.substance_name}::${a.source}`)
  )

  // ── 3. Cross-reference ────────────────────────────────────────────────────────
  let alertsCreated = 0
  let duplicatesSkipped = 0
  const newAlerts: AlertEmailData['alerts'] = []

  for (const ingredient of ingredientList) {
    console.log(
      `\n[check-regulations] Checking: "${ingredient.ingredient_name}" | CAS: ${ingredient.cas_number ?? 'none'}`
    )

    for (const entry of allEntries) {
      const casBothPresent = ingredient.cas_number && entry.casNumber
      const casMatch =
        casBothPresent &&
        normaliseCas(ingredient.cas_number!) === normaliseCas(entry.casNumber!)
      const nameMatch = !casMatch && namesOverlap(ingredient.ingredient_name, entry.name)

      if (!casMatch && !nameMatch) continue

      const matchType = casMatch ? 'CAS' : 'name'
      console.log(
        `[check-regulations]   ✓ [${entry.source}] ${matchType} match → "${entry.name}"`
      )

      // Source-aware deduplication key
      const key = `${ingredient.id}::${entry.name}::${entry.source}`
      if (existingKeys.has(key)) {
        duplicatesSkipped++
        continue
      }
      existingKeys.add(key) // prevent duplicates within this run

      const { error: insertError } = await supabase.from('regulatory_alerts').insert({
        user_id: user.id,
        ingredient_id: ingredient.id,
        substance_name: entry.name,
        cas_number: entry.casNumber,
        source: entry.source,
        regulation: entry.regulation,
        reason: entry.reason,
        echa_url: entry.url,
      })

      if (insertError) {
        console.error(
          `[check-regulations] Failed to insert [${entry.source}] alert for "${entry.name}":`,
          insertError.message
        )
      } else {
        alertsCreated++
        newAlerts.push({
          substanceName: entry.name,
          casNumber: entry.casNumber,
          ingredientName: ingredient.ingredient_name,
          reason: entry.reason,
          source: entry.source,
        })
      }
    }
  }

  console.log(
    `[check-regulations] Done — ${alertsCreated} alerts created, ${duplicatesSkipped} duplicates skipped`
  )

  // ── 4. Send email if there are new alerts ─────────────────────────────────────
  if (newAlerts.length > 0) {
    console.log(
      `[check-regulations] Sending alert email to ${user.email} (${newAlerts.length} alerts)`
    )
    try {
      await sendAlertEmail({ to: user.email!, companyName, alerts: newAlerts })
      console.log('[check-regulations] Email sent successfully')
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
      console.error(`[check-regulations] Email failed (alerts still saved): ${msg}`)
    }
  }

  return NextResponse.json({
    echaCount: svhcList.length,
    eurlexCount: eurlexList.length,
    ansmCount: ansmList.length,
    ingredientsChecked: ingredientList.length,
    alertsCreated,
    duplicatesSkipped,
    emailSent: newAlerts.length > 0,
  })
}
