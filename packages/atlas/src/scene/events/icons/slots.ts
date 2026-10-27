/**
 * Where each item takes its place among the instances it is drawn with: items of one key share one instanced mesh, and
 * each takes the next slot in it. Shared by the 3D icons (`iconInstances`) and the facing squares (`billboards`).
 */

/** Each item's slot, and how many items each key holds. */
export interface Slots<K> {
  /** Each item's rank among the items of its key, in the items' order. */
  slots: number[]
  /** How many items each key holds, in the order the keys first appear. */
  counts: Map<K, number>
}

/**
 * Give each item its slot.
 * @param keys - each item's key, in the items' order
 * @returns the slots and the counts
 */
export function slotsByKey<K>(keys: readonly K[]): Slots<K> {
  const slots: number[] = []
  const counts = new Map<K, number>()
  for (const key of keys) {
    // The next free slot of this key.
    const count = counts.get(key) ?? 0
    slots.push(count)
    counts.set(key, count + 1)
  }
  return { slots, counts }
}
