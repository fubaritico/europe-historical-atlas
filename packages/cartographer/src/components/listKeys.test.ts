import { describe, expect, it } from 'vitest'

import { listKeyAction } from './listKeys'

describe('listKeyAction', () => {
  describe('happy path', () => {
    it('moves the cursor down with ↓ and chooses its row with Enter', () => {
      expect(listKeyAction(0, 'ArrowDown', 3)).toEqual({ move: 1 })
      expect(listKeyAction(1, 'Enter', 3)).toEqual({ choose: 1 })
    })
  })

  describe('variants', () => {
    it('wraps ↓ from the last row to the first, and ↑ from the first to the last', () => {
      expect(listKeyAction(2, 'ArrowDown', 3)).toEqual({ move: 0 })
      expect(listKeyAction(0, 'ArrowUp', 3)).toEqual({ move: 2 })
    })

    it('jumps to the first row on Home and the last on End', () => {
      expect(listKeyAction(1, 'Home', 3)).toEqual({ move: 0 })
      expect(listKeyAction(1, 'End', 3)).toEqual({ move: 2 })
    })

    it('chooses with Space as with Enter', () => {
      expect(listKeyAction(2, ' ', 3)).toEqual({ choose: 2 })
    })
  })

  describe('managed errors', () => {
    it('chooses nothing on Enter before the cursor has moved', () => {
      expect(listKeyAction(-1, 'Enter', 3)).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('takes no key on an empty list', () => {
      expect(listKeyAction(-1, 'ArrowDown', 0)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('starts ↓ on the first row and ↑ on the last when no row has the cursor yet', () => {
      expect(listKeyAction(-1, 'ArrowDown', 3)).toEqual({ move: 0 })
      expect(listKeyAction(-1, 'ArrowUp', 3)).toEqual({ move: 2 })
    })

    it('leaves any other key to the page', () => {
      expect(listKeyAction(0, 'a', 3)).toBeNull()
    })
  })
})
