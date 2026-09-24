/**
 * What to tell the reader when an asset fails, and how much it costs them.
 *
 * At the root for the same reason `computeLabels` is: `data/` must not hold a sentence in a particular
 * language, and `ui/` must not know what a land mask is. The composition root is the only place that
 * legitimately knows both.
 *
 * The degraded-mode policy lives here too, and that is deliberate. Which layers are essential and which
 * are decor is a **product decision**, not an accident of which `catch` someone happened to write — the
 * roadmap's robustness chapter names it as one of the four things to build.
 */

import { isAssetError } from '@europe-atlas/core/data/assetError'

import type { Notice } from './ui/notice'
import type { AssetKind } from '@europe-atlas/core/data/assetError'

/** What the reader loses when an asset fails. */
export interface AssetPolicy {
  /** How the map is affected. */
  severity: Notice['severity']
  /** What it is called, in the reader's language. */
  label: string
  /** What the reader loses, in one sentence. */
  consequence: string
}

/**
 * Which assets the map cannot do without, declared rather than discovered.
 *
 * Relief is the map: without elevation there is no surface to paint, nothing to drape and nothing to
 * click. Everything else degrades — a mask falls back to an elevation threshold, and the rest is drawn
 * or not drawn.
 */
export const ASSET_POLICY: Record<AssetKind, AssetPolicy> = {
  heightmap: {
    severity: 'blocking',
    label: 'le relief',
    consequence: 'La carte ne peut pas être affichée.',
  },
  landMask: {
    severity: 'degraded',
    label: 'le masque des terres',
    consequence:
      'Le trait de côte est déduit de l’altitude : les polders néerlandais passent sous l’eau et les lacs fermés apparaissent comme des plaines.',
  },
  regions: {
    severity: 'degraded',
    label: 'les frontières historiques',
    consequence: 'La carte s’affiche sans les pays ni leurs frontières.',
  },
  rivers: {
    severity: 'degraded',
    label: 'les fleuves',
    consequence: 'La carte s’affiche sans le réseau hydrographique.',
  },
}

/** How each kind of failure reads, as the middle of a sentence. */
const FAILURE_PHRASE: Record<
  'transport' | 'schema' | 'consistency' | 'semantic' | 'unknown',
  string
> = {
  transport: 'n’a pas pu être chargé',
  schema: 'est illisible',
  consistency: 'est incomplet',
  semantic: 'ne correspond pas à cette carte',
  unknown: 'a échoué',
}

/**
 * Turn a caught failure into something worth showing.
 *
 * Any failure, not only an {@link AssetError}: a caller that cannot say which asset broke still has to
 * say that something did, and a silent catch is what this whole chapter exists to remove.
 * @param asset - which asset family was being loaded
 * @param error - whatever was caught
 * @returns the notice to post
 */
export function assetNotice(asset: AssetKind, error: unknown): Notice {
  const policy = ASSET_POLICY[asset]
  const failure = isAssetError(error) ? error.failure : 'unknown'
  const title = `${capitalise(policy.label)} ${FAILURE_PHRASE[failure]}. ${policy.consequence}`

  // The technical half is kept separate and quieter: it is for whoever can act on it, and naming a
  // field path in the headline would bury the sentence that matters.
  const detail = isAssetError(error)
    ? `${error.source} — ${error.detail}`
    : error instanceof Error
      ? error.message
      : undefined

  return { severity: policy.severity, title, ...(detail === undefined ? {} : { detail }) }
}

/**
 * Capitalise the first letter of a label so it can open a sentence.
 * @param text - the label
 * @returns the label with its first character upper-cased
 */
function capitalise(text: string): string {
  return text.replace(/^./, (first) => first.toUpperCase())
}
