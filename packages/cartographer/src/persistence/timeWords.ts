/**
 * Times worded for the author — when a draft was kept, when a year changed on disk (CARTO-238). One home,
 * so the dialogues and the status bar say a time the same way.
 */

/**
 * The day of a date, for comparing two of them.
 * @param date - the date
 * @returns its day, as text
 */
const day = (date: Date): string => date.toDateString()

/**
 * Word a time for the author: *"today at 15:42"*, *"yesterday at 23:10"*, or the date.
 * @param at - the ISO time
 * @param now - the present
 * @param options - what to show
 * @param options.seconds - show the seconds too — *"today at 15:42:07"* — where two times of one minute
 *   must be told apart, as two snapshots can be (the dev, 2026-10-18)
 * @returns the words
 */
export function timeWords(at: string, now: Date, options: { seconds?: boolean } = {}): string {
  const when = new Date(at)
  if (Number.isNaN(when.getTime())) return `at an unknown time (${at})`
  const time = when.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    ...(options.seconds === true ? { second: '2-digit' } : {}),
  })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (day(when) === day(now)) return `today at ${time}`
  if (day(when) === day(yesterday)) return `yesterday at ${time}`
  return `on ${when.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at ${time}`
}
