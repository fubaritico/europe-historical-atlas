import type { MapCheckMessageKey } from '../i18n'
import type { TiedPolity } from '@europe-historical-atlas/core/data/cmsAlignment'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * What the CMS says of a tied polity, written beside the map's name: « → royaume de León · 910 – 1230 ». A date the CMS
 * lacks reads « ? », the map keeping its own; a Wikidata item the map holds otherwise is named, aligning writes it
 * (CARTO-568).
 * @param row - the polity and its territory
 * @param t - the dialogue's messages
 * @returns the line
 */
export function cmsSide(row: TiedPolity, t: Translate<MapCheckMessageKey>): string {
  const year = (value: number | null | undefined): string =>
    value === null || value === undefined ? t('noDate') : String(value)
  const dates = t('dates', { from: year(row.cms.existsFrom), to: year(row.cms.existsTo) })
  const item =
    row.wikidataDiffers && row.cms.wikidata !== null
      ? ` · ${t('otherItem', { id: row.cms.wikidata })}`
      : ''
  return `→ ${row.cms.name} · ${dates}${item}`
}
