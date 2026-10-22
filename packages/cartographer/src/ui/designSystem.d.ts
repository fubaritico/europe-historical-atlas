/**
 * The design system's two stylesheets, imported for their side effect in `main.tsx`.
 *
 * `noUncheckedSideEffectImports` is on, and Vite's client types only declare `*.css` — a pattern these
 * two package subpaths do not end with (`./css` and `.`, mapped to `.css` files by the packages'
 * `exports`). So `tsc` cannot see them as stylesheets and refuses the imports.
 *
 * Declared here, by name and only these two, rather than by turning the guard off: every other bare
 * side-effect import stays checked. What this gives up is `tsc` noticing a subpath the design system
 * removes — Vite still resolves through `exports` at build time, so that failure stays loud.
 */
declare module '@fubaritico/tokens/css' {}

/** See `@fubaritico/tokens/css` above: the skin, `@layer ui.components`, same reason. */
declare module '@fubaritico/styles' {}
