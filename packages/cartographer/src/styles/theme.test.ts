import { describe, expect, it } from 'vitest'

import shell from '../components/shell.css?raw'
import main from '../main.tsx?raw'
import workbench from '../workbench/entry.tsx?raw'

import sheets from './sheets.ts?raw'
import theme from './theme.css?raw'

/** The theme's code, comments removed and whitespace collapsed — a formatter may wrap a value. */
const code = theme
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\(\s+/g, '(')
  .replace(/\s+\)/g, ')')

/** Every custom property the theme declares, by name, with its raw value. */
const declared = new Map(
  [...code.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map(([, name, value]) => [
    name ?? '',
    (value ?? '').trim(),
  ])
)

/** A token's colour, following `var(--x)` through the theme until it reaches a hex value. */
function resolve(name: string): string {
  const value = declared.get(name)
  if (value === undefined) throw new Error(`${name} is not declared by the theme`)
  const reference = /^var\((--[a-z0-9-]+)\)$/.exec(value)
  return reference?.[1] === undefined ? value : resolve(reference[1])
}

/** WCAG 2.x relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

/** WCAG 2.x contrast ratio between two tokens of the theme. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(resolve(a)), luminance(resolve(b))].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

/** Text the form shows, against the surface it sits on — WCAG 1.4.3, 4.5:1. */
const TEXT_PAIRS: readonly (readonly [string, string])[] = [
  ['--color-foreground', '--color-background'], // a value typed in a field
  ['--color-foreground', '--color-card'], // a label on the panel
  ['--color-foreground-muted', '--color-card'], // a dimmed label, as Illustrator sets them
  ['--color-muted-foreground', '--color-background'], // a placeholder
  // Not the primary button's caption: the ink on the hairline colour, chosen on sight by the dev on
  // 2026-10-09 — contrast is not a constraint he holds this tool to.
  ['--color-secondary-foreground', '--color-secondary'],
  ['--color-accent-foreground', '--color-accent'], // a button under the pointer
]

/** Boundaries the form relies on to be seen at all — WCAG 1.4.11, 3:1. */
const BOUNDARY_PAIRS: readonly (readonly [string, string])[] = [
  ['--color-input-border', '--color-background'], // a field's outline
  ['--color-input', '--color-card'], // an outline button's border, on the panel
  ['--color-ring', '--color-background'], // the focus ring around a field
  ['--color-ring', '--color-card'], // the focus ring around a button
  ['--color-destructive', '--color-background'], // an invalid field's outline
]

describe('theme.css', () => {
  describe('happy path', () => {
    it.each(TEXT_PAIRS)('%s on %s reads at 4.5:1 or more', (fg, bg) => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
    })

    it.each(BOUNDARY_PAIRS)('%s against %s stands out at 3:1 or more', (edge, surface) => {
      expect(contrast(edge, surface)).toBeGreaterThanOrEqual(3)
    })
  })

  describe('variants', () => {
    // Both sheets set the same properties on `:root`, unlayered, so the later wins: swapped, the
    // design system's light values would come back over ours.
    it('is imported after the tokens sheet', () => {
      const tokens = sheets.indexOf("import '@fubaritico/tokens/css'")
      const ours = sheets.indexOf("import './theme.css'")
      expect(tokens).toBeGreaterThan(-1)
      expect(ours).toBeGreaterThan(tokens)
    })

    // One module carries the order, so the application and the workbench cannot show two cascades —
    // which only holds if both go through it and neither imports a sheet of its own.
    it.each([
      ['the application', main, "import './styles/sheets'"],
      ['the workbench', workbench, "import '../styles/sheets'"],
    ])('reaches the sheets through styles/sheets only — %s', (_, source, entry) => {
      expect(source).toContain(entry)
      expect(source).not.toMatch(/import '[^']*\.css'/)
      expect(source).not.toContain("import '@fubaritico/")
    })

    it('declares every colour the shell reads, so the palette lives in one place', () => {
      const read = new Set([...shell.matchAll(/var\((--[a-z-]+)\)/g)].map(([, name]) => name ?? ''))
      const layout = new Set(['--rail', '--dock-w'])
      const missing = [...read].filter((name) => !layout.has(name) && !declared.has(name))
      expect(read.size).toBeGreaterThan(0)
      expect(missing).toEqual([])
    })
  })

  describe('managed errors', () => {
    // A declared gap, not a pass: the error message under a field is text, so it owes 4.5:1, and the
    // palette has no warning ink light enough. When a lighter one is chosen this fails — move the pair
    // into TEXT_PAIRS then. See known-issues.md.
    it('the field error message is still under 4.5:1 — a declared gap', () => {
      expect(contrast('--color-destructive-hover', '--color-card')).toBeLessThan(4.5)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a token the theme does not declare, rather than reading it as black', () => {
      expect(() => resolve('--color-nowhere')).toThrow(
        '--color-nowhere is not declared by the theme'
      )
    })
  })

  describe('edge cases', () => {
    it('was actually read', () => {
      expect(declared.size).toBeGreaterThan(20)
    })

    it('declares no colour in the light scheme or behind a switch — there is one theme', () => {
      expect(code).not.toMatch(/prefers-color-scheme|data-theme/)
    })
  })
})
