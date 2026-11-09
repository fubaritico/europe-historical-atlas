import { kmToSegment } from './geo.mjs'

/**
 * The dev's itinerary of the coasts (2026-11-09), so every pass over a map goes round it in one order and nothing is
 * forgotten: from the north, round Scandinavia, then the Baltic; Denmark, the Low Countries, the French coast, Spain,
 * Italy, Greece, the Black Sea, Turkey, the Levant, Egypt, Libya, the Maghreb, West Africa; then the Red Sea, the Indian
 * Ocean, the Persian Gulf, the Caspian Sea.
 *
 * Written as waypoints — a plain line from one to the next — and a finding takes the rank of the nearest stretch, then
 * its place along it. The waypoints are Claude's reading of the dev's words (2026-11-09); an island takes the stretch of
 * the nearest coast.
 */

/**
 * The waypoints, in the dev's order: a name for the reader, a longitude and a latitude.
 * @type {readonly { name: string, at: readonly [number, number] }[]}
 */
export const ITINERARY = [
  { name: 'North Cape', at: [25.8, 71.2] },
  { name: 'Lofoten', at: [14, 68] },
  { name: 'Bergen', at: [5, 60.4] },
  { name: 'Lindesnes', at: [7, 58] },
  { name: 'Oslofjord', at: [10.5, 59] },
  { name: 'Gothenburg', at: [11.8, 57.7] },
  { name: 'Stockholm', at: [18.5, 59.3] },
  { name: 'Head of Bothnia', at: [22, 65.6] },
  { name: 'Gulf of Finland', at: [28, 60.2] },
  { name: 'Riga', at: [24, 57] },
  { name: 'Königsberg', at: [20.5, 54.7] },
  { name: 'Rügen', at: [13.5, 54.4] },
  { name: 'Zealand', at: [12.4, 55.6] },
  { name: 'Jutland', at: [8.2, 56] },
  { name: 'Frisia', at: [6, 53.5] },
  { name: 'Rhine mouth', at: [4, 52] },
  { name: 'Calais', at: [1.8, 51] },
  { name: 'Normandy', at: [0, 49.5] },
  { name: 'Brest', at: [-4.5, 48.4] },
  { name: 'La Rochelle', at: [-1.2, 46] },
  { name: 'Bay of Biscay', at: [-3, 43.4] },
  { name: 'Galicia', at: [-9, 43] },
  { name: 'Lisbon', at: [-9.2, 38.7] },
  { name: 'Gibraltar', at: [-5.6, 36] },
  { name: 'Valencia', at: [-0.3, 39.5] },
  { name: 'Barcelona', at: [2.2, 41.4] },
  { name: 'Marseille', at: [5.4, 43.3] },
  { name: 'Genoa', at: [8.9, 44.4] },
  { name: 'Rome', at: [12.3, 41.8] },
  { name: 'Strait of Messina', at: [15.6, 38.2] },
  { name: 'Taranto', at: [17.2, 40.4] },
  { name: 'Venice', at: [12.3, 45.4] },
  { name: 'Dalmatia', at: [16.4, 43.5] },
  { name: 'Albania', at: [19.4, 41.3] },
  { name: 'Peloponnese', at: [22.4, 36.5] },
  { name: 'Athens', at: [23.7, 38] },
  { name: 'Thessaloniki', at: [22.9, 40.6] },
  { name: 'Bosporus', at: [29, 41.1] },
  { name: 'Danube mouth', at: [29.7, 45.2] },
  { name: 'Crimea', at: [34, 44.5] },
  { name: 'Sea of Azov', at: [38, 47] },
  { name: 'Colchis', at: [41.6, 41.6] },
  { name: 'Sinope', at: [35, 42] },
  { name: 'Aegean Turkey', at: [27, 38.4] },
  { name: 'Antalya', at: [30.7, 36.9] },
  { name: 'Levant', at: [35.5, 34] },
  { name: 'Nile delta', at: [31.5, 31.5] },
  { name: 'Cyrenaica', at: [20, 31.5] },
  { name: 'Tripoli', at: [13.2, 32.9] },
  { name: 'Tunis', at: [10.2, 36.8] },
  { name: 'Algiers', at: [3, 36.8] },
  { name: 'Tangier', at: [-5.8, 35.8] },
  { name: 'Atlantic Morocco', at: [-9.6, 30.4] },
  { name: 'Cape Verde', at: [-17, 14.7] },
  { name: 'Suez', at: [32.5, 30] },
  { name: 'Jeddah', at: [39.2, 21.5] },
  { name: 'Aden', at: [45, 12.8] },
  { name: 'Oman', at: [58.5, 23.6] },
  { name: 'Hormuz', at: [56.3, 26.6] },
  { name: 'Basra', at: [48, 30] },
  { name: 'Baku', at: [49.9, 40.4] },
  { name: 'Volga mouth', at: [48, 46.3] },
  { name: 'Turkmen shore', at: [53, 40] },
]

/**
 * Where a point falls on the itinerary.
 * @param {readonly [number, number]} point - the point
 * @param {typeof ITINERARY} [itinerary] - the waypoints; the dev's by default
 * @returns {{ rank: number, stretch: string }} `rank` grows along the itinerary (the stretch's index, plus the place
 *   along it between 0 and 1); `stretch` names its two waypoints
 */
export function itineraryRank(point, itinerary = ITINERARY) {
  let best = { km: Infinity, rank: 0, stretch: '' }
  for (let k = 0; k + 1 < itinerary.length; k++) {
    const a = itinerary[k].at
    const b = itinerary[k + 1].at
    const km = kmToSegment(point, a, b)
    if (km < best.km) {
      const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
      const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy)))
      best = { km, rank: k + t, stretch: `${itinerary[k].name} → ${itinerary[k + 1].name}` }
    }
  }
  return { rank: best.rank, stretch: best.stretch }
}
