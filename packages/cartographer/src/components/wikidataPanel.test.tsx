import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { UNFRAMED } from '../view/viewport'

import { PolityDialog } from './PolityDialog'
import { WIKIDATA_DELAY_MS, useWikidataItem } from './useWikidataItem'
import { WikidataPanel } from './WikidataPanel'
import { wikidataViewOf } from './wikidataView'

import type { WikidataFacts } from '../wikidata/wikidataFacts'
import type { WikidataAnswer, WikidataSource } from '../wikidata/wikidataSource'

/** The County of Tripoli's facts, as read from Wikidata on 2026-10-17. */
const TRIPOLI: WikidataFacts = {
  id: 'Q272033',
  labels: { en: 'County of Tripoli', fr: 'comté de Tripoli' },
  inception: 1102,
  dissolved: 1289,
  belongsTo: ['Q55502'],
  predecessors: [],
  successors: [],
  wikipedia: { en: 'https://en.wikipedia.org/wiki/County_of_Tripoli', fr: null },
  notASubject: null,
}

/** A source answering from a table of facts, recording the ids it was asked. */
function tableSource(table: Record<string, WikidataFacts>) {
  const asked: string[][] = []
  const source: WikidataSource = {
    read: (ids) => {
      asked.push([...ids])
      const found = new Map(ids.flatMap((id) => (table[id] ? [[id, table[id]] as const] : [])))
      return Promise.resolve<WikidataAnswer>({ found, unknown: ids.filter((id) => !table[id]) })
    },
  }
  return { source, asked }
}

/** An empty form. */
const EMPTY = { name: '', existsFrom: '', existsTo: '', suzerain: null }

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('wikidataViewOf', () => {
  it('adds the anachronism and the suggestions to an item found', () => {
    const view = wikidataViewOf({ kind: 'found', facts: TRIPOLI }, EMPTY, 1100, [
      { id: 'jerusalem', name: 'Kingdom of Jerusalem', wikidata: 'Q55502' },
    ])
    expect(view.kind === 'found' && view.warning).toBe(
      'Wikidata: County of Tripoli 1102–1289 — does not exist yet in 1100'
    )
    expect(view.kind === 'found' && view.suggestions.map((s) => s.field)).toEqual([
      'name',
      'existsFrom',
      'existsTo',
      'suzerain',
    ])
  })

  it('offers nothing and warns of nothing for a Wikipedia category but what it is', () => {
    const view = wikidataViewOf(
      { kind: 'found', facts: { ...TRIPOLI, notASubject: 'a Wikipedia category' } },
      EMPTY,
      1100,
      []
    )
    expect(view).toMatchObject({ kind: 'found', warning: null, suggestions: [] })
  })

  it('passes every other state through', () => {
    expect(wikidataViewOf({ kind: 'reading', id: 'Q1' }, EMPTY, 1100, [])).toEqual({
      kind: 'reading',
      id: 'Q1',
    })
  })
})

describe('useWikidataItem', () => {
  describe('happy path', () => {
    it('reads the item a moment after the id is typed', async () => {
      vi.useFakeTimers()
      const { source } = tableSource({ Q272033: TRIPOLI })
      const { result } = renderHook(() => useWikidataItem(source, 'Q272033'))

      expect(result.current).toEqual({ kind: 'reading', id: 'Q272033' })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(WIKIDATA_DELAY_MS)
      })

      expect(result.current).toEqual({ kind: 'found', facts: TRIPOLI })
    })
  })

  describe('variants', () => {
    it('reads nothing while the field does not hold an id', () => {
      const { source, asked } = tableSource({})
      const { result } = renderHook(() => useWikidataItem(source, 'Tripoli'))

      expect(result.current).toEqual({ kind: 'none' })
      expect(asked).toEqual([])
    })

    it('says an id Wikidata does not know', async () => {
      vi.useFakeTimers()
      const { source } = tableSource({})
      const { result } = renderHook(() => useWikidataItem(source, 'Q9'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(WIKIDATA_DELAY_MS)
      })

      expect(result.current).toEqual({ kind: 'unknown', id: 'Q9' })
    })
  })

  describe('managed errors', () => {
    it('says Wikidata did not answer, and logs it, rather than blocking', async () => {
      vi.useFakeTimers()
      const source: WikidataSource = { read: () => Promise.reject(new Error('Failed to fetch')) }
      const { result } = renderHook(() => useWikidataItem(source, 'Q1'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(WIKIDATA_DELAY_MS)
      })

      expect(result.current).toEqual({ kind: 'failed', id: 'Q1', reason: 'Failed to fetch' })
      expect(console.warn).toHaveBeenCalledTimes(1)
    })
  })

  // L4: the source rejecting a non-Error is read with String() — covered by the managed case's path.

  describe('edge cases', () => {
    it('reads only the last id typed, a keystroke restarting the wait', async () => {
      vi.useFakeTimers()
      const { source, asked } = tableSource({ Q272033: TRIPOLI })
      const { result, rerender } = renderHook(({ typed }) => useWikidataItem(source, typed), {
        initialProps: { typed: 'Q2720' },
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(WIKIDATA_DELAY_MS / 2)
      })
      rerender({ typed: 'Q272033' })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(WIKIDATA_DELAY_MS)
      })

      expect(asked).toEqual([['Q272033']])
      expect(result.current).toEqual({ kind: 'found', facts: TRIPOLI })
    })

    it('never lets an answer for an older id stand for the new one', async () => {
      // The trap: a slow reply landing after the id changed.
      vi.useFakeTimers()
      let release: () => void = () => undefined
      const source: WikidataSource = {
        read: (ids) =>
          ids[0] === 'Q1'
            ? new Promise((resolve) => {
                release = () => {
                  resolve({ found: new Map([['Q1', { ...TRIPOLI, id: 'Q1' }]]), unknown: [] })
                }
              })
            : Promise.resolve({ found: new Map(), unknown: ids.slice() }),
      }
      const { result, rerender } = renderHook(({ typed }) => useWikidataItem(source, typed), {
        initialProps: { typed: 'Q1' },
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(WIKIDATA_DELAY_MS)
      })
      rerender({ typed: 'Q2' })
      // Q2 is answered first; the slow reply for Q1 lands after it.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(WIKIDATA_DELAY_MS)
      })
      await act(async () => {
        release()
        await Promise.resolve()
      })

      expect(result.current).toEqual({ kind: 'unknown', id: 'Q2' })
    })
  })
})

describe('WikidataPanel', () => {
  it('shows nothing while no id is typed', () => {
    const { container } = render(<WikidataPanel view={{ kind: 'none' }} onUse={() => undefined} />)
    expect(container.textContent).toBe('')
  })

  it('says what a category is, instead of offering anything', () => {
    render(
      <WikidataPanel
        view={{
          kind: 'found',
          facts: { ...TRIPOLI, id: 'Q25167513', notASubject: 'a Wikipedia category' },
          warning: null,
          suggestions: [],
        }}
        onUse={() => undefined}
      />
    )
    expect(
      screen.getByText('Q25167513 is a Wikipedia category, not a polity — check the id')
    ).toBeTruthy()
  })

  it('offers Use for an empty field, Replace for a different one, and an inert Agrees for one that agrees', async () => {
    const onUse = vi.fn()
    render(
      <WikidataPanel
        view={{
          kind: 'found',
          facts: TRIPOLI,
          warning: null,
          suggestions: [
            { field: 'existsFrom', value: '1102', shown: '1102', state: 'empty' },
            {
              field: 'name',
              value: 'County of Tripoli',
              shown: 'County of Tripoli',
              state: 'differs',
            },
            { field: 'existsTo', value: '1289', shown: '1289', state: 'same' },
          ],
        }}
        onUse={onUse}
      />
    )
    expect(screen.getByRole('button', { name: 'Use 1102 for Exists from' }).textContent).toBe('Use')
    expect(
      screen.getByRole('button', { name: 'Replace County of Tripoli for Name' }).textContent
    ).toBe('Replace')
    // Review A11Y-008: a field that agrees keeps its button, inert, so focus is never pulled from under it.
    const agrees = screen.getByRole('button', { name: 'Agrees 1289 for Exists to' })
    expect(agrees.getAttribute('aria-disabled')).toBe('true')
    await userEvent.setup().click(agrees)
    expect(onUse).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Use 1102 for Exists from' }))
    expect(onUse).toHaveBeenCalledWith('existsFrom', '1102')
  })
})

describe('WikidataPanel — the live region (review A11Y-010)', () => {
  it('is always there, empty while there is nothing to say', () => {
    render(<WikidataPanel view={{ kind: 'none' }} onUse={() => undefined} />)
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('says it is reading, then that Wikidata does not know an id', () => {
    const { rerender } = render(
      <WikidataPanel view={{ kind: 'reading', id: 'Q9' }} onUse={() => undefined} />
    )
    expect(screen.getByRole('status').textContent).toBe('Reading Q9 on Wikidata…')
    rerender(<WikidataPanel view={{ kind: 'unknown', id: 'Q9' }} onUse={() => undefined} />)
    expect(screen.getByRole('status').textContent).toBe('Wikidata does not know Q9')
  })

  it('holds the warning but neither the links nor the buttons', () => {
    render(
      <WikidataPanel
        view={{
          kind: 'found',
          facts: TRIPOLI,
          warning: 'Wikidata: County of Tripoli 1102–1289 — does not exist yet in 1100',
          suggestions: [{ field: 'existsFrom', value: '1102', shown: '1102', state: 'empty' }],
        }}
        onUse={() => undefined}
      />
    )
    const status = screen.getByRole('status')
    expect(status.textContent).toBe(
      'Wikidata: County of Tripoli 1102–1289 — does not exist yet in 1100'
    )
    expect(status.querySelector('a, button')).toBeNull()
  })
})

describe('PolityDialog with Wikidata (CARTO-243)', () => {
  it('keeps the form working when Wikidata does not answer, and says so', async () => {
    // Review QUAL-001: the ticket's third acceptance case, through the whole dialogue.
    const store = createCartographerStore({
      edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
      viewport: { viewport: UNFRAMED },
    })
    const failing: WikidataSource = { read: () => Promise.reject(new Error('Failed to fetch')) }
    render(
      <PolityDialog
        store={store}
        editing={null}
        isOpen
        onClose={() => undefined}
        wikidata={failing}
      />
    )
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Wikidata id'), 'Q1')
    expect(
      await screen.findByText(
        'Wikidata did not answer (Failed to fetch) — the form works without it'
      )
    ).toBeTruthy()
    await user.type(screen.getByLabelText('Name'), 'County of Tripoli')
    await user.click(screen.getByRole('button', { name: 'OK' }))

    expect(store.getState().document.polities.map((polity) => polity.name)).toEqual([
      'County of Tripoli',
    ])
  })

  it('warns that Tripoli does not exist yet in 1100, and fills a year only on the author’s click', async () => {
    const store = createCartographerStore({
      edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
      viewport: { viewport: UNFRAMED },
    })
    const { source } = tableSource({ Q272033: TRIPOLI })
    render(
      <PolityDialog
        store={store}
        editing={null}
        isOpen
        onClose={() => undefined}
        wikidata={source}
      />
    )
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Wikidata id'), 'Q272033')
    expect(
      await screen.findByText('Wikidata: County of Tripoli 1102–1289 — does not exist yet in 1100')
    ).toBeTruthy()
    const from = screen.getByLabelText<HTMLInputElement>('Exists from')
    expect(from.value).toBe('')

    await user.click(screen.getByRole('button', { name: 'Use 1102 for Exists from' }))

    expect(from.value).toBe('1102')
  })
})
