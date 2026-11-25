import { describe, expect, it } from 'vitest'

import { gesture } from './gesture'

const press = () => undefined

describe('gesture', () => {
  describe('happy path', () => {
    it('acts, with its tooltip, when nothing stops it', () => {
      expect(gesture(press, 'Open (⌘O)', undefined)).toEqual({ onPress: press, hint: 'Open (⌘O)' })
    })
  })

  describe('variants', () => {
    it('says why it cannot act, and nothing else', () => {
      expect(gesture(press, 'Open (⌘O)', 'sign in first')).toEqual({ unavailable: 'sign in first' })
    })
  })

  describe('managed errors', () => {
    // L3: N/A — a pure choice between two shapes.
    it('never hands both the gesture and the reason', () => {
      const action = gesture(press, 'Open (⌘O)', 'sign in first')

      expect('onPress' in action).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — nothing is read nor awaited.
    it('keeps the very function it was given', () => {
      const action = gesture(press, 'hint', undefined)

      expect('onPress' in action && action.onPress).toBe(press)
    })
  })

  describe('edge cases', () => {
    it('an empty reason still stops it', () => {
      expect(gesture(press, 'hint', '')).toEqual({ unavailable: '' })
    })
  })
})
