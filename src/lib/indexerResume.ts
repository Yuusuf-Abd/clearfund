/**
 * Resolve a cached campaign indexer's restart point.
 * When the RPC head is below the saved cursor, a rollback invalidates cached IDs.
 */
export function getIndexerResumeState(
  deployBlock: bigint,
  head: bigint,
  lastScanned: bigint | undefined,
  cachedIds: readonly bigint[],
): { fromBlock: bigint; ids: Set<bigint> } {
  const rolledBack = lastScanned !== undefined && lastScanned > head
  const canResume = !rolledBack && cachedIds.length > 0 && lastScanned !== undefined
  const resumeBlock = canResume ? lastScanned + 1n : deployBlock
  return {
    fromBlock: resumeBlock > deployBlock ? resumeBlock : deployBlock,
    ids: new Set<bigint>(rolledBack ? [] : cachedIds),
  }
}
