import type { BarButtonAction } from '../internal/BarButton'

/**
 * A bar button's gesture, or why it cannot act (CARTO-535: nobody signed in) — exactly one of the two, as the button's
 * type holds it.
 * @param onPress - what it does
 * @param hint - its tooltip when it can act
 * @param unavailable - why it cannot, or nothing when it can
 * @returns the button's action
 */
export function gesture(
  onPress: () => void,
  hint: string,
  unavailable: string | undefined
): BarButtonAction {
  return unavailable === undefined ? { onPress, hint } : { unavailable }
}
