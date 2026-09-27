/**
 * The Cartographer's working format: **one folder per year, three files inside it.**
 *
 * `registry.json` says who exists that year, `polities.json` what they hold, `borders.json` how their
 * limits are dressed. Nothing is shared between years and no file refers to another folder — decided
 * 2026-09-27, and the reason is that the link between two dates is made by the reader, not by the data
 * (`files/plans/cartographer/format.md`).
 *
 * **The one idea to carry away**: a ring is a list of *anchor indices*, never a list of coordinates. Two
 * rings holding the same run of indices are the same points, so a sliver cannot appear between them —
 * there is nothing to drift apart.
 *
 * **Why Zod here and hand-written readers for the four original assets.** Roadmap chapter 07 chose guards
 * over a library and named the case that would reverse it: the contribution tooling, which is this. Three
 * nested formats that the editor *writes* as well as reads is where a schema earns its weight — and the
 * chapter's own objection to guards ("the guard can drift from the type it guards") is what this file
 * would otherwise have created. Measured first: the worker's import graph never reaches a reader, so
 * nothing here can land in the 13.5 kB compute chunk the CI guards.
 *
 * **Types are declared, not inferred.** `z.infer` would drop every field's documentation, which this
 * codebase requires on any exported interface. Each schema is annotated `z.ZodMiniType<T>` instead, so a
 * schema that stops producing its type fails the build — drift prevented from the other direction.
 *
 * **Every object is strict**: an unrecognised key is an error, not something stripped in silence. A
 * hand-authored file with `colours` for `colour` would otherwise lose a pinned colour with nothing said,
 * which is the plausible-substitution failure `rules/error-handling.md` singles out.
 *
 * **`zod/mini` rather than the chained API, and it is measured.** Same validation, a functional shape —
 * `z.string().check(z.minLength(1))` here, `z.string().min(1)` in the classic build; `z.nullable(x)` rather
 * than `x.nullable()`, which is a function and not a method. Probed on 2026-09-27 by importing one schema
 * into the atlas and building: the classic build costs **+25.10 kB gzipped**, mini **+5.82 kB**, against a
 * 185.68 kB bundle. Verbosity for 19 kB is a trade this project takes — the splash screen's whole
 * silhouette cost 4.3 kB.
 */

import { z } from 'zod/mini'

import type { GeoBounds } from '../geo/mercator'

/** A pinned colour, as a six-digit hex string. */
const hexColour = z.nullable(
  z.string().check(z.regex(/^#[0-9a-fA-F]{6}$/, 'should be a #rrggbb hex colour'))
)

/** A Wikidata entity id. Checked in shape only — we never resolve it. */
const wikidataId = z.nullable(
  z.string().check(z.regex(/^Q\d+$/, 'should be a Wikidata id like Q70972'))
)

/** A year, negative for BCE. Whole, because this project authors years and not instants. */
const year = z.int()

/** An index into a year's `anchors` array. */
const anchorIndex = z.int().check(z.nonnegative())

/**
 * One polity, valid for the year of the file it sits in.
 *
 * Every field is that year's truth and is written once in it. A name is a string, not a dated list: two
 * years are two files, so *regnum Francorum* in 1100 and *Royaume de France* in 1659 need no machinery to
 * tell apart.
 */
export interface YearPolity {
  /** Ours, readable, unique within this year. Never a display name. */
  id: string
  /** The name that year, as it was written — "Reaume de France" is period spelling, not a typo. */
  name: string
  /**
   * Its dignity: `empire`, `kingdom`, `duchy`, `county`… OHM's `border_type`.
   *
   * Left open rather than a union: OHM is a wiki, the vocabulary grows, and a closed union would reject
   * real data. Measured 2026-09-27 — only 28 of the 52 polities alive at 1100 carry one at all.
   */
  rank: string | null
  /** Its standing: `country`, `personal_union`, `condominium`… OHM's `place`. Open, for the same reason. */
  status: string | null
  /**
   * The id, **in this same file**, of the polity it owes homage to. `null` when it owes nobody.
   *
   * A plain field because the file is one year: in 1100 Aquitaine owes France and the 1100 registry says
   * so; in 1260 it does not and the 1260 registry does not. A rear-vassal is a chain of these.
   */
  suzerain: string | null
  /**
   * When the polity began.
   *
   * **A fact about the polity, not a reference to another file** — which is the distinction that keeps it
   * here: it is read against this same file's `year`, and that is what warns "this polity did not exist in
   * 1110" after a year is derived from an earlier one.
   */
  existsFrom: number | null
  /** When it ended. `null` = it outlives this year as far as we know. */
  existsTo: number | null
  /** A pinned colour as a hex string; `null` leaves it to the palette by adjacency. */
  colour: string | null
  /**
   * Wikidata `Q…`, for **checking** that two entries mean the same polity — never for identity.
   *
   * Measured 2026-09-27: OHM gives each period its own Q-id, so grouping by it split the Kingdom of France
   * into four. It identifies a polity *during a period*, which is not a polity.
   */
  wikidata: string | null
}

/** {@link YearPolity}. */
export const yearPolitySchema: z.ZodMiniType<YearPolity> = z.strictObject({
  id: z.string().check(z.minLength(1)),
  name: z.string().check(z.minLength(1)),
  rank: z.nullable(z.string()),
  status: z.nullable(z.string()),
  suzerain: z.nullable(z.string()),
  existsFrom: z.nullable(year),
  existsTo: z.nullable(year),
  colour: hexColour,
  wikidata: wikidataId,
})

/** `<year>/registry.json` — who exists that year. */
export interface YearRegistry {
  /** Format version, so a reader can refuse a shape it does not know. */
  version: number
  /** The year, inside the file — not only in its folder's name. */
  year: number
  /** Every polity of that year. */
  polities: YearPolity[]
}

/** {@link YearRegistry}. */
export const yearRegistrySchema: z.ZodMiniType<YearRegistry> = z.strictObject({
  version: z.int().check(z.gte(1)),
  year,
  polities: z.array(yearPolitySchema),
})

/** Where a stretch of geometry came from, and under what terms. */
export interface YearProvenance {
  /** Referenced by `anchorSource` and by a border's `source`. */
  id: number
  /** What it is, in one clause — "Natural Earth 10m coastline", "reported by eye — Duby (reference)". */
  name: string
  /** What may be done with it — `public domain`, `CC0`, `fact`. */
  licence: string
}

/** {@link YearProvenance}. */
export const yearProvenanceSchema: z.ZodMiniType<YearProvenance> = z.strictObject({
  id: z.int().check(z.nonnegative()),
  name: z.string().check(z.minLength(1)),
  licence: z.string().check(z.minLength(1)),
})

/** What one polity holds that year, as rings of anchor indices. */
export interface YearClaim {
  /** An id from the same year's registry. No name here, ever. */
  polity: string
  /**
   * Every ring, outer and hole alike, each an ordered list of indices into {@link YearPolities.anchors}.
   *
   * Which ring is a hole and which is a second piece is decided by containment, not declared — the same
   * even-odd contract the atlas already consumes. Fewer than three indices cannot enclose an area.
   */
  rings: number[][]
}

/** {@link YearClaim}. */
export const yearClaimSchema: z.ZodMiniType<YearClaim> = z.strictObject({
  polity: z.string().check(z.minLength(1)),
  rings: z.array(z.array(anchorIndex).check(z.minLength(3))),
})

/** Ground the author left unclaimed on purpose, so the pre-publication check stops reporting it. */
export interface DeliberateGap {
  /** The ring enclosing it, as anchor indices. */
  ring: number[]
  /** Why it is empty — a no-man's-land between marches, a frontier zone. */
  reason: string
}

/** {@link DeliberateGap}. */
export const deliberateGapSchema: z.ZodMiniType<DeliberateGap> = z.strictObject({
  ring: z.array(anchorIndex).check(z.minLength(3)),
  reason: z.string().check(z.minLength(1)),
})

/** `<year>/polities.json` — what was held that year. */
export interface YearPolities {
  /** Format version. */
  version: number
  /** The year. */
  year: number
  /** The window the author works in, distinct from the render frame. */
  editorialZone: GeoBounds
  /** The sources the geometry was taken from. */
  sources: YearProvenance[]
  /** Every point of the year, once. **An anchor's id is its index in this array.** */
  anchors: [number, number][]
  /** Which source each anchor came from. Parallel to {@link anchors}, same length. */
  anchorSource: number[]
  /** What each polity holds. */
  claims: YearClaim[]
  /** Unclaimed ground declared on purpose. */
  deliberateGaps: DeliberateGap[]
}

/**
 * A geographic box whose edges are the right way round.
 *
 * The ordering check is what catches a north/south swap, which otherwise flips the whole map upside down
 * with no error anywhere — the same reasoning as `expectBounds` in the hand-written readers.
 */
const geoBoundsSchema: z.ZodMiniType<GeoBounds> = z
  .strictObject({
    west: z.number(),
    south: z.number(),
    east: z.number(),
    north: z.number(),
  })
  .check(
    z.refine((box) => box.east > box.west, 'east should be east of west'),
    z.refine((box) => box.north > box.south, 'north should be north of south')
  )

/** {@link YearPolities}. The anchors/anchorSource length agreement is a consistency check, not a schema one. */
export const yearPolitiesSchema: z.ZodMiniType<YearPolities> = z.strictObject({
  version: z.int().check(z.gte(1)),
  year,
  editorialZone: geoBoundsSchema,
  sources: z.array(yearProvenanceSchema),
  anchors: z.array(z.tuple([z.number(), z.number()])),
  anchorSource: z.array(z.int().check(z.nonnegative())),
  claims: z.array(yearClaimSchema),
  deliberateGaps: z.array(deliberateGapSchema),
})

/**
 * What a limit *is*, as an editorial fact.
 *
 * Ours and closed, unlike `rank` and `status`, because nothing outside this project supplies it.
 *
 * `indefinite` is `format.md`'s *undefined* renamed: as a string literal beside TypeScript's own
 * `undefined` it reads as a bug rather than as a cartographic statement about a boundary nobody fixed.
 */
export type BorderFact = 'agreed' | 'de-facto' | 'contested' | 'indefinite'

/** {@link BorderFact}. */
export const borderFactSchema = z.enum(['agreed', 'de-facto', 'contested', 'indefinite'])

/**
 * How a border is drawn, when the author says so rather than letting the rule decide.
 *
 * `null` on every field means "leave it to the derived rule". The vocabulary of `hand` is owned by the
 * editorial hands table, not by this type — a table's rows are data, and closing them into a union here
 * would mean editing code to add a stroke.
 */
export interface BorderDress {
  /** Which row of the editorial hands table draws it; `null` = let the derived relation choose. */
  hand: string | null
  /** An id from the year's `sources`: where this border's course was read. */
  source: number | null
  /** Anything the author wants to say about it. */
  note: string | null
}

/** A border dressed by naming its two owners — the whole boundary between them. */
export interface PairBorder extends BorderDress {
  /** Two ids from the same year's registry. The pair is unordered. */
  between: [string, string]
  /** What the limit is, as a fact. */
  type: BorderFact
}

/** The three fields every dressed border carries. */
const borderDressFields = {
  hand: z.nullable(z.string().check(z.minLength(1))),
  source: z.nullable(z.int().check(z.nonnegative())),
  note: z.nullable(z.string()),
}

/** {@link PairBorder}. */
export const pairBorderSchema: z.ZodMiniType<PairBorder> = z.strictObject({
  ...borderDressFields,
  between: z.tuple([z.string().check(z.minLength(1)), z.string().check(z.minLength(1))]),
  type: borderFactSchema,
})

/**
 * A border dressed by naming a run of anchors — that stretch and nothing else, whatever it separates.
 *
 * This is "I selected a line and gave it a style". **A run beats a pair, a pair beats the derived rule.**
 * It stores indices, so it cannot drift: move anchor 51 and the dressed stretch moves with it, because it
 * *is* anchor 51.
 */
export interface RunBorder extends BorderDress {
  /** Indices into the same year's `anchors`, in order. Two make a segment. */
  run: number[]
}

/** {@link RunBorder}. */
export const runBorderSchema: z.ZodMiniType<RunBorder> = z.strictObject({
  ...borderDressFields,
  run: z.array(anchorIndex).check(z.minLength(2)),
})

/** `<year>/borders.json` — how the year's limits are dressed. Never their geometry. */
export interface YearBorders {
  /** Format version. */
  version: number
  /** The year. */
  year: number
  /** Dressed by pair of polities. */
  pairs: PairBorder[]
  /** Dressed by run of anchors, which wins over a pair. */
  runs: RunBorder[]
}

/** {@link YearBorders}. */
export const yearBordersSchema: z.ZodMiniType<YearBorders> = z.strictObject({
  version: z.int().check(z.gte(1)),
  year,
  pairs: z.array(pairBorderSchema),
  runs: z.array(runBorderSchema),
})

/** One authored year, its three files read together. */
export interface AuthoredYear {
  /** The year all three files agree on. */
  year: number
  /** Who existed. */
  registry: YearRegistry
  /** What they held. */
  polities: YearPolities
  /** How their limits are dressed. */
  borders: YearBorders
}

/** The format version these schemas write and accept. */
export const YEAR_FORMAT_VERSION = 1
