/** Return the inclusive end block for an RPC log batch. */
export function getIndexerBatchEnd(fromBlock: bigint, head: bigint, batchSize: bigint): bigint {
  if (batchSize <= 0n) throw new RangeError('Indexer batch size must be positive')
  if (fromBlock > head) throw new RangeError('Indexer start block exceeds chain head')
  const batchEnd = fromBlock + batchSize - 1n
  return batchEnd > head ? head : batchEnd
}
