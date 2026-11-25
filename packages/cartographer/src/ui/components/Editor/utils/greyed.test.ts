import { describe, expect, it } from 'vitest'

import { greyed } from './greyed'

import type { MenuDefinition } from '../../MenuBar'

const choose = () => undefined

/**
 * A menu of two commands around a separator.
 * @returns the menu
 */
function fileMenu(): MenuDefinition {
  return {
    id: 'file',
    label: 'File',
    entries: [
      { kind: 'command', id: 'open', label: 'Open…', keys: null, enabled: true, onChoose: choose },
      { kind: 'separator', id: 'sep' },
      { kind: 'command', id: 'save', label: 'Save', keys: null, enabled: false, onChoose: choose },
    ],
  }
}

describe('greyed', () => {
  describe('happy path', () => {
    it('greys each menu whole (CARTO-555)', () => {
      expect(
        greyed([fileMenu(), { ...fileMenu(), id: 'edit' }]).map((menu) => menu.enabled)
      ).toEqual([false, false])
    })
  })

  describe('variants', () => {
    it('keeps its title, its lines and their order', () => {
      const [menu] = greyed([fileMenu()])

      expect([menu?.label, menu?.entries.map((entry) => entry.kind)]).toEqual([
        'File',
        ['command', 'separator', 'command'],
      ])
    })
  })

  describe('managed errors', () => {
    // L3: N/A — a pure map over menus; nothing can be refused.
    it('leaves the menus it was given untouched', () => {
      const menus = [fileMenu()]

      greyed(menus)

      expect(menus[0]?.enabled).toBeUndefined()
    })
  })

  // L4: N/A — no input is parsed, nothing is awaited.

  describe('edge cases', () => {
    it('no menus, no menus', () => {
      expect(greyed([])).toEqual([])
    })
  })
})
