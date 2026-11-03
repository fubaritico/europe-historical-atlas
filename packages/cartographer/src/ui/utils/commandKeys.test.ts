import { afterEach, describe, expect, it, vi } from 'vitest'

import { listenForCommand, shownPlatform } from './commandKeys'

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

/**
 * Press a key on an element of the page.
 * @param target - where
 * @param init - the key
 * @returns the event, to read whether it was taken
 */
function press(target: Element, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

/**
 * A listener that answers a key before the page does.
 * @param event - the key
 */
function answerFirst(event: Event): void {
  event.preventDefault()
}

describe('commandKeys', () => {
  describe('happy path', () => {
    it('hears ‹cmd+C› on the page as copy, and takes the key', () => {
      const onCopy = vi.fn()
      const stop = listenForCommand(document, 'copy', onCopy)
      const event = press(document.body, { key: 'c', code: 'KeyC', metaKey: true })
      stop()

      expect(onCopy).toHaveBeenCalledOnce()
      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('variants', () => {
    it('hears ‹ctrl+C› as copy too', () => {
      const onCopy = vi.fn()
      const stop = listenForCommand(document, 'copy', onCopy)
      press(document.body, { key: 'c', code: 'KeyC', ctrlKey: true })
      stop()

      expect(onCopy).toHaveBeenCalledOnce()
    })

    it('reads a Mac from the browser', () => {
      expect(shownPlatform({ platform: 'MacIntel' })).toBe('mac')
    })
  })

  describe('managed errors', () => {
    it('leaves ‹cmd+C› to a text field, which copies its own text', () => {
      const onCopy = vi.fn()
      const field = document.body.appendChild(document.createElement('input'))
      const stop = listenForCommand(document, 'copy', onCopy)
      const event = press(field, { key: 'c', code: 'KeyC', metaKey: true })
      stop()

      expect(onCopy).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(false)
    })

    it('leaves ‹cmd+C› to an open dialogue, whose form keeps its own keys', () => {
      const onCopy = vi.fn()
      const dialogue = document.body.appendChild(document.createElement('dialog'))
      dialogue.setAttribute('open', '')
      const button = dialogue.appendChild(document.createElement('button'))
      const stop = listenForCommand(document, 'copy', onCopy)
      press(button, { key: 'c', code: 'KeyC', metaKey: true })
      stop()

      expect(onCopy).not.toHaveBeenCalled()
    })

    it('shows Ctrl, said in the console, when the browser says nothing of its system', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      expect(shownPlatform({})).toBe('other')
      expect(warn).toHaveBeenCalledOnce()
    })
  })

  // L4: N/A — a key either is the command or is not; nothing is fetched or parsed.

  describe('edge cases', () => {
    it('does not hear a key already answered elsewhere', () => {
      const onCopy = vi.fn()
      const stop = listenForCommand(document, 'copy', onCopy)
      document.body.addEventListener('keydown', answerFirst)
      press(document.body, { key: 'c', code: 'KeyC', metaKey: true })
      document.body.removeEventListener('keydown', answerFirst)
      stop()

      expect(onCopy).not.toHaveBeenCalled()
    })

    it('stops hearing once stopped', () => {
      const onCopy = vi.fn()
      listenForCommand(document, 'copy', onCopy)()
      press(document.body, { key: 'c', code: 'KeyC', metaKey: true })

      expect(onCopy).not.toHaveBeenCalled()
    })
  })
})
