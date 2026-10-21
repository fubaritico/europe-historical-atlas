# `@europe-historical-atlas/core`

The part of the atlas that has nothing to do with drawing: the file formats, the readers that validate
them, the compositing that turns elevation into a painted texture, and the projection maths.

**It is consumed by every application in this repository** — the atlas today, the cartographer next. That
is the point: the editor writes what the map reads, **with the same code**, so the two cannot drift. The
borders once had two sources of truth and the gaps that came out of it took a session to understand.

## Two contracts, both enforced rather than documented

**No three.js.** ESLint refuses the import anywhere in this package. What it buys is measured: the
compute worker ships at **13.5 kB with no renderer in it**. Verified by breaking the rule on purpose.

**No DOM.** This package compiles against `lib: ["ESNext", "WebWorker"]` — `document` and `window` do not
exist here, and `tsc` says so. That is stronger than a convention: it is what lets `pipeline/` run inside
a Worker, and it would let the whole package run under Node.

> Both were _already true_ before they were enforced — the check was added to keep them true. It caught
> two modules the same day (`editableFocus`, `motion`: browser concerns that had drifted in) and one
> `as unknown as` cast that existed only to paper over the wrong lib.

## The layers, and which way they point

```
utils/   ← leaf: small pure helpers, importing nothing at all
geo/     ← leaf: Mercator projection maths
i18n/    ← leaf: the message engine — ICU MessageFormat, ours, and typed catalogues in fr and en
time/    ← the historical date — instant or interval, circa, Julian ↔ Gregorian, no year zero; reads i18n/
data/    ← the domain and its ports: heightmap, land mask, rivers, regions, asset errors
pipeline/← the CPU work the map costs: rasterising, expanding claims, deriving borders, compositing
editor/  ← the Cartographer's document model: anchors, rings, edits, history
```

`data/` reads `geo/` and `utils/`. `pipeline/` and `editor/` read the layers above them, never each other.
**Nothing reads `pipeline/`** except an application. `i18n/` reads only `utils/`; `time/` reads `utils/` and
`i18n/` (its words); whatever is dated reads it. Each arrow is an ESLint rule, listed as a table in the root `eslint.config.js`.

**Why a date is not a `Date`**: what this project dates is a year, an interval or a "circa", almost never a
day, and a day of 1066 is Julian — a calendar neither `Date`, `Intl` nor `Temporal` has. `time/` holds the
type, the reader that refuses a bad date with its reason (`readHistoricalDate`), the conversion through
the Julian Day Number, and the text a reader sees ("1337–1453", "vers 1100", "44 av. J.-C.").

**Why our own ICU engine**: no label is written in the code (the dev's call, 2026-10-21) — every text an
application shows is a message in a catalogue, in French and English. The syntax is ICU MessageFormat, the
standard translators read; the engine is ours, about two hundred lines over `Intl.PluralRules`, with no
dependency. A missing translation fails `tsc`; a malformed message or a missing value throws, and the
tests read every catalogue.

## It is not built, on purpose

```json
"exports": { "./*": "./src/*.ts" }
```

One line, and no `dist/`. `@europe-historical-atlas/core/utils/math` resolves straight to
`src/utils/math.ts`. TypeScript follows it (`moduleResolution: "bundler"`), Vite follows it, and Vitest
follows it through Vite.

**Why there is no build step:** nothing outside this repository consumes the package, every consumer is
already a bundler that compiles TypeScript, a `dist/` is an output that goes stale, and tree-shaking is
_better_ from source because the bundler sees the real module graph.

**When one would become necessary:** publishing to npm, or a consumer that cannot compile TypeScript. A
Next application (Payload) is not one — it needs `transpilePackages`, a single line of config.

**Why subpath exports and not a barrel `index.ts`:** a barrel would route the whole graph through one
entry, flattening four layers into one namespace and — the expensive part — making `pipeline/`
inseparable from the rest. That is precisely how three.js would end up inside the worker chunk.

## Tests

Twenty suites, run from the workspace root with `pnpm test`. Everything here is exercisable with
literals: no canvas, no renderer, no network. A module that cannot be tested that way does not belong in
this package.
