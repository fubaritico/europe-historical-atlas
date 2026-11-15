// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { Formik } from 'formik'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { CITY_SHEET_MESSAGES } from '../i18n'
import { EMPTY_MOMENT } from '../utils/sheetValues'

import { HolderChain } from './HolderChain'

import type { ChainReading } from '../utils/readVassalChain'
import type { SheetValues } from '../utils/sheetValues'

const say = createTranslator(CITY_SHEET_MESSAGES, 'fr')

const COUNT = { id: '10', name: 'Mathias II — comté de Nantes' }
const DUKE = { id: '20', name: 'Alain IV — duché de Bretagne' }
const EMPEROR = { id: '40', name: 'Henri IV — Saint-Empire' }

/**
 * A sheet's values: a holder's title, the year as typed.
 * @param year - the start's year, as typed
 * @param titled - whether a holder's title is chosen
 * @returns the values
 */
function values(year: string, titled = true): SheetValues {
  return {
    place: null,
    date: { start: { ...EMPTY_MOMENT, year }, end: EMPTY_MOMENT },
    importance: '',
    reasons: [],
    testimonies: [],
    communities: [],
    holderTitle: titled ? { id: 10, name: COUNT.name } : null,
    holderName: '',
    holderQid: '',
    showInAtlas: false,
  }
}

/**
 * The chain under a form holding these values.
 * @param initial - the form's values
 * @param read - the chain's reader
 * @returns the rendered chain
 */
function renderChain(
  initial: SheetValues,
  read: (title: number | string, year: number) => Promise<ChainReading[]>
) {
  return render(
    <Formik initialValues={initial} onSubmit={() => undefined}>
      <HolderChain read={read} say={say} />
    </Formik>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('HolderChain', () => {
  describe('happy path', () => {
    it('shows the chain up to a sovereign, under its year', async () => {
      renderChain(values('1100'), () =>
        Promise.resolve([{ titles: [COUNT, DUKE], end: 'sovereign' }])
      )
      expect(await screen.findByText('Chaîne de vassalité en 1100')).toBeTruthy()
      expect(screen.getByRole('listitem').textContent).toBe(
        'Mathias II — comté de Nantes → Alain IV — duché de Bretagne — souverain'
      )
    })
  })

  describe('variants', () => {
    it('says where the chain stops for want of a link: beyond, we do not know — never sovereign', async () => {
      renderChain(values('1110'), () => Promise.resolve([{ titles: [COUNT], end: 'unknown' }]))
      expect((await screen.findByRole('listitem')).textContent).toBe(
        'Mathias II — comté de Nantes — au-delà, on ne sait pas'
      )
    })

    it('lists every reading when the sources diverge, and says how many', async () => {
      renderChain(values('1100'), () =>
        Promise.resolve([
          { titles: [COUNT, DUKE], end: 'sovereign' },
          { titles: [COUNT, EMPEROR], end: 'sovereign' },
        ])
      )
      expect(
        await screen.findByText('Les sources divergent : 2 lectures, toutes gardées.')
      ).toBeTruthy()
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })

    it('shows nothing while no title is chosen, its live region already there', () => {
      const read = vi.fn(() => Promise.resolve([]))
      const { container } = renderChain(values('1100', false), read)
      expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('')
      expect(read).not.toHaveBeenCalled()
    })

    it('asks for the year before reading the chain', () => {
      const read = vi.fn(() => Promise.resolve([]))
      renderChain(values(''), read)
      expect(
        screen.getByText('Saisissez l’année de la fiche : la chaîne se lit à cette année.')
      ).toBeTruthy()
      expect(read).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('says a failed read under the holder', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      renderChain(values('1100'), () => Promise.reject(new Error('refused')))
      expect(
        await screen.findByText('La chaîne n’a pas pu être lue. Réessayez dans un instant.')
      ).toBeTruthy()
    })
  })

  // L4: the reader's failures are the managed error above; the component adds no I/O of its own.

  describe('edge cases', () => {
    it('says links that contradict one another, rather than climbing forever', async () => {
      renderChain(values('1100'), () =>
        Promise.resolve([{ titles: [COUNT, DUKE, COUNT], end: 'loop' }])
      )
      expect((await screen.findByRole('listitem')).textContent).toContain(
        'les maillons se contredisent'
      )
    })
  })
})
