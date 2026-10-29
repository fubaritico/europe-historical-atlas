/**
 * The layers each blur moves its objects to while it is on (ATLAS-302, `screenBlur`): one per blur, never the camera's
 * own (0), never shared — two blurs on one layer would each draw the other's objects into its image, with no error
 * anywhere. Held in one table so a new blur takes a number the others do not.
 */
export const BLUR_LAYERS = {
  /** The borders' lines. */
  borders: 5,
  /** The countries' names' ink. */
  names: 6,
  /** The 3D event icons and their halos. */
  icons: 7,
} as const
