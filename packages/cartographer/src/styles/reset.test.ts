import { describe, expect, it } from 'vitest'

import reset from './reset.css?raw'

/** The sheet with its comments removed, so a commented-out brace cannot fool the scan. */
const code = reset.replace(/\/\*[\s\S]*?\*\//g, '').trim()

/**
 * The top-level statements of the sheet: what sits at brace depth zero, each with its body.
 *
 * A hand scan rather than a CSS parser — the question is only "is anything outside the layer?", and a
 * parser dependency to answer one structural question is the wrong trade.
 */
function topLevelBlocks(css: string): string[] {
  const blocks: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < css.length; i++) {
    const char = css[i]
    if (char === '{') depth++
    if (char === '}') {
      depth--
      if (depth === 0) {
        blocks.push(css.slice(start, i + 1).trim())
        start = i + 1
      }
    }
  }
  const rest = css.slice(start).trim()
  if (rest !== '') blocks.push(rest)
  return blocks
}

describe('reset.css', () => {
  describe('happy path', () => {
    it('is one block, the ui.reset layer', () => {
      const blocks = topLevelBlocks(code)
      expect(blocks).toHaveLength(1)
      expect(blocks[0]?.startsWith('@layer ui.reset {')).toBe(true)
    })
  })

  describe('variants', () => {
    it('still carries the preflight inside the layer — the box model and the border reset', () => {
      expect(code).toContain('box-sizing: border-box')
      expect(code).toContain('border-width: 0')
    })
  })

  describe('managed errors', () => {
    // The failure this guards: an unlayered rule beats every layered one whatever the load order, so a
    // single rule outside `ui.reset` would erase the design system's borders and padding, silently.
    it('leaves no rule outside the layer', () => {
      const outside = topLevelBlocks(code).filter((block) => !block.startsWith('@layer ui.reset {'))
      expect(outside).toEqual([])
    })
  })

  // L4: N/A — a static file; there is no runtime path to fail.

  describe('edge cases', () => {
    // Vitest empties stylesheets unless `test.css` opens them, and on an empty string every check above
    // that looks for an absence passes. This one makes reading nothing a failure.
    it('was actually read', () => {
      expect(code.length).toBeGreaterThan(1000)
    })

    it('balances its braces, so the scan above read the whole sheet', () => {
      const opened = code.split('{').length - 1
      const closed = code.split('}').length - 1
      expect(opened).toBe(closed)
    })
  })
})
