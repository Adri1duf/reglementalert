/**
 * EUR-Lex scraper — EU Cosmetics Regulation (EC) 1223/2009 restricted/prohibited substances.
 *
 * Live fetching of EUR-Lex is impractical (Javscript-rendered search, SPARQL endpoint needed
 * for structured substance extraction). This module uses a curated static list drawn from
 * Annex II (prohibited), Annex III (restricted) and recent amendment regulations.
 *
 * Update this list after each Official Journal amendment to Regulation (EC) 1223/2009.
 */

export type EurLexEntry = {
  name: string
  casNumber: string | null
  reason: string | null
  regulation: string
  url: string | null
}

export async function fetchEurLexSubstances(): Promise<EurLexEntry[]> {
  // EUR-Lex does not expose a machine-readable substance list — the legal text embeds
  // substance names in Annexes I–VI of Regulation (EC) 1223/2009 and its ~80 amendments.
  // We maintain a curated snapshot of the most toxicologically significant entries.
  console.log(`[eurlex] Using curated static list (${EURLEX_SUBSTANCES.length} substances)`)
  return EURLEX_SUBSTANCES
}

// ── Static substance list ─────────────────────────────────────────────────────
// Source: Regulation (EC) 1223/2009 Annexes II & III + amendments up to Feb 2026.
// Prohibited substances (Annex II) and key restricted substances (Annex III/VI).

const BASE_REG = 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:'

const EURLEX_SUBSTANCES: EurLexEntry[] = [
  // ── Recent prohibitions via amendments ──────────────────────────────────────
  {
    name: 'Lilial',
    casNumber: '80-54-6',
    reason:
      'Prohibited in all cosmetic products (CMR category 1B — reproductive toxicity). ' +
      'INCI: Butylphenyl Methylpropional. Deadline: March 2022.',
    regulation: 'Regulation (EU) 2021/1099 — Cosmetics Regulation Annex II',
    url: `${BASE_REG}32021R1099`,
  },
  {
    name: 'Butylphenyl methylpropional',
    casNumber: '80-54-6',
    reason:
      'Prohibited in all cosmetic products (CMR category 1B — reproductive toxicity). ' +
      'Also known as Lilial.',
    regulation: 'Regulation (EU) 2021/1099 — Cosmetics Regulation Annex II',
    url: `${BASE_REG}32021R1099`,
  },
  {
    name: 'HICC',
    casNumber: '31906-04-4',
    reason:
      'Hydroxyisohexyl 3-cyclohexene carboxaldehyde — prohibited fragrance allergen ' +
      '(strong skin sensitiser, Annex II entry).',
    regulation: 'Regulation (EU) 2019/1966 — Cosmetics Regulation Annex II',
    url: `${BASE_REG}32019R1966`,
  },
  {
    name: 'Hydroxyisohexyl 3-cyclohexene carboxaldehyde',
    casNumber: '31906-04-4',
    reason: 'Prohibited fragrance allergen. Strong skin sensitiser. Also known as HICC.',
    regulation: 'Regulation (EU) 2019/1966 — Cosmetics Regulation Annex II',
    url: `${BASE_REG}32019R1966`,
  },
  {
    name: 'Atranol',
    casNumber: '526-37-4',
    reason:
      'Prohibited fragrance ingredient — strong contact allergen derived from oakmoss/treemoss extracts.',
    regulation: 'Regulation (EU) 2019/1966 — Cosmetics Regulation Annex II',
    url: `${BASE_REG}32019R1966`,
  },
  {
    name: 'Chloroatranol',
    casNumber: '57074-21-2',
    reason:
      'Prohibited fragrance ingredient — potent contact allergen from oakmoss/treemoss extracts.',
    regulation: 'Regulation (EU) 2019/1966 — Cosmetics Regulation Annex II',
    url: `${BASE_REG}32019R1966`,
  },
  {
    name: 'Kojic acid',
    casNumber: '501-30-4',
    reason:
      'Restricted skin-brightening agent: max 1% in face care products (rinse-off and leave-on), ' +
      'max 0.5% in hand care leave-on products.',
    regulation: 'Regulation (EU) 2022/1531 — Cosmetics Regulation Annex III',
    url: `${BASE_REG}32022R1531`,
  },
  {
    name: 'Titanium dioxide',
    casNumber: '13463-67-7',
    reason:
      'Prohibited in aerosol/spray cosmetic products where particles could be inhaled ' +
      '(classified as possible carcinogen by inhalation — Regulation (EU) 2021/850).',
    regulation: 'Regulation (EU) 2021/850 — Cosmetics Regulation Annex II',
    url: `${BASE_REG}32021R0850`,
  },
  {
    name: 'Phenoxyethanol',
    casNumber: '122-99-6',
    reason:
      'Restricted: maximum 0.4% in nappy creams and body lotions/milks for children under 3 years ' +
      '(Regulation (EU) 2021/1902).',
    regulation: 'Regulation (EU) 2021/1902 — Cosmetics Regulation Annex III',
    url: `${BASE_REG}32021R1902`,
  },

  // ── Annex III restricted substances (original 1223/2009 + older amendments) ──
  {
    name: 'Formaldehyde',
    casNumber: '50-00-0',
    reason:
      'Restricted preservative: max 0.2% in non-oral products, max 0.1% in oral hygiene products; ' +
      'prohibited in aerosol applications. Mandatory warning label required.',
    regulation: 'Regulation (EC) 1223/2009 — Annex III, entry 5',
    url: `${BASE_REG}32009R1223`,
  },
  {
    name: 'Resorcinol',
    casNumber: '108-46-3',
    reason:
      'Restricted: max 0.5% in hair dye products only. Prohibited in other cosmetics.',
    regulation: 'Regulation (EC) 1223/2009 — Annex III, entry 35',
    url: `${BASE_REG}32009R1223`,
  },
  {
    name: 'Hydroquinone',
    casNumber: '123-31-9',
    reason:
      'Restricted to professional use only (oxidative hair colouring products). ' +
      'Prohibited in other cosmetics due to skin sensitisation and potential genotoxicity.',
    regulation: 'Regulation (EC) 1223/2009 — Annex III, entry 14',
    url: `${BASE_REG}32009R1223`,
  },
  {
    name: 'Toluene',
    casNumber: '108-88-3',
    reason:
      'Restricted to nail products only (max 25%). Prohibited in all other cosmetic products. ' +
      'CMR category 2 (reproductive toxicity).',
    regulation: 'Regulation (EC) 1223/2009 — Annex III, entry 105',
    url: `${BASE_REG}32009R1223`,
  },
  {
    name: 'Methylisothiazolinone',
    casNumber: '2682-20-4',
    reason:
      'MIT — prohibited in leave-on products. Restricted in rinse-off products (max 0.0015%). ' +
      'Potent contact allergen.',
    regulation: 'Regulation (EU) 2017/1224 — Cosmetics Regulation Annex III',
    url: `${BASE_REG}32017R1224`,
  },
  {
    name: 'Triclosan',
    casNumber: '3380-34-5',
    reason:
      'Restricted biocidal preservative — permitted only in toothpaste (0.3%), hand soaps, ' +
      'body soaps, shower gels, deodorant sticks, face powder and nail products (max 0.3%). ' +
      'Endocrine-disrupting concern.',
    regulation: 'Regulation (EU) 2014/358 — Cosmetics Regulation Annex III',
    url: `${BASE_REG}32014R0358`,
  },

  // ── Annex VI restricted UV filters ─────────────────────────────────────────
  {
    name: 'Oxybenzone',
    casNumber: '131-57-7',
    reason:
      'Benzophenone-3 — restricted UV filter: max 6% in face products, max 0.5% in other ' +
      'body lotions. Under review for endocrine disruption.',
    regulation: 'Regulation (EC) 1223/2009 — Annex VI, entry 4',
    url: `${BASE_REG}32009R1223`,
  },
  {
    name: 'Benzophenone-3',
    casNumber: '131-57-7',
    reason:
      'Restricted UV filter: max 6% in face products, max 0.5% in other body lotions. ' +
      'Also known as Oxybenzone. Under review for endocrine disruption.',
    regulation: 'Regulation (EC) 1223/2009 — Annex VI, entry 4',
    url: `${BASE_REG}32009R1223`,
  },
  {
    name: 'Octinoxate',
    casNumber: '5466-77-3',
    reason:
      'Ethylhexyl methoxycinnamate — restricted UV filter, max 7.5% in cosmetics.',
    regulation: 'Regulation (EC) 1223/2009 — Annex VI, entry 13',
    url: `${BASE_REG}32009R1223`,
  },
  {
    name: 'Ethylhexyl methoxycinnamate',
    casNumber: '5466-77-3',
    reason:
      'Restricted UV filter, max 7.5% in cosmetics. Also known as Octinoxate.',
    regulation: 'Regulation (EC) 1223/2009 — Annex VI, entry 13',
    url: `${BASE_REG}32009R1223`,
  },
]
