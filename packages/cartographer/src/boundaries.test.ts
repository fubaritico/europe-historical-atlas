import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * The architecture boundaries, asserted by asking ESLint what it resolves — not by reading the config.
 *
 * **Why this exists, and it is not belt-and-braces.** The layer directions here are held by
 * `no-restricted-imports`, and the practice had been to prove each new row by breaking it **by hand**,
 * once, the day it was written. That practice failed on 2026-10-05: the first row written for `view/` was
 * authored in the root config and caught **nothing**, because ESLint resolves a `files` glob against the
 * directory of the config it *loaded*, and this package loads its own. The gate stayed green and only a
 * manual sabotage found it. A guard proved once by hand becomes false again at the next move, in silence.
 *
 * **What is asserted, and why it is the right thing.** Not that the rule *fires* — that is ESLint's own
 * job and it has tests. What broke was **matching**: the rule resolved to no `patterns` at all on a
 * `view/` file. So these tests take real files in each layer and check the options the rule ends up with.
 * Had they existed that evening, they would have failed on the exact defect.
 *
 * `lintText` was tried first and does not work here: the config turns on typed linting through the
 * project service, which refuses a path that is not in a tsconfig — *"was not found by the project
 * service"* — so parsing fails and no rule ever runs. Writing throwaway files into `src/` would work and
 * was rejected: a crashed run would leave them behind, and the next `lint` would fail on a file nobody
 * wrote.
 */

/** The shape `no-restricted-imports` is configured with, as far as these tests care. */
interface RestrictedImports {
  /** Whole packages that may not be imported. */
  paths?: { name: string }[]
  /** Specifier patterns that may not be imported, grouped with their message. */
  patterns?: { group: string[]; message: string }[]
}

/**
 * The resolved options of `no-restricted-imports` for one file.
 * @param eslint - the instance resolving the config
 * @param filePath - a real file, relative to the package
 * @returns the rule's options
 * @throws when the rule is absent, which is itself the defect these tests exist to catch
 */
async function restrictionsFor(eslint: ESLint, filePath: string): Promise<RestrictedImports> {
  const config = (await eslint.calculateConfigForFile(filePath)) as
    { rules?: Record<string, unknown[]> } | undefined
  // An ignored path resolves to no config at all rather than to a config with no rules — two different
  // facts, and conflating them would let "nothing applies here" read as "the rule is simply absent".
  if (config === undefined)
    throw new Error(`${filePath} is covered by no config at all — the boundary is not held`)
  const rule = config.rules?.['no-restricted-imports']
  if (rule === undefined)
    throw new Error(
      `no-restricted-imports does not apply to ${filePath} — the boundary is not held`
    )
  const options = rule[1]
  if (typeof options !== 'object' || options === null)
    throw new Error(`no-restricted-imports has no options for ${filePath}`)
  return options
}

/** Every group pattern the rule forbids for a file, flattened. */
function forbiddenPatterns(restrictions: RestrictedImports): string[] {
  return (restrictions.patterns ?? []).flatMap((entry) => entry.group)
}

/** Every package name the rule forbids for a file. */
function forbiddenPackages(restrictions: RestrictedImports): string[] {
  return (restrictions.paths ?? []).map((entry) => entry.name)
}

/** Resolved once per layer, because booting ESLint's config resolution is the slow part. */
const resolved = new Map<string, RestrictedImports>()

/** A real file in each layer that owns a boundary row, plus one the package-wide row alone covers. */
const LAYERS = {
  view: 'src/view/viewport.ts',
  geometry: 'src/geometry/hitTest.ts',
  state: 'src/state/editionSlice.ts',
  canvas: 'src/canvas/painter.ts',
  components: 'src/components/MapCanvas.tsx',
  root: 'src/main.tsx',
} as const

describe('architecture boundaries', () => {
  beforeAll(async () => {
    const eslint = new ESLint()
    for (const [layer, filePath] of Object.entries(LAYERS)) {
      resolved.set(layer, await restrictionsFor(eslint, filePath))
    }
  }, 120_000)

  describe('happy path', () => {
    it('applies the rule to every layer, which is the thing that silently stopped being true', () => {
      for (const layer of Object.keys(LAYERS)) {
        expect(resolved.has(layer), `${layer} resolves no restrictions`).toBe(true)
      }
    })

    it('forbids the store to the two pure layers', () => {
      for (const layer of ['view', 'geometry']) {
        const patterns = forbiddenPatterns(resolved.get(layer) ?? {})

        expect(patterns, `${layer} must not reach state/`).toContain('**/state/**')
        expect(patterns, `${layer} must not reach the composition root`).toContain('**/main')
      }
    })

    it('forbids three.js across the whole package, the entry included', () => {
      for (const layer of Object.keys(LAYERS)) {
        expect(
          forbiddenPackages(resolved.get(layer) ?? {}),
          `${layer} must refuse three`
        ).toContain('three')
      }
    })
  })

  describe('variants', () => {
    it('composes the package ban with the layer direction, rather than replacing it', () => {
      // `no-restricted-imports` is a single rule, so a directory row that carried only a direction
      // would erase the three.js ban for every file under it. Both halves have to survive together.
      const view = resolved.get('view') ?? {}

      expect(forbiddenPackages(view)).toContain('three')
      expect(forbiddenPatterns(view)).toContain('**/state/**')
    })

    it('leaves view/ readable from above — a direction, not a symmetry', () => {
      // Forbidding this was the mistake of 2026-10-05: `view/` is a leaf, read from above exactly as
      // core's geo/ is read by its data/, and step 4d puts the settled viewport in a slice.
      const patterns = forbiddenPatterns(resolved.get('state') ?? {})

      expect(patterns).not.toContain('**/view/**')
      expect(patterns).not.toContain('**/view')
    })

    it('keeps core’s projection maths reachable from the pure layers', () => {
      for (const layer of ['view', 'geometry']) {
        const patterns = forbiddenPatterns(resolved.get(layer) ?? {})

        expect(patterns, `${layer} must still read geo/`).not.toContain('**/geo/**')
      }
    })

    it('carries a message that names the boundary and explains it', () => {
      const entry = (resolved.get('view')?.patterns ?? [])[0]

      expect(entry?.message).toContain('Architecture boundary')
      expect(entry?.message).toContain('view/')
    })
  })

  describe('managed errors', () => {
    it('refuses a file the rule does not cover, rather than reporting a held boundary', async () => {
      const eslint = new ESLint()

      // `dist` is ignored by this package's config, so nothing applies to it.
      await expect(restrictionsFor(eslint, 'dist/assets/index.js')).rejects.toThrow(
        /the boundary is not held|not held|ignored/i
      )
    }, 120_000)
  })

  describe('unmanaged errors', () => {
    // L4: N/A — the resolution happens in `beforeAll`, so a failure there fails the suite outright
    // instead of being swallowed. There is deliberately no fallback: a boundary that cannot be measured
    // must not report itself as held, which is what `restrictionsFor` throws for.
    it('treats an absent rule as a failure and not as an empty set', async () => {
      const eslint = new ESLint()

      await expect(restrictionsFor(eslint, 'src/view/viewport.ts')).resolves.toBeDefined()
    }, 120_000)
  })

  describe('edge cases', () => {
    it('polices a .tsx the same as a .ts, the globs naming both', async () => {
      // The entry is `main.tsx`; a `*.ts` glob would have left it outside every row, which is the family
      // of defect known-issues records four other instances of.
      const eslint = new ESLint()

      const tsx = await restrictionsFor(eslint, 'src/main.tsx')

      expect(forbiddenPackages(tsx)).toContain('three')
    }, 120_000)

    it('forbids the composition root to be imported from anywhere that has a row', () => {
      for (const layer of ['view', 'geometry', 'state', 'canvas', 'components']) {
        const patterns = forbiddenPatterns(resolved.get(layer) ?? {})

        expect(patterns, `${layer} must not import main`).toContain('**/main.{ts,tsx}')
      }
    })

    it('lets the painter and the components read the layers below them', () => {
      // `canvas/` paints what the store holds, through `view/`'s arithmetic; `components/` wires them
      // together. Forbidding either would be the symmetry mistake made once already on `state/`.
      for (const layer of ['canvas', 'components']) {
        const patterns = forbiddenPatterns(resolved.get(layer) ?? {})

        expect(patterns, `${layer} must read view/`).not.toContain('**/view/**')
        expect(patterns, `${layer} must read geometry/`).not.toContain('**/geometry/**')
        expect(patterns, `${layer} must read state/`).not.toContain('**/state/**')
      }
    })
  })
})
