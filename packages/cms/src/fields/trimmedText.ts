/**
 * A name read without the spaces typed or pasted around it, on every name or title typed by hand (never a label a
 * hook computes): « siège archiépiscopal » had been saved with a space in front and « Historia ecclesiastica » with
 * one behind, and showed so in the admin's lists and in the atlas's export (2026-11-17 — those two rows corrected
 * once, through the CMS; the hook guards every save after). Only the ends are touched; a value that is not text goes
 * through as sent, so the field's own validation still says what is wrong with it.
 * @param args - Payload's field hook arguments
 * @param args.value - the text as sent
 * @returns the text without its leading and trailing spaces
 */
export function trimmedText({ value }: { value?: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value
}
