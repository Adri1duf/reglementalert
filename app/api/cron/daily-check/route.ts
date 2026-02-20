import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchSVHCList } from '@/lib/echa-scraper'
import { sendAlertEmail, type AlertEmailData } from '@/lib/email'

// ── Types ────────────────────────────────────────────────────────────────────

type IngredientRow = {
  id: string
  ingredient_name: string
  cas_number: string | null
  user_id: string
  profiles: { company_name: string } | null
}

type AlertRow = {
  ingredient_id: string
  substance_name: string
}

// ── Matching helpers (mirrors check-regulations/route.ts) ─────────────────────

function normaliseCas(cas: string): string {
  return cas.trim().toLowerCase()
}

function namesOverlap(a: string, b: string): boolean {
  const la = a.toLowerCase().trim()
  const lb = b.toLowerCase().trim()
  if (la.length < 4 || lb.length < 4) return la === lb
  return la.includes(lb) || lb.includes(la)
}

// ── Cron handler ──────────────────────────────────────────────────────────────

// Vercel Cron Jobs send GET requests.
export async function GET(request: NextRequest) {
  // ── 0. Verify the cron secret ─────────────────────────────────────────────
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('[daily-check] Rejected: missing or invalid Authorization header')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  console.log('[daily-check] Starting daily ECHA regulation check')

  const admin = createAdminClient()

  // ── 1. Fetch the SVHC list once — shared across all users ─────────────────
  const svhcList = await fetchSVHCList()
  console.log(`[daily-check] Loaded ${svhcList.length} SVHC substances`)

  // ── 2. Fetch every monitored ingredient with its owner's profile ───────────
  const { data: allIngredients, error: ingError } = await admin
    .from('monitored_ingredients')
    .select('id, ingredient_name, cas_number, user_id, profiles(company_name)')
    .returns<IngredientRow[]>()

  if (ingError) {
    console.error('[daily-check] Failed to fetch ingredients:', ingError.message)
    return NextResponse.json({ error: ingError.message }, { status: 500 })
  }

  if (!allIngredients || allIngredients.length === 0) {
    console.log('[daily-check] No monitored ingredients — nothing to do')
    return NextResponse.json({ usersChecked: 0, alertsCreated: 0, emailsSent: 0 })
  }

  // ── 3. Get user emails via admin auth API ─────────────────────────────────
  const {
    data: { users },
  } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(users.map((u) => [u.id, u.email ?? '']))

  // ── 4. Group ingredients by user ─────────────────────────────────────────
  const byUser = new Map<string, IngredientRow[]>()
  for (const row of allIngredients) {
    const list = byUser.get(row.user_id) ?? []
    list.push(row)
    byUser.set(row.user_id, list)
  }

  console.log(`[daily-check] ${byUser.size} user(s) with monitored ingredients`)

  // ── 5. Process each user ──────────────────────────────────────────────────
  let usersChecked = 0
  let totalAlertsCreated = 0
  let emailsSent = 0

  for (const [userId, ingredients] of byUser) {
    const userEmail = emailMap.get(userId)
    if (!userEmail) {
      console.warn(`[daily-check] No email for user ${userId} — skipping`)
      continue
    }

    const companyName = ingredients[0]?.profiles?.company_name ?? userEmail
    console.log(
      `\n[daily-check] User: ${userEmail} | Company: ${companyName} | Ingredients: ${ingredients.length}`
    )

    try {
      // Batch-fetch all existing SVHC alerts for this user (avoids N×M duplicate-check queries)
      const { data: existingAlerts } = await admin
        .from('regulatory_alerts')
        .select('ingredient_id, substance_name')
        .eq('user_id', userId)
        .eq('source', 'ECHA_SVHC')
        .returns<AlertRow[]>()

      const existingKeys = new Set(
        (existingAlerts ?? []).map((a) => `${a.ingredient_id}::${a.substance_name}`)
      )

      // Cross-reference ingredients against the SVHC list
      const rowsToInsert: object[] = []
      const newAlerts: AlertEmailData['alerts'] = []

      for (const ingredient of ingredients) {
        for (const svhc of svhcList) {
          const casBothPresent = ingredient.cas_number && svhc.casNumber
          const casMatch =
            casBothPresent &&
            normaliseCas(ingredient.cas_number!) === normaliseCas(svhc.casNumber!)
          const nameMatch = !casMatch && namesOverlap(ingredient.ingredient_name, svhc.name)

          if (!casMatch && !nameMatch) continue

          const key = `${ingredient.id}::${svhc.name}`
          if (existingKeys.has(key)) continue // already alerted

          rowsToInsert.push({
            user_id: userId,
            ingredient_id: ingredient.id,
            substance_name: svhc.name,
            cas_number: svhc.casNumber,
            source: 'ECHA_SVHC',
            regulation: 'REACH Candidate List (SVHC)',
            reason: svhc.reason,
            echa_url: svhc.echaUrl,
          })

          newAlerts.push({
            substanceName: svhc.name,
            casNumber: svhc.casNumber,
            ingredientName: ingredient.ingredient_name,
            reason: svhc.reason,
          })
        }
      }

      // Batch-insert all new alerts for this user in a single round-trip
      if (rowsToInsert.length > 0) {
        const { error: insertError } = await admin
          .from('regulatory_alerts')
          .insert(rowsToInsert)

        if (insertError) {
          // UNIQUE violation means a concurrent run beat us — safe to ignore
          console.error(
            `[daily-check] Insert error for ${userEmail}: ${insertError.message}`
          )
        } else {
          totalAlertsCreated += rowsToInsert.length
          console.log(
            `[daily-check] Inserted ${rowsToInsert.length} alert(s) for ${userEmail}`
          )
        }
      } else {
        console.log(`[daily-check] No new matches for ${userEmail}`)
      }

      usersChecked++

      // Send one email per user if there are genuinely new alerts
      if (newAlerts.length > 0) {
        try {
          await sendAlertEmail({ to: userEmail, companyName, alerts: newAlerts })
          emailsSent++
          console.log(`[daily-check] Email sent to ${userEmail}`)
        } catch (emailErr) {
          // Email failure must not stop the run — alerts are already saved
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
          console.error(`[daily-check] Email failed for ${userEmail}: ${msg}`)
        }
      }
    } catch (userErr) {
      // Per-user isolation: one failure doesn't stop other users from being processed
      const msg = userErr instanceof Error ? userErr.message : String(userErr)
      console.error(`[daily-check] Unhandled error for user ${userId}: ${msg}`)
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log(
    `\n[daily-check] Done in ${elapsed}s — ` +
      `${usersChecked} users checked, ${totalAlertsCreated} alerts created, ${emailsSent} emails sent`
  )

  return NextResponse.json({
    usersChecked,
    alertsCreated: totalAlertsCreated,
    emailsSent,
    elapsedSeconds: Number(elapsed),
  })
}
