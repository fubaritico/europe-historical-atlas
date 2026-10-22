import { afterEach, describe, expect, it, vi } from 'vitest'

import { STACKING_SHORTCUTS, listenForStackingKeys, stackingMoveFor } from './stackingShortcut'

import type { StackingKeyTarget } from './stackingShortcut'

const key = (
  name: string,
  mods: Partial<Record<'ctrl' | 'meta' | 'alt' | 'shift', boolean>> = {}
) => ({
  key: name,
  ctrlKey: mods.ctrl ?? false,
  metaKey: mods.meta ?? false,
  altKey: mods.alt ?? false,
  shiftKey: mods.shift ?? false,
})

/**
 * A key target recording its one listener, to fire events by hand.
 * @returns the target and a way to press a key on an element
 */
function page() {
  let heard: ((event: KeyboardEvent) => void) | null = null
  const target: StackingKeyTarget = {
    addEventListener: (_, listener) => {
      heard = listener
    },
    removeEventListener: () => {
      heard = null
    },
  }
  const press = (on: Element, init: KeyboardEventInit): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { ...init, cancelable: true, bubbles: true })
    on.dispatchEvent(event)
    heard?.(event)
    return event
  }
  return { target, press, listening: () => heard !== null }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('stackingMoveFor', () => {
  describe('happy path', () => {
    it('reads ‹cmd+↑› as Bring Forward and ‹cmd+↓› as Send Backward', () => {
      expect(stackingMoveFor(key('ArrowUp', { meta: true }))).toBe('forward')
      expect(stackingMoveFor(key('ArrowDown', { meta: true }))).toBe('backward')
    })
  })

  describe('variants', () => {
    it('reads ‹shift› as all the way: to the front, to the back', () => {
      expect(stackingMoveFor(key('ArrowUp', { meta: true, shift: true }))).toBe('front')
      expect(stackingMoveFor(key('ArrowDown', { meta: true, shift: true }))).toBe('back')
    })

    it('takes ‹ctrl› for ‹cmd› off a Mac', () => {
      expect(stackingMoveFor(key('ArrowUp', { ctrl: true }))).toBe('forward')
    })

    it('shows each command’s keys and announces both modifiers', () => {
      expect(STACKING_SHORTCUTS.front.shown).toBe('⇧⌘↑')
      expect(STACKING_SHORTCUTS.back.aria).toContain('Control+Shift+ArrowDown')
    })
  })

  // L3 (managed errors): N/A — a key is a command or it is not.

  describe('unmanaged errors', () => {
    it('reads nothing from an arrow pressed alone, which pans the map', () => {
      expect(stackingMoveFor(key('ArrowUp'))).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('leaves ‹alt›, the sideways arrows and other keys alone', () => {
      expect(stackingMoveFor(key('ArrowUp', { meta: true, alt: true }))).toBeNull()
      expect(stackingMoveFor(key('ArrowLeft', { meta: true }))).toBeNull()
      expect(stackingMoveFor(key('s', { meta: true }))).toBeNull()
    })
  })
})

describe('listenForStackingKeys', () => {
  it('runs the command and keeps the key from the browser', () => {
    const { target, press } = page()
    const onMove = vi.fn()
    listenForStackingKeys(target, onMove)
    const event = press(document.body, { key: 'ArrowDown', metaKey: true, shiftKey: true })
    expect(onMove).toHaveBeenCalledWith('back')
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves the key to a text field, where ‹cmd+↑› goes to its start', () => {
    const { target, press } = page()
    const onMove = vi.fn()
    listenForStackingKeys(target, onMove)
    const field = document.body.appendChild(document.createElement('input'))
    const event = press(field, { key: 'ArrowUp', metaKey: true })
    expect(onMove).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('leaves the key to an open dialogue', () => {
    const { target, press } = page()
    const onMove = vi.fn()
    listenForStackingKeys(target, onMove)
    const dialog = document.body.appendChild(document.createElement('dialog'))
    dialog.setAttribute('open', '')
    const inside = dialog.appendChild(document.createElement('button'))
    press(inside, { key: 'ArrowUp', metaKey: true })
    expect(onMove).not.toHaveBeenCalled()
  })

  it('leaves the key to the open stacking menu', () => {
    const { target, press } = page()
    const onMove = vi.fn()
    listenForStackingKeys(target, onMove)
    const menu = document.body.appendChild(document.createElement('div'))
    menu.className = 'polity-stack-menu'
    const item = menu.appendChild(document.createElement('div'))
    press(item, { key: 'ArrowDown', metaKey: true })
    expect(onMove).not.toHaveBeenCalled()
  })

  it('leaves a key already handled elsewhere', () => {
    const { target, press } = page()
    const onMove = vi.fn()
    listenForStackingKeys(target, onMove)
    const handler = document.body.appendChild(document.createElement('div'))
    handler.addEventListener('keydown', (event) => {
      event.preventDefault()
    })
    press(handler, { key: 'ArrowUp', metaKey: true })
    expect(onMove).not.toHaveBeenCalled()
  })

  it('stops listening when asked', () => {
    const { target, listening } = page()
    listenForStackingKeys(target, vi.fn())()
    expect(listening()).toBe(false)
  })
})
