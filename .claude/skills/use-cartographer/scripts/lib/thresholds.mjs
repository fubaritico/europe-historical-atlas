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

/**
 * A pixel's edge is at most this long. Cliopatria's grid, reprojected, comes into our format as cells about 0.08° wide
 * and 0.065° high — 7 km by 7 km at 43° N, measured on the 1300 import (2026-11-09): its 4-point rings cluster at
 * 40–57 km². Proposed by Claude, from that measure; the dev's rule is the removal, not the number.
 */
export const PIXEL_EDGE_KM = 10

/**
 * Two points at one latitude to within this, in degrees, make a pixel's flat edge: the grid's rows. A point placed by
 * hand never lands on another's latitude to a millionth (about 0.1 m).
 */
export const FLAT_EDGE_DEGREES = 1e-6

/** A run of pixel edges with this many flat treads or more is lint — one tread is a corner (Claude, 2026-11-09). */
export const STAIR_MIN_TREADS = 2

/**
 * A closed loop of water this large or larger is a closed sea, its shore a coast; smaller, a lake, left to the lakes'
 * plan (the dev, 2026-11-09: coasts first, then lakes). Measured on the mask the same day: the Black Sea 455,895 km² and
 * the Caspian 394,760 km², then Ladoga 17,786 km² — the line falls in the gap. Claude's, from that measure.
 */
export const SEA_MIN_KM2 = 100_000

/**
 * An edge on the sea side with a sample farther than this from the shore is off it. The shore is traced on a grid of
 * 2,560 columns, about 4 km a pixel at 45° N: half a pixel, and the Pen's own snap, stay under it. Claude's, 2026-11-09.
 */
export const OFF_COAST_KM = 2

/**
 * …and is measured only within this distance of the shore: farther out at sea, it is an island's ring or a polity
 * across the water, not a coast. The farthest coarse coast measured on 1300 lay 78 km off (Crimea). Claude's,
 * 2026-11-09.
 */
export const SHORE_REACH_KM = 100

/**
 * A shore nobody holds with a polity's edge this close behind it is a coast drawn short of the sea; farther, the shore is
 * truly empty. The Aegean coast of Turkey in 1300 lay up to 17 km short. Claude's, 2026-11-09.
 */
export const SHORT_OF_SHORE_KM = 30

/** An anchor this close to the shore lies on it — the Pen's snap put it there. Claude's, 2026-11-09. */
export const ON_SHORE_KM = 0.1

/** A ring of this many points or fewer is a leftover of the import (the dev, 2026-11-09: « paths of 3 or 4 dots »). */
export const LEFTOVER_MAX_POINTS = 4

/**
 * …and of this area or less: a large polity drawn coarsely in four points is not waste. Proposed by Claude, 2026-11-09,
 * just above the largest four-point ring of the 1300 import (290 km²); found by a test, not on a map.
 */
export const LEFTOVER_MAX_KM2 = 300
