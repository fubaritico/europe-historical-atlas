import { TOOL_MESSAGES } from '../../../../i18n/tools'
import { useTranslation } from '../../../hooks/useTranslation'
import { TOOL_RAIL_MESSAGES } from '../i18n'

/**
 * A tool's tooltip, in the page's language: its name, then its key as the keyboard reads it (*Space*,
 * *Espace*).
 * @returns a function building the tooltip from the tool's name and its `KeyboardEvent.key`
 */
export function useToolTitle(): (label: string, key: string) => string {
  // Context
  const t = useTranslation(TOOL_RAIL_MESSAGES)
  const toolNames = useTranslation(TOOL_MESSAGES)

  // Return
  return (label, key) => t('toolTitle', { tool: label, key: toolNames('keyName', { key }) })
}
