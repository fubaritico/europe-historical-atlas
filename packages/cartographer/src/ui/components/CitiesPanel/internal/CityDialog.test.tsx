import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { cityDetailText } from '../../../testing/cityDetailText'
import { renderInEnglish } from '../../../testing/renderInEnglish'

import { CityDialog } from './CityDialog'

import type { CityVerdict } from '../../../../canvas/cityVerdict'
import type { CityMark } from '../../../../state/citiesSlice'

const EMPIRE = { name: 'Sacrum Imperium', wikidata: 'Q12548' }
const METZ: CityMark = {
  id: 'metz',
  name: 'Metz',
  lon: 6.18,
  lat: 49.12,
  date: {
    kind: 'instant',
    at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
  },
  holder: EMPIRE,
  chain: null,
  holderSources: [{ title: 'Duby, Atlas historique', where: 'p. 46', holder: EMPIRE }],
}
const AGREES: CityVerdict = {
  onMap: { id: 'hre', ...EMPIRE },
  bySources: EMPIRE,
  kind: 'agrees',
  chain: null,
  expected: null,
  expectedOnMap: null,
}

/**
 * The box, Metz open or none.
 * @param open - whether Metz is open
 * @returns the close callback and a user
 */
function mount(open = true) {
  const onClose = vi.fn()
  renderInEnglish(
    <CityDialog
      openedCity={open ? METZ : null}
      openedVerdict={open ? AGREES : undefined}
      onClose={onClose}
    />
  )
  return { onClose, user: userEvent.setup() }
}

// CARTO-384, the dev, 2026-11-07: a city's information box, « like the filters' modal, for now ».
describe('CityDialog', () => {
  describe('happy path', () => {
    it('opens on Metz, named by it, and says who holds it by the sources and on the map', () => {
      mount()
      expect(screen.getByRole('dialog', { name: 'Metz' })).toBeTruthy()
      expect(cityDetailText(screen.getByRole('region', { name: 'Metz' }))).toEqual([
        'Coordinates: 6°11′E 49°07′N',
        'By the sources: Sacrum Imperium',
        'Sources: Duby, Atlas historique, p. 46',
        'On the map: Sacrum Imperium',
        'At the right place.',
      ])
    })

    // CARTO-368, the dev, 2026-11-07: the box says where the city is, not only whom it belongs to.
    it("gives Metz's coordinates first, under their heading, as the status bar writes a position", () => {
      mount()
      const headings = screen.getAllByRole('heading').map((heading) => heading.textContent)
      expect(headings[0]).toBe('Coordinates')
      expect(cityDetailText(screen.getByRole('region', { name: 'Metz' }))[0]).toBe(
        'Coordinates: 6°11′E 49°07′N'
      )
    })
  })

  describe('variants', () => {
    // The dev's screen of 2026-11-16: the chain one title per line, the last saying how it ends
    // CARTO-491, the dev, 2026-11-20: a city's chain must agree with the ranks' scores, and say it when it does not
    it('says, under the chain, a king put under a count — the two titles named', () => {
      const chain = [
        {
          titles: [
            { name: 'Sulayman — taïfa de Lérida', wikidata: null, kind: 'kingdom' },
            { name: 'Raimond-Bérenger III — comté de Barcelone', wikidata: 'Q1', kind: 'county' },
          ],
          end: 'unknown' as const,
        },
      ]
      renderInEnglish(
        <CityDialog
          openedCity={{ ...METZ, chain }}
          openedVerdict={{ ...AGREES, chain }}
          onClose={vi.fn()}
        />
      )
      expect(screen.getByRole('region', { name: 'Metz' }).textContent).toContain(
        'To check: “Sulayman — taïfa de Lérida” ranks higher than its suzerain, “Raimond-Bérenger III — comté de Barcelone”.'
      )
    })

    it('says nothing of a chain that climbs, nor of titles whose rank the export does not carry', () => {
      const climbing = [
        {
          titles: [
            { name: 'Baudouin III — comté de Hainaut', wikidata: 'Q1', kind: 'county' },
            { name: 'Henri IV — royaume de Germanie', wikidata: 'Q2', kind: 'kingdom' },
            { name: 'Henri IV — Saint-Empire', wikidata: 'Q12548' },
          ],
          end: 'sovereign' as const,
        },
      ]
      renderInEnglish(
        <CityDialog
          openedCity={{ ...METZ, chain: climbing }}
          openedVerdict={{ ...AGREES, chain: climbing }}
          onClose={vi.fn()}
        />
      )
      expect(screen.getByRole('region', { name: 'Metz' }).textContent).not.toContain('To check')
    })

    it('writes the chain of vassalage one title per line, the last « sovereign »', () => {
      const chain = [
        {
          titles: [
            { name: 'Baudouin III — comté de Hainaut', wikidata: 'Q1' },
            { name: 'Henri IV — royaume de Germanie', wikidata: 'Q2' },
            { name: 'Henri IV — Saint-Empire', wikidata: 'Q12548' },
          ],
          end: 'sovereign' as const,
        },
      ]
      renderInEnglish(
        <CityDialog
          openedCity={{ ...METZ, chain }}
          openedVerdict={{ ...AGREES, chain }}
          onClose={vi.fn()}
        />
      )
      expect(cityDetailText(screen.getByRole('region', { name: 'Metz' }))).toContain(
        'Chain of vassalage: Baudouin III — comté de Hainaut; → Henri IV — royaume de Germanie; ' +
          '→ Henri IV — Saint-Empire · sovereign'
      )
      // The dev, 2026-11-16: each person's name in italics
      expect(
        [...document.querySelectorAll('.city-detail__person')].map((name) => name.textContent)
      ).toEqual(['Baudouin III', 'Henri IV', 'Henri IV'])
    })

    // The dev, 2026-11-17: Carcassonne's four readings read as one list — each reading whole, numbered
    it("writes each of Carcassonne's readings whole from its holder, numbered", () => {
      const viscount = { name: 'Bernard Aton IV — Viscounty of Carcassonne, 1100', wikidata: 'Q1' }
      const chain = [
        { titles: [viscount], end: 'sovereign' as const },
        {
          titles: [viscount, { name: 'Raymond IV — comté de Toulouse, 1100', wikidata: 'Q2' }],
          end: 'sovereign' as const,
        },
      ]
      renderInEnglish(
        <CityDialog
          openedCity={{ ...METZ, chain }}
          openedVerdict={{ ...AGREES, chain }}
          onClose={vi.fn()}
        />
      )
      expect(cityDetailText(screen.getByRole('region', { name: 'Metz' }))).toContain(
        'Chain of vassalage — 2 readings according to the sources: ' +
          'Reading 1; Bernard Aton IV — Viscounty of Carcassonne · sovereign; ' +
          'Reading 2; Bernard Aton IV — Viscounty of Carcassonne; → Raymond IV — comté de Toulouse · sovereign'
      )
    })

    it("leaves out a title's lone year, the map's own, and keeps a span of years", () => {
      const chain = [
        {
          titles: [
            { name: 'Godefroy — Basse-Lotharingie, 1087–1100', wikidata: 'Q1' },
            { name: 'Henri IV — Saint-Empire, 1100', wikidata: 'Q2' },
          ],
          end: 'sovereign' as const,
        },
      ]
      renderInEnglish(
        <CityDialog
          openedCity={{ ...METZ, chain }}
          openedVerdict={{ ...AGREES, chain }}
          onClose={vi.fn()}
        />
      )
      expect(cityDetailText(screen.getByRole('region', { name: 'Metz' }))).toContain(
        'Chain of vassalage: Godefroy — Basse-Lotharingie, 1087–1100; → Henri IV — Saint-Empire · sovereign'
      )
    })

    it('closes on « Close »', async () => {
      const { onClose, user } = mount()
      await user.click(screen.getByRole('button', { name: 'Close' }))
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  // L3–L4: N/A — it shows what it is handed.

  describe('edge cases', () => {
    it('ends each reading of a divergent chain with how it ends: unknown, or links that contradict', () => {
      const count = { name: 'Comté de Hainaut', wikidata: 'Q1' }
      const chain = [
        {
          titles: [count, { name: 'Royaume de Germanie', wikidata: 'Q2' }],
          end: 'unknown' as const,
        },
        { titles: [count, { name: 'Royaume de France', wikidata: 'Q3' }], end: 'loop' as const },
      ]
      renderInEnglish(
        <CityDialog
          openedCity={{ ...METZ, chain }}
          openedVerdict={{ ...AGREES, chain }}
          onClose={vi.fn()}
        />
      )
      const region = screen.getByRole('region', { name: 'Metz' })
      expect(region.querySelectorAll('.city-detail__reading')).toHaveLength(2)
      expect(cityDetailText(region)).toContain(
        'Chain of vassalage — 2 readings according to the sources: ' +
          'Reading 1; Comté de Hainaut; → Royaume de Germanie · beyond, we do not know; ' +
          'Reading 2; Comté de Hainaut; → Royaume de France · the links contradict one another'
      )
    })

    it('leaves out the sources and the chain when the city has none', () => {
      renderInEnglish(
        <CityDialog
          openedCity={{ ...METZ, holderSources: [] }}
          openedVerdict={AGREES}
          onClose={vi.fn()}
        />
      )
      const headings = screen.getAllByRole('heading').map((heading) => heading.textContent)
      expect(headings).toEqual(['Coordinates', 'By the sources', 'On the map'])
    })

    // The letters are French in either language, as the status bar's (`viewport/coordinateLabel`): `O`, never `W`.
    it('writes a city west of Greenwich with its letter, never a minus sign', () => {
      const onClose = vi.fn()
      renderInEnglish(
        <CityDialog
          openedCity={{ ...METZ, name: 'Huesca', lon: -0.41, lat: 42.14 }}
          openedVerdict={AGREES}
          onClose={onClose}
        />
      )
      expect(cityDetailText(screen.getByRole('region', { name: 'Huesca' }))[0]).toBe(
        'Coordinates: 0°25′O 42°08′N'
      )
    })

    it('shows nothing with no city open', () => {
      mount(false)
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.queryByText('Close')).toBeNull()
    })

    it('shows nothing with a city but no verdict yet', () => {
      const onClose = vi.fn()
      renderInEnglish(<CityDialog openedCity={METZ} openedVerdict={undefined} onClose={onClose} />)
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
