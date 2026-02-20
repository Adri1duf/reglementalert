import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSVHCList } from '@/lib/echa-scraper'

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

  // ── 1. Fetch the SVHC list (live or fallback) ──────────────────────────────
  const svhcList = await fetchSVHCList()
  console.log(`[check-regulations] Loaded ${svhcList.length} SVHC substances`)
  console.log(
    `[check-regulations] First 3 SVHCs: ${svhcList
      .slice(0, 3)
      .map((s) => `"${s.name}" (CAS: ${s.casNumber ?? 'none'})`)
      .join(' | ')}`
  )
  // Sanity-check: are the two substances the user expects actually in the list?
  const dehpEntry = svhcList.find((s) => s.name.toLowerCase().includes('dehp'))
  const leadEntry = svhcList.find((s) => s.name.toLowerCase() === 'lead')
  console.log(`[check-regulations] "DEHP" in list: ${dehpEntry ? `✓ "${dehpEntry.name}"` : '✗ NOT FOUND'}`)
  console.log(`[check-regulations] "Lead" in list: ${leadEntry ? `✓ "${leadEntry.name}"` : '✗ NOT FOUND'}`)

  // ── 2. Fetch this user's monitored ingredients ─────────────────────────────
  const { data: ingredients, error: ingError } = await supabase
    .from('monitored_ingredients')
    .select('id, ingredient_name, cas_number')
    .eq('user_id', user.id)
    .returns<MonitoredIngredient[]>()

  if (ingError) {
    console.error('[check-regulations] Failed to fetch ingredients:', ingError.message)
    return NextResponse.json({ error: ingError.message }, { status: 500 })
  }

  const ingredientList = ingredients ?? []
  console.log(
    `[check-regulations] ${ingredientList.length} monitored ingredient(s): ` +
      ingredientList.map((i) => `"${i.ingredient_name}" (CAS: ${i.cas_number ?? 'none'})`).join(', ')
  )

  // ── 3. Cross-reference ─────────────────────────────────────────────────────
  let alertsCreated = 0
  let duplicatesSkipped = 0

  for (const ingredient of ingredientList) {
    console.log(
      `\n[check-regulations] Checking ingredient: "${ingredient.ingredient_name}" | CAS: ${ingredient.cas_number ?? 'none'}`
    )
    let matchFound = false

    for (const svhc of svhcList) {
      // Determine match type
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

      // Check for an existing alert to avoid duplicates
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

      // Create the alert
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
      }
    }

    if (!matchFound) {
      // Reveal structural issues: show which SVHCs the ingredient came closest to
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

  return NextResponse.json({
    svhcCount: svhcList.length,
    ingredientsChecked: ingredientList.length,
    alertsCreated,
    duplicatesSkipped,
  })
}
