import { describe, expect, it } from 'vitest'

import { ALL_CONTROL_TABLES, asGroup } from './devParams'
import { findControlInconsistencies, findGroupingProblems } from './utils/controlSpec'

import type { ControlSpec } from './utils/controlSpec'

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
