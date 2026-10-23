/**
 * What the year on disk says to the author — a sentence, how loud, and what it is about.
 *
 * **The dev's call, 2026-10-24**: the status bar is the tool's (*« ça me sert à savoir ce que je fais »*), not
 * the place for what happens on disk. So the persistence layer no longer writes a line there: it sends a
 * notice, and the composition root shows it — a **toast** when nothing is at risk, a **dialogue** (an *alarm*)
 * when the work may be lost or was not done. The tone is chosen where the sentence is written, by the module
 * that knows what happened, never guessed from the text.
 */

/**
 * How a notice is shown.
 *
 * `success` — done (a green toast). `info` — a fact, nothing to do. `warning` — nothing is lost, a gesture is to
 * be made again (an orange toast). `alarm` — the work may be lost or was not done: a dialogue the author closes.
 */
export type NoticeTone = 'success' | 'info' | 'warning' | 'alarm'

/**
 * What a notice is about. A notice replaces the earlier one of its topic — one toast per topic on screen — and a
 * `success` withdraws the alarm of its topic: a save confirmed after its doubt closes it.
 */
export type NoticeTopic = 'year' | 'draft' | 'snapshot'

/** One notice. */
export interface Notice {
  /** How loud. */
  tone: NoticeTone
  /** What it is about. */
  topic: NoticeTopic
  /** The sentence the author reads. */
  text: string
}

/** Where a notice goes — the composition root routes it (`noticeRouter.ts`). */
export type Report = (notice: Notice) => void
