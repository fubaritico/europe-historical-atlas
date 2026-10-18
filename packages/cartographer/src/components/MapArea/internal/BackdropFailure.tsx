import { isAssetError } from '@europe-historical-atlas/core/data/assetError'

import { NOTICE } from '../areaStyle'

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
 * @returns the blocking notice
 */
export function BackdropFailure({ error }: BackdropFailureProps) {
  // Derived
  const detail = isAssetError(error)
    ? `${error.asset} (${error.failure}) — ${error.detail}`
    : error instanceof Error
      ? error.message
      : String(error)

  // Render
  return (
    <div style={NOTICE} role="alert">
      <p>The backdrop could not be prepared.</p>
      <p>{detail}</p>
      <p>No year can be opened without it: the relief carries the coordinate system.</p>
    </div>
  )
}
