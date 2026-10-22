/**
 * Persist the cursor, canonical block hash and discovered IDs together.
 * A single localStorage write cannot expose a cursor with a mismatched ID set.
 */
export interface IndexerCheckpoint {
  cursor: bigint
  hash: string
  ids: bigint[]
}

export function encodeIndexerCheckpoint(checkpoint: IndexerCheckpoint): string {
  return JSON.stringify({
    version: 1,
    cursor: checkpoint.cursor.toString(),
    hash: checkpoint.hash,
    ids: checkpoint.ids.map(String),
  })
}

export function decodeIndexerCheckpoint(value: string | null): IndexerCheckpoint | undefined {
  if (!value) return undefined
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null) return undefined
    const data = parsed as Record<string, unknown>
    if (data.version !== 1 || typeof data.cursor !== 'string' ||
        !/^\d+$/.test(data.cursor) || typeof data.hash !== 'string' ||
        !/^0x[0-9a-fA-F]{64}$/.test(data.hash) ||
        !Array.isArray(data.ids) ||
        !data.ids.every((id: unknown) => typeof id === 'string' && /^\d+$/.test(id))) {
      return undefined
    }
    const ids = data.ids as string[]
    if (new Set(ids).size !== ids.length) return undefined
    return { cursor: BigInt(data.cursor), hash: data.hash, ids: ids.map(BigInt) }
  } catch {
    return undefined
  }
}
