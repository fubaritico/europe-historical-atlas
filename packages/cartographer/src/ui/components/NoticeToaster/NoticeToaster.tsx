import { Toaster } from '@fubaritico/react/Toast'

import { useTranslation } from '../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../i18n/actions'

import { NOTICE_TOASTER_MESSAGES } from './i18n'

import type { ReactToaster } from '@fubaritico/react/Toast'

/**
 * The stack where the year on disk says what went well — saved, opened, a draft resumed — and what is to be done
 * again (`persistence/notice.ts`). The design system's `Toaster`, worded in the page's language.
 *
 * **Its own stack, injected**, not the page's shared one: the toasts are the Cartographer's, a test mounts its
 * own, and no other script of the page reaches it (the design system's note on untrusted scripts).
 */

/** What the stack needs. */
export interface NoticeToasterProps {
  /** The stack to render — the one the notice router shows toasts on. Read once, at mount. */
  toaster: ReactToaster
}

/**
 * Render the stack.
 * @param props - the stack
 * @param props.toaster - the stack to render, read once at mount
 * @returns the stack
 */
export function NoticeToaster({ toaster }: NoticeToasterProps) {
  // Context
  const t = useTranslation(NOTICE_TOASTER_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // Render
  // Bottom centre (the dev, 2026-10-24): under the eye, clear of the panels on either side.
  return (
    <Toaster
      toaster={toaster}
      position="bottom-center"
      label={t('label')}
      closeLabel={action('close')}
    />
  )
}
