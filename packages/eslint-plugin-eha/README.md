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

## The rules

| rule                             | where                                | fix                                                            |
| -------------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| `eha/component-body-order`       | the Cartographer, `**/*.{ts,tsx}`    | separators, and props moved into the signature when it is safe |
| `eha/hoist-independent-function` | every package, tests included        | moves the function to the module when it is safe               |
| `eha/no-import-cycle`            | every package, tests included        | none — the child declares its type, the parent's extends it    |
| `eha/one-hook-per-file`          | the Cartographer's component folders | none                                                           |
| `eha/component-folder-layout`    | the Cartographer's component folders | none — hooks in `hooks/`, children in `internal/`              |
| `eha/no-reach-into-component`    | the Cartographer, tests included     | none — import the folder's `index.ts`                          |

All are errors: one author, nothing to count down.

### `component-body-order`

A component or hook body declares, in this order, each group opened by its separator comment:

```
Guards → Store → Store actions → Context → Ids → Refs → State → Derived → Handlers → Effects → Render
```

In a hook the last group is `// Return`. A declaration never goes above what it reads, and nothing moves
across an early return or a statement the order says nothing of — the rule only asks for moves JavaScript
allows. Props are destructured in the signature, unless the body also uses them whole. A custom hook is
given the group of what it returns in the `hooks` option; the store's selector hook is named in `stores`,
and its actions are told from its values by their type.

### `hoist-independent-function`

A function declared at the top of another's body that reads nothing from it — no parameter, variable,
type parameter, `this`, `super` — belongs to the module. The fix moves it with its attached comments,
keeps every string byte for byte, and refuses when the name is taken or the code shares its lines.

### `no-inline-event-handlers`

A function written in an `on*` attribute of a component's render is declared in the body instead, under
`// Handlers`, and passed by name — the message proposes `handleClick`, then `handleButtonClick`, then a
number, so the name collides with nothing. When the function reads a `.map` row or a callback's
parameter, it cannot move up: the message asks for that part to become a component of its own. JSX no
component renders — a test's callback, a helper — is not a component body, and is left alone.
