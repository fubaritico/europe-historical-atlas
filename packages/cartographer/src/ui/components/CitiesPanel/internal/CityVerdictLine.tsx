import { Alert } from '@fubaritico/react/Alert'

import { cityAlert } from '../../../../canvas/cityVerdict'

import type { CityVerdictKind } from '../../../../canvas/cityVerdict'
import type { CityAlert } from '../../../../canvas/paint/cityPainter'
import type { AlertVariant } from '@fubaritico/react/Alert'

/** The alert's variant for each ring a point wears, `none` at the right place. */
const VARIANT: Readonly<Record<CityAlert | 'none', AlertVariant>> = {
  none: 'success',
  toCorrect: 'warning',
  missing: 'error',
  disputed: 'info',
}

/**
 * The verdict at the foot of a city's detail (the dev, 2026-11-16: *"when there is a warning, put it in an alert"*):
 * yellow — not at the right place, a chain that stops short — in a warning; red — to declare, nothing to compare by —
 * in an error; in a disputed zone, in an information (CARTO-511); at the right place, in a success.
 * @param props - the verdict's kind and its sentence
 * @param props.kind - the verdict's kind
 * @param props.text - its sentence
 * @returns the alert
 */
export function CityVerdictLine({ kind, text }: { kind: CityVerdictKind; text: string }) {
  // Derived
  const variant = VARIANT[cityAlert(kind) ?? 'none']

  // Render
  return (
    <Alert className="city-detail__verdict" variant={variant}>
      {text}
    </Alert>
  )
}
