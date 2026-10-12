import componentBodyOrder from './rules/component-body-order/index.js'
import hoistIndependentFunction from './rules/hoist-independent-function/index.js'

/**
 * The lint rules of the Europe historical atlas. They put every declaration where a reader expects it,
 * and their messages say what to write, with the reader's own names.
 *
 * Adapted from `eslint-plugin-fluid-react`, written by the dev for Fluid's React library.
 */
const plugin = {
  meta: { name: 'eslint-plugin-eha' },
  /** @type {Record<string, import('eslint').Rule.RuleModule>} */
  rules: {
    'component-body-order': componentBodyOrder,
    'hoist-independent-function': hoistIndependentFunction,
  },
}

export default plugin
