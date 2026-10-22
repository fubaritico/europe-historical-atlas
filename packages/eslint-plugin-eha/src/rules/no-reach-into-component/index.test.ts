import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, it } from 'vitest'

import rule from './index.js'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

/** TypeScript's parser; the rule reads no type. */
const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser } })

/** The components' folder, as an absolute path a real file would have. */
const ROOT = '/repo/packages/cartographer/src/components'

/**
 * A case: an import written in a file under the components' folder.
 * @param path - the importing file, under `src/components/`
 * @param code - the code
 * @returns the case
 */
const from = (path: string, code: string) => ({ code, filename: `${ROOT}/${path}` })

/**
 * The message for an import reaching inside a folder.
 * @param source - what was imported
 * @param folder - the folder reached into
 * @returns the expected error
 */
const reaching = (source: string, folder: string) => ({
  message:
    `\`${source}\` reaches inside \`${folder}\`.\n` +
    `Import what \`${folder}\` shares from \`${folder}\` itself — its \`index\` — the rest is its own.`,
})

describe('eha/no-reach-into-component', () => {
  describe('happy path', () => {
    ruleTester.run('through the barrel only', rule, {
      valid: [from('Editor.tsx', "import { PolitiesPanel } from './PolitiesPanel'")],
      invalid: [
        {
          ...from('Editor.tsx', "import { useForm } from './PolitiesPanel/hooks/usePolityForm'"),
          errors: [reaching('./PolitiesPanel/hooks/usePolityForm', 'PolitiesPanel')],
        },
      ],
    })
  })

  describe('variants', () => {
    ruleTester.run('every way in, and every way allowed', rule, {
      valid: [
        from('Editor.tsx', "import { PolitiesPanel } from './PolitiesPanel/index'"),
        // Inside the folder, its files reach one another freely.
        from('PolitiesPanel/PolitiesPanel.tsx', "import { Foot } from './internal/PolitiesFoot'"),
        from('PolitiesPanel/internal/PolitiesFoot.tsx', "import { useX } from '../hooks/useX'"),
        // A flat file at the components' root is no folder's inside.
        from('Editor.tsx', "import { PolityList } from './PolityList'"),
        // A package is no component.
        from('Editor.tsx', "import { useState } from 'react'"),
        // What several components use sits beside `components/`, no folder's inside (the dev, 2026-10-22).
        from('Editor/Editor.tsx', "import { useLocale } from '../../hooks/useLocale'"),
        // A component's `utils/` and `i18n/` are its own, reached freely from inside the folder.
        from('ToolRail/internal/ToolButton.tsx', "import { headLabel } from '../utils/headLabel'"),
      ],
      invalid: [
        // A folder named `shared` is no exception any more: a folder in `components/` is a component's.
        {
          ...from('Editor/Editor.tsx', "import { polityRows } from '../shared/polityRows'"),
          errors: [reaching('../shared/polityRows', 'shared')],
        },
        // Nor are a component's helpers and catalogue anyone else's.
        {
          ...from('Editor/Editor.tsx', "import { headLabel } from '../ToolRail/utils/headLabel'"),
          errors: [reaching('../ToolRail/utils/headLabel', 'ToolRail')],
        },
        {
          ...from('Editor.tsx', "import { Foot } from './PolitiesPanel/internal/PolitiesFoot'"),
          errors: [reaching('./PolitiesPanel/internal/PolitiesFoot', 'PolitiesPanel')],
        },
        {
          ...from('Editor.tsx', "import { PolitiesPanel } from './PolitiesPanel/PolitiesPanel'"),
          errors: 1,
        },
        {
          ...from(
            'ToolRail/ToolRail.tsx',
            "import { Foot } from '../PolitiesPanel/internal/PolitiesFoot'"
          ),
          errors: 1,
        },
        {
          ...from('Editor.tsx', "export { useX } from './PolitiesPanel/hooks/useX'"),
          errors: 1,
        },
        { ...from('Editor.tsx', "export * from './PolitiesPanel/hooks/useX'"), errors: 1 },
        {
          ...from('Editor.tsx', "const m = import('./PolitiesPanel/internal/PolitiesFoot')"),
          errors: [reaching('./PolitiesPanel/internal/PolitiesFoot', 'PolitiesPanel')],
        },
        {
          ...from('Editor.tsx', "type F = import('./PolitiesPanel/internal/PolitiesFoot').Foot"),
          errors: [reaching('./PolitiesPanel/internal/PolitiesFoot', 'PolitiesPanel')],
        },
      ],
    })
  })

  describe('managed errors', () => {
    ruleTester.run('from outside the components', rule, {
      valid: [],
      invalid: [
        {
          code: "import { Foot } from '../components/PolitiesPanel/internal/PolitiesFoot'",
          filename: '/repo/packages/cartographer/src/state/store.ts',
          errors: 1,
        },
      ],
    })
  })

  describe('unmanaged errors', () => {
    ruleTester.run('a declaration without a source', rule, {
      valid: [
        from('Editor.tsx', 'const a = 1\nexport { a }'),
        from('Editor.tsx', 'const m = import(`./${name}`)'),
      ],
      invalid: [],
    })
  })

  describe('edge cases', () => {
    ruleTester.run('a path that climbs out and back in', rule, {
      valid: [
        from(
          'PolitiesPanel/hooks/usePolityForm.ts',
          "import { x } from '../../PolitiesPanel/internal/EditDialog'"
        ),
      ],
      invalid: [
        {
          ...from(
            'ToolRail/hooks/useX.ts',
            "import { x } from '../../PolitiesPanel/hooks/usePolityForm'"
          ),
          errors: 1,
        },
      ],
    })
  })
})
