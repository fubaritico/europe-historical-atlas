/**
 * The only DOM the app owns besides the canvas: a splash, a progress bar, and somewhere to say a load
 * failed.
 *
 * The three are built together because a failure has to reach exactly one of them and the choice is not
 * free: a blocking failure means there is no map behind the splash, so the splash stays up and the
 * message lands on it, while a degraded one is told over a map that works. Holding them apart is how a
 * caller ends up deciding that per catch block.
 */

import { assetNotice } from './assetMessages'
import { createNoticeBoard } from './ui/notice'
import { createProgressOverlay } from './ui/progressOverlay'
import { createSplash } from './ui/splash'
import { PARCHMENT } from './viewport'

import type { ProgressOverlay } from './ui/progressOverlay'
import type { AssetKind } from '@europe-historical-atlas/core/data/assetError'

/** The map's surrounding interface. */
export interface MapUi {
  /** The progress panel, driven by whatever is computing. */
  readonly progress: ProgressOverlay
  /**
   * Take the splash down. Safe to call twice.
   * @returns nothing
   */
  dismissSplash: () => void
  /**
   * Tell the reader an asset failed, and keep the console line for whoever is looking at one.
   *
   * Whether it blocks or merely degrades is declared in `assetMessages`, never decided here: which
   * layers the map cannot do without is a product decision, not an accident of which catch this is.
   * @param asset - which asset family failed
   * @param error - whatever was caught
   * @returns nothing
   */
  reportAssetFailure: (asset: AssetKind, error: unknown) => void
  /** Unmount everything. */
  dispose: () => void
}

/** What the interface needs from its host. */
export interface MapUiOptions {
  /** Where to mount — normally the document body, over the canvas. */
  host: HTMLElement
  /**
   * Whether the app has been torn down. A load abandoned mid-flight must not post a notice onto a page
   * that is already gone.
   * @returns `true` once teardown has run
   */
  isDisposed: () => boolean
}

/**
 * Build the splash, the progress panel and the notice board, and mount them.
 * @param options - where to mount, and how to know the app is gone
 * @returns the interface
 */
export function createMapUi(options: MapUiOptions): MapUi {
  const progress = createProgressOverlay({ host: options.host })
  // Mounted before a single byte is fetched, and taken down the moment there is a map underneath it.
  // The relief and the mask are three megabytes each; without this the reader gets a blank page for as
  // long as that takes, which reads as broken rather than as loading.
  const splash = createSplash({ host: options.host, background: PARCHMENT })
  // Until this existed every failure ended in `console.error` and nothing else, so a relief that failed
  // to load showed a blank canvas and no explanation. A console is not a user interface.
  const notices = createNoticeBoard({ host: options.host })

  return {
    progress,
    dismissSplash(): void {
      splash.dismiss()
    },
    reportAssetFailure(asset: AssetKind, error: unknown): void {
      console.error(`asset ${asset} failed`, error)
      if (options.isDisposed()) return
      const notice = assetNotice(asset, error)
      notices.show(notice)
      // A blocking failure means there is no map behind the splash, so the splash stays and the message
      // lands on it. Dismissing it would reveal an empty canvas and call that an improvement.
      if (notice.severity !== 'blocking') return
      progress.end()
    },
    dispose(): void {
      progress.dispose()
      splash.dispose() // a load abandoned mid-flight must not leave the silhouette over a dead canvas
      notices.dispose()
    },
  }
}
