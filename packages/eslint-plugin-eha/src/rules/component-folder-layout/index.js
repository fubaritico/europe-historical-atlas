import { componentPathOf, componentsDirOf } from '../../utils/componentPath.js'
import { topLevel } from '../../utils/topLevel.js'

/**
 * Where each entity sits in a component's folder — the dev's call, 2026-10-18: a hook only that component uses
 * lives in its `hooks/` folder, a child component only it uses in its `internal/` folder, and the component
 * itself at the folder's root, `<Name>/<Name>.tsx`. Read from the file's path and what it declares at its top;
 * the barrel (`index`) and the tests are left alone, and a flat file at the components' root is not held yet.
 */

/**
 * Whether a file is one the rule leaves alone: the folder's barrel, or a test.
 * @param {string} file - the file's name
 * @returns {boolean} `true` to skip it
 */
const isExempt = (file) => /^index\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file)

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'A component folder holds its hooks in `hooks/`, its children in `internal/`',
    },
    schema: [
      {
        type: 'object',
        properties: { componentsDir: { type: 'string' } },
        additionalProperties: false,
      },
    ],
    messages: {
      hookOutsideHooks:
        'Move `{{name}}` to `{{folder}}/hooks/{{name}}.ts`.\n' +
        'A hook only `{{folder}}` uses lives in its `hooks/` folder.',
      childOutsideInternal:
        'Move `{{name}}` to `{{folder}}/internal/{{name}}.tsx`.\n' +
        'A component only `{{folder}}` uses lives in its `internal/` folder.',
      mainNotAtRoot:
        'Move `{{name}}` to `{{folder}}/{{name}}.tsx`.\n' +
        'The component a folder is named after sits at its root, beside its barrel.',
    },
  },
  create: (context) => {
    const place = componentPathOf(context.filename, componentsDirOf(context))
    if (place === null || isExempt(place.file)) return {}
    const where = place.inner.join('/')
    const folder = place.folder
    return {
      Program: (program) => {
        const { hooks, components } = topLevel(program)
        for (const hook of hooks)
          if (where !== 'hooks')
            context.report({
              node: hook.node,
              messageId: 'hookOutsideHooks',
              data: { name: hook.name, folder },
            })
        for (const component of components) {
          const main = component.name === folder
          const misplaced = main ? where !== '' : where !== 'internal'
          if (misplaced)
            context.report({
              node: component.node,
              messageId: main ? 'mainNotAtRoot' : 'childOutsideInternal',
              data: { name: component.name, folder },
            })
        }
      },
    }
  },
}

export default rule
