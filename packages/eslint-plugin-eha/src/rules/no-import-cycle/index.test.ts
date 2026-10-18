import { chmodSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { Linter, RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { specifiersOf } from './graph.js'

import rule from './index.js'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

/** TypeScript's parser; the rule reads no type. */
const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser } })

/** The fixtures' root: a folder of our own under the system's temp folder, removed after the suite. */
const ROOT = mkdtempSync(join(tmpdir(), 'eha-no-import-cycle-'))

afterAll(() => {
  rmSync(ROOT, { recursive: true, force: true })
})

/** The remedy every message ends with. */
const REMEDY = "The child declares its type and the parent's extends it."

/**
 * Write a scenario's files under a folder of its own — the rule reads the linted file's neighbours from disk.
 * @param name - the scenario's folder
 * @param files - each file's path in the folder, and its text
 * @returns the folder, absolute
 */
const scenario = (name: string, files: Record<string, string>) => {
  const folder = join(ROOT, name)
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true })
    writeFileSync(join(folder, path), text)
  }
  return folder
}

/**
 * A case linting one file of a scenario, with the text it has on disk.
 * @param name - the scenario's folder
 * @param files - its files
 * @param linted - the file linted, among them
 * @returns the case
 */
const lint = (name: string, files: Record<string, string>, linted: string) => {
  const folder = scenario(name, files)
  return { code: files[linted] ?? '', filename: join(folder, linted) }
}

/**
 * The error for a cycle.
 * @param steps - the files of the cycle, relative to the linted file's folder
 * @returns the expected error
 */
const cycle = (...steps: string[]) => ({ message: `Import cycle: ${steps.join(' → ')}. ${REMEDY}` })

/**
 * A linter running the rule alone, for the cases a `RuleTester` cannot stage (a file changed between two
 * lints, a file unreadable).
 * @param code - the linted text
 * @param filename - the linted file
 * @returns the messages
 */
const verify = (code: string, filename: string) =>
  new Linter({ cwd: ROOT }).verify(
    code,
    [
      {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: { eha: { rules: { 'no-import-cycle': rule } } },
        languageOptions: { parser: tseslint.parser },
        rules: { 'eha/no-import-cycle': 'error' },
      },
    ],
    filename
  )

describe('eha/no-import-cycle', () => {
  describe('happy path', () => {
    ruleTester.run('two files importing each other', rule, {
      valid: [
        lint(
          'happy-valid',
          { 'a.ts': "import { b } from './b'", 'b.ts': 'export const b = 1' },
          'a.ts'
        ),
      ],
      invalid: [
        {
          ...lint(
            'happy',
            { 'a.ts': "import { b } from './b'", 'b.ts': "import { a } from './a'" },
            'a.ts'
          ),
          errors: [cycle('a.ts', 'b.ts', 'a.ts')],
        },
      ],
    })
  })

  describe('variants', () => {
    ruleTester.run('every way a cycle closes', rule, {
      valid: [
        // A diamond: two ways to one file, no way back.
        lint(
          'diamond',
          {
            'a.ts': "import { b } from './b'\nimport { c } from './c'",
            'b.ts': "import { d } from './d'",
            'c.ts': "import { d } from './d'",
            'd.ts': 'export const d = 1',
          },
          'a.ts'
        ),
        // Explicit extensions, as written: `./a.js` names `a.js`, a file of its own — not `a.ts`.
        lint(
          'explicit',
          {
            'a.ts': "import { b } from './b.ts'",
            'b.ts': "import { a } from './a.js'",
            'a.js': '',
          },
          'a.ts'
        ),
        // A cycle the linted file only reaches is not its own: b ↔ c is reported in b and c.
        lint(
          'beside',
          {
            'a.ts': "import { b } from './b'",
            'b.ts': "import { c } from './c'",
            'c.ts': "import { b } from './b'",
          },
          'a.ts'
        ),
      ],
      invalid: [
        {
          // The case `import/no-cycle` skips: closed by types only, on both sides.
          ...lint(
            'type-only',
            {
              'a.ts': "import type { B } from './b'\nexport type A = { b: B }",
              'b.ts': "import type { A } from './a'\nexport type B = { a: A }",
            },
            'a.ts'
          ),
          errors: [cycle('a.ts', 'b.ts', 'a.ts')],
        },
        {
          ...lint(
            'inline-type',
            { 'a.ts': "import { type B } from './b'", 'b.ts': "export type { A } from './a'" },
            'a.ts'
          ),
          errors: [cycle('a.ts', 'b.ts', 'a.ts')],
        },
        {
          ...lint(
            'three',
            {
              'a.ts': "import { b } from './b'",
              'b.ts': "import { c } from './c'",
              'c.ts': "import { a } from './a'",
            },
            'a.ts'
          ),
          errors: [cycle('a.ts', 'b.ts', 'c.ts', 'a.ts')],
        },
        {
          ...lint(
            'export-star',
            { 'a.ts': "export * from './b'", 'b.ts': "export * from './a'" },
            'a.ts'
          ),
          errors: [cycle('a.ts', 'b.ts', 'a.ts')],
        },
        {
          // The form `ts.preProcessFile` misses, measured on 5.7.3 — hence the syntax tree in `graph.js`.
          ...lint(
            'export-star-as',
            { 'a.ts': "import { b } from './b'", 'b.ts': "export * as a from './a'" },
            'a.ts'
          ),
          errors: [cycle('a.ts', 'b.ts', 'a.ts')],
        },
        {
          ...lint(
            'dynamic',
            {
              'a.ts': "export const load = () => import('./b')",
              'b.ts': "export const load = () => import('./a')",
            },
            'a.ts'
          ),
          errors: [cycle('a.ts', 'b.ts', 'a.ts')],
        },
        {
          ...lint(
            'import-type-node',
            { 'a.ts': "type B = import('./b').B", 'b.ts': "type A = import('./a').A" },
            'a.ts'
          ),
          errors: [cycle('a.ts', 'b.ts', 'a.ts')],
        },
        {
          // `./folder` resolves to its barrel, and the barrel's `..` back to the file.
          ...lint(
            'index',
            {
              'a.ts': "import { b } from './folder'",
              'folder/index.ts': "import { a } from '../a'",
            },
            'a.ts'
          ),
          errors: [cycle('a.ts', 'folder/index.ts', 'a.ts')],
        },
        {
          // The repository's shape: a parent and its child under `internal/`, the child naming the parent's type.
          ...lint(
            'tsx',
            {
              'PolityForm.tsx':
                "import { PolityFields } from './internal/PolityFields'\nexport type PolityFormProps = { id: string }",
              'internal/PolityFields.tsx':
                "import type { PolityFormProps } from '../PolityForm'\nexport const PolityFields = (props: PolityFormProps) => <p>{props.id}</p>",
            },
            'PolityForm.tsx'
          ),
          languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
          errors: [cycle('PolityForm.tsx', 'internal/PolityFields.tsx', 'PolityForm.tsx')],
        },
        {
          // Seen from the child, the path climbs.
          ...lint(
            'tsx-child',
            {
              'Parent.tsx': "import { Child } from './internal/Child'",
              'internal/Child.tsx': "import type { P } from '../Parent'",
            },
            'internal/Child.tsx'
          ),
          errors: [cycle('Child.tsx', '../Parent.tsx', 'Child.tsx')],
        },
        {
          // Once per declaration: the value import and the type import are two ways back.
          ...lint(
            'per-declaration',
            {
              'a.ts': "import { b } from './b'\nimport type { B } from './b'",
              'b.ts': "import { a } from './a'",
            },
            'a.ts'
          ),
          errors: [cycle('a.ts', 'b.ts', 'a.ts'), cycle('a.ts', 'b.ts', 'a.ts')],
        },
      ],
    })
  })

  describe('managed errors', () => {
    ruleTester.run('what is not followed', rule, {
      valid: [
        // A package: no cycle crosses one.
        lint('bare', { 'a.ts': "import { useState } from 'react'" }, 'a.ts'),
        // A missing file: the type checker reports it; an edge to nothing closes no cycle.
        lint('missing', { 'a.ts': "import { b } from './b'" }, 'a.ts'),
        // A missing file deeper in the graph is skipped, not fatal.
        lint(
          'missing-deep',
          { 'a.ts': "import { b } from './b'", 'b.ts': "import { c } from './gone'" },
          'a.ts'
        ),
        // An asset, and a query: no module evaluated with the importer.
        lint(
          'assets',
          {
            'a.ts': "import './a.css'\nimport text from './b?raw'\nimport Worker from './b?worker'",
            'a.css': '',
            'b.ts': "import { a } from './a'",
          },
          'a.ts'
        ),
        // A non-literal dynamic import names nothing the rule can follow.
        lint(
          'dynamic-variable',
          {
            'a.ts': "const name = './b'\nexport const load = () => import(name)",
            'b.ts': "import { a } from './a'",
          },
          'a.ts'
        ),
      ],
      invalid: [],
    })
  })

  describe('unmanaged errors', () => {
    it('follows a neighbour that does not parse, from what it does name', () => {
      const folder = scenario('broken', {
        'a.ts': "import { b } from './b'",
        'b.ts': "import { a } from './a'\nconst = ;",
      })
      expect(verify("import { b } from './b'", join(folder, 'a.ts'))).toHaveLength(1)
    })

    it.skipIf(process.getuid?.() === 0)(
      'fails the lint on a neighbour that exists but cannot be read',
      () => {
        const folder = scenario('unreadable', { 'a.ts': "import { b } from './b'", 'b.ts': '' })
        chmodSync(join(folder, 'b.ts'), 0o000)
        try {
          expect(() => verify("import { b } from './b'", join(folder, 'a.ts'))).toThrow(/EACCES/)
        } finally {
          chmodSync(join(folder, 'b.ts'), 0o644)
        }
      }
    )
  })

  describe('edge cases', () => {
    ruleTester.run('the smallest cycle', rule, {
      valid: [],
      invalid: [
        {
          ...lint('self', { 'a.ts': "import { a } from './a'" }, 'a.ts'),
          errors: [cycle('a.ts', 'a.ts')],
        },
      ],
    })

    it('reads the linted text, not the file on disk', () => {
      const folder = scenario('unsaved', { 'a.ts': '', 'b.ts': "import { a } from './a'" })
      expect(verify("import { b } from './b'", join(folder, 'a.ts'))).toHaveLength(1)
    })

    it('reads a neighbour again once it has changed', () => {
      const folder = scenario('changed', { 'a.ts': '', 'b.ts': "import { a } from './a'" })
      const filename = join(folder, 'a.ts')
      expect(verify("import { b } from './b'", filename)).toHaveLength(1)
      writeFileSync(join(folder, 'b.ts'), 'export const b = 1')
      const later = new Date(Date.now() + 60_000)
      utimesSync(join(folder, 'b.ts'), later, later)
      expect(verify("import { b } from './b'", filename)).toHaveLength(0)
    })

    it('finds a file written after a first lint missed it', () => {
      const folder = scenario('appears', { 'a.ts': '', 'b.ts': "import { c } from './c'" })
      const filename = join(folder, 'a.ts')
      expect(verify("import { b } from './b'", filename)).toHaveLength(0)
      writeFileSync(join(folder, 'c.ts'), "import { a } from './a'")
      expect(verify("import { b } from './b'", filename)).toHaveLength(1)
    })

    it('walks a wide and deep graph without blowing up', () => {
      // Every layer imports every file of the next: 5^39 paths, 200 files.
      const files: Record<string, string> = {}
      const width = 5
      const depth = 40
      for (let layer = 0; layer < depth; layer += 1)
        for (let column = 0; column < width; column += 1)
          files[`n${String(layer)}_${String(column)}.ts`] =
            layer + 1 < depth
              ? Array.from(
                  { length: width },
                  (_, next) => `import './n${String(layer + 1)}_${String(next)}'`
                ).join('\n')
              : ''
      files['a.ts'] = "import './n0_0'"
      const folder = scenario('wide', files)
      const started = performance.now()
      expect(verify("import './n0_0'", join(folder, 'a.ts'))).toHaveLength(0)
      expect(performance.now() - started).toBeLessThan(5_000)
    })

    it('reads every form of import, ignoring comments and strings', () => {
      const text = [
        "import a from './a'",
        "import type { B } from './b'",
        "export * from './c'",
        "export * as d from './d'",
        "export type { E } from './e'",
        "const f = import('./f')",
        "type G = import('./g').G",
        "import h = require('./h')",
        "// import x from './comment'",
        'const s = "import y from \'./string\'"',
      ].join('\n')
      expect(specifiersOf('x.ts', text)).toEqual([
        './a',
        './b',
        './c',
        './d',
        './e',
        './f',
        './g',
        './h',
      ])
    })
  })
})
