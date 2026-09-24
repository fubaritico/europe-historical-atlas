/**
 * Declarative description of a tunable value — its range, its step and its label.
 *
 * The point of keeping this next to a set of defaults rather than inside the panel: a value's valid
 * range and its default value are two halves of one statement. When they live in different files,
 * nothing stops a default from drifting outside its own slider, where it becomes unreachable in the UI
 * and is silently clamped on the first tweak.
 *
 * Pure types and data — no rendering library is involved, so a control table can be unit-tested without
 * a DOM.
 */

/** A `BlendMode`-style dropdown, a colour picker, a checkbox, or a numeric slider. */
export type ControlSpec =
  | {
      /** A numeric slider. */
      kind: 'number'
      /** Lowest selectable value. */
      min: number
      /** Highest selectable value. */
      max: number
      /** Slider increment. */
      step: number
      /** Text shown next to the control. */
      label: string
    }
  | {
      /** A checkbox. */
      kind: 'boolean'
      /** Text shown next to the control. */
      label: string
    }
  | {
      /** An RGB colour picker over an `{ r, g, b }` object. */
      kind: 'color'
      /** Text shown next to the control. */
      label: string
    }
  | {
      /** A colour picker over a hex string. */
      kind: 'hexColor'
      /** Text shown next to the control. */
      label: string
    }
  | {
      /** A dropdown over a fixed list of string options. */
      kind: 'choice'
      /** The selectable values. */
      options: readonly string[]
      /** Text shown next to the control. */
      label: string
    }

/**
 * A control table for an options object: one {@link ControlSpec} per field. Written as a mapped type so
 * that adding a field without describing it is a compile error — a new tunable can never silently miss
 * its control.
 */
export type ControlTable<T> = {
  [K in keyof T]: T[K] extends number
    ? Extract<ControlSpec, { kind: 'number' }>
    : T[K] extends boolean
      ? Extract<ControlSpec, { kind: 'boolean' }>
      : ControlSpec
}

/** A named set of tunables presented together, in display order. */
export interface ControlGroup<T> {
  /** The group's heading. */
  title: string
  /** The fields it contains, in display order. */
  keys: (keyof T)[]
}

/**
 * Check that a control table and its defaults agree: every numeric default must sit inside its own
 * declared range, and every slider must have a usable step. Returns the problems rather than throwing,
 * so tests can report them all at once.
 * @param controls - the control table
 * @param defaults - the matching defaults object
 * @returns one message per inconsistency; empty when the table is sound
 */
export function findControlInconsistencies(controls: object, defaults: object): string[] {
  // Loosely typed on purpose: this validates arbitrary declarations, so the strictness belongs to
  // `ControlTable<T>` where a table is declared, not to the checker that reads one.
  const problems: string[] = []
  const values = defaults as Record<string, unknown>
  for (const [key, spec] of Object.entries(controls) as [string, ControlSpec][]) {
    if (spec.label.length === 0) problems.push(`${key}: empty label`)
    if (spec.kind !== 'number') continue
    if (spec.max <= spec.min)
      problems.push(`${key}: inverted range ${String(spec.min)}..${String(spec.max)}`)
    if (spec.step <= 0) problems.push(`${key}: non-positive step ${String(spec.step)}`)
    const value = values[key]
    if (typeof value !== 'number') {
      problems.push(`${key}: declared as a slider but the default is ${typeof value}`)
      continue
    }
    if (value < spec.min || value > spec.max) {
      problems.push(
        `${key}: default ${String(value)} outside its range ${String(spec.min)}..${String(spec.max)}`
      )
    }
  }
  return problems
}

/**
 * Check that a set of groups covers a control table exactly: no field missing from the panel, none
 * listed twice, none referring to a field that no longer exists.
 * @param groups - the display groups
 * @param controls - the control table they should cover
 * @returns one message per problem; empty when the grouping is sound
 */
export function findGroupingProblems(
  groups: readonly { readonly keys: readonly PropertyKey[] }[],
  controls: object
): string[] {
  const problems: string[] = []
  const listed = groups.flatMap((group) => [...group.keys]).map(String)
  const declared = new Set(Object.keys(controls))
  const seen = new Set<string>()
  for (const key of listed) {
    if (!declared.has(key)) problems.push(`${key}: grouped but not declared`)
    if (seen.has(key)) problems.push(`${key}: listed in more than one group`)
    seen.add(key)
  }
  for (const key of declared) {
    if (!seen.has(key)) problems.push(`${key}: declared but in no group — it would not be shown`)
  }
  return problems
}
