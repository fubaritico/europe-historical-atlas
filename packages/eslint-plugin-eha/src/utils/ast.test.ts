import { describe, expect, it } from 'vitest'

import { wholeLines } from './ast.js'

/**
 * A node standing on the line that holds `marker` in `text`, located as ESLint would locate it.
 * @param text - the file
 * @param marker - the node's text
 * @returns the node's range and location
 */
const nodeAt = (text: string, marker: string) => {
  const start = text.indexOf(marker)
  const before = text.slice(0, start).split('\n')
  const line = before.length
  const column = (before.at(-1) ?? '').length
  return {
    type: 'Identifier' as const,
    name: marker,
    range: [start, start + marker.length] as [number, number],
    loc: { start: { line, column }, end: { line, column: column + marker.length } },
  }
}

describe('wholeLines', () => {
  describe('happy path', () => {
    it('takes the indentation and the LF line break', () => {
      const text = 'a\n  node\nb'
      expect(text.slice(...wholeLines(nodeAt(text, 'node'), text, false))).toBe('  node\n')
    })
  })

  describe('variants', () => {
    it('takes both characters of a CRLF line break', () => {
      const text = 'a\r\n  node\r\nb'
      expect(text.slice(...wholeLines(nodeAt(text, 'node'), text, false))).toBe('  node\r\n')
    })

    it('takes the blank line below when asked', () => {
      const text = 'a\n  node\n\nb'
      expect(text.slice(...wholeLines(nodeAt(text, 'node'), text, true))).toBe('  node\n\n')
    })

    it('leaves a line below that holds code', () => {
      const text = 'a\n  node\nb'
      expect(text.slice(...wholeLines(nodeAt(text, 'node'), text, true))).toBe('  node\n')
    })
  })

  // L3–L4: N/A — a pure function of a text and a located node, which ESLint always provides.

  describe('edge cases', () => {
    it('ends at the end of a file with no final line break', () => {
      const text = 'a\n  node'
      expect(text.slice(...wholeLines(nodeAt(text, 'node'), text, true))).toBe('  node')
    })
  })
})
