import { describe, expect, it } from 'vitest'

import { REPEAT_MARK, writeAction, writePosition, writeResult } from './statusBar'

describe('writeResult', () => {
  describe('happy path', () => {
    it('writes the result into its zone', () => {
      const node = document.createElement('span')
      writeResult(node, 'Bring to front — Duchy of Normandy')
      expect(node.textContent).toBe('Bring to front — Duchy of Normandy')
    })
  })

  describe('variants', () => {
    // CARTO-121 — a live region whose text does not change may not be read again.
    it('changes the text when the same result is written twice', () => {
      const node = document.createElement('span')
      writeResult(node, 'Bring to front — Duchy of Normandy: already in place')
      writeResult(node, 'Bring to front — Duchy of Normandy: already in place')
      expect(node.textContent).toBe(
        `Bring to front — Duchy of Normandy: already in place${REPEAT_MARK}`
      )
    })

    it('changes the text again on a third identical result', () => {
      const node = document.createElement('span')
      const seen: (string | null)[] = []
      for (let i = 0; i < 3; i++) {
        writeResult(node, 'Saved 1100')
        seen.push(node.textContent)
      }
      expect(seen).toEqual(['Saved 1100', `Saved 1100${REPEAT_MARK}`, 'Saved 1100'])
    })

    it('marks with one zero-width space, never an empty string', () => {
      expect(REPEAT_MARK).toBe(String.fromCodePoint(0x200b))
    })

    it('writes a different result without the mark', () => {
      const node = document.createElement('span')
      writeResult(node, 'Saved 1100')
      writeResult(node, 'Saved 1100')
      writeResult(node, 'Opened 1100')
      expect(node.textContent).toBe('Opened 1100')
    })

    it('clears the zone', () => {
      const node = document.createElement('span')
      writeResult(node, 'Saved 1100')
      writeResult(node, null)
      expect(node.textContent).toBe('')
    })
  })

  describe('managed errors', () => {
    it('does nothing before the zone is mounted', () => {
      expect(() => {
        writeResult(null, 'Saved 1100')
      }).not.toThrow()
    })
  })

  describe('unmanaged errors', () => {
    it('writes the result as text, never as markup', () => {
      const node = document.createElement('span')
      writeResult(node, '<b>x</b>')
      writeResult(node, '<b>x</b>')
      expect(node.children).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('never marks an empty zone cleared twice', () => {
      const node = document.createElement('span')
      writeResult(node, null)
      writeResult(node, null)
      expect(node.textContent).toBe('')
    })
  })
})

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
