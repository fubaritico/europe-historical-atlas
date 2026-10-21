# Rules — Error handling is a decision, not an implementation detail

> Added 2026-09-17, at the dev's request. **Every error-handling choice must be discussed before it is
> written.** Not reported afterwards — discussed, with the alternatives on the table.

## The rule

When the code reaches a point where something can be missing, wrong or absent, there is always more than
one thing to do about it:

- **surface it** — throw, reject, post a notice, refuse to continue;
- **handle it** — a declared degraded mode that does less and *says so*;
- **substitute** — a fallback value that lets the code carry on.

**Choosing between those is the dev's call, every time.** It is a product decision: it settles what the
reader sees when the world is not as expected. Deciding it silently while writing a line is how a
codebase ends up full of answers nobody chose.

### Operationally

Stop and ask before writing any of these:

- `?? something` standing in for a value that failed to arrive;
- a `catch` that continues rather than re-throwing;
- a default parameter that covers a missing collaborator rather than an optional one;
- a guard that returns early where the caller expected an answer;
- anything described in its own comment as a "fallback".

Bring three things to the question, not one: **what breaks**, **who learns that it happened**, and
**what the alternative costs**.

## No refusal is silent — decided by the dev, 2026-10-11

> *"Faut prévenir, faut tout couvrir parce que tu vas voir que ça va devenir extrêmement subtil. On ne
> peut pas se permettre de laisser les choses sans message."*

Whatever the branch chosen above, **something is said**. A guard that returns early, a refused gesture,
an entry a painter skips: each one logs, at least to the console, with the `[Cartographer]` (or the
application's) tag. Two levels, and the line is whether anything should have prevented it:

- **`console.warn`** — a gesture of the author's that the tool declines (a click off the map, ‹enter› on
  two anchors). Ordinary, and logged because the screen may show nothing.
- **`console.error`** — what no gesture should reach (the document refusing what the tool checked, a
  claim naming a polity the registry lacks). A defect, said loudly.

**Never per frame.** A check that would run on every repaint is run once per document version instead
(`documentFaults`), or the log drowns everything else. A refusal with an on-screen answer still logs —
the console is the one place a later, subtler failure can be traced back to.

## A label that cannot be built throws, and a boundary keeps the screen — decided by the dev, 2026-10-21

> *« On traduit en phase de développement, et en production il y aura toujours un label »* — so the code is
> expected to work, and a message missing one of its values is a defect, not a case to word over.

- **The i18n engine throws** on a message called without a value it names, or on a malformed pattern. Every
  catalogue entry is checked by the tests, so this is meant to fail there, not in front of a reader.
- **In the Cartographer, React error boundaries** keep the rest of the screen alive: where a component fails,
  its place shows the error message, **centred vertically and horizontally**. Where the boundaries sit is
  proposed systematically (in the shared `Panel` shell, plus one at the root) — pending the dev's answer.
- **In the atlas**, which has no React, the error net (ATLAS-42) shows any unexpected error on screen. Its own
  message takes no value, so it cannot fail this way.

## The distinction that makes the discussion tractable

Not every substitution is equal, and the difference is not how bad the failure is — it is **whether
anyone finds out**.

| | example in this codebase | verdict |
|---|---|---|
| **Declared degraded mode** — does less, and announces it | the land mask fails → the shoreline falls back to an elevation threshold, **and a notice is posted**; the severity is declared per asset in `assetMessages`, never inferred from which `catch` fired | a decision, taken and written down (roadmap 07) |
| **Loud propagation** — the wrong value stays visibly wrong | `easeInOut` carries a `NaN` through, so a broken frame time shows up at once as a camera that has gone nowhere | the dev's call, 2026-09-17 |
| **Silent substitution** — a plausible answer replaces a broken one | `reliefWorldY` reads a `NaN` elevation as **sea level**, because its two `>` comparisons both fail for `NaN` | never discussed; found by a test on 2026-09-17, and precisely what this rule exists to prevent |

The last row is the dangerous shape, and the reason is worth stating: **sea level is a plausible
answer.** Nothing downstream can tell it apart from a real one. A `NaN` that stays a `NaN` is a defect
that reports itself; a `NaN` that becomes zero is a defect that has been hidden.

## What this does *not* mean

It is not a ban on fallbacks. The land mask's degraded mode is a fallback, it was the right call, and
the map would be worse without it — a blank canvas is not more honest than an approximate shoreline, it
is just less useful. What was right about it is that it was **argued for, decided, and declared**.

## Existing handlers

Everything written before 2026-09-17 predates this rule and is **not retroactively re-opened** — that
would be a chantier of its own. But:

- **Touching a file re-opens its error handling.** If a fallback is in code being changed, raise it.
- The known silent ones are recorded in `known-issues.md` as they are found. `reliefWorldY` is the first.
