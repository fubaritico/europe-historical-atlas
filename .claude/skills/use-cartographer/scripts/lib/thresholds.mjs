/**
 * The numbers behind the decisions of `references/decide.md` — one home, so a tuned value changes every measure at
 * once. Each one is the dev's or was agreed with him on the date given; change it there first, then here.
 */

/** A border within this distance of a river, all along, may be put on it (agreed 2026-11-08). */
export const RIVER_NEAR_KM = 8

/** …along at least this length — a crossing is not a course (agreed 2026-11-08). */
export const RIVER_MIN_RUN_KM = 30

/**
 * The margin, in degrees, of the box a river stretch must reach to be measured at all — a speed-up, not a rule. It must
 * stay wider than {@link RIVER_NEAR_KM} in longitude at the highest latitude measured: 0.5° is 28 km at 60° N, 10 km at
 * 80° N. Raise it with RIVER_NEAR_KM, never below.
 */
export const RIVER_PREFILTER_DEGREES = 0.5

/** Where a border is measured against a river: one sample every this many kilometres. */
export const RIVER_SAMPLE_KM = 5

/** A straight run longer than this reads as a ruler's cut, not a drawn border (the dev, 2026-11-08). */
export const STIFF_SEGMENT_KM = 25

/** An angle under this at a vertex reads as a spike (the dev, 2026-11-08: « avoid spikes »). */
export const SPIKE_DEGREES = 60

/**
 * A polity whose own segments pass closer than this to an anchor a retouch touched keeps a blade there (the dev's
 * correction at Besalú, 2026-11-08). Below the precision any of our witnesses gives, so never a deliberate shape.
 */
export const SLIVER_KM = 1.5

/** A city whose nearest opposing witness is closer than this cannot have an enclave: the zone is disputed (agreed 2026-11-08). */
export const ENCLAVE_MIN_GAP_KM = 5

/** An enclave's radius never exceeds this (agreed 2026-11-08). */
export const ENCLAVE_MAX_RADIUS_KM = 8
