import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/** A message of {@link ERROR_BOUNDARY_MESSAGES}. */
export type ErrorBoundaryMessageKey =
  /** The headline shown in place of a zone that failed. */
  | 'failed'
  /** The button that remounts the zone, where the zone allows it. */
  | 'retry'
  /** The button that closes a menu that failed. */
  | 'dismiss'

/** What a failed zone says, in French and English. */
export const ERROR_BOUNDARY_MESSAGES: Catalogue<ErrorBoundaryMessageKey> = {
  fr: {
    failed: 'Cette zone n’a pas pu s’afficher.',
    retry: 'Réessayer',
    dismiss: 'Fermer',
  },
  en: {
    failed: 'This area could not be shown.',
    retry: 'Retry',
    dismiss: 'Close',
  },
}
