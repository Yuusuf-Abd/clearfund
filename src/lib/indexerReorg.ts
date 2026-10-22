/**
 * A cached cursor is safe to resume only if its block hash still matches.
 * Older caches without a checkpoint are rebuilt once.
 */
export function shouldRebuildIndexer(
  savedCursor: bigint | undefined,
  head: bigint,
  savedHash: string | undefined,
  observedHash: string | undefined,
): boolean {
  if (savedCursor === undefined) return false
  if (savedCursor > head) return true
  if (!savedHash || !observedHash) return true
  return savedHash.toLowerCase() !== observedHash.toLowerCase()
}
