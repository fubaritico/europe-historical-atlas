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
    it('greys every command', () => {
      const [menu] = greyed([fileMenu()])

      expect(
        menu?.entries.filter((entry) => entry.kind === 'command').map((entry) => entry.enabled)
      ).toEqual([false, false])
    })
  })

  describe('variants', () => {
    it('keeps the separators and the order', () => {
      const [menu] = greyed([fileMenu()])

      expect(menu?.entries.map((entry) => entry.kind)).toEqual(['command', 'separator', 'command'])
    })
  })

  describe('managed errors', () => {
    // L3: N/A — a pure map over menus; nothing can be refused.
    it('leaves the menus it was given untouched', () => {
      const menus = [fileMenu()]

      greyed(menus)

      expect(menus[0]?.entries[0]).toMatchObject({ enabled: true })
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — no input is parsed, nothing is awaited.
    it('keeps every other field of a command', () => {
      const [menu] = greyed([fileMenu()])

      expect(menu?.entries[0]).toMatchObject({ id: 'open', label: 'Open…' })
    })
  })

  describe('edge cases', () => {
    it('no menus, no menus', () => {
      expect(greyed([])).toEqual([])
    })
  })
})
