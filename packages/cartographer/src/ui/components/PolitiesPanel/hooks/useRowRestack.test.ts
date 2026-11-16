import { act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'

import { openEmptyYear } from '../../../../state/openEmptyYear'
import { createCartographerStore } from '../../../../state/store'
import { UNFRAMED } from '../../../../viewport/viewport'
import { renderHookInEnglish } from '../../../testing/renderInEnglish'

import { useRowRestack } from './useRowRestack'

import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

const STEP = { kind: 'create-polity', label: 'create polity' }

/**
 * A polity owing a suzerain, or nobody.
 * @param id - its id, its name too
 * @param suzerain - whom it owes
 * @returns the polity
 */
function polity(id: string, suzerain: string | null = null): YearPolity {
  return {
    id,
    name: id,
    rank: null,
    status: null,
    suzerain,
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  }
}

/**
 * The drop's handler over a year holding France and two of its vassals, then the Empire.
 * @returns the store, the handler and what the result zone was told
 */
function setUp() {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  for (const each of [
    polity('France'),
    polity('Anjou', 'France'),
    polity('Blois', 'France'),
    polity('Empire'),
  ])
    store.getState().createPolity(each, STEP)
  const onResult = vi.fn()
  const { result } = renderHookInEnglish(() => useRowRestack(store, onResult))
  const ids = () => store.getState().document.polities.map((each) => each.id)
  return { store, drop: result.current, onResult, ids }
}

afterEach(() => {
  vi.restoreAllMocks()
})

// CARTO-457, the dev, 2026-11-16: « c'est un déplacement entre siblings, il faut pas plus que ça »
describe('useRowRestack', () => {
  describe('happy path', () => {
    it('puts Anjou in front of Blois, says so, and ctrl+Z takes it back in one step', () => {
      const { store, drop, onResult, ids } = setUp()
      act(() => {
        drop('Anjou', 'Blois', 'front')
      })
      expect(ids()).toEqual(['France', 'Blois', 'Anjou', 'Empire'])
      expect(onResult).toHaveBeenLastCalledWith('Anjou put in front of Blois · ctrl+Z undoes it')
      act(() => {
        store.getState().undo()
      })
      expect(ids()).toEqual(['France', 'Anjou', 'Blois', 'Empire'])
    })
  })

  describe('managed errors', () => {
    it('refuses Anjou dropped beside the Empire — not its sibling — and says why', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { drop, onResult, ids } = setUp()
      act(() => {
        drop('Anjou', 'Empire', 'front')
      })
      expect(ids()).toEqual(['France', 'Anjou', 'Blois', 'Empire'])
      expect(onResult).toHaveBeenLastCalledWith(
        'nothing moved: Anjou is ranged among its siblings, and Empire owes another suzerain'
      )
    })
  })

  // L4: N/A — the store refuses nothing a sibling drop sends it; core's restackBeside is tested beside it

  describe('edge cases', () => {
    it('says nothing moved when Anjou is dropped where it already stands', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { drop, onResult } = setUp()
      act(() => {
        drop('Anjou', 'Blois', 'back')
      })
      expect(onResult).toHaveBeenLastCalledWith('nothing moved: Anjou already stands there')
    })
  })
})
