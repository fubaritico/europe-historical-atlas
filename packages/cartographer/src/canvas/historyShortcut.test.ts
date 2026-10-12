// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { isPageHistoryKey, keepsItsOwnUndo } from './historyShortcut'

/**
 * A key pressed on an element and read where the page's listener reads it, after bubbling.
 * @param target - where the key is pressed
 * @param init - the key and its modifiers
 * @param canvas - the canvas the answer is asked for
 * @returns whether the page's listener should answer it
 */
function pressedOn(target: Element, init: KeyboardEventInit, canvas: Element): boolean {
  let answer = false
  const listener = (event: KeyboardEvent): void => {
    answer = isPageHistoryKey(event, canvas)
  }
  document.addEventListener('keydown', listener)
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  document.removeEventListener('keydown', listener)
  return answer
}

/** A canvas in the page, and a list beside it — `{Polities}`. */
function page() {
  const canvas = document.body.appendChild(document.createElement('canvas'))
  const list = document.body.appendChild(document.createElement('ul'))
  return { canvas, list }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('isPageHistoryKey', () => {
  describe('happy path', () => {
    it('answers ctrl+Z pressed in the panel', () => {
      const { canvas, list } = page()
      expect(pressedOn(list, { key: 'z', ctrlKey: true }, canvas)).toBe(true)
    })
  })

  describe('variants', () => {
    it('answers ctrl+shift+Z and cmd+Z too', () => {
      const { canvas, list } = page()
      expect(pressedOn(list, { key: 'Z', ctrlKey: true, shiftKey: true }, canvas)).toBe(true)
      expect(pressedOn(list, { key: 'z', metaKey: true }, canvas)).toBe(true)
    })

    it('leaves a key pressed on the canvas to the canvas’s own listener', () => {
      const { canvas } = page()
      expect(pressedOn(canvas, { key: 'z', ctrlKey: true }, canvas)).toBe(false)
    })

    it('leaves a key something already took', () => {
      const { canvas, list } = page()
      list.addEventListener('keydown', (event) => {
        event.preventDefault()
      })
      expect(pressedOn(list, { key: 'z', ctrlKey: true }, canvas)).toBe(false)
    })
  })

  describe('managed errors', () => {
    it.each(['input', 'textarea', 'select'])('leaves ctrl+Z in a %s to the field', (tag) => {
      const { canvas } = page()
      const field = document.body.appendChild(document.createElement(tag))
      expect(pressedOn(field, { key: 'z', ctrlKey: true }, canvas)).toBe(false)
    })

    it('leaves ctrl+Z in an editable element to it', () => {
      const { canvas } = page()
      const editable = document.body.appendChild(document.createElement('div'))
      // jsdom does not compute it; the browser does from `contenteditable`.
      Object.defineProperty(editable, 'isContentEditable', { value: true })
      expect(pressedOn(editable, { key: 'z', ctrlKey: true }, canvas)).toBe(false)
    })

    it('leaves the document alone while a dialogue is open', () => {
      const { canvas } = page()
      const dialog = document.body.appendChild(document.createElement('dialog'))
      dialog.setAttribute('open', '')
      const button = dialog.appendChild(document.createElement('button'))
      expect(pressedOn(button, { key: 'z', ctrlKey: true }, canvas)).toBe(false)
    })
  })

  // L4: N/A — a predicate over an event, nothing thrown.

  describe('edge cases', () => {
    it('ignores alt+ctrl+Z and a bare Z', () => {
      const { canvas, list } = page()
      expect(pressedOn(list, { key: 'z', ctrlKey: true, altKey: true }, canvas)).toBe(false)
      expect(pressedOn(list, { key: 'z' }, canvas)).toBe(false)
    })

    it('reads a target that is not an element as no text field', () => {
      expect(keepsItsOwnUndo(window)).toBe(false)
      expect(keepsItsOwnUndo(null)).toBe(false)
    })
  })
})
