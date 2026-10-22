import type { PersistenceWords } from './persistenceWords'

/**
 * Times worded for the author — when a draft was kept, when a year changed on disk (CARTO-238). One home,
 * so the dialogues and the status bar say a time the same way, in the page's language (ATLAS-159).
 */

/**
 * The day of a date, for comparing two of them.
 * @param date - the date
 * @returns its day, as text
 */
const day = (date: Date): string => date.toDateString()

/**
 * The tag a date is written with: the editor's English is British — *colour*, *2 October 2026* — so English
 * dates follow `en-GB` rather than `Intl`'s American default.
 */
const DATE_TAGS = { fr: 'fr', en: 'en-GB' } as const

/**
 * Word a time for the author: *"today at 15:42"*, *"yesterday at 23:10"*, or the date — on a 24-hour clock in
 * both languages, the editor's habit since CARTO-238.
 * @param at - the ISO time
 * @param now - the present
 * @param words - the sentences and the page's language
 * @param options - what to show
 * @param options.seconds - show the seconds too — *"today at 15:42:07"* — where two times of one minute
 *   must be told apart, as two snapshots can be (the dev, 2026-10-18)
 * @returns the words
 */
export function timeWords(
  at: string,
  now: Date,
  words: PersistenceWords,
  options: { seconds?: boolean } = {}
): string {
  const { t } = words
  const tag = DATE_TAGS[words.locale]
  const when = new Date(at)
  if (Number.isNaN(when.getTime())) {
    console.warn(`[Cartographer] a time could not be read: "${at}".`)
    return t('unknownTime')
  }
  const time = when.toLocaleTimeString(tag, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(options.seconds === true ? { second: '2-digit' } : {}),
  })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (day(when) === day(now)) return t('today', { time })
  if (day(when) === day(yesterday)) return t('yesterday', { time })
  const date = when.toLocaleDateString(tag, { day: 'numeric', month: 'long', year: 'numeric' })
  return t('onDate', { date, time })
}
