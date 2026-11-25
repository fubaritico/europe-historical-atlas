import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { refusesGreyed } from './refusesGreyed'

import type { MenuDefinition } from '../menuBarProps'

const MENUS: MenuDefinition[] = [
  { id: 'file', label: 'File', entries: [] },
  { id: 'edit', label: 'Edit', entries: [], enabled: false },
  { id: 'view', label: 'View', entries: [], enabled: true },
]

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('refusesGreyed', () => {
  describe('happy path', () => {
    it('lets a menu open when nothing greys it', () => {
      expect([refusesGreyed(MENUS, 'file'), refusesGreyed(MENUS, 'view')]).toEqual([false, false])
    })
  })

  describe('variants', () => {
    it('refuses a menu greyed whole, said in the console', () => {
      expect(refusesGreyed(MENUS, 'edit')).toBe(true)
      expect(console.warn).toHaveBeenCalledWith(
        '[Cartographer] the menu edit is greyed: not opened'
      )
    })
  })

  // L3, L4: N/A — a reading of the menus handed in.

  describe('edge cases', () => {
    it('refuses nothing when no menu is asked — a menu closing', () => {
      expect(refusesGreyed(MENUS, null)).toBe(false)
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('lets an unknown menu through: the bar opens only menus it holds', () => {
      expect(refusesGreyed(MENUS, 'nowhere')).toBe(false)
    })
  })
})
