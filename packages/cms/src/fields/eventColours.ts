/**
 * The colours an event type's pins may wear (ATLAS-298): vivid ones, so the head reads as its colour where it is lit
 * (the dev, 2026-10-27: « un rouge vraiment rouge plutôt que carmin », « des couleurs plus vives »). A short list
 * chosen from, rather than any colour typed, so two types never wear two near-identical shades.
 */

/** Each colour the form offers: its value as the atlas reads it, and its name in the form. */
export const EVENT_COLOURS = [
  { value: '#e3170a', label: 'Rouge' },
  { value: '#ff7a00', label: 'Orange' },
  { value: '#ffc300', label: 'Jaune' },
  { value: '#1fa33a', label: 'Vert' },
  { value: '#1565e8', label: 'Bleu' },
  { value: '#8a2be2', label: 'Violet' },
  { value: '#d4148a', label: 'Magenta' },
] as const

/** One of {@link EVENT_COLOURS}' values. */
export type EventColour = (typeof EVENT_COLOURS)[number]['value']

/**
 * The colour a type takes until one is chosen for it — the pin's own red, which every pin wore before the field
 * existed. Also the column's default, so adding the field gives every type already written this red, with no
 * question in the terminal.
 */
export const DEFAULT_EVENT_COLOUR: EventColour = '#e3170a'
