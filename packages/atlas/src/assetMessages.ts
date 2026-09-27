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

import { isAssetError } from '@europe-historical-atlas/core/data/assetError'

import type { Notice } from './ui/notice'
import type { AssetKind } from '@europe-historical-atlas/core/data/assetError'

/** What the reader loses when an asset fails. */
export interface AssetPolicy {
  /** How the map is affected. */
  severity: Notice['severity']
  /** What it is called, in the reader's language. */
  label: string
  /**
   * How that label agrees, because French verbs and participles follow their subject.
   *
   * Not decoration: the labels are a mix of genders and numbers — `le relief`, `les frontières
   * historiques` — and a single invariable phrase produced *"Les frontières historiques a échoué"*
   * in production. Carried on the label rather than inferred from the string, because inferring
   * gender from an article is exactly the kind of cleverness that breaks on the first exception.
   */
  agreement: 'ms' | 'fs' | 'mp' | 'fp'
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
    agreement: 'ms',
    consequence: 'La carte ne peut pas être affichée.',
  },
  landMask: {
    severity: 'degraded',
    label: 'le masque des terres',
    agreement: 'ms',
    consequence:
      'Le trait de côte est déduit de l’altitude : les polders néerlandais passent sous l’eau et les lacs fermés apparaissent comme des plaines.',
  },
  regions: {
    severity: 'degraded',
    label: 'les frontières historiques',
    agreement: 'fp',
    consequence: 'La carte s’affiche sans les pays ni leurs frontières.',
  },
  rivers: {
    severity: 'degraded',
    label: 'les fleuves',
    agreement: 'mp',
    consequence: 'La carte s’affiche sans le réseau hydrographique.',
  },
  yearRegistry: {
    severity: 'degraded',
    label: 'le registre de l’année',
    agreement: 'ms',
    consequence:
      'Les pays s’affichent sans nom, sans rang et sans lien de vassalité : la géométrie est là, l’identité manque.',
  },
  yearPolities: {
    severity: 'degraded',
    label: 'les territoires de l’année',
    agreement: 'mp',
    consequence: 'La carte s’affiche sans les pays ni leurs frontières.',
  },
  yearBorders: {
    severity: 'degraded',
    label: 'le style des frontières',
    agreement: 'ms',
    consequence:
      'Les frontières s’affichent avec leur style déduit : les traits posés à la main sont perdus.',
  },
}

/** How each kind of failure reads, as the middle of a sentence, agreeing with its subject. */
const FAILURE_PHRASE: Record<
  'transport' | 'schema' | 'consistency' | 'semantic' | 'unknown',
  Record<AssetPolicy['agreement'], string>
> = {
  transport: {
    ms: 'n’a pas pu être chargé',
    fs: 'n’a pas pu être chargée',
    mp: 'n’ont pas pu être chargés',
    fp: 'n’ont pas pu être chargées',
  },
  schema: {
    ms: 'est illisible',
    fs: 'est illisible',
    mp: 'sont illisibles',
    fp: 'sont illisibles',
  },
  consistency: {
    ms: 'est incomplet',
    fs: 'est incomplète',
    mp: 'sont incomplets',
    fp: 'sont incomplètes',
  },
  semantic: {
    ms: 'ne correspond pas à cette carte',
    fs: 'ne correspond pas à cette carte',
    mp: 'ne correspondent pas à cette carte',
    fp: 'ne correspondent pas à cette carte',
  },
  unknown: { ms: 'a échoué', fs: 'a échoué', mp: 'ont échoué', fp: 'ont échoué' },
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
  const title = `${capitalise(policy.label)} ${FAILURE_PHRASE[failure][policy.agreement]}. ${policy.consequence}`

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
