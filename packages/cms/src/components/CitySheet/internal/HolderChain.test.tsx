// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Formik } from 'formik'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { RelationshipInputStandIn } from '../../../testing/relationshipInputStandIn'
import { CITY_SHEET_MESSAGES } from '../i18n'
import { EMPTY_MOMENT } from '../utils/sheetValues'

import { HolderChain } from './HolderChain'

import type { ChainWriters } from './HolderChain'
import type { ChainSaver } from '../hooks/useChainSaver'
import type { ChainReading } from '../utils/readVassalChain'
import type { LinkAnswer } from '../utils/saveVassalLink'
import type { SheetValues } from '../utils/sheetValues'

const toast = vi.hoisted(() => ({ error: vi.fn() }))

vi.mock('@payloadcms/ui', () => ({ toast, RelationshipInput: RelationshipInputStandIn }))

const say = createTranslator(CITY_SHEET_MESSAGES, 'fr')

const COUNT = { id: 10, name: 'Mathias II — comté de Nantes' }
const DUKE = { id: 20, name: 'Alain IV — duché de Bretagne' }
const EMPEROR = { id: 40, name: 'Henri IV — Saint-Empire' }
const LINE = `Vassal de : le suzerain de ${COUNT.name}`
const SAVED: LinkAnswer = { kind: 'saved' }

/** The count alone: no link above him. */
const ALONE: ChainReading[] = [{ titles: [COUNT], steps: [], end: 'unknown' }]
/** The count under the duke by link 7, sourced by 4; the duke's chain stopping there. */
const UNDER_DUKE: ChainReading[] = [
  { titles: [COUNT, DUKE], steps: [{ link: '7', source: 4 }], end: 'unknown' },
]

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
    holderTitle: titled ? COUNT.id : null,
    holderName: '',
    holderQid: '',
    showInAtlas: false,
  }
}

/**
 * The bridge to the sheet's « Enregistrer », keeping what the chain hands it.
 * @returns the bridge and a way to press « Enregistrer »
 */
function bridge() {
  let saveAll: () => Promise<boolean> = () => Promise.resolve(true)
  const saver: ChainSaver = {
    waiting: 0,
    setWaiting: vi.fn(),
    register: (fn) => {
      saveAll = fn
    },
    saveAll: () => saveAll(),
  }
  return {
    saver,
    save: async () => {
      let done = false
      await act(async () => {
        done = await saver.saveAll()
      })
      return done
    },
  }
}

/**
 * The chain under a form holding these values.
 * @param read - the chain's reader
 * @param writers - the writes stood in for — each saving by default
 * @param initial - the form's values
 * @returns the rendered chain, the writers, and « Enregistrer »
 */
function renderChain(
  read: (title: number | string, year: number) => Promise<ChainReading[]>,
  writers: Partial<Omit<ChainWriters, 'saver'>> = {},
  initial: SheetValues = values('1100')
) {
  const { saver, save } = bridge()
  const all: ChainWriters = {
    saveLink: vi.fn(() => Promise.resolve(SAVED)),
    updateLink: vi.fn(() => Promise.resolve(SAVED)),
    deleteLink: vi.fn(() => Promise.resolve(SAVED)),
    saveSovereign: vi.fn(() => Promise.resolve(SAVED)),
    ...writers,
    saver,
  }
  const view = render(
    <Formik initialValues={initial} onSubmit={() => undefined}>
      <HolderChain read={read} writers={all} say={say} />
    </Formik>
  )
  return { ...view, writers: all, save }
}

/**
 * The reading in one line, under the blocks.
 * @param container - the rendered chain
 * @returns its text
 */
function summary(container: HTMLElement): string | null | undefined {
  return container.querySelector('.city-sheet__chain-reading')?.textContent
}

/**
 * Chooses a block's suzerain or source, in one gesture.
 * @param line - the block
 * @param label - « Vassal de » or « Source »
 * @param id - the id chosen
 */
async function choose(line: HTMLElement, label: string, id: string): Promise<void> {
  const user = userEvent.setup()
  const field = within(line).getByLabelText(label)
  await user.clear(field)
  await user.click(field)
  await user.paste(id)
}

/**
 * Adds a block with ⊕ above the count.
 * @returns the block
 */
async function addLine(): Promise<HTMLElement> {
  await userEvent
    .setup()
    .click(await screen.findByRole('button', { name: `Ajouter le suzerain de ${COUNT.name}` }))
  return screen.getByRole('group', { name: LINE })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  toast.error.mockClear()
})

describe('HolderChain', () => {
  describe('happy path', () => {
    // The dev, 2026-11-16: the same blocks to enter a chain and to change it
    it('opens the links already entered as blocks, their suzerain and source in them', async () => {
      renderChain(() => Promise.resolve(UNDER_DUKE))
      const line = await screen.findByRole('group', { name: LINE })
      expect(within(line).getByLabelText<HTMLInputElement>('Vassal de').value).toBe('20')
      expect(within(line).getByLabelText<HTMLInputElement>('Source').value).toBe('4')
      expect(within(line).getByText(/^Ce maillon sert à toutes les villes/)).toBeTruthy()
    })

    it('saves a new block at « Enregistrer », its source facultative, and reads the chain again', async () => {
      const read = vi.fn().mockResolvedValueOnce(ALONE).mockResolvedValueOnce(UNDER_DUKE)
      const { writers, save, container } = renderChain(read)
      await choose(await addLine(), 'Vassal de', '20')
      expect(writers.saveLink).not.toHaveBeenCalled()
      expect(await save()).toBe(true)
      expect(writers.saveLink).toHaveBeenCalledWith({
        vassal: 10,
        suzerain: 20,
        source: null,
        year: 1100,
      })
      await waitFor(() => {
        expect(summary(container)).toBe(`${COUNT.name} → ${DUKE.name} — au-delà, on ne sait pas`)
      })
    })
  })

  describe('variants', () => {
    it("chains a second block on the first one's suzerain, both saved at « Enregistrer »", async () => {
      const { writers, save } = renderChain(() => Promise.resolve(ALONE))
      await choose(await addLine(), 'Vassal de', '20')
      await userEvent
        .setup()
        .click(screen.getByRole('button', { name: 'Ajouter le suzerain de la ligne au-dessous' }))
      const second = screen.getByRole('group', {
        name: 'Vassal de : le suzerain de la ligne au-dessous',
      })
      await choose(second, 'Vassal de', '30')
      await save()
      expect(writers.saveLink).toHaveBeenLastCalledWith({
        vassal: 20,
        suzerain: 30,
        source: null,
        year: 1100,
      })
    })

    it('changes a link entered — its suzerain and its source — at « Enregistrer »', async () => {
      const { writers, save } = renderChain(() => Promise.resolve(UNDER_DUKE))
      const line = await screen.findByRole('group', { name: LINE })
      await choose(line, 'Vassal de', '30')
      await choose(line, 'Source', '5')
      await save()
      expect(writers.updateLink).toHaveBeenCalledWith({ link: '7', suzerain: 30, source: 5 })
      expect(writers.saveLink).not.toHaveBeenCalled()
    })

    it('removes a link closed with ✕ at « Enregistrer », and offers ⊕ again', async () => {
      const { writers, save } = renderChain(() => Promise.resolve(UNDER_DUKE))
      const line = await screen.findByRole('group', { name: LINE })
      await userEvent
        .setup()
        .click(within(line).getByRole('button', { name: 'Fermer cette ligne sans l’enregistrer' }))
      expect(
        screen.getByRole('button', { name: `Ajouter le suzerain de ${COUNT.name}` })
      ).toBeTruthy()
      expect(writers.deleteLink).not.toHaveBeenCalled()
      await save()
      expect(writers.deleteLink).toHaveBeenCalledWith('7')
    })

    it('saves nothing for a link left as it was', async () => {
      const { writers, save } = renderChain(() => Promise.resolve(UNDER_DUKE))
      await screen.findByRole('group', { name: LINE })
      expect(await save()).toBe(true)
      expect(writers.updateLink).not.toHaveBeenCalled()
      expect(writers.saveLink).not.toHaveBeenCalled()
      expect(writers.deleteLink).not.toHaveBeenCalled()
    })

    it('ticks « Souverain » on the title the chain stops at, and offers no ⊕ once it is', async () => {
      const read = vi
        .fn()
        .mockResolvedValueOnce(ALONE)
        .mockResolvedValueOnce([{ titles: [COUNT], steps: [], end: 'sovereign' }])
      const { writers } = renderChain(read)
      await userEvent.setup().click(await screen.findByRole('checkbox', { name: 'Souverain' }))
      expect(writers.saveSovereign).toHaveBeenCalledWith(10, true)
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /^Ajouter le suzerain/ })).toBeNull()
      })
    })

    it("moves « Souverain » to the last block, and unticks it when that block's suzerain changes", async () => {
      renderChain(() => Promise.resolve(ALONE))
      const line = await addLine()
      await choose(line, 'Vassal de', '20')
      expect(screen.getAllByRole('checkbox', { name: 'Souverain' })).toHaveLength(1)
      await userEvent.setup().click(within(line).getByRole('checkbox', { name: 'Souverain' }))
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /^Ajouter le suzerain/ })).toBeNull()
      })
      await choose(line, 'Vassal de', '21')
      expect(within(line).getByRole('checkbox', { name: 'Souverain' })).toHaveProperty(
        'checked',
        false
      )
    })

    it('lists every reading when the sources diverge, and says how many', async () => {
      const { container } = renderChain(() =>
        Promise.resolve([
          { titles: [COUNT, DUKE], steps: [{ link: '7', source: null }], end: 'sovereign' },
          { titles: [COUNT, EMPEROR], steps: [{ link: '8', source: null }], end: 'sovereign' },
        ])
      )
      expect(
        await screen.findByText('Les sources divergent : 2 lectures, toutes gardées.')
      ).toBeTruthy()
      expect(container.querySelectorAll('.city-sheet__chain-reading')).toHaveLength(2)
    })

    it('shows nothing while no title is chosen, and asks for the year before reading', () => {
      const read = vi.fn(() => Promise.resolve(ALONE))
      const { container, unmount } = renderChain(read, {}, values('1100', false))
      expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('')
      unmount()
      renderChain(read, {}, values(''))
      expect(
        screen.getByText('Saisissez l’année de la fiche : la chaîne se lit à cette année.')
      ).toBeTruthy()
      expect(read).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('says a failed read under the holder', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      renderChain(() => Promise.reject(new Error('refused')))
      expect(
        await screen.findByText('La chaîne n’a pas pu être lue. Réessayez dans un instant.')
      ).toBeTruthy()
    })

    // The dev, 2026-11-16: a required field missing is said under it, never a silent grey button
    it('sends nothing while a block misses its suzerain, and says so under it', async () => {
      const { writers, save } = renderChain(() => Promise.resolve(ALONE))
      const line = await addLine()
      expect(await save()).toBe(false)
      expect(within(line).getByRole('alert').textContent).toBe(
        'Choisissez le suzerain, ou fermez la ligne avec ✕.'
      )
      expect(writers.saveLink).not.toHaveBeenCalled()
    })

    it('says a refused link under its block, in the server’s words, and keeps what was chosen', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { save } = renderChain(() => Promise.resolve(ALONE), {
        saveLink: () => Promise.resolve({ kind: 'refused', message: 'Ce maillon existe déjà.' }),
      })
      const line = await addLine()
      await choose(line, 'Vassal de', '20')
      expect(await save()).toBe(false)
      expect(within(line).getByRole('alert').textContent).toBe('Ce maillon existe déjà.')
      expect(within(line).getByLabelText<HTMLInputElement>('Vassal de').value).toBe('20')
    })
  })

  describe('unmanaged errors', () => {
    it('says a failed save under its block, in a toast and the console', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { save } = renderChain(() => Promise.resolve(ALONE), {
        saveLink: () => Promise.reject(new TypeError('Failed to fetch')),
      })
      const line = await addLine()
      await choose(line, 'Vassal de', '20')
      expect(await save()).toBe(false)
      const message =
        'Le maillon n’a pas pu être enregistré. Changez le suzerain ou la source pour réessayer.'
      expect(within(line).getByRole('alert').textContent).toBe(message)
      expect(toast.error).toHaveBeenCalledWith(message)
      expect(error).toHaveBeenCalledWith(
        '[CMS] a link of vassalage could not be saved',
        expect.any(TypeError)
      )
    })
  })

  describe('edge cases', () => {
    it('says links that contradict one another, rather than climbing forever', async () => {
      const { container } = renderChain(() =>
        Promise.resolve([
          {
            titles: [COUNT, DUKE, COUNT],
            steps: [
              { link: '7', source: null },
              { link: '9', source: null },
            ],
            end: 'loop',
          },
        ])
      )
      await screen.findByText('Chaîne de vassalité en 1100')
      expect(summary(container)).toContain('les maillons se contredisent')
    })

    it('moves the keyboard to the block ⊕ adds, and back to ⊕ once ✕ closes it', async () => {
      renderChain(() => Promise.resolve(ALONE))
      const line = await addLine()
      expect(document.activeElement).toBe(line)
      await userEvent
        .setup()
        .click(within(line).getByRole('button', { name: 'Fermer cette ligne sans l’enregistrer' }))
      expect(document.activeElement?.getAttribute('aria-label')).toBe(
        `Ajouter le suzerain de ${COUNT.name}`
      )
    })

    it('leaves the keyboard where it is when the sheet opens on a chain already entered', async () => {
      renderChain(() => Promise.resolve(UNDER_DUKE))
      await screen.findByRole('group', { name: LINE })
      expect(document.activeElement).toBe(document.body)
    })
  })
})
