import { describe, expect, it } from 'vitest'

import { filterRows } from './filterRows'

import type { PolityRow } from '../../../utils/polityRows'

/** A row of the tree, at its depth. */
function row(name: string, depth: number): PolityRow {
  return {
    id: name.toLowerCase(),
    name,
    rank: '',
    dates: '',
    colour: '#888888',
    hasTerritory: true,
    depth,
    suzerainName: null,
  }
}

/** France with two vassals, one of them with its own; then Poland, alone. */
const TREE = [
  row('France', 0),
  row('Champagne', 1),
  row('Normandie', 1),
  row('Bayeux', 2),
  row('Pologne', 0),
]

/** The names of the rows kept. */
function names(query: string): string[] {
  return filterRows(TREE, query).rows.map(({ name }) => name)
}

describe('filterRows', () => {
  describe('happy path', () => {
    it('keeps a polity at the top that answers, alone', () => {
      expect(names('pologne')).toEqual(['Pologne'])
    })

    it('keeps a vassal with its suzerain above it, greyed', () => {
      const filtered = filterRows(TREE, 'champ')

      expect(filtered.rows.map(({ name }) => name)).toEqual(['France', 'Champagne'])
      expect([...filtered.dimmed]).toEqual(['france'])
      expect(filtered.found).toBe(1)
    })
  })

  describe('variants', () => {
    it('keeps the whole chain above a vassal of a vassal', () => {
      expect(names('bayeux')).toEqual(['France', 'Normandie', 'Bayeux'])
    })

    it('does not grey a suzerain that answers itself', () => {
      const filtered = filterRows(TREE, 'n')

      expect(filtered.rows.map(({ name }) => name)).toEqual([
        'France',
        'Champagne',
        'Normandie',
        'Pologne',
      ])
      expect(filtered.dimmed.size).toBe(0)
      expect(filtered.found).toBe(4)
    })

    it('keeps a suzerain found without its vassals', () => {
      expect(names('france')).toEqual(['France'])
    })

    it('does not carry a chain over to the next polity at the top', () => {
      expect(names('pol')).toEqual(['Pologne'])
    })
  })

  // L3–L4: N/A — rows and a string in, rows out; nothing is read, nothing can fail.

  describe('edge cases', () => {
    it('keeps every row and greys none for an empty filter', () => {
      const filtered = filterRows(TREE, '')

      expect(filtered.rows).toEqual(TREE)
      expect(filtered.dimmed.size).toBe(0)
      expect(filtered.found).toBe(5)
    })

    it('keeps nothing when no name answers', () => {
      expect(filterRows(TREE, 'kiev')).toEqual({ rows: [], dimmed: new Set(), found: 0 })
    })

    it('drops a sibling’s vassals from the chain when the tree climbs back', () => {
      // Bayeux sits under Normandie; Champagne, before them, must not stand above Bayeux.
      expect(names('bay')).not.toContain('Champagne')
    })
  })
})
