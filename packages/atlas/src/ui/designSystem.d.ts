/**
 * The design system's tokens sheet, imported for its side effect in `ui/styles/sheets.ts` (ATLAS-519).
 *
 * `noUncheckedSideEffectImports` is on, and Vite's client types only declare `*.css` — a pattern this package subpath
 * does not end with (`./css`, mapped to a `.css` file by the package's `exports`). Declared here, by name, rather than
 * by turning the guard off — the Cartographer's `ui/designSystem.d.ts`, same reason. The components sheet,
 * `@fubaritico/styles`, joins it the day it is loaded (ATLAS-520).
 */
declare module '@fubaritico/tokens/css' {}
