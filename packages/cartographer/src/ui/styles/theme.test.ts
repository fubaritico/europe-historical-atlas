import tokensSheet from '@fubaritico/tokens/css?raw'
import { describe, expect, it } from 'vitest'

import main from '../../main.tsx?raw'

import editorChrome from './editor-chrome.css?raw'
import sheets from './sheets.ts?raw'
import shell from './shell.css?raw'
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
  ['--color-text', '--color-surface'], // a value typed in a field
  ['--color-text', '--color-surface-raised'], // a label on the panel
  ['--color-text-secondary', '--color-surface-raised'], // a dimmed label, as Illustrator sets them
  ['--color-text-placeholder', '--color-surface'], // a placeholder
  ['--color-table-header-text', '--color-surface-raised'], // a table's column header
  // Not the primary button's caption: the ink on the hairline colour, chosen on sight by the dev on
  // 2026-10-09 — contrast is not a constraint he holds this tool to.
  ['--color-text', '--color-fill'], // the secondary button
  ['--color-text', '--color-hover'], // a button under the pointer
  ['--color-text', '--color-pressed'], // the active item of a list
  ['--color-text', '--color-selected'], // a selected row
]

/** Boundaries the form relies on to be seen at all — WCAG 1.4.11, 3:1. */
const BOUNDARY_PAIRS: readonly (readonly [string, string])[] = [
  ['--color-border-strong', '--color-surface'], // a field's outline
  ['--color-border-strong', '--color-surface-raised'], // an outline button's border, on the panel
  ['--color-focus', '--color-surface'], // the focus ring around a field
  ['--color-focus', '--color-surface-raised'], // the focus ring around a button
  ['--color-destructive', '--color-surface'], // an invalid field's outline
]

/** Every custom property the design system's tokens sheet defines. */
const defined = new Set([...tokensSheet.matchAll(/(--[a-z0-9-]+):/g)].map(([, name]) => name ?? ''))

/** The design system's roles the theme sets — every `--color-*` it declares; the rest is our palette. */
const overridden = [...declared.keys()].filter((name) => name.startsWith('--color-'))

/**
 * The design system's roles the theme leaves at their default, each for a reason — none needs a colour
 * the palette lacks. Proposed 2026-10-21 with the 0.7.0 move (CARTO-117), for the dev to confirm.
 */
const UNSET_ON_PURPOSE: ReadonlyMap<string, string> = new Map([
  ...[
    '--color-surface-inverse',
    '--color-surface-inverse-hover',
    '--color-surface-inverse-pressed',
    '--color-surface-inverse-selected',
    '--color-text-on-inverse',
    '--color-text-on-inverse-strong',
    '--color-text-on-inverse-secondary',
    '--color-fill-on-inverse',
    '--color-fill-on-inverse-hover',
    '--color-border-on-inverse',
  ].map((name) => [name, 'read by the `variant="dark"` panels, dark by default'] as const),
  ['--color-overlay', 'the scrim behind a dialog, dark in either scheme'],
  ['--color-text-on-destructive', 'white on the warning fill, meant white'],
  ['--color-white', 'white by name'],
  ['--color-success', 'no component here paints success'],
  ['--color-success-hover', 'no component here paints success'],
  ['--color-text-on-success', 'no component here paints success'],
  [
    '--color-warning',
    'no component here paints a warning — refusals use --warn, through destructive',
  ],
  ['--color-rating-filled', 'no rating here'],
  ['--color-rating-empty', 'no rating here'],
  ['--color-skeleton-shimmer', 'no skeleton here'],
])

/** Every custom property a sheet reads through `var()`. */
function reads(sheet: string): Set<string> {
  return new Set([...sheet.matchAll(/var\((--[a-z0-9-]+)/g)].map(([, name]) => name ?? ''))
}

/** Every custom property a sheet declares. */
function declares(sheet: string): Set<string> {
  return new Set([...sheet.matchAll(/(--[a-z0-9-]+):/g)].map(([, name]) => name ?? ''))
}

/** Custom properties a component sets in its `style`, not a sheet. */
const SET_BY_COMPONENTS = new Set(['--polity-depth']) // PolityOption: a row's depth in the tree

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
    // which only holds if both go through it and neither imports a sheet of its own. The workbench's half
    // is in its own suite, `workbench/Workbench.test.tsx`: the chrome may not read the workbench.
    it('reaches the sheets through styles/sheets only — the application', () => {
      expect(main).toContain("import './ui/styles/sheets'")
      expect(main).not.toMatch(/import '[^']*\.css'/)
      expect(main).not.toContain("import '@fubaritico/")
    })

    // A role the design system renames or drops leaves our override pointing at nothing: no error, and
    // its light default comes back — what fubaritico-ds 0.7.0 did to 22 of ours.
    it('overrides only roles the design system defines', () => {
      expect(overridden.length).toBeGreaterThan(0)
      expect(overridden.filter((name) => !defined.has(name))).toEqual([])
    })

    // The other direction, and the one 0.7.0 broke silently: a role the design system defines and the
    // theme does not set keeps its light value. Each one is set, or left on purpose with its reason.
    it('sets every role of the design system, or leaves it on purpose', () => {
      const roles = [...defined].filter((name) => /^--color-(?!primitive-)/.test(name))
      const unset = roles.filter((name) => !declared.has(name)).sort()
      expect(unset).toEqual([...UNSET_ON_PURPOSE.keys()].sort())
    })

    // A misspelt or vanished custom property fails silently in CSS: the declaration is dropped.
    it('reads only custom properties our sheets declare or a component sets — editor-chrome.css', () => {
      const known = new Set([
        ...declared.keys(),
        ...declares(shell),
        ...declares(editorChrome),
        ...SET_BY_COMPONENTS,
      ])
      const unknown = [...reads(editorChrome)].filter((name) => !known.has(name))
      expect(reads(editorChrome).size).toBeGreaterThan(0)
      expect(unknown).toEqual([])
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
      expect(contrast('--color-text-destructive', '--color-surface-raised')).toBeLessThan(4.5)
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

    it('read the design system tokens sheet', () => {
      expect(defined.has('--color-surface')).toBe(true)
    })

    it('declares no colour in the light scheme or behind a switch — there is one theme', () => {
      expect(code).not.toMatch(/prefers-color-scheme|data-theme/)
    })
  })
})
