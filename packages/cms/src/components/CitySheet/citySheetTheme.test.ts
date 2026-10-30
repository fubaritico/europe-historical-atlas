import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { describe, expect, it } from 'vitest'

import { catalogueMismatches } from '@europe-historical-atlas/core/i18n/catalogue'

import { CITY_SHEET_MESSAGES } from './i18n'

/** Resolves a package's file the way Next does when it bundles the screen. */
const resolve = createRequire(import.meta.url).resolve

/** Our sheet, comments removed. */
const ours = readFileSync(new URL('./citySheet.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
)

/** The design system's tokens, as the screen imports them. */
const tokens = readFileSync(resolve('@fubaritico/tokens/css'), 'utf8')

/** Payload's admin sheet, which defines its theme's variables (`@payloadcms/next/css`, imported by the layout). */
const payload = readFileSync(resolve('@payloadcms/next/css'), 'utf8')

/** Every design-system colour role, primitives aside. */
const roles = new Set(
  [...tokens.matchAll(/(--color-(?!primitive-)[a-z-]+):/g)].map(([, name]) => name ?? '')
)

/** Every role our sheet sets, with what it reads. */
const set = new Map(
  [...ours.matchAll(/(--color-[a-z-]+):\s*([^;]+);/g)].map(([, name, value]) => [
    name ?? '',
    (value ?? '').trim(),
  ])
)

/** Every Payload variable our sheet reads. */
const read = new Set(
  [...ours.matchAll(/var\((--theme-[a-z0-9-]+)\)/g)].map(([, name]) => name ?? '')
)

/** Every variable Payload defines. */
const defined = new Set(
  [...payload.matchAll(/(--theme-[a-z0-9-]+):/g)].map(([, name]) => name ?? '')
)

/** The roles left at the design system's value, each for a reason. */
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
    '--color-border-strong-on-inverse',
    '--color-text-destructive-on-inverse',
  ].map(
    (name) => [name, 'the `variant="dark"` parts, dark already; the screen uses none'] as const
  ),
  ['--color-overlay', 'the scrim behind a dialog, dark in either scheme; no dialog here'],
  ['--color-text-on-destructive', 'white on the warning fill, meant white'],
  ['--color-text-on-success', 'white on the success fill, meant white'],
  ['--color-white', 'white by name'],
  ['--color-success', 'no success state in the form; Payload’s toast says « saved »'],
  ['--color-success-hover', 'no success state in the form'],
  ['--color-warning', 'no warning state in the form'],
  ['--color-rating-filled', 'no rating here'],
  ['--color-rating-empty', 'no rating here'],
  ['--color-skeleton-shimmer', 'no skeleton here'],
])

describe('the city sheet’s theme', () => {
  describe('happy path', () => {
    it('sets each colour role to one of Payload’s variables', () => {
      expect(set.size).toBeGreaterThan(0)
      expect(
        [...set.values()].filter((value) => !/^var\(--theme-[a-z0-9-]+\)$/.test(value))
      ).toEqual([])
    })
  })

  describe('variants', () => {
    // The other direction, the one that fails silently: a role left out keeps the design system's light value.
    it('sets every role of the design system, or leaves it on purpose', () => {
      const unset = [...roles].filter((name) => !set.has(name)).sort()
      expect(unset).toEqual([...UNSET_ON_PURPOSE.keys()].sort())
    })

    it('says every text in French and English with the same values', () => {
      expect(catalogueMismatches(CITY_SHEET_MESSAGES)).toEqual([])
    })
  })

  describe('managed errors', () => {
    // A role the design system renames leaves our override pointing at nothing, and its light default comes back.
    it('sets only roles the design system defines', () => {
      expect([...set.keys()].filter((name) => !roles.has(name))).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // A misspelt or vanished variable fails silently in CSS: the declaration is dropped.
    it('reads only variables Payload defines', () => {
      expect([...read].filter((name) => !defined.has(name))).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('read the three sheets', () => {
      expect(roles.has('--color-surface')).toBe(true)
      expect(defined.has('--theme-input-bg')).toBe(true)
      expect(read.size).toBeGreaterThan(5)
    })
  })
})
