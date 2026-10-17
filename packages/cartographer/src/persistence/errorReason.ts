/**
 * Read a caught value as one sentence for the author — an `Error`'s message, or the value as text. Shared
 * by every module that reports a failure of the year's persistence in the status bar.
 * @param error - whatever was thrown
 * @returns its message
 */
export function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
