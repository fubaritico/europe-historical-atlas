import { describe, expect, it } from 'vitest'

import chrome from './editor-chrome.css?raw'
import { sheetRule } from './sheetRule'

const rule = (selector: string): string => sheetRule(chrome, 'editor-chrome.css', selector)

// jsdom has no cascade of layers, so the computed height cannot be read here: the sheet is read as text,
// and the real height was measured in the browser (2026-10-14: 240px before, the dock's height after).
describe('editor-chrome.css — the {Polities} list', () => {
  describe('happy path', () => {
    it('lifts the design system cap of 240px on a listbox', () => {
      expect(rule('.ui-listbox.polities__list')).toContain('--ui-listbox-max-block-size: none;')
    })
  })

  describe('variants', () => {
    it('grows to the dock height and scrolls inside it', () => {
      const list = rule('.ui-listbox.polities__list')
      expect(list).toContain('flex: 1 1 auto;')
      expect(list).toContain('min-height: 0;')
      expect(list).toContain('overflow-y: auto;')
    })

    // Measured on 1100 (137 polities): without it, 46 absolute « vassal of » spans escaped the scroller and
    // the document scrolled to 3 236px in a 903px window.
    it('is positioned, so the absolute visually-hidden spans of its rows stay clipped inside it', () => {
      expect(rule('.visually-hidden')).toContain('position: absolute;')
      expect(rule('.ui-listbox.polities__list')).toContain('position: relative;')
    })
  })

  describe('managed errors', () => {
    it('names a selector the sheet does not hold', () => {
      expect(() => rule('.no-such-rule')).toThrow('.no-such-rule is not in editor-chrome.css')
    })
  })

  // L4: N/A — a static sheet read at build time, nothing asynchronous or optional.
  // L5: N/A — one rule, no boundary.
})
