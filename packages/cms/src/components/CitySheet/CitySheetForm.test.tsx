// @vitest-environment jsdom
import '../../testing/popoverStandIn'
import '../../testing/resizeObserverStandIn'

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CitySheetForm } from './CitySheetForm'
import { EMPTY_MOMENT } from './utils/sheetValues'

import type { SheetValues } from './utils/sheetValues'

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@payloadcms/ui', () => ({ toast }))

/** The CMS's reasons, as the server reads them. */
const REASONS = [
  { id: 1, name: 'Pouvoir' },
  { id: 2, name: 'Religion' },
]

/** Rome in 1100, a capital — the sheet the dev's base holds. */
const rome: SheetValues = {
  place: { id: 5, name: 'Rome' },
  date: { start: { ...EMPTY_MOMENT, year: '1100' }, end: EMPTY_MOMENT },
  importance: 'capital',
  reasons: [],
  testimonies: [],
  holderName: '',
  holderQid: '',
  showInAtlas: false,
}

/** A new sheet. */
const empty: SheetValues = {
  place: null,
  date: { start: EMPTY_MOMENT, end: EMPTY_MOMENT },
  importance: '',
  reasons: [],
  testimonies: [],
  holderName: '',
  holderQid: '',
  showInAtlas: false,
}

/**
 * The form, in French, on an existing sheet or a new one.
 * @param values - its values
 * @param id - its id, absent for a new one
 * @param reasons - the CMS's reasons, its two by default
 * @returns the rendered form
 */
function renderForm(values: SheetValues, id?: number, reasons: typeof REASONS = REASONS) {
  return render(
    <CitySheetForm
      initialValues={values}
      {...(id === undefined ? {} : { id })}
      locale="fr"
      contentLocale="fr"
      api="/api"
      admin="/admin"
      reasons={reasons}
    />
  )
}

/**
 * The start's year field.
 * @returns the input
 */
function startYear(): HTMLInputElement {
  const [start] = screen.getAllByLabelText('Année')
  if (!(start instanceof HTMLInputElement)) throw new Error('no year field')
  return start
}

/**
 * The server answering one response.
 * @param status - the HTTP status
 * @param json - the body
 * @returns the stand-in
 */
function serverAnswers(status: number, json: unknown) {
  const fetcher = vi.fn<typeof fetch>((input) =>
    Promise.resolve(
      (input as string).startsWith('/api/place-periods?')
        ? new Response(JSON.stringify({ docs: [] }), { status: 200 })
        : new Response(JSON.stringify(json), { status })
    )
  )
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

/**
 * The server: the places' search answers Rome, a save answers the new sheet's id.
 * @returns the stand-in, to read the save's body
 */
function serverWithPlaces() {
  const fetcher = vi.fn<typeof fetch>((input) => {
    const url = input as string
    const json = url.startsWith('/api/places')
      ? { docs: [{ id: 5, name: 'Rome' }] }
      : url.startsWith('/api/place-periods?')
        ? { docs: [] }
        : { doc: { id: 7 } }
    return Promise.resolve(new Response(JSON.stringify(json), { status: 200 }))
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

/**
 * The server holding Rome's sheet for 1100: the places' search answers Rome, Rome's sheets answer that one.
 * @returns the stand-in
 */
function serverWithRome1100() {
  const fetcher = vi.fn<typeof fetch>((input) => {
    const url = input as string
    const json = url.startsWith('/api/places')
      ? { docs: [{ id: 5, name: 'Rome' }] }
      : { docs: [{ id: 1, date: { start: { year: 1100, circa: true }, end: { year: null } } }] }
    return Promise.resolve(new Response(JSON.stringify(json), { status: 200 }))
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

/**
 * The server for a line: the sources' search answers Buringh, Rome's sheets none, a save Rome's id.
 * @returns the stand-in, to read the save's body
 */
function serverWithSources() {
  const fetcher = vi.fn<typeof fetch>((input) => {
    const url = input as string
    const json = url.startsWith('/api/sources')
      ? { docs: [{ id: 4, title: 'Buringh 2021' }] }
      : url.startsWith('/api/place-periods?')
        ? { docs: [] }
        : { doc: { id: 1 } }
    return Promise.resolve(new Response(JSON.stringify(json), { status: 200 }))
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

/**
 * The body of the save the form sent.
 * @param fetcher - the server's stand-in
 * @returns the body, parsed
 */
function savedBody(fetcher: ReturnType<typeof serverWithSources>): Record<string, unknown> {
  const save = fetcher.mock.calls.find(([input]) => input === '/api/place-periods/1')
  return JSON.parse(save?.[1]?.body as string) as Record<string, unknown>
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('CitySheetForm', () => {
  describe('happy path', () => {
    it('opens Rome with its place, its year, and the button greyed while nothing has changed', async () => {
      renderForm(rome, 1)
      expect(screen.getByText('Rome')).toBeTruthy()
      expect(startYear().value).toBe('1100')
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Enregistrer' }).hasAttribute('disabled')).toBe(
          true
        )
      })
    })

    it('enables the button once a valid change is typed, saves, and says so', async () => {
      const fetcher = serverAnswers(200, { doc: { id: 1 } })
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.clear(startYear())
      await user.type(startYear(), '1101')
      const save = screen.getByRole('button', { name: 'Enregistrer' })
      await waitFor(() => {
        expect(save.hasAttribute('disabled')).toBe(false)
      })
      await user.click(save)
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Fiche enregistrée.')
      })
      expect(fetcher.mock.calls.some(([input]) => input === '/api/place-periods/1')).toBe(true)
      expect(router.refresh).toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('opens a new sheet with its « Ajouter » greyed, and no error before anything is touched', async () => {
      renderForm(empty)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Ajouter' }).hasAttribute('disabled')).toBe(true)
      })
      expect(screen.queryByText('Il faut au moins une année.')).toBeNull()
      expect(screen.queryByText('Choisissez un lieu.')).toBeNull()
    })

    it('says a field’s error once it is touched, and the help again once it is right', async () => {
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.clear(startYear())
      await user.tab()
      expect(await screen.findByText('Il faut au moins une année.')).toBeTruthy()
      await user.type(startYear(), '1100')
      await waitFor(() => {
        expect(screen.queryByText('Il faut au moins une année.')).toBeNull()
      })
    })
    it('creates a sheet from nothing: the place searched and chosen, a year, an importance', async () => {
      const fetcher = serverWithPlaces()
      renderForm(empty)
      const user = userEvent.setup()
      await user.type(screen.getByRole('combobox', { name: 'Lieu' }), 'Ro')
      await user.click(await screen.findByRole('option', { name: 'Rome' }))
      // The search's field is gone: the focus goes to the place held, never to the page.
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Retirer Rome' }))
      await user.type(startYear(), '1100')
      await user.click(screen.getByRole('button', { name: 'Importance : Choisir une importance' }))
      await user.click(await screen.findByRole('option', { name: 'Capitale' }))
      await user.click(screen.getByRole('button', { name: 'Ajouter' }))
      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith('/admin/collections/place-periods/7')
      })
      const save = fetcher.mock.calls.find(([input]) => input === '/api/place-periods')
      expect(JSON.parse(save?.[1]?.body as string)).toMatchObject({
        place: 5,
        importance: 'capital',
      })
    })

    it('removes the place held: the search comes back with the focus, and says a place is needed', async () => {
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Retirer Rome' }))
      expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Lieu' }))
      expect(await screen.findByText('Choisissez un lieu.')).toBeTruthy()
    })
    it('refuses a year the place already has a sheet for while it is typed — the button greyed, the sentence under the year', async () => {
      serverWithRome1100()
      renderForm({ ...empty, importance: 'capital' })
      const user = userEvent.setup()
      await user.type(screen.getByRole('combobox', { name: 'Lieu' }), 'Ro')
      await user.click(await screen.findByRole('option', { name: 'Rome' }))
      await user.type(startYear(), '1100')
      await user.tab()
      expect(await screen.findByText(/^Rome a déjà une fiche pour vers 1100\./)).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Ajouter' }).hasAttribute('disabled')).toBe(true)
      await user.clear(startYear())
      await user.type(startYear(), '1101')
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Ajouter' }).hasAttribute('disabled')).toBe(false)
      })
    })

    it('greys the button once the place is chosen after its year: the sheets read run the check again', async () => {
      serverWithRome1100()
      renderForm({ ...empty, importance: 'capital' })
      const user = userEvent.setup()
      await user.type(startYear(), '1100')
      await user.type(screen.getByRole('combobox', { name: 'Lieu' }), 'Ro')
      await user.click(await screen.findByRole('option', { name: 'Rome' }))
      await waitFor(() => {
        expect(screen.getByText(/^Rome a déjà une fiche pour vers 1100\./)).toBeTruthy()
      })
      expect(screen.getByRole('button', { name: 'Ajouter' }).hasAttribute('disabled')).toBe(true)
    })

    it('keeps Rome’s own sheet valid: it is not compared with itself', async () => {
      serverWithRome1100()
      renderForm(rome, 1)
      const user = userEvent.setup()
      const [startCirca] = screen.getAllByLabelText('Vers (année estimée)', { selector: 'input' })
      if (startCirca === undefined) throw new Error('no circa box')
      await user.click(startCirca)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Enregistrer' }).hasAttribute('disabled')).toBe(
          false
        )
      })
    })

    // CMS-391, the dev, 2026-11-08: a box, unticked by default, says whether the atlas shows the city.
    it('puts « Afficher la ville dans l’atlas » first, before the place, where it is seen', () => {
      renderForm(empty)
      const box = screen.getByRole('checkbox', { name: 'Afficher la ville dans l’atlas' })
      const place = screen.getByRole('combobox', { name: 'Lieu' })
      expect(box.compareDocumentPosition(place) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('saves Rome ticked « Afficher la ville dans l’atlas » once its box is ticked', async () => {
      const fetcher = serverWithSources()
      renderForm(rome, 1)
      const user = userEvent.setup()
      const box = screen.getByRole('checkbox', {
        name: 'Afficher la ville dans l’atlas',
      })
      expect(box).toHaveProperty('checked', false)
      await user.click(box)
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
      expect(savedBody(fetcher).showInAtlas).toBe(true)
    })

    it('chooses a reason by typing, without its accent, and saves its id as a number', async () => {
      const fetcher = serverWithSources()
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.type(screen.getByRole('combobox', { name: 'Raisons' }), 'relig')
      await user.click(await screen.findByRole('option', { name: 'Religion' }))
      expect(screen.getByRole('button', { name: 'Retirer Religion' })).toBeTruthy()
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
      expect(savedBody(fetcher).reasons).toEqual([2])
    })

    it('says where reasons are entered when the list has none yet', () => {
      renderForm(rome, 1, [])
      expect(screen.getByText(/^Aucune raison saisie encore/)).toBeTruthy()
    })

    it('removes a reason by its badge', async () => {
      renderForm({ ...rome, reasons: [1, 2] }, 1)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Retirer Pouvoir' }))
      expect(screen.queryByRole('button', { name: 'Retirer Pouvoir' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Retirer Religion' })).toBeTruthy()
    })

    it('adds a source’s line — the source searched, a population and its figure — and saves it', async () => {
      const fetcher = serverWithSources()
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Ajouter une source' }))
      expect(screen.getByRole('button', { name: 'Enregistrer' }).hasAttribute('disabled')).toBe(
        true
      )
      await user.type(screen.getByRole('combobox', { name: 'Source' }), 'Bur')
      await user.click(await screen.findByRole('option', { name: 'Buringh 2021' }))
      await user.click(screen.getByRole('button', { name: 'Sur quoi : Choisir' }))
      await user.click(await screen.findByRole('option', { name: 'Population' }))
      await user.type(screen.getByLabelText('Habitants'), '35000')
      await user.type(screen.getByLabelText('Où'), 'p. 12')
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
      expect(savedBody(fetcher).testimonies).toEqual([
        {
          source: 4,
          subject: 'population',
          population: 35000,
          importance: null,
          reason: null,
          holderName: null,
          holderQid: null,
          where: 'p. 12',
          quotation: null,
        },
      ])
    })

    // The free text is pasted, not typed key by key: this test is about what is saved, and seventy keystrokes, each one
    // re-rendering the form, took it past its 5 s on the CI's loaded runner (REPO-260, 2026-11-06 run 114510149255) —
    // whose cleanup then left its line in the next tests' page. The source's search is still typed: that is its gesture.
    it('adds a quoted line naming the holder, enters the holder, and saves both', async () => {
      const fetcher = serverWithSources()
      renderForm(rome, 1)
      const user = userEvent.setup()
      const paste = async (field: HTMLElement, text: string) => {
        await user.click(field)
        await user.paste(text)
      }
      const holder = screen.getByRole('group', { name: 'Tenue par' })
      await paste(within(holder).getByLabelText('Pays'), 'Papal States')
      await paste(within(holder).getByLabelText('Identifiant Wikidata du pays'), 'Q170174')
      await user.click(screen.getByRole('button', { name: 'Ajouter une source' }))
      const line = screen.getByRole('group', { name: 'Source 1' })
      await user.type(within(line).getByRole('combobox', { name: 'Source' }), 'Bur')
      await user.click(await screen.findByRole('option', { name: 'Buringh 2021' }))
      await user.click(within(line).getByRole('button', { name: 'Sur quoi : Choisir' }))
      await user.click(await screen.findByRole('option', { name: 'Le pays qui la tient' }))
      await paste(within(line).getByLabelText('Pays'), 'Papal States')
      await paste(within(line).getByLabelText('Citation'), 'the Patrimony of Peter')
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
      const body = savedBody(fetcher)
      expect([body.holderName, body.holderQid]).toEqual(['Papal States', 'Q170174'])
      expect(body.testimonies).toEqual([
        {
          source: 4,
          subject: 'holder',
          population: null,
          importance: null,
          reason: null,
          holderName: 'Papal States',
          holderQid: null,
          where: null,
          quotation: 'the Patrimony of Peter',
        },
      ])
    })

    it('removes a line, and the keyboard lands on the add button', async () => {
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Ajouter une source' }))
      expect(screen.getByRole('group', { name: 'Source 1' })).toBeTruthy()
      await user.click(screen.getByRole('button', { name: 'Retirer la ligne 1' }))
      expect(screen.queryByRole('group', { name: 'Source 1' })).toBeNull()
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Ajouter une source' })
      )
    })
  })

  describe('managed errors', () => {
    it('says the server’s refusal at the top, under its field, in a toast — and keeps what was typed', async () => {
      const message = 'Rome a déjà une fiche pour 1101.'
      serverAnswers(400, {
        errors: [{ message, data: { errors: [{ path: 'date.start.year', message }] } }],
      })
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.clear(startYear())
      await user.type(startYear(), '1101')
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
      expect((await screen.findAllByText(message)).length).toBe(2)
      expect(toast.error).toHaveBeenCalledWith(message)
      expect(startYear().value).toBe('1101')
      expect(console.error).toHaveBeenCalled()
    })
    it('says a failed search of the places under the field, and in the console', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
      )
      renderForm(empty)
      const user = userEvent.setup()
      await user.type(screen.getByRole('combobox', { name: 'Lieu' }), 'Ro')
      expect(
        await screen.findByText('La recherche des lieux n’a pas abouti. Réessayez dans un instant.')
      ).toBeTruthy()
      expect(console.error).toHaveBeenCalledWith(
        '[CMS] a search of the base failed',
        expect.any(TypeError)
      )
    })
    it('says when the place’s sheets could not be read: the overlap is then checked at save', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
      )
      renderForm(rome, 1)
      expect(
        await screen.findByText(/^Les fiches déjà saisies pour ce lieu n’ont pas pu être lues/)
      ).toBeTruthy()
    })
  })

  describe('unmanaged errors', () => {
    it('says a silent server in its own words, and keeps what was typed', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
      )
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.clear(startYear())
      await user.type(startYear(), '1101')
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
      expect(await screen.findByText(/^Le serveur ne répond pas/)).toBeTruthy()
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Le serveur ne répond pas'))
      expect(startYear().value).toBe('1101')
    })
    it('says an answer that is not Payload’s as a fault, not as a silence', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve(new Response('<html>500</html>', { status: 500 })))
      )
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.clear(startYear())
      await user.type(startYear(), '1101')
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('répondu de façon inattendue')
        )
      })
    })
  })

  describe('edge cases', () => {
    it('opens the new sheet at its own address once it is created', async () => {
      serverAnswers(201, { doc: { id: 7 } })
      renderForm({ ...rome, date: { start: { ...EMPTY_MOMENT, year: '' }, end: EMPTY_MOMENT } })
      const user = userEvent.setup()
      await user.type(startYear(), '1100')
      await user.click(screen.getByRole('button', { name: 'Ajouter' }))
      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith('/admin/collections/place-periods/7')
      })
    })
  })
})
