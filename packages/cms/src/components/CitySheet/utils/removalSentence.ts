import type { LinkNames } from './linkNames'
import type { Say } from './say'

/**
 * The toast of a link closed by ✕ that the server kept (the dev, 2026-11-16: « un message d'erreur intelligible, c'est
 * au bon endroit et le bon message »): which link, what the server said, and that it is still in the base. A link the
 * chain read does not name — never met: a line closed by ✕ comes from that read — is said without its names, and the
 * console says why.
 * @param names - the link's vassal and suzerain, `null` when the read does not hold it
 * @param message - the server's sentence, `null` when it did not answer
 * @param say - the translator
 * @returns the sentence
 */
export function removalSentence(names: LinkNames | null, message: string | null, say: Say): string {
  if (names === null) {
    console.error('[CMS] a link closed by ✕ is in no reading of the chain: said without its names')
    return message === null
      ? say('removalFailedUnnamed')
      : say('removalRefusedUnnamed', { message })
  }
  const { vassal, suzerain } = names
  return message === null
    ? say('removalFailed', { vassal, suzerain })
    : say('removalRefused', { vassal, suzerain, message })
}
