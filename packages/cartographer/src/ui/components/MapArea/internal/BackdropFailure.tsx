import { isAssetError } from '@europe-historical-atlas/core/data/assetError'

import { useTranslation } from '../../../hooks/useTranslation'
import { NOTICE } from '../areaStyle'
import { MAP_AREA_MESSAGES } from '../i18n'

/** What the failure state shows. */
export interface BackdropFailureProps {
  /** Whatever was thrown. */
  error: unknown
}

/**
 * The failure.
 *
 * **`role="alert"`, because this one is blocking** — there is nothing behind it to go back to, and the
 * author cannot draw. The atlas settled the same pair: a blocking notice interrupts and carries no
 * dismiss button, since a close button would promise something to go back to.
 *
 * **It names the file and how it failed when it can.** An `AssetError` carries which asset broke, the
 * class of failure and a one-clause detail, which is the difference between *"something went wrong"* and
 * a message someone can act on. The title deliberately claims nothing about the cause: pretending to
 * know more is what once had this project blame the JSON for a file that was simply absent.
 * @param props - the thrown value
 * @param props.error - whatever was thrown; an `AssetError` is named with its asset and failure
 * @returns the blocking notice
 */
export function BackdropFailure({ error }: BackdropFailureProps) {
  // Context
  const t = useTranslation(MAP_AREA_MESSAGES)

  // Derived
  const detail = isAssetError(error)
    ? `${error.asset} (${error.failure}) — ${error.detail}`
    : error instanceof Error
      ? error.message
      : String(error)

  // Render
  return (
    <div style={NOTICE} role="alert">
      <p>{t('failed')}</p>
      {/* The program's own words — the file and how it failed — English whatever the page: said so. */}
      <p lang="en">{detail}</p>
      <p>{t('failedCost')}</p>
    </div>
  )
}
