// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { isEditableFocused } from './editableFocus'

/**
 * Put a fresh element of the given tag into the page and focus it.
 * @param tag - the tag to create
 * @param contentEditable - whether to make it editable rather than rely on its tag
 * @returns the focused element
 */
function focusElement(tag: string, contentEditable = false): HTMLElement {
  const el = document.createElement(tag)
  if (contentEditable) el.setAttribute('contenteditable', 'true')
  document.body.appendChild(el)
  el.focus()
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('isEditableFocused', () => {
  describe('happy path', () => {
    it('is true while a text field has the focus', () => {
      focusElement('input')
      expect(isEditableFocused()).toBe(true)
    })

    it('is false when nothing in particular has the focus', () => {
      expect(isEditableFocused()).toBe(false)
    })
  })

  describe('variants', () => {
    it('is true for a textarea', () => {
      focusElement('textarea')
      expect(isEditableFocused()).toBe(true)
    })

    it('is true for a select', () => {
      focusElement('select')
      expect(isEditableFocused()).toBe(true)
    })

    it('is true for a contenteditable element, whatever its tag', () => {
      const el = focusElement('div', true)
      // jsdom does not implement `isContentEditable` from the attribute, so state it directly.
      Object.defineProperty(el, 'isContentEditable', { value: true })
      expect(isEditableFocused()).toBe(true)
    })

    it('is false for an ordinary focusable element', () => {
      focusElement('button')
      expect(isEditableFocused()).toBe(false)
    })
  })

  // L3 (managed errors): N/A — it answers a question and has nothing to handle.

  describe('unmanaged errors', () => {
    it('is false when the active element is not an HTML element at all', () => {
      focusElement('input') // so a pass cannot come from there being no focus in the first place
      Object.defineProperty(document, 'activeElement', { value: null, configurable: true })
      expect(isEditableFocused()).toBe(false)
      // Deleted rather than reassigned: an own property on the instance would shadow the prototype's
      // accessor for every later test, which is exactly what it did the first time this was written.
      Reflect.deleteProperty(document, 'activeElement')
      expect(document.activeElement).not.toBeNull()
    })
  })

  describe('edge cases', () => {
    it('is false where there is no document, rather than throwing', () => {
      // A shared util may end up imported somewhere with no DOM; the map's keys are not hijacked
      // there because there are no keys there to hijack.
      const original = globalThis.document
      Object.defineProperty(globalThis, 'document', { value: undefined, configurable: true })
      expect(isEditableFocused()).toBe(false)
      Object.defineProperty(globalThis, 'document', { value: original, configurable: true })
    })

    it('follows the focus when it moves off a field', () => {
      const input = focusElement('input')
      expect(isEditableFocused()).toBe(true)
      input.blur()
      expect(isEditableFocused()).toBe(false)
    })
  })
})
