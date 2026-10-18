/**
 * The opacity at or below which a fading layer is not drawn at all — nothing to see, so nothing to pay for.
 *
 * One threshold for every layer that fades by zoom: the rivers by rank (`riverLayer.setZoom`) and the
 * composed line work (`composedLineLayer.setFade`), so a river and a border vanish at the same point of
 * their fade. Kept in a module of its own so neither layer imports the other for it.
 */
export const FADE_HIDDEN = 0.001
