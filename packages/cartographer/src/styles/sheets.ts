/**
 * Every stylesheet the Cartographer loads, in the one order that works — imported by the application
 * (`main.tsx`) and by the workbench (`workbench/workbench.tsx`) alike, so the two cannot show different
 * cascades.
 *
 * **What decides precedence, sheet by sheet:**
 *
 * - the **tokens** come first, because the skin reads `var(--color-*)` out of them;
 * - the **skin** sits in `@layer ui.components`, so anything unlayered beats it whatever the order;
 * - our **theme** redeclares the tokens on `:root`, unlayered like the tokens sheet — so here the order
 *   does decide, and it must come after them (`theme.test.ts` holds it);
 * - the **reset** is in `@layer ui.reset`, beneath the skin (`reset.test.ts` holds it);
 * - the **shell** is unlayered, so it beats both layers;
 * - the **editor chrome**, the fineness pass over the skin's components, is unlayered and last.
 */
import '@fubaritico/tokens/css'
import '@fubaritico/styles'
import './theme.css'
import './reset.css'
import '../components/shell.css'
import './editor-chrome.css'
