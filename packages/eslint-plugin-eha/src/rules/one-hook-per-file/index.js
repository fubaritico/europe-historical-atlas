import { topLevel } from '../../utils/topLevel.js'

/**
 * One hook per file, and none in a component's file — the dev's call, 2026-10-18: *« quand tu te balades
 * d'entité en entité … c'est plus facile à lire quand on les a séparément »*. A reader following a hook opens
 * the file that bears its name, and a component's file holds the component alone (with
 * `react/no-multi-comp` for the components themselves).
 *
 * Only top-level declarations count: a hook is a function named `use…` declared at the top of the module,
 * exported or not; a component, an uppercase function rendering JSX, wrapped (`memo(() => …)`) or not.
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'One hook per file, and no hook in a component’s file' },
    schema: [],
    messages: {
      besideComponent:
        'Move `{{hook}}` to its own file, `{{hook}}.ts`, beside this one.\n' +
        'A component’s file holds the component; its hooks sit next to it, one per file.',
      secondHook:
        'Move `{{hook}}` to its own file, `{{hook}}.ts`, beside this one.\n' +
        'One hook per file, named after it, so the reader opens the file that bears its name.',
    },
  },
  create: (context) => ({
    Program: (program) => {
      const { hooks, components } = topLevel(program)
      hooks.forEach((hook, index) => {
        if (components.length > 0)
          context.report({
            node: hook.node,
            messageId: 'besideComponent',
            data: { hook: hook.name },
          })
        else if (index > 0)
          context.report({ node: hook.node, messageId: 'secondHook', data: { hook: hook.name } })
      })
    },
  }),
}

export default rule
