import type { NoticeToasts } from '../../../../persistence/noticeRouter'
import type { ToastApi } from '@fubaritico/react/Toast'

/**
 * The toasts the notice router shows, on the design system's API: a tone is its intent, a topic its id — so a
 * newer toast of a topic replaces the older one, and the stack never holds two about the same thing.
 * @param api - the toast API of the Cartographer's stack
 * @returns the toasts, as the router needs them
 */
export function noticeToasts(api: ToastApi): NoticeToasts {
  return {
    show: (tone, text, id) => {
      api[tone](text, { id })
    },
  }
}
