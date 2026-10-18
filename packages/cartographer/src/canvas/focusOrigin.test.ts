import { describe, expect, it } from 'vitest'

import shell from '../styles/shell.css?raw'

import { FOCUS_ORIGIN_ATTRIBUTE, trackFocusOrigin } from './focusOrigin'

function focusableCanvas(): HTMLCanvasElement {
  const node = document.createElement('canvas')
  node.tabIndex = 0
  document.body.append(node)
  return node
}

describe('trackFocusOrigin', () => {
  describe('happy path', () => {
    it('marks the node when the pointer goes down on it', () => {
      const node = focusableCanvas()
      trackFocusOrigin(node)
      node.dispatchEvent(new Event('pointerdown'))
      expect(node.getAttribute(FOCUS_ORIGIN_ATTRIBUTE)).toBe('pointer')
    })
  })

  describe('variants', () => {
    it('leaves a node focused by the keyboard unmarked, so its ring stays', () => {
      const node = focusableCanvas()
      trackFocusOrigin(node)
      node.focus()
      expect(node.getAttribute(FOCUS_ORIGIN_ATTRIBUTE)).toBeNull()
    })

    // The trap this module exists for: `:focus-visible` comes back at the first key pressed after a
    // click, and drawing is pressing keys. A key must not undo the mark.
    it('keeps the mark through the keys pressed while drawing', () => {
      const node = focusableCanvas()
      trackFocusOrigin(node)
      node.dispatchEvent(new Event('pointerdown'))
      node.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }))
      node.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
      expect(node.getAttribute(FOCUS_ORIGIN_ATTRIBUTE)).toBe('pointer')
    })

    it('forgets the mark on blur, so coming back by Tab shows the ring again', () => {
      const node = focusableCanvas()
      trackFocusOrigin(node)
      node.dispatchEvent(new Event('pointerdown'))
      node.dispatchEvent(new FocusEvent('blur'))
      expect(node.getAttribute(FOCUS_ORIGIN_ATTRIBUTE)).toBeNull()
    })
  })

  // L3: N/A — nothing here can fail in a way the code handles.
  // L4: N/A — two listeners and an attribute; no input to be malformed.

  describe('edge cases', () => {
    it('removes its listeners and the mark on teardown', () => {
      const node = focusableCanvas()
      const stop = trackFocusOrigin(node)
      node.dispatchEvent(new Event('pointerdown'))
      stop()
      expect(node.getAttribute(FOCUS_ORIGIN_ATTRIBUTE)).toBeNull()
      node.dispatchEvent(new Event('pointerdown'))
      expect(node.getAttribute(FOCUS_ORIGIN_ATTRIBUTE)).toBeNull()
    })

    // The attribute is a contract between this module and a stylesheet; a rename on one side would
    // leave the ring on screen with every test above still green.
    it('is the attribute shell.css hides the ring on', () => {
      expect(shell.length).toBeGreaterThan(0)
      expect(shell).toContain(`canvas[${FOCUS_ORIGIN_ATTRIBUTE}='pointer']`)
      expect(shell).toMatch(/canvas\[data-focus-origin='pointer'\]\s*\{\s*outline:\s*none;/)
    })
  })
})
