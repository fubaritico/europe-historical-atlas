/**
 * Send each notice where it is shown: an alarm to the dialogue, anything else to a toast (`notice.ts`).
 */

import type { AlarmBoard } from './alarmBoard'
import type { NoticeTone, NoticeTopic, Report } from './notice'

/** The toasts, reduced to what a notice needs. Structural, so a test hands in a literal. */
export interface NoticeToasts {
  /**
   * Show a toast, in place of the one with the same id.
   * @param tone - its intent
   * @param text - its sentence
   * @param id - its topic, so a newer one of the same topic replaces it
   */
  show: (tone: Exclude<NoticeTone, 'alarm'>, text: string, id: NoticeTopic) => void
}

/** Where the router sends notices. */
export interface NoticeRoutes {
  /** The toasts. */
  toasts: NoticeToasts
  /** The alarms the dialogue shows. */
  alarms: AlarmBoard
}

/**
 * Build the report the persistence layer is handed.
 * @param routes - the toasts and the alarms
 * @returns where every notice goes
 */
export function routeNotices(routes: NoticeRoutes): Report {
  return (notice) => {
    if (notice.tone === 'alarm') {
      routes.alarms.raise({ topic: notice.topic, text: notice.text })
      return
    }
    // A topic that turns out well closes its doubt — a save confirmed after its delay: the toast says the rest.
    if (notice.tone === 'success') routes.alarms.withdraw(notice.topic)
    routes.toasts.show(notice.tone, notice.text, notice.topic)
  }
}
