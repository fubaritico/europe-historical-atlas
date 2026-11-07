import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { CityDialog } from './CityDialog'

import type { CityMark } from '../../../../state/citiesSlice'
import type { CityVerdict } from '../utils/cityVerdict'

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
  holderSources: [{ title: 'Duby, Atlas historique', where: 'p. 46', holder: EMPIRE }],
}
const AGREES: CityVerdict = { onMap: EMPIRE, bySources: EMPIRE, kind: 'agrees' }

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
      const dialogue = screen.getByRole('dialog', { name: 'Metz' })
      expect(dialogue.textContent).toContain('By the sources: Sacrum Imperium')
      expect(dialogue.textContent).toContain('Source: Duby, Atlas historique, p. 46')
      expect(dialogue.textContent).toContain('On the map: Sacrum Imperium')
      expect(dialogue.textContent).toContain('At the right place.')
    })

    // CARTO-368, the dev, 2026-11-07: the box says where the city is, not only whom it belongs to.
    it("gives Metz's coordinates first, as the status bar writes a position", () => {
      mount()
      const lines = screen.getByRole('region', { name: 'Metz' }).querySelectorAll('p')
      expect(lines[0]?.textContent).toBe('Coordinates: 6°11′E 49°07′N')
    })
  })

  describe('variants', () => {
    it('closes on « Close »', async () => {
      const { onClose, user } = mount()
      await user.click(screen.getByRole('button', { name: 'Close' }))
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  // L3–L4: N/A — it shows what it is handed.

  describe('edge cases', () => {
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
      expect(screen.getByRole('dialog', { name: 'Huesca' }).textContent).toContain(
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
