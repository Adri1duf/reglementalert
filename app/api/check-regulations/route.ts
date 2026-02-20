import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSVHCList } from '@/lib/echa-scraper'
import { sendAlertEmail, type AlertEmailData } from '@/lib/email'

type MonitoredIngredient = {
  id: string
  ingredient_name: string
  cas_number: string | null
}

/** Normalise a CAS number for comparison: trim whitespace. */
function normaliseCas(cas: string): string {
  return cas.trim().toLowerCase()
}

/** Returns true if a and b overlap (either contains the other), case-insensitive. */
function namesOverlap(a: string, b: string): boolean {
  const lower_a = a.toLowerCase().trim()
  const lower_b = b.toLowerCase().trim()
  // Require at least 4 chars to avoid "lead" matching "unleaded", etc.
  if (lower_a.length < 4 || lower_b.length < 4) return lower_a === lower_b
  return lower_a.includes(lower_b) || lower_b.includes(lower_a)
}

export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 1. Fetch SVHC list + user data in parallel ─────────────────────────────
  const [svhcList, { data: profile }, { data: ingredients, error: ingError }] =
    await Promise.all([
      fetchSVHCList(),
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

  console.log(`[check-regulations] Loaded ${svhcList.length} SVHC substances`)

  // Sanity-check: are the key substances in the list?
  const dehpEntry = svhcList.find((s) => s.name.toLowerCase().includes('dehp'))
  const leadEntry = svhcList.find((s) => s.name.toLowerCase() === 'lead')
  console.log(`[check-regulations] "DEHP" in list: ${dehpEntry ? `✓ "${dehpEntry.name}"` : '✗ NOT FOUND'}`)
  console.log(`[check-regulations] "Lead" in list: ${leadEntry ? `✓ "${leadEntry.name}"` : '✗ NOT FOUND'}`)

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

  // ── 2. Cross-reference ─────────────────────────────────────────────────────
  let alertsCreated = 0
  let duplicatesSkipped = 0
  const newAlerts: AlertEmailData['alerts'] = []

  for (const ingredient of ingredientList) {
    console.log(
      `\n[check-regulations] Checking: "${ingredient.ingredient_name}" | CAS: ${ingredient.cas_number ?? 'none'}`
    )
    let matchFound = false

    for (const svhc of svhcList) {
      const casBothPresent = ingredient.cas_number && svhc.casNumber
      const casMatch =
        casBothPresent &&
        normaliseCas(ingredient.cas_number!) === normaliseCas(svhc.casNumber!)
      const nameMatch = !casMatch && namesOverlap(ingredient.ingredient_name, svhc.name)

      if (!casMatch && !nameMatch) continue

      matchFound = true
      const matchType = casMatch ? 'CAS' : 'name'
      console.log(
        `[check-regulations]   ✓ ${matchType} match → "${svhc.name}" (CAS: ${svhc.casNumber ?? 'none'})`
      )

      // Skip if this alert already exists
      const { data: existing } = await supabase
        .from('regulatory_alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('ingredient_id', ingredient.id)
        .eq('source', 'ECHA_SVHC')
        .eq('substance_name', svhc.name)
        .maybeSingle()

      if (existing) {
        duplicatesSkipped++
        continue
      }

      // Insert the alert
      const { error: insertError } = await supabase.from('regulatory_alerts').insert({
        user_id: user.id,
        ingredient_id: ingredient.id,
        substance_name: svhc.name,
        cas_number: svhc.casNumber,
        source: 'ECHA_SVHC',
        regulation: 'REACH Candidate List (SVHC)',
        reason: svhc.reason,
        echa_url: svhc.echaUrl,
      })

      if (insertError) {
        console.error(
          `[check-regulations] Failed to insert alert for "${svhc.name}":`,
          insertError.message
        )
      } else {
        alertsCreated++
        // Collect for the email — only genuinely new alerts reach this point
        newAlerts.push({
          substanceName: svhc.name,
          casNumber: svhc.casNumber,
          ingredientName: ingredient.ingredient_name,
          reason: svhc.reason,
        })
      }
    }

    if (!matchFound) {
      const ing = ingredient.ingredient_name.toLowerCase()
      const nameHits = svhcList.filter((s) => s.name.toLowerCase().includes(ing))
      const reverseHits = svhcList.filter((s) => ing.includes(s.name.toLowerCase()))
      const casHits = ingredient.cas_number
        ? svhcList.filter((s) => s.casNumber === ingredient.cas_number)
        : []

      console.log(
        `[check-regulations]   ✗ No match. Diagnostics:` +
          `\n    SVHC name contains ingredient name (${nameHits.length}): ${nameHits.map((s) => `"${s.name}"`).slice(0, 3).join(', ') || 'none'}` +
          `\n    Ingredient name contains SVHC name (${reverseHits.length}): ${reverseHits.map((s) => `"${s.name}"`).slice(0, 3).join(', ') || 'none'}` +
          (ingredient.cas_number
            ? `\n    CAS exact match (${casHits.length}): ${casHits.map((s) => s.name).join(', ') || 'none'}`
            : `\n    CAS: not provided — only name matching applied`)
      )
    }
  }

  console.log(
    `[check-regulations] Done — ${alertsCreated} alerts created, ${duplicatesSkipped} duplicates skipped`
  )

  // ── 3. Send email if there are new alerts ──────────────────────────────────
  if (newAlerts.length > 0) {
    console.log(`[check-regulations] Sending alert email to ${user.email} (${newAlerts.length} alerts)`)
    try {
      await sendAlertEmail({
        to: user.email!,
        companyName,
        alerts: newAlerts,
      })
      console.log('[check-regulations] Email sent successfully')
    } catch (emailErr) {
      // Email failure must never fail the check — alerts are already saved
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
      console.error(`[check-regulations] Email failed (alerts still saved): ${msg}`)
    }
  }

  return NextResponse.json({
    svhcCount: svhcList.length,
    ingredientsChecked: ingredientList.length,
    alertsCreated,
    duplicatesSkipped,
    emailSent: newAlerts.length > 0,
  })
}
