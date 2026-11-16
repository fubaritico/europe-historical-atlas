import { Alert } from '@fubaritico/react/Alert'

import { cityAlert } from '../../../../canvas/cityVerdict'

import type { CityVerdictKind } from '../../../../canvas/cityVerdict'

/**
 * The verdict at the foot of a city's detail (the dev, 2026-11-16: *"when there is a warning, put it in an alert"*):
 * yellow — not at the right place, a chain that stops short — in a warning; red — to declare, nothing to compare by —
 * in an error; at the right place, in a success.
 * @param props - the verdict's kind and its sentence
 * @param props.kind - the verdict's kind
 * @param props.text - its sentence
 * @returns the alert
 */
export function CityVerdictLine({ kind, text }: { kind: CityVerdictKind; text: string }) {
  // Derived
  const alert = cityAlert(kind)

  const variant = alert === null ? 'success' : alert === 'toCorrect' ? 'warning' : 'error'

  // Render
  return (
    <Alert className="city-detail__verdict" variant={variant}>
      {text}
    </Alert>
  )
}
