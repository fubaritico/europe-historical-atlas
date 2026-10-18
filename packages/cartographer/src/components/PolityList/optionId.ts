/**
 * The DOM id of a row's option — what `aria-activedescendant` points at.
 * @param id - the polity's id
 * @returns the option's id
 */
export function optionId(id: string): string {
  return `polity-option-${id}`
}
