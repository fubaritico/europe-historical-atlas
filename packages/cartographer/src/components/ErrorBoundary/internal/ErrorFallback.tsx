import { Button } from '@fubaritico/react/Button'

import { useTranslation } from '../../shared/hooks/useTranslation'
import { ERROR_BOUNDARY_MESSAGES } from '../messages'

/** What a failed zone shows. */
export interface ErrorFallbackProps {
  /** The error's own words — technical, in English whatever the page's language. */
  message: string
  /** One line, for a bar — no room there for a block or a button. */
  compact: boolean
  /** Remount the zone; absent where retrying would not help. */
  onRetry?: () => void
  /** Close the zone — a menu's; absent elsewhere. */
  onDismiss?: () => void
}

/**
 * The place of a zone that failed: a headline, the error's message, and « Retry » or « Close » where the zone
 * allows it — centred both ways, the dev's call (2026-10-21); on one line in a bar.
 * @param props - the error's message, how much room there is, and what can be done
 * @param props.message - the error's own words
 * @param props.compact - one line, for a bar
 * @param props.onRetry - remount the zone, when it may be retried
 * @param props.onDismiss - close the zone, when it is a menu
 * @returns the fallback
 */
export function ErrorFallback({ message, compact, onRetry, onDismiss }: ErrorFallbackProps) {
  // Context
  const t = useTranslation(ERROR_BOUNDARY_MESSAGES)

  // Render
  return (
    <div className={compact ? 'error-zone error-zone--bar' : 'error-zone'} role="alert">
      <p className="error-zone__title">{t('failed')}</p>
      {/* The error's words are a program's, English whatever the page: said so, for a screen reader. */}
      <p className="error-zone__message" lang="en" title={message}>
        {message}
      </p>
      {onRetry === undefined ? null : (
        <Button type="button" variant="secondary" onClick={onRetry}>
          {t('retry')}
        </Button>
      )}
      {onDismiss === undefined ? null : (
        <Button type="button" variant="secondary" onClick={onDismiss}>
          {t('dismiss')}
        </Button>
      )}
    </div>
  )
}
