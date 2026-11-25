import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link SIGN_IN_MESSAGES} (CARTO-535).
 *
 * - `title`, `lead` — the form's heading and its line: the CMS's account.
 * - `expired` — the line when a session expired while drawing: nothing is lost.
 * - `checking` — while the CMS is asked who is signed in.
 * - `email`, `password`, `signIn`, `signingIn` — the fields, the button, and the button while it waits.
 * - `offline`, `retry` — the CMS not started, and the button that asks again.
 * - `refused` — the CMS's refusal; `reason` its words.
 * - `broken` — the Cartographer's own server answered with nothing readable: a defect.
 */
export type SignInMessageKey = keyof typeof en

/** {@link SignInMessageKey}, in French and English, both bundled with the code (`plan.md`, P8). */
export const SIGN_IN_MESSAGES: Catalogue<SignInMessageKey> = { fr, en }
