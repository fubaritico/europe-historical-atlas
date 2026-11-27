import type { TerritoriesRead } from '../../../../persistence/cmsTerritory'
import type { Report } from '../../../../persistence/notice'
import type { ContentTerritory } from '@europe-historical-atlas/core/data/contentFormat'

/** What a reading of the CMS settles into — the check's hook hands its own. */
export interface ReadingSink {
  /** Whether this reading is still the one awaited: not closed, not pressed again since. */
  current: () => boolean
  /**
   * Install the territories read, and show the groups.
   * @param territories - every territory of the CMS
   */
  read: (territories: ContentTerritory[]) => void
  /** Close the dialogue: nothing on the map changes. */
  close: () => void
  /** Say that the CMS refused the session — the session's dialogue opens. */
  sessionLost: () => void
  /** Shows a notice — the alarm dialogue. */
  report: Report
  /** The words of the two alarms, in the page's language. */
  words: {
    /** The CMS not started. */
    offline: string
    /**
     * The CMS's refusal.
     * @param reason - its words
     * @returns the sentence
     */
    refused: (reason: string) => string
  }
}

/**
 * Settle a reading of the CMS for [Check this year] (CARTO-568): the groups when it was read, otherwise the dialogue
 * closed and the author told — the session's dialogue for a session refused, the alarm dialogue for the CMS not started
 * or refusing. A reading no longer awaited is dropped, said in the console (newest call wins).
 * @param read - how the reading ended
 * @param sink - where it settles
 */
export function settleReading(read: TerritoriesRead, sink: ReadingSink): void {
  if (!sink.current()) {
    console.warn(
      '[Cartographer] a reading of the CMS answered after the check was closed or pressed again'
    )
    return
  }
  if (read.kind === 'read') {
    sink.read(read.territories)
    return
  }
  sink.close()
  if (read.kind === 'signedOut') {
    console.warn('[Cartographer] [Check this year]: the CMS refused the session')
    sink.sessionLost()
    return
  }
  const text = read.kind === 'offline' ? sink.words.offline : sink.words.refused(read.reason)
  console.warn(`[Cartographer] [Check this year]: ${text}`)
  sink.report({ tone: 'alarm', topic: 'cms', text })
}
