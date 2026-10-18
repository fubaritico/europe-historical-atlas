import componentBodyOrder from './rules/component-body-order/index.js'
import componentFolderLayout from './rules/component-folder-layout/index.js'
import hoistIndependentFunction from './rules/hoist-independent-function/index.js'
import noImportCycle from './rules/no-import-cycle/index.js'
import noInlineEventHandlers from './rules/no-inline-event-handlers/index.js'
import noReachIntoComponent from './rules/no-reach-into-component/index.js'
import oneHookPerFile from './rules/one-hook-per-file/index.js'

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
    'component-folder-layout': componentFolderLayout,
    'hoist-independent-function': hoistIndependentFunction,
    'no-import-cycle': noImportCycle,
    'no-inline-event-handlers': noInlineEventHandlers,
    'no-reach-into-component': noReachIntoComponent,
    'one-hook-per-file': oneHookPerFile,
  },
}

export default plugin
