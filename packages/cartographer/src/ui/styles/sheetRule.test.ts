import { describe, expect, it } from 'vitest'

import { sheetRule } from './sheetRule'

describe('sheetRule', () => {
  describe('happy path', () => {
    it('returns the rule of the selector on one line', () => {
      expect(sheetRule('.a {\n  color: red;\n}\n', 'a.css', '.a')).toBe('.a { color: red; ')
    })
  })

  describe('variants', () => {
    it('finds a rule nested and indented in a layer', () => {
      expect(sheetRule('@layer x {\n  .a {\n    color: red;\n  }\n}', 'a.css', '.a')).toBe(
        '.a { color: red; '
      )
    })

    it('ignores a commented-out rule of the same selector', () => {
      const sheet = '/* .a { color: blue; } */\n.a {\n  color: red;\n}'
      expect(sheetRule(sheet, 'a.css', '.a')).toBe('.a { color: red; ')
    })
  })

  describe('managed errors', () => {
    it('throws on a selector the sheet does not hold, naming the sheet', () => {
      expect(() => sheetRule('.a { color: red; }', 'a.css', '.b')).toThrow('.b is not in a.css')
    })
  })

  // L4: N/A — pure string work, nothing asynchronous or optional.

  describe('edge cases', () => {
    it('does not take the tail of a compound selector for the rule', () => {
      const sheet = '.panel .a {\n  color: blue;\n}\n.a {\n  color: red;\n}'
      expect(sheetRule(sheet, 'a.css', '.a')).toBe('.a { color: red; ')
    })

    it('throws when the selector only appears as the tail of a compound one', () => {
      expect(() => sheetRule('.panel .a {\n  color: blue;\n}', 'a.css', '.a')).toThrow(
        '.a is not in a.css'
      )
    })

    it('reads the dot of a selector literally, not as any character', () => {
      expect(() => sheetRule('xa {\n  color: blue;\n}', 'a.css', '.a')).toThrow(
        '.a is not in a.css'
      )
    })
  })
})
