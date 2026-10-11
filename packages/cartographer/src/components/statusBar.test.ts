import { describe, expect, it } from 'vitest'

import { writeAction, writePosition } from './statusBar'

describe('statusBar', () => {
  describe('happy path', () => {
    it('writes the action sentence into its zone', () => {
      const node = document.createElement('span')
      writeAction(node, 'Drawing in Reaume de France')
      expect(node.textContent).toBe('Drawing in Reaume de France')
    })
  })

  describe('variants', () => {
    it('clears the action when no action has a subject', () => {
      const node = document.createElement('span')
      writeAction(node, 'Drawing in Reaume de France')
      writeAction(node, null)
      expect(node.textContent).toBe('')
    })
  })

  describe('managed errors', () => {
    it('does nothing before the zone is mounted', () => {
      expect(() => {
        writeAction(null, 'Drawing in Reaume de France')
      }).not.toThrow()
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — a synchronous DOM write with nothing to fail on.
    it('writes the position as text, never as markup', () => {
      const node = document.createElement('span')
      writeAction(node, '<b>x</b>')
      expect(node.children).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    // s02 — two zones side by side: writing one never clears the other.
    it('keeps the two zones apart', () => {
      const bar = document.createElement('p')
      const action = bar.appendChild(document.createElement('span'))
      const position = bar.appendChild(document.createElement('span'))
      writeAction(action, 'Drawing in Reaume de France')
      writePosition(position, [2.35, 48.85])
      expect(action.textContent).toBe('Drawing in Reaume de France')
      expect(position.textContent).not.toBe('')
    })
  })
})
