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
}
