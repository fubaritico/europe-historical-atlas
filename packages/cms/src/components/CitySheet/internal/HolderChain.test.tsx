// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Formik } from 'formik'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { RelationshipInputStandIn } from '../../../testing/relationshipInputStandIn'
import { CITY_SHEET_MESSAGES } from '../i18n'
import { EMPTY_MOMENT } from '../utils/sheetValues'

import { HolderChain } from './HolderChain'

import type { ChainReading } from '../utils/readVassalChain'
import type { LinkAnswer, NewVassalLink } from '../utils/saveVassalLink'
import type { SheetValues } from '../utils/sheetValues'

const toast = vi.hoisted(() => ({ error: vi.fn() }))

vi.mock('@payloadcms/ui', () => ({ toast, RelationshipInput: RelationshipInputStandIn }))

const say = createTranslator(CITY_SHEET_MESSAGES, 'fr')

const COUNT = { id: 10, name: 'Mathias II — comté de Nantes' }
const DUKE = { id: 20, name: 'Alain IV — duché de Bretagne' }
const EMPEROR = { id: 40, name: 'Henri IV — Saint-Empire' }
const LINE = `Vassal de : le suzerain de ${COUNT.name}`

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
 * The chain under a form holding these values.
 * @param initial - the form's values
 * @param read - the chain's reader
 * @param saveLink - the link's writer
 * @param saveSovereign - the « souverain » box's writer
 * @returns the rendered chain
 */
function renderChain(
  initial: SheetValues,
  read: (title: number | string, year: number) => Promise<ChainReading[]>,
  saveLink: (link: NewVassalLink) => Promise<LinkAnswer> = () => Promise.resolve({ kind: 'saved' }),
  saveSovereign: (title: number | string, sovereign: boolean) => Promise<LinkAnswer> = () =>
    Promise.resolve({ kind: 'saved' })
) {
  return render(
    <Formik initialValues={initial} onSubmit={() => undefined}>
      <HolderChain read={read} writers={{ saveLink, saveSovereign }} say={say} />
    </Formik>
  )
}

/**
 * The reading in one line, under the « Vassal de » lines.
 * @param container - the rendered chain
 * @returns its text
 */
function summary(container: HTMLElement): string | null | undefined {
  return container.querySelector('.city-sheet__chain-reading')?.textContent
}

/**
 * Opens the line « Vassal de » where the chain stops at the count, and chooses its suzerain and its source.
 * @param suzerain - the suzerain's id, typed
 * @param source - the source's id, typed; nothing when omitted
 * @returns the line
 */
async function enterLink(suzerain: string, source?: string): Promise<HTMLElement> {
  const user = userEvent.setup()
  await user.click(
    await screen.findByRole('button', {
      name: 'Ajouter le suzerain de Mathias II — comté de Nantes',
    })
  )
  const line = screen.getByRole('group', { name: LINE })
  await user.type(within(line).getByLabelText('Vassal de'), suzerain)
  if (source !== undefined) await user.type(within(line).getByLabelText('Source'), source)
  return line
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  toast.error.mockClear()
})

describe('HolderChain', () => {
  describe('happy path', () => {
    it('shows one line « Vassal de » per link, then the chain in one line up to a sovereign', async () => {
      const { container } = renderChain(values('1100'), () =>
        Promise.resolve([{ titles: [COUNT, DUKE], end: 'sovereign' }])
      )
      expect(await screen.findByText('Chaîne de vassalité en 1100')).toBeTruthy()
      expect(container.querySelector('.city-sheet__chain-link')?.textContent).toBe(
        'Vassal de' + DUKE.name
      )
      expect(summary(container)).toBe(`${COUNT.name} → ${DUKE.name} — souverain`)
      expect(screen.queryByRole('button', { name: /^Ajouter le suzerain/ })).toBeNull()
    })
  })

  describe('variants', () => {
    it('offers « Vassal de ⊕ » where the chain stops for want of a link: beyond, we do not know', async () => {
      const { container } = renderChain(values('1110'), () =>
        Promise.resolve([{ titles: [COUNT], end: 'unknown' }])
      )
      expect(
        await screen.findByRole('button', { name: `Ajouter le suzerain de ${COUNT.name}` })
      ).toBeTruthy()
      expect(summary(container)).toBe(`${COUNT.name} — au-delà, on ne sait pas`)
    })

    it('saves the link once its suzerain and its source are chosen, and reads the chain again', async () => {
      const read = vi
        .fn()
        .mockResolvedValueOnce([{ titles: [COUNT], end: 'unknown' }])
        .mockResolvedValueOnce([{ titles: [COUNT, DUKE], end: 'unknown' }])
      const saveLink = vi.fn(() => Promise.resolve<LinkAnswer>({ kind: 'saved' }))
      const { container } = renderChain(values('1100'), read, saveLink)
      await enterLink('20')
      expect(saveLink).not.toHaveBeenCalled()
      await userEvent.setup().type(screen.getByLabelText('Source'), '4')
      expect(saveLink).toHaveBeenCalledWith({ vassal: 10, suzerain: 20, source: 4, year: 1100 })
      await waitFor(() => {
        expect(summary(container)).toBe(`${COUNT.name} → ${DUKE.name} — au-delà, on ne sait pas`)
      })
      expect(read).toHaveBeenCalledTimes(2)
      // The line saved left the block with the keyboard in it: the keyboard is back on ⊕
      expect(document.activeElement?.getAttribute('aria-label')).toBe(
        `Ajouter le suzerain de ${DUKE.name}`
      )
    })

    // The dev, 2026-11-16: a repeating block — ⊕ again as soon as the line has its suzerain, sources or not.
    it("chains a second line on the first one's suzerain, without waiting for its source", async () => {
      const saveLink = vi.fn(() => Promise.resolve<LinkAnswer>({ kind: 'saved' }))
      renderChain(
        values('1100'),
        () => Promise.resolve([{ titles: [COUNT], end: 'unknown' }]),
        saveLink
      )
      await enterLink('20')
      const user = userEvent.setup()
      await user.click(
        screen.getByRole('button', { name: 'Ajouter le suzerain de la ligne au-dessous' })
      )
      const second = screen.getByRole('group', {
        name: 'Vassal de : le suzerain de la ligne au-dessous',
      })
      await user.type(within(second).getByLabelText('Vassal de'), '40')
      await user.type(within(second).getByLabelText('Source'), '4')
      expect(saveLink).toHaveBeenCalledWith({ vassal: 20, suzerain: 40, source: 4, year: 1100 })
      expect(screen.getByRole('group', { name: LINE })).toBeTruthy()
    })

    it('ticks « Souverain » on the title the chain stops at, and offers no ⊕ once it is', async () => {
      const saveSovereign = vi.fn(() => Promise.resolve<LinkAnswer>({ kind: 'saved' }))
      const read = vi
        .fn()
        .mockResolvedValueOnce([{ titles: [COUNT], end: 'unknown' }])
        .mockResolvedValueOnce([{ titles: [COUNT], end: 'sovereign' }])
      renderChain(values('1100'), read, undefined, saveSovereign)
      await userEvent.setup().click(await screen.findByRole('checkbox', { name: 'Souverain' }))
      expect(saveSovereign).toHaveBeenCalledWith(10, true)
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /^Ajouter le suzerain/ })).toBeNull()
      })
      expect(screen.getByRole('checkbox', { name: 'Souverain' })).toHaveProperty('checked', true)
    })

    it('moves « Souverain » to the suzerain of the last line, and hides ⊕ once it is ticked', async () => {
      const saveSovereign = vi.fn(() => Promise.resolve<LinkAnswer>({ kind: 'saved' }))
      renderChain(
        values('1100'),
        () => Promise.resolve([{ titles: [COUNT], end: 'unknown' }]),
        undefined,
        saveSovereign
      )
      const line = await enterLink('20')
      expect(screen.getAllByRole('checkbox', { name: 'Souverain' })).toHaveLength(1)
      await userEvent.setup().click(within(line).getByRole('checkbox', { name: 'Souverain' }))
      expect(saveSovereign).toHaveBeenCalledWith(20, true)
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /^Ajouter le suzerain/ })).toBeNull()
      })
    })

    // Review ARCH-001: a suzerain changed is not the one ticked
    it("unticks « Souverain » when the line's suzerain is changed, and offers ⊕ again", async () => {
      renderChain(values('1100'), () => Promise.resolve([{ titles: [COUNT], end: 'unknown' }]))
      const line = await enterLink('20')
      const user = userEvent.setup()
      await user.click(within(line).getByRole('checkbox', { name: 'Souverain' }))
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /^Ajouter le suzerain/ })).toBeNull()
      })
      await user.type(within(line).getByLabelText('Vassal de'), '1')
      expect(within(line).getByRole('checkbox', { name: 'Souverain' })).toHaveProperty(
        'checked',
        false
      )
      expect(screen.getByRole('button', { name: /^Ajouter le suzerain/ })).toBeTruthy()
    })

    it('lists every reading when the sources diverge, and says how many', async () => {
      const { container } = renderChain(values('1100'), () =>
        Promise.resolve([
          { titles: [COUNT, DUKE], end: 'sovereign' },
          { titles: [COUNT, EMPEROR], end: 'sovereign' },
        ])
      )
      expect(
        await screen.findByText('Les sources divergent : 2 lectures, toutes gardées.')
      ).toBeTruthy()
      expect(container.querySelectorAll('.city-sheet__chain-reading')).toHaveLength(2)
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

    it('says a refused link under its line, in the server’s words, and keeps what was chosen', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const refusal = 'Ce maillon existe déjà.'
      renderChain(
        values('1100'),
        () => Promise.resolve([{ titles: [COUNT], end: 'unknown' }]),
        () => Promise.resolve({ kind: 'refused', message: refusal })
      )
      const line = await enterLink('20', '4')
      expect((await within(line).findByRole('alert')).textContent).toBe(refusal)
      expect(warn).toHaveBeenCalledWith(`[CMS] a link of vassalage was refused: ${refusal}`)
      expect(within(line).getByLabelText<HTMLInputElement>('Vassal de').value).toBe('20')
    })
  })

  describe('managed errors — one save at a time', () => {
    it('tries again once a refused line has its suzerain changed', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const saveLink = vi
        .fn<(link: NewVassalLink) => Promise<LinkAnswer>>()
        .mockResolvedValueOnce({ kind: 'refused', message: 'Ce maillon existe déjà.' })
        .mockResolvedValueOnce({ kind: 'saved' })
      renderChain(
        values('1100'),
        () => Promise.resolve([{ titles: [COUNT], end: 'unknown' }]),
        saveLink
      )
      const line = await enterLink('20', '4')
      await within(line).findByRole('alert')
      await userEvent.setup().type(within(line).getByLabelText('Vassal de'), '1')
      expect(saveLink).toHaveBeenLastCalledWith({
        vassal: 10,
        suzerain: 201,
        source: 4,
        year: 1100,
      })
      expect(saveLink).toHaveBeenCalledTimes(2)
    })

    it('holds the line while its link is saved: a second choice sends nothing', async () => {
      let answer: (value: LinkAnswer) => void = () => undefined
      const saveLink = vi.fn(
        () =>
          new Promise<LinkAnswer>((resolve) => {
            answer = resolve
          })
      )
      renderChain(
        values('1100'),
        () => Promise.resolve([{ titles: [COUNT], end: 'unknown' }]),
        saveLink
      )
      const line = await enterLink('20', '4')
      expect(within(line).getByText('Enregistrement du maillon…')).toBeTruthy()
      await userEvent.setup().type(within(line).getByLabelText('Vassal de'), '1')
      expect(saveLink).toHaveBeenCalledTimes(1)
      answer({ kind: 'saved' })
    })

    it('says nothing on a line closed before its refusal came back', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      let answer: (value: LinkAnswer) => void = () => undefined
      renderChain(
        values('1100'),
        () => Promise.resolve([{ titles: [COUNT], end: 'unknown' }]),
        () =>
          new Promise<LinkAnswer>((resolve) => {
            answer = resolve
          })
      )
      const line = await enterLink('20', '4')
      const user = userEvent.setup()
      await user.click(
        within(line).getByRole('button', { name: 'Fermer cette ligne sans l’enregistrer' })
      )
      answer({ kind: 'refused', message: 'Ce maillon existe déjà.' })
      await user.click(screen.getByRole('button', { name: `Ajouter le suzerain de ${COUNT.name}` }))
      await waitFor(() => {
        expect(screen.getByRole('group', { name: LINE })).toBeTruthy()
      })
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('says a failed save under its line, in a toast and the console', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      renderChain(
        values('1100'),
        () => Promise.resolve([{ titles: [COUNT], end: 'unknown' }]),
        () => Promise.reject(new TypeError('Failed to fetch'))
      )
      const line = await enterLink('20', '4')
      const message =
        'Le maillon n’a pas pu être enregistré. Changez le suzerain ou la source pour réessayer.'
      expect((await within(line).findByRole('alert')).textContent).toBe(message)
      expect(toast.error).toHaveBeenCalledWith(message)
      expect(error).toHaveBeenCalledWith(
        '[CMS] a link of vassalage could not be saved',
        expect.any(TypeError)
      )
    })
  })

  describe('edge cases', () => {
    it('says links that contradict one another, rather than climbing forever', async () => {
      const { container } = renderChain(values('1100'), () =>
        Promise.resolve([{ titles: [COUNT, DUKE, COUNT], end: 'loop' }])
      )
      await screen.findByText('Chaîne de vassalité en 1100')
      expect(summary(container)).toContain('les maillons se contredisent')
    })

    it('moves the keyboard to the line ⊕ opens, and back to ⊕ once ✕ closes it', async () => {
      renderChain(values('1100'), () => Promise.resolve([{ titles: [COUNT], end: 'unknown' }]))
      const user = userEvent.setup()
      await user.click(
        await screen.findByRole('button', { name: `Ajouter le suzerain de ${COUNT.name}` })
      )
      const line = screen.getByRole('group', { name: LINE })
      expect(document.activeElement).toBe(line)
      await user.click(
        within(line).getByRole('button', { name: 'Fermer cette ligne sans l’enregistrer' })
      )
      expect(document.activeElement?.getAttribute('aria-label')).toBe(
        `Ajouter le suzerain de ${COUNT.name}`
      )
    })

    it('closes the line unsaved and forgotten with ✕, and saves nothing once the suzerain is emptied', async () => {
      const saveLink = vi.fn(() => Promise.resolve<LinkAnswer>({ kind: 'saved' }))
      renderChain(
        values('1100'),
        () => Promise.resolve([{ titles: [COUNT], end: 'unknown' }]),
        saveLink
      )
      const line = await enterLink('20')
      const user = userEvent.setup()
      await user.clear(within(line).getByLabelText('Vassal de'))
      await user.type(within(line).getByLabelText('Source'), '4')
      expect(saveLink).not.toHaveBeenCalled()
      await user.click(
        within(line).getByRole('button', { name: 'Fermer cette ligne sans l’enregistrer' })
      )
      expect(screen.queryByRole('group', { name: LINE })).toBeNull()
      await user.click(screen.getByRole('button', { name: `Ajouter le suzerain de ${COUNT.name}` }))
      expect(screen.getByLabelText<HTMLInputElement>('Source').value).toBe('')
      expect(saveLink).not.toHaveBeenCalled()
    })
  })
})
