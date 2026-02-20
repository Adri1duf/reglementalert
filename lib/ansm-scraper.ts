/**
 * ANSM scraper — Agence nationale de sécurité du médicament et des produits de santé.
 * https://ansm.sante.fr
 *
 * ANSM's website is a Nuxt.js SPA; the search results are loaded asynchronously.
 * We attempt a live fetch for completeness but always fall back to a curated static list
 * of recent cosmetics safety alerts issued by ANSM.
 *
 * Update ANSM_FALLBACK when ANSM publishes new cosmetics alerts (typically several per year).
 */

import * as cheerio from 'cheerio'

export type AnsmEntry = {
  name: string
  casNumber: string | null
  reason: string | null
  regulation: string
  url: string | null
}

const ANSM_SEARCH_URL =
  'https://ansm.sante.fr/rechercher?category=cosmetiques'

const MIN_LIVE_RESULTS = 3

export async function fetchAnsmSubstances(): Promise<AnsmEntry[]> {
  try {
    console.log('[ansm] Attempting live fetch from ANSM...')
    const html = await fetchWithTimeout(ANSM_SEARCH_URL, 10_000)
    const parsed = parseAnsmPage(html)

    if (parsed.length >= MIN_LIVE_RESULTS) {
      console.log(`[ansm] Live fetch OK — ${parsed.length} substances extracted`)
      return parsed
    }

    console.warn(
      `[ansm] Live fetch returned only ${parsed.length} result(s) ` +
        `(ANSM uses a JavaScript SPA — fallback to static list)`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[ansm] Live fetch failed (${msg}) — using static fallback`)
  }

  console.log(`[ansm] Using static fallback (${ANSM_FALLBACK.length} substances)`)
  return ANSM_FALLBACK
}

async function fetchWithTimeout(url: string, ms: number): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  return res.text()
}

/**
 * Attempts to extract substance names from ANSM search result HTML.
 * ANSM's website is a SPA so this will rarely find useful content,
 * but it's here as a best-effort attempt.
 */
function parseAnsmPage(html: string): AnsmEntry[] {
  const $ = cheerio.load(html)
  const entries: AnsmEntry[] = []

  // Try common article/result card selectors used by ANSM
  $('article, .search-result, .result-item, h2 a, h3 a').each((_, el) => {
    const text = $(el).text().trim()
    if (!text || text.length < 10) return

    // Only keep entries mentioning cosmetics-related keywords
    const lower = text.toLowerCase()
    if (
      lower.includes('cosmétique') ||
      lower.includes('cosmetique') ||
      lower.includes('rappel') ||
      lower.includes('alerte')
    ) {
      entries.push({
        name: text.slice(0, 120),
        casNumber: null,
        reason: 'ANSM cosmetics safety alert',
        regulation: 'ANSM décision de police sanitaire',
        url: ANSM_SEARCH_URL,
      })
    }
  })

  return entries
}

// ── Static fallback — ANSM cosmetics safety alerts ────────────────────────────
// Sources: ansm.sante.fr alerts and decisions (2021–2025)
// Each entry links a substance to its ANSM safety context.

const ANSM_BASE = 'https://ansm.sante.fr'

const ANSM_FALLBACK: AnsmEntry[] = [
  {
    name: 'Hydroquinone',
    casNumber: '123-31-9',
    reason:
      'ANSM regularly identifies hydroquinone in illegal skin-lightening products sold online. ' +
      'Prohibited in cosmetics accessible to the general public in France. Causes permanent ' +
      'depigmentation (ochronosis) at high concentrations.',
    regulation: 'ANSM — Décision de police sanitaire (cosmétiques éclaircissants)',
    url: `${ANSM_BASE}/rechercher?category=cosmetiques&query=hydroquinone`,
  },
  {
    name: 'Mercury',
    casNumber: '7439-97-6',
    reason:
      'ANSM has seized multiple skin-lightening creams containing mercury (up to 33 000 ppm). ' +
      'Causes severe kidney damage and neurological toxicity. Prohibited in all cosmetics at ' +
      'any concentration above 1 ppm.',
    regulation: 'ANSM — Rappel de produits cosmétiques contenant du mercure',
    url: `${ANSM_BASE}/rechercher?category=cosmetiques&query=mercure`,
  },
  {
    name: 'Formaldehyde',
    casNumber: '50-00-0',
    reason:
      'ANSM has issued multiple alerts on keratin hair-straightening products ("Brazilian blow-out") ' +
      'releasing formaldehyde above legal limits during use. Risk of respiratory sensitisation ' +
      'and carcinogenicity for professional hairdressers.',
    regulation: 'ANSM — Alerte sur les lissages kératine au formaldéhyde',
    url: `${ANSM_BASE}/rechercher?category=cosmetiques&query=formaldehyde`,
  },
  {
    name: 'Toluene',
    casNumber: '108-88-3',
    reason:
      'ANSM alerts on nail products (varnishes, hardeners) containing toluene above the ' +
      'permitted maximum of 25%. Neurotoxic solvent; risk for pregnant women and professionals ' +
      'with chronic exposure.',
    regulation: 'ANSM — Alerte vernis à ongles (toluène)',
    url: `${ANSM_BASE}/rechercher?category=cosmetiques&query=tolu%C3%A8ne`,
  },
  {
    name: 'Resorcinol',
    casNumber: '108-46-3',
    reason:
      'ANSM surveillance highlights resorcinol-related contact allergy cases in hair dye users. ' +
      'Restricted to max 0.5% in oxidative hair dye products; prohibited in other cosmetics.',
    regulation: 'ANSM — Surveillance colorants capillaires (résorcinol)',
    url: `${ANSM_BASE}/rechercher?category=cosmetiques&query=r%C3%A9sorcinol`,
  },
  {
    name: 'Methylisothiazolinone',
    casNumber: '2682-20-4',
    reason:
      'ANSM has issued multiple contact allergy alerts for MIT. Listed as a strong sensitiser; ' +
      'prohibited in leave-on products since 2017. Ongoing pharmacovigilance for rinse-off cosmetics.',
    regulation: 'ANSM — Alerte MIT/CMIT conservateurs (allergie de contact)',
    url: `${ANSM_BASE}/rechercher?category=cosmetiques&query=methylisothiazolinone`,
  },
  {
    name: 'Titanium dioxide',
    casNumber: '13463-67-7',
    reason:
      'ANSM and ANSES alert on inhalation risk of titanium dioxide nanoparticles in spray/aerosol ' +
      'cosmetics (sunscreens, powders, dry shampoos). Classified as a possible carcinogen by ' +
      'inhalation (IARC Group 2B). Prohibited in spray form under EU cosmetics regulation.',
    regulation: 'ANSM — Avis sur le dioxyde de titane dans les aérosols cosmétiques',
    url: `${ANSM_BASE}/rechercher?category=cosmetiques&query=dioxyde+de+titane`,
  },
  {
    name: 'Kojic acid',
    casNumber: '501-30-4',
    reason:
      'ANSM monitors kojic acid use in skin-brightening products. Newly restricted by EU Regulation ' +
      '(EU) 2022/1531 (max 1% face care, 0.5% hand care leave-on). Alerts for products exceeding ' +
      'permitted limits.',
    regulation: 'ANSM — Surveillance acide kojique dans les cosmétiques éclaircissants',
    url: `${ANSM_BASE}/rechercher?category=cosmetiques&query=acide+kojique`,
  },
  {
    name: 'Diethylene glycol',
    casNumber: '111-46-6',
    reason:
      'ANSM has recalled multiple cosmetic products found to be contaminated with diethylene ' +
      'glycol (DEG), a nephrotoxic substance prohibited in cosmetics. Risk of accidental ' +
      'poisoning when used on damaged skin or by children.',
    regulation: 'ANSM — Rappel produits cosmétiques (contamination diéthylène glycol)',
    url: `${ANSM_BASE}/rechercher?category=cosmetiques&query=di%C3%A9thyl%C3%A8ne+glycol`,
  },
  {
    name: 'Lead acetate',
    casNumber: '301-04-2',
    reason:
      'ANSM has identified lead acetate in progressive hair-colouring products (grey-coverage). ' +
      'Prohibited in all cosmetics in the EU since 2018 (Regulation (EU) 2018/1847). ' +
      'Neurotoxic and reprotoxic.',
    regulation: 'ANSM — Décision interdiction acétate de plomb dans les cosmétiques',
    url: `${ANSM_BASE}/rechercher?category=cosmetiques&query=acétate+de+plomb`,
  },
]
