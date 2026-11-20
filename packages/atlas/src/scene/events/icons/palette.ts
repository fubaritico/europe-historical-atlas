/**
 * The colours of the 3D icons — shared by the flat drawings that show the same shapes from afar.
 */

/** The colours of the icons, as CSS colours. */
export interface EventIconPalette {
  /** A sword's blade. */
  steel: string
  /** A sword's guard and pommel. */
  brass: string
  /** A sword's grip. */
  leather: string
  /** A tower's walls. */
  stone: string
  /** A tower's door. */
  door: string
  /** A crown. */
  gold: string
  /** A crown's stones. */
  jewel: string
  /** A crown's pearls (ATLAS-287). */
  pearl: string
  /** A closed crown's cap. */
  velvet: string
  /** A crown's blue stones and enamels. */
  sapphire: string
  /** A cathedral's walls: a pale limestone, lighter than a tower's stone (ATLAS-288). */
  limestone: string
  /** A cathedral's walls behind what stands out of them: the same limestone, in the shade (ATLAS-288). */
  limestoneShade: string
  /** A cathedral's roofs and spire: lead and slate (ATLAS-288). */
  slate: string
  /** A trebuchet's timber. */
  wood: string
  /** A trebuchet's stone: a small grey ball (the dev, 2026-10-27). */
  rock: string
  /**
   * An oriflamme's cloth: a carmine brighter than a crown's velvet, which the icons' lights leave nearly black on a
   * flat cloth (ATLAS-477) — the bench's own red, to judge on the map.
   */
  cloth: string
}

/** The default colours — metals and stone that read on the parchment. */
export const EVENT_ICON_PALETTE: EventIconPalette = {
  steel: '#c9ccd1',
  brass: '#b08d3c',
  leather: '#4a2c1d',
  stone: '#cbb894',
  door: '#3b2a1e',
  gold: '#d4a53a',
  jewel: '#9b1c1c',
  pearl: '#f2ede1',
  velvet: '#8e1b2a',
  sapphire: '#2f4a9c',
  limestone: '#e8dfc8',
  limestoneShade: '#b9ad92',
  slate: '#66748a',
  wood: '#8a6440',
  rock: '#8d8c87',
  cloth: '#f0283c',
}
