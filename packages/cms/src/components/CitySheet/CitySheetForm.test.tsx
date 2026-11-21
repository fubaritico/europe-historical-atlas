// @vitest-environment jsdom
import '../../testing/popoverStandIn'
import '../../testing/resizeObserverStandIn'

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RelationshipInputStandIn } from '../../testing/relationshipInputStandIn'

import { CitySheetForm } from './CitySheetForm'
import { EMPTY_MOMENT } from './utils/sheetValues'

import type { SheetValues } from './utils/sheetValues'

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@payloadcms/ui', () => ({ toast, RelationshipInput: RelationshipInputStandIn }))

/** The CMS's reasons, as the server reads them. */
const REASONS = [
  { id: 1, name: 'Pouvoir' },
  { id: 2, name: 'Religion' },
]

/** The CMS's confessions, as the server reads them (CMS-433). */
const CONFESSIONS = [
  { id: 8, name: 'Catholique' },
  { id: 9, name: 'Juive' },
]

/** Rome in 1100, a capital — the sheet the dev's base holds. */
const rome: SheetValues = {
  place: { id: 5, name: 'Rome' },
  date: { start: { ...EMPTY_MOMENT, year: '1100' }, end: EMPTY_MOMENT },
  importance: 'capital',
  reasons: [],
  testimonies: [],
  holderTitle: null,
  periodName: null,
  holderName: '',
  holderQid: '',
  communities: [],
  showInAtlas: false,
}

/** A new sheet. */
const empty: SheetValues = {
  place: null,
  date: { start: EMPTY_MOMENT, end: EMPTY_MOMENT },
  importance: '',
  reasons: [],
  testimonies: [],
  holderTitle: null,
  periodName: null,
  holderName: '',
  holderQid: '',
  communities: [],
  showInAtlas: false,
}

/**
 * The form, in French, on an existing sheet or a new one.
 * @param values - its values
 * @param id - its id, absent for a new one
 * @param reasons - the CMS's reasons, its two by default
 * @param confessions - the CMS's confessions, its two by default
 * @returns the rendered form
 */
function renderForm(
  values: SheetValues,
  id?: number,
  reasons: typeof REASONS = REASONS,
  confessions: typeof CONFESSIONS = CONFESSIONS
) {
  return render(
    <CitySheetForm
      initialValues={values}
      {...(id === undefined ? {} : { id })}
      locale="fr"
      contentLocale="fr"
      api="/api"
      admin="/admin"
      lists={{ reasons, confessions }}
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
    // The dev, 2026-11-16: the button is always there to click, and says what is wrong rather than staying grey
    it('opens Rome with its place and its year, and says « nothing to save » when nothing changed', async () => {
      renderForm(rome, 1)
      expect(screen.getByText('Rome')).toBeTruthy()
      expect(startYear().value).toBe('1100')
      await userEvent.setup().click(screen.getByRole('button', { name: 'Enregistrer' }))
      expect(await screen.findByText('Rien à enregistrer : rien n’a changé.')).toBeTruthy()
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
    // CMS-422: the holder chosen in Payload's own field, saved by its id.
    it('saves the title chosen in « Personnage et titre » by its id', async () => {
      const fetcher = serverWithSources()
      renderForm(rome, 1)
      const user = userEvent.setup()
      const holder = screen.getByRole('group', { name: 'Tenue par' })
      await user.type(within(holder).getByLabelText('Personnage et titre'), '12')
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
      expect(savedBody(fetcher).holderTitle).toBe(12)
    })

    // CMS-495: the name the place bore at the sheet's date, chosen in Payload's own field, saved by its id.
    it('saves the name chosen in « Nom d’époque » by its id', async () => {
      const fetcher = serverWithSources()
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Nom d’époque'), '7')
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
      expect(savedBody(fetcher).periodName).toBe(7)
    })

    it('offers the names of the sheet’s place only, and every title to the holder', () => {
      renderForm(rome, 1)
      expect(screen.getByLabelText('Nom d’époque').dataset.filter).toBe(
        JSON.stringify({ 'period-names': { place: { equals: 5 } } })
      )
      expect(screen.getByLabelText('Personnage et titre').dataset.filter).toBe('null')
    })

    it('keeps the name a saved sheet opens with', () => {
      renderForm({ ...rome, periodName: 7 }, 1)
      expect(screen.getByLabelText<HTMLInputElement>('Nom d’époque').value).toBe('7')
    })

    it('asks for the place first on a new sheet, in the name’s stead', () => {
      renderForm(empty)
      expect(screen.queryByLabelText('Nom d’époque')).toBeNull()
      expect(
        screen.getByText(
          'Choisissez d’abord le lieu : les noms d’époque proposés sont ceux de ce lieu.'
        )
      ).toBeTruthy()
    })

    it('empties the name once the place is removed: a name is a name of one place', async () => {
      serverWithRome1100()
      renderForm({ ...rome, periodName: 7 }, 1)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Retirer Rome' }))
      expect(screen.queryByLabelText('Nom d’époque')).toBeNull()
      await user.type(screen.getByRole('combobox', { name: 'Lieu' }), 'Ro')
      await user.click(await screen.findByRole('option', { name: 'Rome' }))
      expect((await screen.findByLabelText<HTMLInputElement>('Nom d’époque')).value).toBe('')
    })

    // CMS-422 step 2c: the holder as a title, its chain computed from the links and read under it.
    it('shows the chain of the holder’s title at the sheet’s year, up to a sovereign', async () => {
      const span = { start: { year: 1084 }, end: { year: 1103 } }
      const fetcher = vi.fn<typeof fetch>((input) => {
        const url = input as string
        const json = url.startsWith('/api/vassal-links?')
          ? {
              docs: [
                { id: 1, vassal: 10, answersTo: 'suzerain', suzerain: 20, date: span },
                { id: 2, vassal: 20, answersTo: 'no-one', suzerain: null, date: span },
              ],
            }
          : url.startsWith('/api/titles?')
            ? {
                docs: [
                  { id: 10, label: 'Mathias II — comté de Nantes' },
                  { id: 20, label: 'Alain IV — duché de Bretagne' },
                ],
              }
            : { docs: [] }
        return Promise.resolve(new Response(JSON.stringify(json), { status: 200 }))
      })
      vi.stubGlobal('fetch', fetcher)
      renderForm({ ...rome, holderTitle: 10 }, 1)
      expect(await screen.findByText('Chaîne de vassalité en 1100')).toBeTruthy()
      expect(
        screen.getByText('Mathias II — comté de Nantes → Alain IV — duché de Bretagne', {
          exact: false,
        })
      ).toBeTruthy()
      expect(screen.getByText('— souverain', { exact: false })).toBeTruthy()
    })

    it('opens a new sheet with no error before anything is touched, and says them all at « Ajouter »', async () => {
      renderForm(empty)
      expect(screen.queryByText('Il faut au moins une année.')).toBeNull()
      expect(screen.queryByText('Choisissez un lieu.')).toBeNull()
      await userEvent.setup().click(screen.getByRole('button', { name: 'Ajouter' }))
      expect(
        await screen.findByText(
          'Rien n’est enregistré : des champs sont à corriger, voyez les messages en rouge.'
        )
      ).toBeTruthy()
      expect(screen.getByText('Choisissez un lieu.')).toBeTruthy()
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
    it('refuses a year the place already has a sheet for while it is typed — the sentence under the year, and at « Ajouter »', async () => {
      serverWithRome1100()
      renderForm({ ...empty, importance: 'capital' })
      const user = userEvent.setup()
      await user.type(screen.getByRole('combobox', { name: 'Lieu' }), 'Ro')
      await user.click(await screen.findByRole('option', { name: 'Rome' }))
      await user.type(startYear(), '1100')
      await user.tab()
      expect(await screen.findByText(/^Rome a déjà une fiche pour vers 1100\./)).toBeTruthy()
      await user.click(screen.getByRole('button', { name: 'Ajouter' }))
      expect(
        await screen.findByText(
          'Rien n’est enregistré : des champs sont à corriger, voyez les messages en rouge.'
        )
      ).toBeTruthy()
      await user.clear(startYear())
      await user.type(startYear(), '1101')
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Ajouter' }).hasAttribute('disabled')).toBe(false)
      })
    })

    it('refuses the year once the place is chosen after it: the sheets read run the check again', async () => {
      serverWithRome1100()
      renderForm({ ...empty, importance: 'capital' })
      const user = userEvent.setup()
      await user.type(startYear(), '1100')
      await user.type(screen.getByRole('combobox', { name: 'Lieu' }), 'Ro')
      await user.click(await screen.findByRole('option', { name: 'Rome' }))
      await waitFor(() => {
        expect(screen.getByText(/^Rome a déjà une fiche pour vers 1100\./)).toBeTruthy()
      })
      await user.click(screen.getByRole('button', { name: 'Ajouter' }))
      expect(
        await screen.findByText(
          'Rien n’est enregistré : des champs sont à corriger, voyez les messages en rouge.'
        )
      ).toBeTruthy()
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
      await user.type(screen.getByLabelText('Source'), '4')
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
          confession: null,
          holderName: null,
          holderQid: null,
          holderAsWritten: null,
          where: 'p. 12',
          quotation: null,
        },
      ])
    })

    // The free text is pasted, not typed key by key: this test is about what is saved, and seventy keystrokes, each one
    // re-rendering the form, took it past its 5 s on the CI's loaded runner (REPO-260, 2026-11-06 run 114510149255) —
    // whose cleanup then left its line in the next tests' page. The source's search is still typed: that is its gesture.
    // CMS-422: the polity typed by name is off the screen, and kept in the base for the export.
    it('adds a quoted line naming the holder, and saves it with the polity typed before kept', async () => {
      const fetcher = serverWithSources()
      renderForm({ ...rome, holderName: 'Papal States', holderQid: 'Q170174' }, 1)
      const user = userEvent.setup()
      const paste = async (field: HTMLElement, text: string) => {
        await user.click(field)
        await user.paste(text)
      }
      const holder = screen.getByRole('group', { name: 'Tenue par' })
      expect(within(holder).queryByLabelText('Pays')).toBeNull()
      await user.click(screen.getByRole('button', { name: 'Ajouter une source' }))
      const line = screen.getByRole('group', { name: 'Source 1' })
      await user.type(within(line).getByLabelText('Source'), '4')
      await user.click(within(line).getByRole('button', { name: 'Sur quoi : Choisir' }))
      await user.click(await screen.findByRole('option', { name: 'Le pays qui la tient' }))
      await paste(within(line).getByLabelText('Pays'), 'Papal States')
      await paste(within(line).getByLabelText('Nom dans la source'), 'Patrimonium Petri')
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
          confession: null,
          holderName: 'Papal States',
          holderQid: null,
          holderAsWritten: 'Patrimonium Petri',
          where: null,
          quotation: 'the Patrimony of Peter',
        },
      ])
    })

    // CMS-433: a community is saved only with a line of the sources naming its confession; its weight supposed until
    // ticked attested.
    it('adds a community, refuses it until a line names it, then saves both', async () => {
      const fetcher = serverWithSources()
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Ajouter une communauté' }))
      const community = screen.getByRole('group', { name: 'Communauté 1' })
      await user.click(
        within(community).getByRole('button', { name: 'Confession : Choisir une confession' })
      )
      await user.click(await screen.findByRole('option', { name: 'Juive' }))
      await user.click(within(community).getByRole('button', { name: 'Poids : Choisir un poids' }))
      await user.click(await screen.findByRole('option', { name: 'Dominante' }))
      await user.click(within(community).getByLabelText('Poids attesté par une source'))
      expect(
        await within(community).findByText(/une ligne « Une communauté » qui cite cette confession/)
      ).toBeTruthy()
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
      expect(
        await screen.findByText(
          'Rien n’est enregistré : des champs sont à corriger, voyez les messages en rouge.'
        )
      ).toBeTruthy()
      await user.click(screen.getByRole('button', { name: 'Ajouter une source' }))
      const line = screen.getByRole('group', { name: 'Source 1' })
      await user.type(within(line).getByLabelText('Source'), '4')
      await user.click(within(line).getByRole('button', { name: 'Sur quoi : Choisir' }))
      await user.click(await screen.findByRole('option', { name: 'Une communauté' }))
      await user.click(
        within(line).getByRole('button', { name: 'Confession : Choisir une confession' })
      )
      await user.click(await screen.findByRole('option', { name: 'Juive' }))
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
      const body = savedBody(fetcher)
      expect(body.communities).toEqual([
        { confession: 9, weight: 'dominant', weightAttested: true },
      ])
      expect(body.testimonies).toMatchObject([{ source: 4, subject: 'community', confession: 9 }])
    })

    it('removes a community, and the keyboard lands on its add button', async () => {
      renderForm(rome, 1)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Ajouter une communauté' }))
      await user.click(screen.getByRole('button', { name: 'Retirer la communauté 1' }))
      expect(screen.queryByRole('group', { name: 'Communauté 1' })).toBeNull()
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Ajouter une communauté' })
      )
    })

    it('says where the confessions are entered when the list is still empty', () => {
      renderForm(rome, 1, REASONS, [])
      expect(screen.getByText(/Aucune confession saisie encore/)).toBeTruthy()
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
