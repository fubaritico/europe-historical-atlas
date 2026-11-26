import { describe, expect, it } from 'vitest'

import { GESTURE_EVENTS, createGestureWatch } from './gestureWatch'

/**
 * A target that records its listeners and fires them on demand.
 * @returns the target, and how to fire an event
 */
function fakeTarget() {
  const listeners = new Map<string, () => void>()
  const options = new Map<string, unknown>()
  return {
    target: {
      addEventListener: (type: string, listener: () => void, given: unknown) => {
        listeners.set(type, listener)
        options.set(type, given)
      },
    },
    fire: (type: string) => {
      listeners.get(type)?.()
    },
    options,
  }
}

describe('createGestureWatch', () => {
  describe('happy path', () => {
    it('says a gesture once, then nothing until the next', () => {
      const { target, fire } = fakeTarget()
      const watch = createGestureWatch(target)
      watch.gestured()

      fire('pointerdown')

      expect(watch.gestured()).toBe(true)
      expect(watch.gestured()).toBe(false)
    })
  })

  describe('variants', () => {
    it.each(GESTURE_EVENTS)('counts %s as a gesture', (type) => {
      const { target, fire } = fakeTarget()
      const watch = createGestureWatch(target)
      watch.gestured()

      fire(type)

      expect(watch.gestured()).toBe(true)
    })

    it('listens at capture, passive, so no handler of the page hides a gesture', () => {
      const { target, options } = fakeTarget()

      createGestureWatch(target)

      expect(options.get('keydown')).toEqual({ capture: true, passive: true })
    })
  })

  // L3, L4: N/A — a flag and three listeners; nothing can fail

  describe('edge cases', () => {
    it('answers a gesture at first: signing in is one', () => {
      const { target } = fakeTarget()

      expect(createGestureWatch(target).gestured()).toBe(true)
    })

    it('does not count a pointer only moved', () => {
      const { target, fire } = fakeTarget()
      const watch = createGestureWatch(target)
      watch.gestured()

      fire('pointermove')

      expect(watch.gestured()).toBe(false)
    })
  })
})
