# The plans

Everything that was decided, and why. About 6 100 lines. **Nobody reads that cold**, so here are three
ways in.

## 2 minutes — what is going on

Read [`plan.md`](plan.md). It says what is being built, in what order, and how we know a step is
finished. The table at the top lists the decisions that are closed and not to be reopened.

## 20 minutes — the reasoning

| read                                                       | why                                                                                                                                                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`cartographer/groundwork.md`](cartographer/groundwork.md) | the political pipeline as it actually runs today, step by step with `file:line`, then what the format has to become. The document that turned the project around. |
| [`inventory-2026-09-24.md`](inventory-2026-09-24.md)       | every planned thing with its real state — including what is **stale** and must not be read as current                                                             |
| [`glossaire.md`](glossaire.md)                             | the shared vocabulary. Written because the dev stopped following a conversation full of undefined words, and every new term has landed here since.                |

## Everything

```
plan.md                  the plan of record — supersedes any ordering found elsewhere
inventory-2026-09-24.md  what is planned, what is true, what is stale
glossaire.md             the vocabulary
roadmap.md               the chapter index

atlas/                   the map itself
  01-foundations · 02-milestone1-relief · 03-camera-ux · 04-atlas-data
  05-decisions · 07-robustness · focus-mode · readability-budgets

cartographer/            the contribution tool
  06-contribution-tooling.md   the chapter — annotated where later decisions reversed it
  groundwork.md                the pipeline, measured, and what the format must become
  format.md                    the file format, field by field
  ui-inventory.md              panels, dialogues, buttons, cursors, zoom
  scenarii/                    twelve Gherkin files + s00 index + s99, the ledger of holes
  design/                      the screens and the chrome — open the .html files in a browser
```

## How to read the scenarios

Start at [`cartographer/scenarii/s00-index.md`](cartographer/scenarii/s00-index.md). It states the one
thing that makes the rest legible: **every rule in them is a default, not a law.** Only two constraints
are real — anchors are shared between paths, and nothing GPL enters the geometry.

Then read [`cartographer/scenarii/s99-holes.md`](cartographer/scenarii/s99-holes.md), which is where the
scenarios paid for themselves: 26 questions nobody could answer, found by trying to describe a gesture
precisely enough to test it.

## What is not here

`files/resources/` is git-ignored: 170 MB of proprietary Euratlas vectors, a **reference** we may read
facts from and must never redistribute. `files/spikes/*/out/` is ignored too — it holds generated
payloads, including the GPL-3.0 border files.
