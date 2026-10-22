/**
 * What to tell the reader when an asset fails, and how much it costs them.
 *
 * At the root for the same reason `computeLabels` is: `data/` must not hold a sentence in a particular
 * language, and `ui/` must not know what a land mask is. The composition root is the only place that
 * legitimately knows both. The sentences themselves are in `messages.ts`, in French and English
 * (ATLAS-159); this table only says which ones, and how bad it is.
 *
 * The degraded-mode policy lives here too, and that is deliberate. Which layers are essential and which
 * are decor is a **product decision**, not an accident of which `catch` someone happened to write — the
 * roadmap's robustness chapter names it as one of the four things to build.
 */

import { isAssetError } from '@europe-historical-atlas/core/data/assetError'

import type { AtlasMessageKey } from './i18n'
import type { Notice } from './ui/notice'
import type { AssetKind } from '@europe-historical-atlas/core/data/assetError'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/** What the reader loses when an asset fails. */
export interface AssetPolicy {
  /** How the map is affected. */
  severity: Notice['severity']
  /** The sentence saying what failed — a case per kind of failure, agreement written by the translator. */
  failed: AtlasMessageKey
  /** The sentence saying what the reader loses. */
  loss: AtlasMessageKey
}

/**
 * Which assets the map cannot do without, declared rather than discovered.
 *
 * Relief is the map: without elevation there is no surface to paint, nothing to drape and nothing to
 * click. Everything else degrades — a mask falls back to an elevation threshold, and the rest is drawn
 * or not drawn.
 */
export const ASSET_POLICY: Record<AssetKind, AssetPolicy> = {
  heightmap: { severity: 'blocking', failed: 'heightmapFailed', loss: 'heightmapLoss' },
  landMask: { severity: 'degraded', failed: 'landMaskFailed', loss: 'landMaskLoss' },
  regions: { severity: 'degraded', failed: 'regionsFailed', loss: 'regionsLoss' },
  rivers: { severity: 'degraded', failed: 'riversFailed', loss: 'riversLoss' },
  yearRegistry: { severity: 'degraded', failed: 'yearRegistryFailed', loss: 'yearRegistryLoss' },
  yearPolities: { severity: 'degraded', failed: 'yearPolitiesFailed', loss: 'yearPolitiesLoss' },
  yearBorders: { severity: 'degraded', failed: 'yearBordersFailed', loss: 'yearBordersLoss' },
}

/**
 * Turn a caught failure into something worth showing.
 *
 * Any failure, not only an {@link AssetError}: a caller that cannot say which asset broke still has to
 * say that something did, and a silent catch is what this whole chapter exists to remove.
 * @param asset - which asset family was being loaded
 * @param error - whatever was caught
 * @param translate - the atlas's messages, in the reader's language
 * @returns the notice to post
 */
export function assetNotice(
  asset: AssetKind,
  error: unknown,
  translate: Translate<AtlasMessageKey>
): Notice {
  const policy = ASSET_POLICY[asset]
  // A failure that is not an AssetError takes the message's `other` case: "… a échoué".
  const failure = isAssetError(error) ? error.failure : 'unknown'
  const title = translate('assetNotice', {
    failed: translate(policy.failed, { failure }),
    loss: translate(policy.loss),
  })

  // The technical half is kept separate and quieter: it is for whoever can act on it, and naming a
  // field path in the headline would bury the sentence that matters.
  const detail = isAssetError(error)
    ? `${error.source} — ${error.detail}`
    : error instanceof Error
      ? error.message
      : undefined

  return { severity: policy.severity, title, ...(detail === undefined ? {} : { detail }) }
}
