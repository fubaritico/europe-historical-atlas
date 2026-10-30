/** One choice of a short list: the value stored, the label shown. */
export interface Choice {
  /** What the form stores: an importance, a subject, a reason's id. */
  value: number | string
  /** What the list shows. */
  label: string
}
