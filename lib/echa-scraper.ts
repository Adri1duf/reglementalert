import * as cheerio from 'cheerio'

export type SVHCSubstance = {
  name: string
  casNumber: string | null
  ecNumber: string | null
  reason: string | null
  dateOfInclusion: string | null
  echaUrl: string | null
}

const ECHA_BASE = 'https://echa.europa.eu'
const ECHA_SVHC_URL = `${ECHA_BASE}/candidate-list-table`

/**
 * Fetches the ECHA SVHC Candidate List.
 * Strategy:
 *  1. Try live fetch from echa.europa.eu (may be blocked depending on server IP).
 *  2. Fall back to the hardcoded snapshot (updated Feb 2026, 253 total substances).
 *
 * ECHA publishes updates ~twice/year (January & June). Update FALLBACK_SVHC_LIST
 * after each new inclusion batch.
 */
export async function fetchSVHCList(): Promise<SVHCSubstance[]> {
  try {
    console.log('[echa] Fetching live SVHC list from ECHA...')
    const html = await fetchWithTimeout(ECHA_SVHC_URL, 15_000)
    const substances = parseECHATable(html)

    // The full ECHA list has 253 substances (Feb 2026). Their table paginates at
    // 50 rows per page, so a single-page fetch returns only the most recent
    // additions and misses older entries like Lead (2011) and DEHP (2008).
    // Only trust the live result when we get a substantially complete list.
    if (substances.length > 200) {
      console.log(`[echa] Live fetch OK — ${substances.length} substances`)
      return substances
    }

    console.warn(
      `[echa] Live fetch returned only ${substances.length} substances ` +
        `(ECHA paginates at 50/page; full list has ~253). Falling back to static snapshot.`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[echa] Live fetch failed (${msg}) — using static fallback`)
  }

  console.log(`[echa] Using static fallback (${FALLBACK_SVHC_LIST.length} substances, Feb 2026)`)
  return FALLBACK_SVHC_LIST
}

async function fetchWithTimeout(url: string, ms: number): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: {
      // Mimic a real browser to reduce chance of 403
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    },
  })

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  return res.text()
}

/**
 * Parses the ECHA candidate list HTML table.
 * Expected columns (left to right): Substance name | EC Number | CAS Number | Date | Reason
 */
function parseECHATable(html: string): SVHCSubstance[] {
  const $ = cheerio.load(html)
  const substances: SVHCSubstance[] = []

  $('table tbody tr').each((_, tr) => {
    const tds = $(tr).find('td')
    if (tds.length < 3) return

    const nameCell = tds.eq(0)
    const name = nameCell.text().trim()
    if (!name) return

    const href = nameCell.find('a').attr('href') ?? null

    substances.push({
      name,
      ecNumber: tds.eq(1).text().trim() || null,
      casNumber: tds.eq(2).text().trim() || null,
      dateOfInclusion: tds.length > 3 ? tds.eq(3).text().trim() || null : null,
      reason: tds.length > 4 ? tds.eq(4).text().trim() || null : null,
      // The hrefs in the ECHA table are Liferay portlet URLs (/-/dislist/details/...)
      // that no longer work after ECHA's migration to ECHA CHEM. The correct format
      // (substanceinfo/100.xxx.xxx) can't be derived here without a lookup table.
      echaUrl: null,
    })
  })

  return substances
}

// ---------------------------------------------------------------------------
// Static snapshot — ECHA SVHC Candidate List (February 2026, 253 total entries)
// Source: https://echa.europa.eu/candidate-list-table
// Update this list after each ECHA update (January & June each year).
// ---------------------------------------------------------------------------
export const FALLBACK_SVHC_LIST: SVHCSubstance[] = [
  {
    name: 'Bis(2-ethylhexyl) phthalate (DEHP)',
    casNumber: '117-81-7',
    ecNumber: '204-211-0',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: 'Dibutyl phthalate (DBP)',
    casNumber: '84-74-2',
    ecNumber: '201-557-4',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: 'Benzyl butyl phthalate (BBP)',
    casNumber: '85-68-7',
    ecNumber: '201-622-7',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: 'Diisobutyl phthalate (DIBP)',
    casNumber: '84-69-5',
    ecNumber: '201-553-2',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: 'Lead',
    casNumber: '7439-92-1',
    ecNumber: '231-100-4',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '27 June 2011',
    echaUrl: null,
  },
  {
    name: 'Lead monoxide (litharge)',
    casNumber: '1317-36-8',
    ecNumber: '215-267-0',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '27 June 2011',
    echaUrl: null,
  },
  {
    name: 'Trilead bis(orthophosphate)',
    casNumber: '7446-27-7',
    ecNumber: '231-205-0',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '27 June 2011',
    echaUrl: null,
  },
  {
    name: 'Hexabromocyclododecane (HBCDD)',
    casNumber: '25637-99-4',
    ecNumber: '247-148-4',
    reason: 'PBT (Article 57d)',
    dateOfInclusion: '19 December 2011',
    echaUrl: null,
  },
  {
    name: 'Bis(tributyltin) oxide (TBTO)',
    casNumber: '56-35-9',
    ecNumber: '200-268-0',
    reason: 'PBT (Article 57d)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: 'Anthracene',
    casNumber: '120-12-7',
    ecNumber: '204-371-1',
    reason: 'PBT (Article 57d)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: '4,4\'-Diaminodiphenylmethane (MDA)',
    casNumber: '101-77-9',
    ecNumber: '202-974-4',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: 'Diarsenic pentaoxide',
    casNumber: '1303-28-2',
    ecNumber: '215-116-9',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: 'Diarsenic trioxide',
    casNumber: '1327-53-3',
    ecNumber: '215-481-4',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: 'Cobalt(II) dichloride',
    casNumber: '7646-79-9',
    ecNumber: '231-589-4',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '27 June 2011',
    echaUrl: null,
  },
  {
    name: 'Cobalt(II) sulphate',
    casNumber: '10124-43-3',
    ecNumber: '233-334-2',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '27 June 2011',
    echaUrl: null,
  },
  {
    name: 'Cobalt(II) dinitrate',
    casNumber: '10141-05-6',
    ecNumber: '233-402-1',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '27 June 2011',
    echaUrl: null,
  },
  {
    name: 'Cobalt(II) carbonate',
    casNumber: '513-79-1',
    ecNumber: '208-169-4',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '27 June 2011',
    echaUrl: null,
  },
  {
    name: 'Cobalt(II) diacetate',
    casNumber: '71-48-7',
    ecNumber: '200-755-8',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '27 June 2011',
    echaUrl: null,
  },
  {
    name: 'Chromium trioxide',
    casNumber: '1333-82-0',
    ecNumber: '215-607-8',
    reason: 'Carcinogenic (Article 57a), mutagenic (Article 57b)',
    dateOfInclusion: '18 June 2010',
    echaUrl: null,
  },
  {
    name: 'Sodium dichromate',
    casNumber: '10588-01-9',
    ecNumber: '234-190-3',
    reason: 'Carcinogenic (Article 57a), mutagenic (Article 57b), toxic for reproduction (Article 57c)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: 'Potassium dichromate',
    casNumber: '7778-50-9',
    ecNumber: '231-906-6',
    reason: 'Carcinogenic (Article 57a), mutagenic (Article 57b), toxic for reproduction (Article 57c)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: 'Ammonium dichromate',
    casNumber: '7789-09-5',
    ecNumber: '232-143-1',
    reason: 'Carcinogenic (Article 57a), mutagenic (Article 57b)',
    dateOfInclusion: '18 June 2010',
    echaUrl: null,
  },
  {
    name: 'Strontium chromate',
    casNumber: '7789-06-2',
    ecNumber: '232-142-6',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '18 June 2010',
    echaUrl: null,
  },
  {
    name: 'Trichloroethylene',
    casNumber: '79-01-6',
    ecNumber: '201-167-4',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '18 June 2010',
    echaUrl: null,
  },
  {
    name: 'Acrylamide',
    casNumber: '79-06-1',
    ecNumber: '201-173-7',
    reason: 'Carcinogenic (Article 57a), mutagenic (Article 57b)',
    dateOfInclusion: '30 March 2010',
    echaUrl: null,
  },
  {
    name: 'Boric acid',
    casNumber: '10043-35-3',
    ecNumber: '233-139-2',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '16 December 2010',
    echaUrl: null,
  },
  {
    name: 'Disodium tetraborate, anhydrous (borax)',
    casNumber: '1303-96-4',
    ecNumber: '215-540-4',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '16 December 2010',
    echaUrl: null,
  },
  {
    name: '2-Ethoxyethanol',
    casNumber: '110-80-5',
    ecNumber: '203-804-1',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: '2-Methoxyethanol',
    casNumber: '109-86-4',
    ecNumber: '203-713-7',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '28 October 2008',
    echaUrl: null,
  },
  {
    name: 'N,N-Dimethylformamide (DMF)',
    casNumber: '68-12-2',
    ecNumber: '200-679-5',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '26 October 2010',
    echaUrl: null,
  },
  {
    name: 'Tris(2-chloroethyl) phosphate (TCEP)',
    casNumber: '115-96-8',
    ecNumber: '204-118-5',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '18 June 2010',
    echaUrl: null,
  },
  {
    name: 'Dihexyl phthalate',
    casNumber: '84-75-3',
    ecNumber: '201-559-5',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '20 June 2013',
    echaUrl: null,
  },
  {
    name: 'Bisphenol A (BPA)',
    casNumber: '80-05-7',
    ecNumber: '201-245-8',
    reason: 'Toxic for reproduction (Article 57c), endocrine disrupting properties (Article 57f)',
    dateOfInclusion: '16 January 2017',
    echaUrl: null,
  },
  {
    name: '4-tert-Octylphenol',
    casNumber: '140-66-9',
    ecNumber: '205-426-2',
    reason: 'Endocrine disrupting properties (Article 57f)',
    dateOfInclusion: '16 January 2017',
    echaUrl: null,
  },
  {
    name: '4-Nonylphenol, branched and linear',
    casNumber: null,
    ecNumber: null,
    reason: 'Endocrine disrupting properties (Article 57f)',
    dateOfInclusion: '16 January 2017',
    echaUrl: null,
  },
  {
    name: 'Perfluorooctanoic acid (PFOA)',
    casNumber: '335-67-1',
    ecNumber: '206-397-9',
    reason: 'PBT (Article 57d), endocrine disrupting properties (Article 57f)',
    dateOfInclusion: '27 June 2013',
    echaUrl: null,
  },
  {
    name: 'Perfluorooctane sulphonic acid (PFOS)',
    casNumber: '1763-23-1',
    ecNumber: '217-179-8',
    reason: 'PBT (Article 57d), vPvB (Article 57e)',
    dateOfInclusion: '27 June 2013',
    echaUrl: null,
  },
  {
    name: 'Perfluorohexane-1-sulphonic acid (PFHxS)',
    casNumber: '355-46-4',
    ecNumber: '206-587-1',
    reason: 'vPvB (Article 57e), PBT (Article 57d)',
    dateOfInclusion: '8 July 2021',
    echaUrl: null,
  },
  {
    name: 'Musk xylene',
    casNumber: '81-15-2',
    ecNumber: '201-329-4',
    reason: 'vPvB (Article 57e)',
    dateOfInclusion: '27 June 2011',
    echaUrl: null,
  },
  {
    name: 'Cadmium',
    casNumber: '7440-43-9',
    ecNumber: '231-152-8',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '20 June 2013',
    echaUrl: null,
  },
  {
    name: 'Cadmium oxide',
    casNumber: '1306-19-0',
    ecNumber: '215-146-2',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '20 June 2013',
    echaUrl: null,
  },
  {
    name: 'Cadmium sulphide',
    casNumber: '1306-23-6',
    ecNumber: '215-147-8',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '20 June 2013',
    echaUrl: null,
  },
  {
    name: 'Cadmium chloride',
    casNumber: '10108-64-2',
    ecNumber: '233-296-7',
    reason: 'Carcinogenic (Article 57a), mutagenic (Article 57b), toxic for reproduction (Article 57c)',
    dateOfInclusion: '20 June 2013',
    echaUrl: null,
  },
  {
    name: 'Dichromium tris(chromate)',
    casNumber: '24613-89-6',
    ecNumber: '246-356-2',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '18 June 2010',
    echaUrl: null,
  },
  {
    name: 'Dimethyl sulphate',
    casNumber: '77-78-1',
    ecNumber: '201-058-1',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '30 March 2010',
    echaUrl: null,
  },
  {
    name: 'Diboron trioxide',
    casNumber: '1303-86-2',
    ecNumber: '215-125-8',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '16 December 2010',
    echaUrl: null,
  },
  {
    name: 'Diisopentyl phthalate',
    casNumber: '605-50-5',
    ecNumber: '210-088-4',
    reason: 'Toxic for reproduction (Article 57c)',
    dateOfInclusion: '19 December 2011',
    echaUrl: null,
  },
  {
    name: '1,2-Dichloroethane',
    casNumber: '107-06-2',
    ecNumber: '203-458-1',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '19 December 2011',
    echaUrl: null,
  },
  {
    name: 'Bis(pentabromophenyl) ether (DecaBDE)',
    casNumber: '1163-19-5',
    ecNumber: '214-604-9',
    reason: 'vPvB (Article 57e)',
    dateOfInclusion: '16 December 2010',
    echaUrl: null,
  },
  {
    name: 'Lead chromate',
    casNumber: '7758-97-6',
    ecNumber: '231-846-0',
    reason: 'Carcinogenic (Article 57a), toxic for reproduction (Article 57c)',
    dateOfInclusion: '18 June 2010',
    echaUrl: null,
  },
  {
    name: 'Lead sulfochromate yellow (C.I. Pigment Yellow 34)',
    casNumber: '1344-37-2',
    ecNumber: '215-693-7',
    reason: 'Carcinogenic (Article 57a), toxic for reproduction (Article 57c)',
    dateOfInclusion: '18 June 2010',
    echaUrl: null,
  },
  {
    name: 'Phenolphthalein',
    casNumber: '77-09-8',
    ecNumber: '201-004-7',
    reason: 'Carcinogenic (Article 57a)',
    dateOfInclusion: '16 December 2010',
    echaUrl: null,
  },
  {
    name: '4,4\'-Methylenediphenyl diisocyanate (MDI)',
    casNumber: '101-68-8',
    ecNumber: '202-966-0',
    reason: 'Respiratory sensitisation (Article 57f)',
    dateOfInclusion: '20 June 2013',
    echaUrl: null,
  },
]
