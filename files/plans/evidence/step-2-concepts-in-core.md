# Step 2 — the concepts in `core` (DESIGN-262) — CORE-270

> **Proposed, 2026-10-22, nothing coded.** The design of rung 2 of `../evidence-system.md` §10: *territory,
> dependence, bond; source, claim, evidence; attestation and concordance computed. Pure, tested with literals.*
> Written while the dev is away from his screen, for him to read before any line is written. Every choice below
> is **mine** unless the plan's §9 already records it as his; §8 lists what is his to decide.

## 1. What this rung delivers, and what it does not

**Delivers**: a pure module, `packages/core/src/evidence/`, with the types of the ten concepts and two
computations — **attestation** and **concordance** — tested with literals. It reads `time/` (the historical
date, CORE-217) and nothing else.

**Does not**, on purpose — each is a later rung:

| not here | where |
| --- | --- |
| a file on disk, a register to edit | rung 3, the source register |
| fetching evidence from Wikidata or elsewhere | rung 4, REPO-261 |
| recording a choice between claims | rung 5, arbitration (its type is sketched in §6 so the rest leaves room for it) |
| splitting `YearPolity` into territory, holder, bond in the year files | rung 6 |
| blur and hatching on the map | rungs 7 and 8 |
| events | CORE-252, afterwards: an event is one more kind of claim (§7) |

## 2. The source — what the register will list

```ts
interface Source {
  id: string                      // ours, stable: "hewsen-2001", "euratlas-1100", "wikidata"
  kind: SourceKind                // what kind of witness — reliability is weighed per kind (§5)
  citation: Citation              // author, title, publisher, year, page/plate, url — what a mention prints
  licence: string                 // "CC BY-SA 3.0", "all rights reserved", "public domain"
  use: 'calque' | 'reference'     // traced, or read for facts — decides what passes to a year
  derivesFrom: string[]           // the sources it copies: Armenica.org's map → ["hewsen-2001"]
}
type SourceKind = 'primary' | 'historian-atlas' | 'scholarly' | 'encyclopaedia' | 'crowd-database'
```

- **It is the line `/create-data-mention` already logs on ATLAS-152**, field for field: regions aside, the same
  author, declared source, licence, calque or référence, URL. At rung 3 that checklist becomes records of this type.
- **`derivesFrom` is what makes principle 3 computable** — *a source counts once*. Today's case: the Commons map
  of the Shaddadids declares itself redrawn from Hewsen's atlas; with `derivesFrom: ["hewsen-2001"]`, the two
  are **one witness**, whatever their number.

## 3. What claims are about — territory, holder

```ts
interface Territory { id: string; name: string; wikidata: string | null }   // Champagne, Blois, Berry
interface Holder    { id: string; name: string; kind: 'person' | 'house'; wikidata: string | null }
```

The three notions of §4 of the plan, separated: the **territory** is the land, stable across years; the
**holder** is who holds it; the **bond** is a claim between them (below). Nothing here touches `YearPolity` —
the year files keep their merged unit until rung 6.

## 4. The claim and its evidence

A **claim** is one statement about the world **at a date** — a `HistoricalDate` from CORE-217, so *circa 1100*
and *1125–1284* are both expressible. One union, one shape per thing that can be claimed:

```ts
type Claim =
  | { id; kind: 'dependence'; territory; on: string; date }        // Champagne depends on the Kingdom of France
  | { id; kind: 'holding';    territory; holder; date }            // the house of Blois holds Champagne
  | { id; kind: 'bond';       holder; for: string; of: string; date } // the count, for Champagne, is the man of the king
  | { id; kind: 'begins';     territory; date }                    // the emirate of Kemakh-Erzincan begins in 1072
  | { id; kind: 'ends';       territory; date }                    // … and ends in 1228
```

**Existence is two claims, a beginning and an end** (the dev, 2026-10-23, §8 Q4): each is compared like any
date, with its own precision — Gemini's *« fin Xe siècle – 1182 »* has a vague start and an exact end.

**Evidence** is what one source says of one claim, and where:

```ts
interface Evidence {
  claim: string                       // a claim id
  source: string                      // a source id
  stance: 'supports' | 'contradicts'
  locator: string                     // "p. 128", "plate 23", "statement Q842091/P17"
  checked: 'to-verify' | 'verified'   // has anyone opened the source at that place? (the dev, 2026-10-23)
  via: string | null                  // the tool that brought it — "gemini", a connector — never a source itself
}
```

**A tool that searches is not a witness** (the dev, 2026-10-23). Gemini — or any language model, me included —
gathers: the sources **it cites** are entered in the register and give the evidence, marked *to-verify* until
someone has opened them at that place, then *verified*. Models invent citations (a real book, a page that does not
say it), hence the mark. Measured on his example (the emirate of Kemakh-Erzincan, 22/10): nearly every citation was
Wikipedia, so the whole answer is **one witness**, an encyclopaedia. Whether *to-verify* weighs less in concordance
is **not decided** — for now it is shown, not weighed.

**Existence is claimed, not a field.** Today `existsFrom` / `existsTo` sit on `YearPolity` as facts. In the
machine they are `begins` and `ends` claims with evidence like the rest — principle 0, nothing outside the machine. This rung only
defines the kind; moving the year files' dates into it is rung 6.

**The two other kinds of uncertainty** — *imprécision* (the thing was vague) and *litige* (history was divided) —
are claims the contributor makes, **not computed** (plan §1). I propose they come with the rungs that draw them
(a vague limit already exists for tribes; the disputed zone is rung 8), not here — **decided by the dev, §8 Q5.**

## 5. The two computations

### Which claims compete — the *question*

Concordance is agreement **among competing answers**, so the first thing to compute is what competes. A
**question** is a kind of claim, its subject, and a period: *Champagne — depends on whom? — around 1100*. Two
claims answer the same question when they have the same kind and subject and **their dates overlap**.

| kind | subject (what the question is about) | the answer that varies |
| --- | --- | --- |
| `dependence` | the territory | `on` |
| `holding` | the territory | `holder` |
| `bond` | the holder and the land (`for`) | `of` |
| `begins` | the territory | `date` — two beginnings agree when their windows overlap (§8 Q3) |
| `ends` | the territory | `date` — likewise |

### Attestation — a count

**How many independent witnesses support a claim.** Sources are grouped into **witnesses**: a source and
everything it derives from, transitively, are one witness (a union-find over `derivesFrom`). Two supporting
pieces of evidence from Armenica.org and from Hewsen give an attestation of **1**.

### Concordance — a measure of agreement, never of truth

For a claim *c* in a question *Q*:

```
concordance(c) = Σ weight(w) over the witnesses that support c
                 ─────────────────────────────────────────────
                 Σ weight(w) over every witness that speaks on Q
```

- **weight(w)** is the weight of the witness's kind, from a table **the contributor sets** (§8, point 4 of the
  plan: *the order of weight between kinds of source is set there, by the contributor*). It is **injected** —
  the computation never holds a default of its own.
- A witness that **contradicts** *c* counts in the denominator, not the numerator.
- A witness is counted once per question, whatever the number of its evidence.
- Between 0 and 1. **0 with no witness at all is not 0**: a claim nobody speaks of has **no** concordance — the
  answer is `null`, and the screen says *sans source* (principle 1), never a low gauge.

**Illustrative only**, invented numbers: Champagne around 1100, weights `historian-atlas` 3, `crowd-database` 1.
Two atlases say *depends on France*, Wikidata says nothing, one encyclopaedia (weight 2) says *depends on the
county of Blois*. Concordance of *France*: 6 / 8 = 0.75; of *Blois*: 2 / 8 = 0.25. The screen shows both, with
their sources, and the contributor arbitrates (rung 5).

## 6. Arbitration — only its place, sketched

```ts
interface Arbitration { question; chosen: string; by: string; at: HistoricalDate | string; because: string[] }
```

Not built at this rung. Sketched so that nothing above closes the door: the chosen claim and the evidence ids
that decided it, signed; the others are kept (principle 7).

## 7. What CORE-252 then takes from it

An event (*Hastings, 14 October 1066*) becomes **one more kind of claim** — its date and place are claims, its
sources are register sources, its evidence is the same `Evidence`. CORE-252 then defines only what is specific
to an event (title, nature, actors, consequences) and reuses the rest. That is why the order was set this way
on 19/10.

## 8. Questions for the dev

1. ~~**The kinds of source** and their weights~~ — **decided by the dev, 2026-10-22**: five kinds, weights
   `primary` 4 · `historian-atlas` 3 · `scholarly` 3 · `encyclopaedia` 2 · `crowd-database` 1 (*« on peut partir sur ce
   barème-là »*). Still a table the contributor can change, injected, never a default inside the computation.
2. ~~**A contradicting witness lowers concordance**~~ — **decided by the dev, 2026-10-23**, as proposed: it counts
   in the denominator (*« on va déjà essayer de travailler comme ça, on verra si c'est cohérent »* — a trial, to be
   judged on real cases). Counting only support was refused: a contested claim would look as good as an undisputed one.
3. ~~**When do two dates overlap**~~ — **decided by the dev, 2026-10-23: both** (*« par défaut c'est plus ou moins
   10 ans, et après ça reste réglable »*). A *circa* instant is read as a window of **±10 years by default**; a date
   may carry its own margin (*circa 1100, ±5*), which wins over the default. The default lives in the contributor's
   settings, injected beside the weights — never a constant inside the computation. So *circa 1100* (1090–1110)
   competes with *1105*.
4. ~~**Existence**~~ — **decided by the dev, 2026-10-23**: two claims, a beginning and an end, each compared as a
   date (§4). One interval would have needed a rule of its own — an exception. Same day, same yes: **a tool that
   searches (Gemini) is not a witness**; its cited sources are, marked *to-verify* / *verified* (§4).
5. ~~**Vagueness and dispute**~~ — **decided by the dev, 2026-10-23**: modelled with their drawing rungs (the vague
   limit with the tribes' feather, the dispute with the hatched zone, rung 8), as claims like the others; nothing in
   this rung closes the door to them.
6. ~~**A holder**~~ — **decided by the dev, 2026-10-23**: a person or a house, both allowed, as the sources say it
   (*Mengücek Ahmed Gazi* in 1100, *the Mengüjekids* over the whole span). A bond of homage names a person when one
   is known. **Every person and every house carries its Wikidata id** (*« faut blinder au niveau information »*): the
   id identifies — it settles which Hugh — and is not a witness; Wikidata speaking on a claim is evidence of a
   crowd-database (weight 1) like any other. `null` while not found (CARTO-269 asks to tell *not searched yet* from
   *no item*). His idea, same day: a genealogy could be drawn from it (Wikidata's father, mother, family) — CORE-271
   in Idées.

## 9. How it will be verified

Every computation tested with literals, the five levels of `rules/tests.md`. The guards that matter, each
checked against the plausible naive code (`known-issues/testing.md`):

- **two copies count once** — the naive code counts sources, not witnesses; the test must fall on it;
- **a transitive copy counts once** — A from B from C: the naive code follows one hop only;
- **no witness is `null`, not 0** — the naive division answers `NaN` or 0;
- **a contradiction lowers the gauge** — the naive code ignores `stance`;
- **claims at disjoint dates do not compete** — the naive code groups by subject only.

Reading from `unknown` (a file, a form) follows `historicalDate.ts`: a schema, a refusal with its reason, the
refusal said through `warn`. **One error-handling choice is yours** (`rules/error-handling.md`): evidence naming a
source or a claim that is not there — proposed: **refused**, loudly, since silently dropping it would change a
concordance without anyone knowing.
