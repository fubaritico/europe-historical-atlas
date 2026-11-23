import { describe, expect, it } from 'vitest'

import { formatNameReport } from './nameReport'

import type { NameReport } from './compareNames'

/** A run of the control with nothing in it. */
const EMPTY: NameReport = {
  places: 0,
  same: 0,
  kept: 0,
  noItem: 0,
  noLabel: 0,
  unknown: [],
  gaps: [],
}

describe('formatNameReport', () => {
  describe('happy path', () => {
    it('writes its day, its counts and one row a name to sort', () => {
      const page = formatNameReport(
        {
          ...EMPTY,
          places: 3,
          same: 1,
          kept: 1,
          gaps: [
            {
              place: '2562',
              name: 'Pruse',
              wikidata: 'Q83136',
              wikidataName: 'Bursa',
              language: 'fr',
              alias: true,
            },
          ],
        },
        '2026-11-23'
      )
      expect(page).toContain('`pnpm names:check` le 2026-11-23')
      expect(page).toContain('| **le nom diffère : à trier** | **1** |')
      expect(page).toContain('| **lieux lus** | **3** |')
      expect(page).toContain('| 2562 | Pruse | Bursa | français | oui | Q83136 |')
    })
  })

  describe('variants', () => {
    it('lists the items Wikidata does not know under their own title', () => {
      const page = formatNameReport(
        { ...EMPTY, unknown: [{ place: '9', name: 'Erbil', wikidata: 'Q206236' }] },
        '2026-11-23'
      )
      expect(page).toContain('## Identifiants que Wikidata ne connaît pas')
      expect(page).toContain('| 9 | Erbil | Q206236 |')
    })

    it('says a multilingual comparison', () => {
      const page = formatNameReport(
        {
          ...EMPTY,
          gaps: [
            {
              place: '3',
              name: 'Palu',
              wikidata: 'Q3',
              wikidataName: 'Palu (Elazığ)',
              language: 'mul',
              alias: false,
            },
          ],
        },
        '2026-11-23'
      )
      expect(page).toContain('| 3 | Palu | Palu (Elazığ) | multilingue |  | Q3 |')
    })

    it('says an English comparison, and no alias', () => {
      const page = formatNameReport(
        {
          ...EMPTY,
          gaps: [
            {
              place: '2',
              name: 'Onda',
              wikidata: 'Q2',
              wikidataName: 'Onda Castle',
              language: 'en',
              alias: false,
            },
          ],
        },
        '2026-11-23'
      )
      expect(page).toContain('| 2 | Onda | Onda Castle | anglais |  | Q2 |')
    })
  })

  // L3, L4: N/A — a report is always written whole; the failures stop before it (fetchLabels, run).

  describe('edge cases', () => {
    it('says there is nothing to sort, and has no section of unknown items', () => {
      const page = formatNameReport(EMPTY, '2026-11-23')
      expect(page).toContain('Aucun nom à trier.')
      expect(page).not.toContain('Identifiants que Wikidata ne connaît pas')
    })

    it('escapes a bar in a name, which would cut the row', () => {
      const page = formatNameReport(
        {
          ...EMPTY,
          gaps: [
            {
              place: '1',
              name: 'A|B',
              wikidata: 'Q1',
              wikidataName: 'AB',
              language: 'fr',
              alias: false,
            },
          ],
        },
        '2026-11-23'
      )
      expect(page).toContain('| 1 | A\\|B | AB |')
    })

    it('keeps a name anyone typed on one line, its tag, link and code characters escaped', () => {
      const page = formatNameReport(
        {
          ...EMPTY,
          gaps: [
            {
              place: '1',
              name: 'Kos',
              wikidata: 'Q1',
              wikidataName: 'Kos\n[lien](x) <b>`c`',
              language: 'fr',
              alias: false,
            },
          ],
        },
        '2026-11-23'
      )
      expect(page).toContain('| 1 | Kos | Kos \\[lien\\](x) \\<b\\>\\`c\\` | français |')
    })
  })
})
