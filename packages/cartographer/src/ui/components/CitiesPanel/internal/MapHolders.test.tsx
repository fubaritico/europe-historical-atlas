import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { MapHolders } from './MapHolders'

import type { HolderChoices, MapHolderChoice } from '../utils/holderChoices'

const FRANCE: MapHolderChoice = {
  id: 'france',
  name: 'Royaume de France',
  depth: 0,
  colour: '#3a6ea5',
  key: 'wd:Q70972',
  count: 12,
}
const CHAMPAGNE: MapHolderChoice = {
  id: 'champagne',
  name: 'Comté de Champagne',
  depth: 1,
  colour: null,
  key: null,
  count: 0,
}

/**
 * The section over the two polities, France ticked or not, under a filter or none.
 * @param ticked - the holders ticked
 * @param query - what is typed in the dialogue's filter
 * @returns the callback a box reports to
 */
function mount(ticked: readonly string[] = [], query = '') {
  const onTickHolders = vi.fn()
  const choices: HolderChoices = {
    onMap: [FRANCE, CHAMPAGNE],
    offMap: [],
    noHolder: 0,
    keys: new Set(['wd:Q70972', 'none']),
  }
  renderInEnglish(
    <MapHolders
      choices={choices}
      query={query}
      ticked={new Set(ticked)}
      onTickHolders={onTickHolders}
    />
  )
  return onTickHolders
}

/**
 * The row of a box, by the box's name.
 * @param name - the box's accessible name
 * @returns its row
 */
function rowOf(name: string): HTMLElement {
  const row = screen.getByRole('checkbox', { name }).closest('li')
  if (row === null) throw new Error(`no row for ${name}`)
  return row
}

const swatch = (name: string) => rowOf(name).querySelector('.polity-row__swatch')

// CARTO-370, `s20`: the polities of the map as {Polities} lists them — swatch, tree, count; greyed without an id.
describe('MapHolders', () => {
  describe('happy path', () => {
    // Champagne has no Wikidata id: France's box stands for France's key alone (CARTO-388).
    it('reports France ticked when its box is clicked', async () => {
      const onTickHolders = mount()
      await userEvent
        .setup()
        .click(screen.getByRole('checkbox', { name: 'Royaume de France (12)' }))
      expect(onTickHolders).toHaveBeenCalledWith(['wd:Q70972'], true)
    })
  })

  describe('variants', () => {
    it('reports France unticked when it was ticked', async () => {
      const onTickHolders = mount(['wd:Q70972'])
      await userEvent
        .setup()
        .click(screen.getByRole('checkbox', { name: 'Royaume de France (12)' }))
      expect(onTickHolders).toHaveBeenCalledWith(['wd:Q70972'], false)
    })

    it('indents the Champagne one step under France, as the tree of {Polities}', () => {
      mount()
      expect([
        rowOf('Royaume de France (12)').style.getPropertyValue('--polity-depth'),
        rowOf('Comté de Champagne — no Wikidata id').style.getPropertyValue('--polity-depth'),
      ]).toEqual(['0', '1'])
    })
  })

  // L3–L4: N/A — a view over values.

  describe('edge cases', () => {
    // The dev, 2026-11-07: the dialogue's filter, as {Polities}' — a vassal found under its suzerain, greyed.
    it('keeps France, greyed, above the Champagne found by « champ »', () => {
      mount([], 'champ')
      expect([
        rowOf('Royaume de France (12)').getAttribute('data-dimmed'),
        rowOf('Comté de Champagne — no Wikidata id').getAttribute('data-dimmed'),
      ]).toEqual(['true', 'false'])
    })

    it('says no country answers « kiev », in place of the list', () => {
      mount([], 'kiev')
      expect(screen.queryAllByRole('checkbox')).toEqual([])
      expect(screen.getByText('No country answers “kiev”.')).toBeTruthy()
    })

    it("paints France's swatch in its colour, and strikes the Champagne's, which has none", () => {
      mount()
      expect([
        swatch('Royaume de France (12)')?.getAttribute('data-empty'),
        swatch('Comté de Champagne — no Wikidata id')?.getAttribute('data-empty'),
      ]).toEqual(['false', 'true'])
    })

    it('greys the Champagne, which has no Wikidata id: its box cannot be ticked', () => {
      mount()
      expect(
        screen
          .getByRole('checkbox', { name: 'Comté de Champagne — no Wikidata id' })
          .hasAttribute('disabled')
      ).toBe(true)
    })
  })
})
