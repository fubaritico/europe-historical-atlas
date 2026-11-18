import type {
  ContentCity,
  ContentTerritory,
} from '@europe-historical-atlas/core/data/contentFormat'
import type { ContentSource } from '@europe-historical-atlas/core/data/contentSource'

/**
 * The cities `{Cities}` lists (CARTO-193), read from the contribution's export — `content/cartographer.json`, every
 * city sheet, beside the atlas's own `atlas.json` in the public folder the two share (CMS-223). The CMS's server need not run while the author draws.
 */

/**
 * A city as the Cartographer holds it — declared here, structurally, so this loader never reaches into the store;
 * the store's `CityMark` has the same shape.
 */
export interface LoadedCity {
  /** The sheet's id in the contribution — one city at one date. */
  readonly id: string
  /** Its name, in French — the contribution's language. */
  readonly name: string
  /** Longitude, WGS84 degrees. */
  readonly lon: number
  /** Latitude, WGS84 degrees. */
  readonly lat: number
  /** When the sheet holds. */
  readonly date: ContentCity['date']
  /** The polity holding it by the sources, or `null` while nobody has entered it. */
  readonly holder: ContentCity['holder']
  /** Its chain of vassalage at its sheet's year, or `null` while its sheet names no title (CARTO-435). */
  readonly chain: ContentCity['chain']
  /** The sources that say who held it. */
  readonly holderSources: readonly {
    readonly title: string
    readonly where: string | null
    readonly holder: NonNullable<ContentCity['holder']>
  }[]
}

/** Where the export is, under the public folder the Cartographer shares with the atlas. */
export const CONTENT_URL = '/content/cartographer.json'

/** Where the cities go once read, or the reason they could not be. */
export interface CitySink {
  /**
   * The cities, read.
   * @param cities - every city of the export
   */
  setCities: (cities: readonly LoadedCity[]) => void
  /**
   * The CMS's territories, read (CARTO-450).
   * @param territories - every territory of the export
   */
  setTerritories: (territories: readonly ContentTerritory[]) => void
  /**
   * The export could not be read.
   * @param reason - what went wrong
   */
  setCitiesFailed: (reason: string) => void
}

/**
 * A city of the export as the Cartographer holds it.
 * @param city - the export's city
 * @returns its id, its French name, its position, its date, its holder by the sources and the lines saying so
 */
export function toLoadedCity(city: ContentCity): LoadedCity {
  return {
    id: city.id,
    name: city.place.name.fr,
    lon: city.place.lon,
    lat: city.place.lat,
    date: city.date,
    holder: city.holder,
    chain: city.chain,
    holderSources: city.testimonies.flatMap((testimony) =>
      testimony.subject === 'holder'
        ? [{ title: testimony.source.title, where: testimony.where, holder: testimony.holder }]
        : []
    ),
  }
}

/**
 * Read the cities and hand them to the store. A failure is said twice and replaced by nothing: in the panel, which
 * shows it in place of the list, and in the console with its detail — the rest of the Cartographer works without them.
 * @param source - where the export is read from
 * @param sink - the store's two actions
 * @returns once the cities are in, or the failure said
 */
export async function loadCities(source: ContentSource, sink: CitySink): Promise<void> {
  try {
    const content = await source.load()
    sink.setCities(content.cities.map(toLoadedCity))
    // An export written before CARTO-450 has no territories: none to offer, and the form says to export again
    if (content.territories === undefined)
      console.warn('[Cartographer] the export has no territories: run the CMS export again')
    sink.setTerritories(content.territories ?? [])
  } catch (error: unknown) {
    console.error('[Cartographer] the cities could not be read', error)
    sink.setCitiesFailed(error instanceof Error ? error.message : String(error))
  }
}
