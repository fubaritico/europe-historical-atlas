/** How the area fills its parent, in all three states, so nothing jumps when one replaces another. */
export const FILL = { position: 'absolute', inset: 0 } as const

/** Centred prose, for the two states that have no map to show. */
export const NOTICE = {
  ...FILL,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '2rem',
  textAlign: 'center',
} as const
