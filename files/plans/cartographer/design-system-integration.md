# Wiring `fubaritico-ds` into the Cartographer — the plan

> Written 2026-10-09 at the end of the session, from the four tarballs the dev produced the same
> evening and from two Illustrator screenshots. **Nothing here is built yet.** This is the next
> session's instruction sheet, so it says what to do, in what order, and what each step must prove.
>
> Source: `~/Desktop/WebstormProjects/fubaritico-ds/dist-tarballs/` — `INSTALL.md`, `INTEGRATION.md`
> and four `.tgz` at version `0.1.0`.
>
> **Revised 2026-10-09 afternoon**: the design system is now **published on GitHub Packages** at
> `0.2.0`, under a new scope — `@fubaritico/*`, with `reference` renamed `@fubaritico/react`. The
> tarballs are gone; step 1 below is rewritten. Its own `INTEGRATION.md`, at the root of
> `fubaritico-ds`, is the current reference.

## What the design system actually ships — read, not assumed

| package | what it is | needed |
| --- | --- | --- |
| `@fubaritico/tokens` | tokens as CSS custom properties, plus a TS object. `./css` and `./tailwind` subpaths | **yes** |
| `@fubaritico/styles` | the native BEM skin, plain CSS inside `@layer ui.components` | **yes** |
| `@fubaritico/variants` | CVA resolvers, pure TS, no React and no DOM | pulled in by `react` |
| `@fubaritico/behaviors` | behaviour services (`TabsService`, colour conversions), pure TS | pulled in by `react` |
| `@fubaritico/react` | the React components, **no Tailwind** | **yes** |

**One API change from the 0.1.0 tarballs worth knowing before using `Tabs`**: it runs on
`TabsService` now — `useTabsContext` is gone (→ `useTabsController()`), the ARIA attributes it owns are
no longer accepted as props, and a `defaultValue` matching no tab selects the first. Per-component
READMEs ship in `node_modules/@fubaritico/react/dist/components/<Name>/README.md`; read their
**Notes** before using a component.

**Every component the polity form needs is there**: `Modal`, `Input`, `Dropdown`, `Listbox`,
`Checkbox`, `Button`, `IconButton`, `Typography`, `Tabs`, `Tooltip`, `Alert`.

**What is not there, and only one of them matters to us**: no colour picker, no `Toast`, no
`DatePicker`, no `Carousel`, no `next/*` adapters beyond `NextLinkButton`.

## The three things to know before writing a line

**1. The shipped theme is light, and there is no dark one.** Measured in
`tokens/dist/css/variables.css`: `--color-background: #ffffff`, `--color-foreground: #171717`, and
**no** `prefers-color-scheme` block and **no** `[data-theme]` selector anywhere in the tokens or the
skin. So the dark skin is ours to write. The dev said as much; it is written here because it is the
single largest piece of the work and nothing in the packages hints at it.

**2. The override ladder, and the third rung is the one that matters.** `INTEGRATION.md` gives three:

- per instance, through `--ui-<block>-*` custom properties — **thin**: `Modal` exposes two
  (`--ui-modal-backdrop-opacity`, `--ui-modal-place-items`);
- per theme, by redefining a token — this is where the dark skin lives;
- **anything else**: the skin is inside `@layer ui.components`, so **any unlayered rule of ours
  wins**, with no specificity war and no `!important`.

The dev was surprised there were not more per-component properties. The answer is that the third
rung makes them unnecessary — a plain `.ui-button { … }` in our own sheet beats the layer outright.

**3. A trap that would read as a broken component.** *Never set `display` on `Modal` or `Drawer`.*
They are native `<dialog>` elements; the browser hides a closed one with
`dialog:not([open]) { display: none }`, and **any author `display` overrides it**, leaving the panel
permanently on screen. Position their content with `--ui-modal-place-items` or a rule on a child.

Two smaller ones from the same document: the components import **no CSS by side effect** (forget the
two imports and everything renders correct, accessible and completely unstyled), and the DS ships
**no reset** — which we already have, the preflight landed on 2026-10-08.

## What the Illustrator screenshots are for — and what they are not

**The dev's instruction, 2026-10-09, and it decides the whole visual brief**: *« les screenshots
Illustrator sont là pour te guider… toi tu as déjà ton propre code couleur, tu as déjà tes propres
palettes. Pour que tu te fasses une idée du design fin, des petits contrôles de formulaire. »*

So what is taken from them is **the fineness and the proportions**, never the colours:

- controls that are **small** and tight — a field is a line of text with a hairline around it, not a
  padded box;
- a **1px hairline** everywhere: around fields, around grouped sections, under the title;
- labels **before** their field, right-aligned, in a dimmer ink than the value;
- a **focus ring**, and it is the one place a saturated colour appears;
- an accent used for **three things only** — the active tab, the chosen item in a list, the focus
  ring;
- the dialogue's title bar **darker** than its body, title centred.

And what is **not** taken: Illustrator's light pill-shaped Cancel/OK. The dev's call —
*« pour les boutons cancel et OK, fais autrement : sombre, avec des traits fins, comme pour les
champs des dropdowns, un filet fin avec un ring autour au focus »*. So the buttons read like the
fields they sit under, not like a foreign widget.

**The colours come from ours**: `design/chrome.css`'s dark set, already in
`components/shell.css` — `--bg #22201d`, `--panel #2b2926`, `--raised #35322e`, `--line #45403a`,
`--ink #e8e3d8`, `--ink-dim #a49a8c`, and the reserved `--accent #5b93d6`, which is the focus ring.

## The plan, in five steps

Each one verifies and commits alone, as every step of P4 has.

### 1 · Install the three packages from GitHub Packages

`@fubaritico/{tokens,styles,react}` at `^0.2.0` in `packages/cartographer/package.json`; a root
`.npmrc` routing the `@fubaritico` scope to `npm.pkg.github.com` and reading `NODE_AUTH_TOKEN`; the
CI's `setup` action passing `github.token`, and `packages: read` on the installing jobs.

**What it must prove**: `pnpm install --frozen-lockfile` succeeds, and `pnpm build` still produces
the worker chunk at 13 490 bytes.

**What it costs**: a token, locally and in CI, even though the packages are public — GitHub Packages
requires one to install. The details, and why the local one is a `read:packages`-only PAT rather than
the `gh` login, are in `known-issues.md`.

### 2 · The two CSS imports, and the order

In `main.tsx`, before `shell.css`:

```ts
import '@fubaritico/tokens/css'
import '@fubaritico/styles'
```

The order is not cosmetic: the skin resolves `var(--color-*)` out of the tokens sheet.

**What it must prove**: the measured cost of the two sheets, gzipped, written into the commit. And
that the preflight still comes first — `*{border-width:0}` after the skin would erase its borders.

### 3 · The dark override sheet — `src/styles/theme.css`

One file redefining the tokens the skin reads, with our values. Not a copy of the token sheet: only
what changes.

```css
:root {
  --color-background: #22201d;
  --color-background-subtle: #2b2926;
  --color-background-muted: #35322e;
  --color-foreground: #e8e3d8;
  --color-foreground-muted: #a49a8c;
  --color-foreground-subtle: #7d7468;
  --color-border: #45403a;
  --color-border-muted: #3c3833;
  --color-primary: #5b93d6;
}
```

**Every value is already in the project** — they are `chrome.css`'s, which `shell.css` already
carries. Nothing is invented, and the two sheets must not drift: `shell.css`'s own `:root` block
disappears into this one, so there is a single declaration of each.

**What it must prove, and it is a real test rather than a look**: a contrast assertion. `--ink-dim`
on `--panel` was measured at 5.25:1 when the design was written; the override must not break that,
and `A11Y-101`'s lesson is that a palette edit reintroduces a contrast failure silently. A test over
the pairs the form actually uses.

### 4 · The fineness pass — `src/styles/editor-chrome.css`

Unlayered rules, so they beat `@layer ui.components` without `!important`. This is where the
Illustrator reading lands:

- `.ui-input`, `.ui-dropdown`: hairline border, small radius, tight padding, `--accent` ring on
  `:focus-visible`;
- `.ui-button`: the same treatment rather than a filled pill — the dev's call;
- `.ui-modal`: a title bar darker than the body, the whole dialogue on `--panel` over a dimmed
  backdrop.

**What it must prove**: that the rules actually win. Verified by reading the computed style in a
test, not by looking — the whole point of `@layer` is that precedence is not obvious, and a rule
that quietly loses is this repository's most expensive shape of defect.

### 5 · Then, and only then, `4d-2 (c2)`

The polity form itself, which is what all of the above exists for: `[+ New polity]`, the eight
fields, the target notice. The **state is already built and tested** (step `4d-2 (c1)`, 2026-10-08):
`createPolity`, `toolSlice.aimAt`, `describeDrawingTarget`, `core/editor/polityId`. The wiring is two
lines — `if (createPolity(p, step)) aimAt(p.id)`.

**The colour field, and the dev's call of 2026-10-09**: there is no colour picker in the design
system and he will look at building one *after* a `Toast`. Until then the form offers **no colour**
and the value stays `null`, which the format already means as *"the palette decides"* — so nothing
is faked and nothing has to be undone later. He said it plainly: *« on part sur des couleurs
aléatoires d'abord. »*

## What this plan does NOT do

- **It does not touch `(d)`** — the second canvas and the two tools wired to `documentEdits` and
  `history`. That is the larger piece and it needs none of this.
- **It does not restyle the canvas.** The painter's values come from `canvas/style.ts` and are not
  CSS at all; the design system has no opinion about what is drawn on a canvas.
- **It does not add a colour picker.** See above.
