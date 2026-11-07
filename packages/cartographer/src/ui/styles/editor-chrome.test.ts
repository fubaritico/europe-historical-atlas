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

  describe('edge cases', () => {
    // Measured on 1100 (137 polities, 2026-10-14): the head was squeezed to 14px against the others' 24.
    it('never lets the list squeeze the panel head or the subhead', () => {
      expect(rule('.panel__head')).toContain('flex: 0 0 auto;')
      expect(rule('.polities__subhead')).toContain('flex: 0 0 auto;')
    })
  })

  describe('managed errors', () => {
    it('names a selector the sheet does not hold', () => {
      expect(() => rule('.no-such-rule')).toThrow('.no-such-rule is not in editor-chrome.css')
    })
  })

  // L4: N/A — a static sheet read at build time, nothing asynchronous or optional.
})

/**
 * The declarations of the rule whose selector list holds a selector — alone or in a group — comments removed and
 * whitespace collapsed. `sheetRule` reads a rule by its whole selector; this one finds a member of a group.
 * @param selector - one selector, exactly as written in the sheet
 * @returns the declarations
 * @throws when no rule of the sheet lists it
 */
function declarationsFor(selector: string): string {
  const code = chrome.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const block of code.split('}')) {
    const [selectors = '', body = ''] = block.split('{')
    if (selectors.split(',').some((each) => each.trim() === selector))
      return body.replace(/\s+/g, ' ')
  }
  throw new Error(`${selector} is in no rule of editor-chrome.css`)
}

const row = (verdict: string): string => `.city-row[data-verdict='${verdict}'] .layer-row__name`
const detail = (verdict: string): string =>
  `.city-detail[data-verdict='${verdict}'] .city-detail__verdict`

// CARTO-386, the dev, 2026-11-07: yellow for the map to correct, red for a city with no holder.
describe('editor-chrome.css — the {Cities} alerts', () => {
  describe('happy path', () => {
    it('writes a city the map puts on the wrong side in the caution ink, yellow, in the list and the detail', () => {
      expect(declarationsFor(row('misplaced'))).toContain('color: var(--caution);')
      expect(declarationsFor(detail('misplaced'))).toContain('color: var(--caution);')
    })

    it('writes a city with no holder in the alert ink, red', () => {
      expect(declarationsFor(row('notEntered'))).toContain('color: var(--warn);')
    })
  })

  describe('variants', () => {
    it('gives a holder the map has not drawn yet the same yellow, in the list and the detail', () => {
      expect(declarationsFor(row('toDeclare'))).toContain('color: var(--caution);')
      expect(declarationsFor(detail('toDeclare'))).toContain('color: var(--caution);')
    })
  })

  describe('managed errors', () => {
    it('names a selector no rule lists', () => {
      expect(() => declarationsFor('.no-such-rule')).toThrow(
        '.no-such-rule is in no rule of editor-chrome.css'
      )
    })
  })

  describe('edge cases', () => {
    it('leaves unmarked a holder without a Wikidata id, and a city at the right place', () => {
      expect(() => declarationsFor(row('cannotCompare'))).toThrow()
      expect(() => declarationsFor(row('agrees'))).toThrow()
    })
  })

  // L4: N/A — a static sheet read at build time, nothing asynchronous or optional.
})

// CARTO-385: the {Cities} list stopped at 240px however tall the panel was dragged.
describe('editor-chrome.css — the {Cities} list', () => {
  describe('happy path', () => {
    it('grows to the height the panel has and scrolls inside it', () => {
      const list = rule('.city-list')
      expect(list).toContain('flex: 1 1 240px;')
      expect(list).toContain('overflow-y: auto;')
    })
  })

  describe('variants', () => {
    it('lays the panel body holding the list in a column, so the list can grow in it', () => {
      const body = rule('.panel__body:has(> .city-list)')
      expect(body).toContain('display: flex;')
      expect(body).toContain('flex-direction: column;')
    })
  })

  describe('edge cases', () => {
    it('no longer caps the list at a fixed height', () => {
      expect(rule('.city-list')).not.toContain('max-height')
    })

    // Review of CARTO-385: with `min-height: 0`, a short panel with a city's detail open shrank the list to nothing.
    it('keeps three rows of 24px at least, so a short panel scrolls rather than hiding the list', () => {
      expect(rule('.city-list')).toContain('min-height: 72px;')
    })
  })

  // L3: N/A — the reader's own error is tested once, under {Polities}.
  // L4: N/A — a static sheet read at build time, nothing asynchronous or optional.
})
