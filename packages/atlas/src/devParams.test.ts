import { describe, expect, it } from 'vitest'

import {
  findControlInconsistencies,
  findGroupingProblems,
} from '@europe-atlas/core/utils/controlSpec'

import {
  ALL_CONTROL_TABLES,
  POLITICAL_CONTROLS,
  POLITICAL_CONTROL_GROUPS,
  POLITICAL_CONTROL_ORDER,
  asGroup,
  politicalRebuildFor,
} from './devParams'

import type { PoliticalDevParams } from './devParams'
import type { ControlSpec } from '@europe-atlas/core/utils/controlSpec'

describe('devParams control tables', () => {
  describe('happy path', () => {
    it.each(ALL_CONTROL_TABLES.map((table) => [table.name, table] as const))(
      'keeps every %s default inside its own declared range',
      (_name, table) => {
        // The reason ranges live beside defaults: a value its own slider cannot reach is invisible in
        // the panel and silently clamped on the first tweak.
        expect(findControlInconsistencies(table.controls, table.defaults)).toEqual([])
      }
    )
  })

  describe('variants', () => {
    it.each(ALL_CONTROL_TABLES.map((table) => [table.name, table] as const))(
      'shows every declared %s control exactly once',
      (name, table) => {
        // A missing spec is a compile error, but a spec left out of the display order would just
        // quietly vanish from the panel — only a test catches that.
        expect(findGroupingProblems([asGroup(name, [...table.order])], table.controls)).toEqual([])
      }
    )
  })

  describe('managed errors', () => {
    it('reports a default that sits outside its range', () => {
      const controls = { speed: { kind: 'number', min: 0, max: 10, step: 1, label: 'speed' } }
      expect(findControlInconsistencies(controls, { speed: 42 })).toEqual([
        'speed: default 42 outside its range 0..10',
      ])
    })

    it('reports an inverted range and a non-positive step', () => {
      const controls = { size: { kind: 'number', min: 10, max: 1, step: 0, label: 'size' } }
      const problems = findControlInconsistencies(controls, { size: 5 })
      expect(problems).toContain('size: inverted range 10..1')
      expect(problems).toContain('size: non-positive step 0')
    })

    it('reports a slider whose default is not a number', () => {
      const controls = { size: { kind: 'number', min: 0, max: 10, step: 1, label: 'size' } }
      expect(findControlInconsistencies(controls, { size: 'big' })).toContain(
        'size: declared as a slider but the default is string'
      )
    })

    it('reports a control that no group would show', () => {
      const controls: Record<string, ControlSpec> = {
        shown: { kind: 'boolean', label: 'shown' },
        orphan: { kind: 'boolean', label: 'orphan' },
      }
      expect(findGroupingProblems([asGroup('only', ['shown'])], controls)).toEqual([
        'orphan: declared but in no group — it would not be shown',
      ])
    })

    it('reports a control listed in two groups', () => {
      const controls: Record<string, ControlSpec> = { a: { kind: 'boolean', label: 'a' } }
      const problems = findGroupingProblems(
        [asGroup('one', ['a']), asGroup('two', ['a'])],
        controls
      )
      expect(problems).toContain('a: listed in more than one group')
    })
  })

  // L4 (unmanaged errors): N/A — static declarations checked by pure functions; no I/O, no async.

  describe('edge cases', () => {
    it('accepts an empty table without inventing problems', () => {
      expect(findControlInconsistencies({}, {})).toEqual([])
      expect(findGroupingProblems([], {})).toEqual([])
    })

    it('flags an empty label, which would render as a nameless control', () => {
      const controls: Record<string, ControlSpec> = { a: { kind: 'boolean', label: '' } }
      expect(findControlInconsistencies(controls, { a: true })).toContain('a: empty label')
    })

    it('accepts a default sitting exactly on either bound', () => {
      const controls = { t: { kind: 'number', min: 0, max: 1, step: 0.1, label: 't' } }
      expect(findControlInconsistencies(controls, { t: 0 })).toEqual([])
      expect(findControlInconsistencies(controls, { t: 1 })).toEqual([])
    })
  })
})

describe('POLITICAL_CONTROL_GROUPS', () => {
  it('covers every political tunable exactly once', () => {
    // The panel renders the groups, not the flat order, so a tunable missing from them is a tunable the
    // dev can no longer reach — the same silent-inertness failure as an unwired slider.
    expect(findGroupingProblems([...POLITICAL_CONTROL_GROUPS], POLITICAL_CONTROLS)).toEqual([])
  })

  it('keeps every group small enough to read at a glance', () => {
    // The whole point of splitting was that a flat list of twenty-odd knobs is a haystack.
    for (const group of POLITICAL_CONTROL_GROUPS) expect(group.keys.length).toBeLessThanOrEqual(8)
  })
})

describe('politicalRebuildFor', () => {
  describe('happy path', () => {
    it('gives every political tunable a rebuild', () => {
      for (const key of POLITICAL_CONTROL_ORDER) {
        expect(['redraw', 'trace', 'full']).toContain(politicalRebuildFor(key))
      }
    })
  })

  describe('variants', () => {
    it('sends the year, the colouring and the grid all the way through', () => {
      // The 2026-09-16 regression in one assertion: `snapToCoast` and the palette slots were routed to a
      // rebuild that re-rasterises nothing, so they did nothing at all.
      const mustRecompute: (keyof PoliticalDevParams)[] = [
        'year',
        'snapToCoast',
        'colorBySuzerain',
        'rasterScale',
        'palette1',
        'palette2',
        'palette3',
        'palette4',
        'palette5',
        'palette6',
        'palette7',
        'palette8',
      ]
      for (const key of mustRecompute) expect(politicalRebuildFor(key)).toBe('full')
    })

    it('traces again for smoothing, which moves the line without touching the grid', () => {
      expect(politicalRebuildFor('borderSmoothing')).toBe('trace')
    })

    it('only repaints for a stroke colour or width', () => {
      for (const key of ['borderColor', 'borderWidth', 'frontierOpacity'] as const) {
        expect(politicalRebuildFor(key)).toBe('redraw')
      }
    })
  })

  // L3/L4: N/A — a total lookup over a key union; an unknown key cannot be constructed.

  describe('edge cases', () => {
    it('defaults an unlisted tunable to the full rebuild, not to doing nothing', () => {
      // The safe default is the whole point: a tunable added later must come out correct-but-slower
      // rather than silently inert, which is how two sets of sliders were lost.
      const unlisted = 'aTunableNobodyHasWrittenYet' as keyof PoliticalDevParams
      expect(politicalRebuildFor(unlisted)).toBe('full')
    })

    it('never routes a key to two different rebuilds', () => {
      const seen = new Map<string, string>()
      for (const key of POLITICAL_CONTROL_ORDER) {
        const rebuild = politicalRebuildFor(key)
        expect(seen.get(key) ?? rebuild).toBe(rebuild)
        seen.set(key, rebuild)
      }
      expect(seen.size).toBe(new Set(POLITICAL_CONTROL_ORDER).size)
    })
  })
})
