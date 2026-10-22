/**
 * Retry a transient RPC request once. Failed attempts are never treated as
 * successful empty results, so the indexer will not advance its cursor.
 */
export async function withRpcRetry<T>(
  request: () => Promise<T>,
  attempts = 2,
): Promise<T> {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError('RPC retry attempts must be a positive integer')
  }
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await request()
    } catch (error) {
      if (attempt === attempts) throw error
    }
  }
  throw new Error('Unreachable RPC retry state')
}
