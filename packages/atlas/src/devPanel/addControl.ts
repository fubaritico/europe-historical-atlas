/**
 * How one declared setting becomes a lil-gui widget, and what it does when it changes.
 */

import type { ControlSpec } from '@europe-historical-atlas/core/utils/controlSpec'
import type GUI from 'lil-gui'

/**
 * Render one declared control into a lil-gui folder. The spec says what the control *is*; the caller
 * says what it *does* — ranges are domain knowledge, side effects are wiring, and they stay apart.
 * @param folder - the lil-gui folder to add to
 * @param target - the live object the control mutates in place
 * @param key - the field to bind
 * @param spec - how that field should be presented
 * @param onChange - the side effect to run, on release for anything that rebuilds
 * @param live - bind to `onChange` instead of `onFinishChange` (cheap updates that should track the drag)
 * @returns nothing; the control is added to `folder`
 */
export function addControl<T extends object>(
  folder: GUI,
  target: T,
  key: keyof T & string,
  spec: ControlSpec,
  onChange: () => void,
  live = false
): void {
  // Pick the lil-gui widget the spec's kind calls for: slider, colour picker, list or plain field.
  const controller =
    spec.kind === 'number'
      ? folder.add(target, key, spec.min, spec.max, spec.step)
      : spec.kind === 'color'
        ? folder.addColor(target, key, 255)
        : spec.kind === 'hexColor'
          ? folder.addColor(target, key)
          : spec.kind === 'choice'
            ? folder.add(target, key, [...spec.options])
            : folder.add(target, key)
  // Label it, then run the effect on every change when live, or once on release.
  controller.name(spec.label)
  if (live) controller.onChange(onChange)
  else controller.onFinishChange(onChange)
}

/**
 * Some controls need no side effect: the render loop already reads their value every frame.
 * @returns nothing
 */
export const noEffect = (): void => undefined
