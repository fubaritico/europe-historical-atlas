/**
 * The country names' bench's settings and the form that tunes them (ATLAS-301) — `nameBench.ts` draws, this
 * holds what the dev turns. Split out of it on 2026-10-28, when the bench outgrew one file.
 */

/** What the dev tunes on the bench. */
export interface Settings {
  /** The candidate face, by index into the bench's list. */
  face: number
  /** The display level: 0 shows the sovereigns only. */
  level: number
  /** The room between a letter and a border, in cells. */
  margin: number
  /** The smallest size written, in cells. */
  minSize: number
  /** Whether the names are set in capitals. */
  capitals: boolean
  /** Extra room after each letter, in ems. */
  spacing: number
  /** How much larger two lines must make a name for it to be broken, as a share of its size on one. */
  twoLineGain: number
  /** How much larger following the shape must make a name for it to be chosen over the horizontal. */
  followShapeGain: number
  /** The ink's colour. */
  ink: string
  /** The ink's opacity, `0..1`. */
  opacity: number
  /** How the ink is laid on the colours. */
  blend: 'multiply' | 'source-over'
}

/** Where the bench starts: the dev's picks of 28/10, and Claude's starts where the dev has not chosen yet. */
export const START_SETTINGS: Readonly<Settings> = {
  face: 5, // Fondamento, the dev's pick of 28/10, as the settings below
  level: 0,
  margin: 2,
  minSize: 4,
  capitals: false,
  spacing: 0,
  // Claude's start, 28/10: two lines when they make a name 30 % larger, or alone bring it to the smallest size.
  twoLineGain: 0.3,
  // Claude's start, 28/10: the shape is the last resort, so its price is above two lines'.
  followShapeGain: 0.5,
  ink: '#3b2614',
  opacity: 0.5,
  blend: 'multiply',
}

/** One control of the form: its label, its input, and how it writes the settings. */
export interface Control {
  /** The label shown. */
  readonly label: string
  /** The input element. */
  readonly input: HTMLInputElement | HTMLSelectElement
  /** Write the input's value into the settings. */
  readonly apply: (settings: Settings) => void
}

/**
 * A range input, with its value shown beside it.
 * @param label - its label
 * @param value - its start
 * @param range - its minimum, maximum and step
 * @param write - writes its value into the settings
 * @returns the control
 */
function slider(
  label: string,
  value: number,
  range: readonly [number, number, number],
  write: (settings: Settings, value: number) => void
): Control {
  const input = document.createElement('input')
  input.type = 'range'
  ;[input.min, input.max, input.step] = range.map(String) as [string, string, string]
  input.value = String(value)
  return {
    label,
    input,
    apply: (settings) => {
      write(settings, Number(input.value))
    },
  }
}

/**
 * A drop-down list.
 * @param label - its label
 * @param options - each option's text and value
 * @param selected - the value it starts on
 * @param write - writes its value into the settings
 * @returns the control
 */
function choice(
  label: string,
  options: readonly (readonly [string, string])[],
  selected: string,
  write: (settings: Settings, value: string) => void
): Control {
  const input = document.createElement('select')
  for (const [text, value] of options) input.add(new Option(text, value))
  input.value = selected
  return {
    label,
    input,
    apply: (settings) => {
      write(settings, input.value)
    },
  }
}

/**
 * An input of a type that is read as text — a checkbox's `checked` aside.
 * @param label - its label
 * @param type - `checkbox` or `color`
 * @param value - its start: checked, or the colour
 * @param write - writes its value into the settings
 * @returns the control
 */
function field(
  label: string,
  type: 'checkbox' | 'color',
  value: boolean | string,
  write: (settings: Settings, input: HTMLInputElement) => void
): Control {
  const input = document.createElement('input')
  input.type = type
  if (typeof value === 'boolean') input.checked = value
  else input.value = value
  return {
    label,
    input,
    apply: (settings) => {
      write(settings, input)
    },
  }
}

/**
 * The bench's controls, the face first.
 * @param settings - the settings to start from
 * @param deepest - the year's deepest display level
 * @param faceLabels - the candidate faces' names, in their order
 * @returns the controls
 */
export function controls(
  settings: Settings,
  deepest: number,
  faceLabels: readonly string[]
): Control[] {
  const faces = faceLabels.map((label, index): readonly [string, string] => [label, String(index)])
  return [
    choice('Police (← →)', faces, String(settings.face), (s, v) => {
      s.face = Number(v)
    }),
    slider('Niveau', settings.level, [0, deepest, 1], (s, v) => {
      s.level = v
    }),
    slider('Marge', settings.margin, [0, 6, 0.5], (s, v) => {
      s.margin = v
    }),
    slider('Taille min.', settings.minSize, [1, 12, 0.5], (s, v) => {
      s.minSize = v
    }),
    slider('Espacement', settings.spacing, [0, 0.5, 0.02], (s, v) => {
      s.spacing = v
    }),
    field('Capitales', 'checkbox', settings.capitals, (s, input) => {
      s.capitals = input.checked
    }),
    field('Encre', 'color', settings.ink, (s, input) => {
      s.ink = input.value
    }),
    slider('Gain pour 2 lignes', settings.twoLineGain, [0, 1, 0.05], (s, v) => {
      s.twoLineGain = v
    }),
    slider('Gain pour suivre la forme', settings.followShapeGain, [0, 2, 0.05], (s, v) => {
      s.followShapeGain = v
    }),
    slider('Opacité', settings.opacity, [0.2, 1, 0.05], (s, v) => {
      s.opacity = v
    }),
    choice(
      'Fusion',
      [
        ['multiply', 'multiply'],
        ['normal', 'source-over'],
      ],
      settings.blend,
      (s, v) => {
        s.blend = v === 'multiply' ? 'multiply' : 'source-over'
      }
    ),
  ]
}

/**
 * Step through the faces with the arrow keys, for comparing them on the same map.
 * @param select - the face's drop-down
 * @param redraw - asks for a redraw
 */
export function cycleFacesWithArrows(select: HTMLSelectElement, redraw: () => void): void {
  window.addEventListener('keydown', (event) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    select.selectedIndex = (select.selectedIndex + step + select.length) % select.length
    redraw()
  })
}
