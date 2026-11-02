import { isAssetError } from '@europe-historical-atlas/core/data/assetError'
import { isMapName, yearNamed } from '@europe-historical-atlas/core/data/mapName'
import { assembleAuthoredYear } from '@europe-historical-atlas/core/data/yearConsistency'
import { parseYearManifest } from '@europe-historical-atlas/core/data/yearManifest'
import {
  parseYearBorders,
  parseYearPolities,
  parseYearRegistry,
} from '@europe-historical-atlas/core/data/yearSource'

import { formatYearJson } from './yearJson'

import type { AuthoredYear } from '@europe-historical-atlas/core/data/yearFormat'
import type { YearManifest } from '@europe-historical-atlas/core/data/yearManifest'

/**
 * Deciding what a save writes — the half of the dev server's year endpoint that touches no disk.
 *
 * **Why this is split from the middleware.** Everything that can be wrong with a save — a year that is not
 * a number, a file that fails its schema, three files that disagree, a manifest nobody can read — is decided
 * here, from data, and comes back as either a list of files to write or a refusal. The middleware only moves
 * bytes. So the whole policy is exercised with literals (`rules/modular-architecture.md`, first tripwire),
 * and no test needs a server or a temporary folder to learn whether a bad year is refused.
 *
 * **The rule the endpoint keeps: nothing reaches the disk that `core` would refuse to read back.** The three
 * files go through the very readers and cross-checks the atlas and the Cartographer open a year with
 * (`yearSource.ts`, `yearConsistency.ts`). A save that succeeds is therefore a year that reopens — which is
 * `s04`'s round trip, guarded at the one place a broken file could otherwise be born.
 */

/** One file a save writes, relative to the `years/` folder. */
export interface PlannedFile {
  /** Where it goes, relative to `years/` — `1100/registry.json`, or `index.json` for the manifest. */
  relativePath: string
  /** Its full text, already laid out (`formatYearJson`). */
  text: string
}

/** What a save will write, once every check has passed. */
export interface YearWritePlan {
  /** The map being saved — its folder's name under `years/` (`s19`). */
  map: string
  /** The year its files declare. */
  year: number
  /**
   * The three files of the year, then the manifest **last** when the year is new to it.
   *
   * Last on purpose: a manifest that lists a year whose files are not all written is the one state the
   * atlas cannot read and cannot explain (`s15`, *"one commit, not two"*). Absent when the year is already
   * listed — rewriting an unchanged manifest would only touch its date.
   */
  files: PlannedFile[]
}

/**
 * Why a save was refused, in the HTTP terms the middleware answers with.
 *
 * `400` — the request itself is malformed (the year segment, the body's shape). `422` — the year is
 * well-formed and wrong (a schema, a cross-check). `409` — the folder on disk is in a state no save should
 * write over (the manifest is missing or unreadable).
 */
export interface YearWriteRefusal {
  /** The HTTP status to answer with. */
  status: 400 | 409 | 422
  /** One sentence for the author, shown in the status bar as it is. */
  reason: string
}

/** Either the files to write, or why nothing will be. */
export type YearWriteDecision =
  { accepted: true; plan: YearWritePlan } | { accepted: false; refusal: YearWriteRefusal }

/** What the endpoint received, already read off the request. */
export interface YearWriteRequest {
  /** The map as it appeared in the URL — `/__years/1100-essai` gives `'1100-essai'`. Still a string: unchecked. */
  mapSegment: string
  /** The request body, parsed as JSON — of no known shape yet. */
  body: unknown
  /** The current `years/index.json`, as text; `null` when the file does not exist. */
  manifestText: string | null
}

/**
 * Build a refusal.
 * @param status - the HTTP status
 * @param reason - the sentence for the author
 * @returns the decision
 */
function refuse(status: YearWriteRefusal['status'], reason: string): YearWriteDecision {
  return { accepted: false, refusal: { status, reason } }
}

/**
 * Read the manifest the save will extend.
 *
 * **A missing or unreadable manifest refuses the save** rather than being recreated: it is committed in the
 * repository, so its absence means the endpoint is pointed at the wrong folder, and writing a fresh one
 * there would scatter a year where the atlas never looks.
 * @param text - the manifest's text, or `null` when absent
 * @returns the manifest, or the refusal to send
 */
function readManifest(text: string | null): YearManifest | YearWriteRefusal {
  if (text === null)
    return {
      status: 409,
      reason: 'years/index.json is missing — the save has nowhere to be listed',
    }
  try {
    return parseYearManifest(JSON.parse(text), 'years/index.json')
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error)
    return {
      status: 409,
      reason: `years/index.json cannot be read, so nothing was written: ${detail}`,
    }
  }
}

/**
 * Check the three files the way opening a year checks them, and bind them.
 *
 * The `catch` turns `core`'s failure into the refusal the author reads — it does not continue: a refused
 * save writes nothing. Only an {@link isAssetError} is turned into a refusal; anything else is a defect in
 * this code and is thrown on, so the middleware answers 500 and the console says why.
 * @param body - the request body
 * @param folder - the year's folder, for the messages
 * @returns the year, its three files checked and cross-checked, or the refusal
 */
function readYearFiles(body: unknown, folder: string): AuthoredYear | YearWriteRefusal {
  if (body === null || typeof body !== 'object' || Array.isArray(body))
    return { status: 400, reason: 'the body should be { registry, polities, borders }' }
  const { registry, polities, borders } = body as Record<string, unknown>
  try {
    return assembleAuthoredYear(
      {
        registry: parseYearRegistry(registry, `${folder}/registry.json`),
        polities: parseYearPolities(polities, `${folder}/polities.json`),
        borders: parseYearBorders(borders, `${folder}/borders.json`),
      },
      folder
    )
  } catch (error: unknown) {
    if (isAssetError(error)) return { status: 422, reason: error.message }
    throw error
  }
}

/**
 * Whether a value is a refusal rather than what was asked for.
 * @param value - either
 * @returns `true` for a refusal
 */
function isRefusal(value: object): value is YearWriteRefusal {
  return 'status' in value && 'reason' in value
}

/**
 * Decide what a save writes, or why it writes nothing.
 *
 * In order, stopping at the first problem: the map's name in the URL, the three files against their schemas and
 * against each other; then, **for a map named as a year only**, the year inside the files against its name — a folder
 * named 1200 holding 1100 would be published by the atlas as 1200 (`s19`) — and the manifest, which lists the years the
 * atlas reads. A map with any other name is a working map: the manifest is neither read nor written.
 *
 * **What is written is what `core` parsed, not what arrived.** The schemas are strict, so the two hold the
 * same fields; writing the parsed value means no stray key can ride along into the repository.
 * @param request - the map segment, the body and the current manifest
 * @returns the plan, or the refusal
 */
export function planYearWrite(request: YearWriteRequest): YearWriteDecision {
  const map = request.mapSegment
  if (!isMapName(map))
    return refuse(
      400,
      `"${map}" is not a map's name — letters, digits, "-", "_" and "." only, starting with a letter or a digit`
    )

  const authored = readYearFiles(request.body, `years/${map}`)
  if (isRefusal(authored)) return refuse(authored.status, authored.reason)

  const planned: PlannedFile[] = [
    { relativePath: `${map}/registry.json`, text: formatYearJson(authored.registry) },
    { relativePath: `${map}/polities.json`, text: formatYearJson(authored.polities) },
    { relativePath: `${map}/borders.json`, text: formatYearJson(authored.borders) },
  ]
  const year = yearNamed(map)
  if (year === null) return { accepted: true, plan: { map, year: authored.year, files: planned } }

  if (authored.year !== year)
    return refuse(
      422,
      `A map named ${map} is the map of the year ${map}, which the atlas publishes — this map is ${String(authored.year)}. Choose another name`
    )
  const manifest = readManifest(request.manifestText)
  if (isRefusal(manifest)) return refuse(manifest.status, manifest.reason)
  if (!manifest.years.includes(year)) {
    const listed: YearManifest = {
      ...manifest,
      years: [...manifest.years, year].sort((a, b) => a - b),
    }
    planned.push({ relativePath: 'index.json', text: formatYearJson(listed) })
  }
  return { accepted: true, plan: { map, year, files: planned } }
}
