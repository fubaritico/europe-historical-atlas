# eslint-plugin-eha

The lint rules of the Europe historical atlas. They put every declaration where a reader expects it —
the same order, the same separator comments, in every component, hook and function — and when a rule
reports, its message says what to write, with your own names in it.

Adapted from `eslint-plugin-fluid-react`, which the dev wrote for Fluid's React library. What was kept,
changed and dropped is in `files/plans/eslint-plugin-eha/plan.md`.

## Why JavaScript

ESLint imports the plugin as it is. Node 22.14 cannot load a `.ts` file without a flag, and a build step
would put a `dist/` between a rule and every lint that runs it. The files are typed with JSDoc and checked
by `tsc` (`checkJs`), and the typed lint of the repository reads them like any other source.
