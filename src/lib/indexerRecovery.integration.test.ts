import { describe, expect, it, vi } from 'vitest'
import { getIndexerBatchEnd } from './indexerBatch'
import { getIndexerResumeState } from './indexerResume'
import { shouldRebuildIndexer } from './indexerReorg'
import { withRpcRetry } from './indexerRpcRetry'
import { createScanGeneration } from './indexerScanGeneration'

type Cache = { cursor?: bigint; hash?: string; ids: bigint[] }
type Rpc = {
  head: () => Promise<bigint>
  blockHash: (block: bigint) => Promise<string>
  logs: (from: bigint, to: bigint) => Promise<bigint[]>
  campaign: (id: bigint) => Promise<string>
}

/** Integration harness: compose the same scan helpers without mounting React. */
async function runScan(cache: Cache, rpc: Rpc, scans = createScanGeneration()) {
  const generation = scans.begin()
  const isStale = () => !scans.isCurrent(generation)
  const head = await withRpcRetry(rpc.head)
  if (isStale()) return undefined
  const observedHash = cache.cursor !== undefined && cache.cursor <= head
    ? await withRpcRetry(() => rpc.blockHash(cache.cursor!))
    : undefined
  if (isStale()) return undefined
  const rebuild = shouldRebuildIndexer(cache.cursor, head, cache.hash, observedHash)
  const resume = getIndexerResumeState(10n, head, rebuild ? undefined : cache.cursor, rebuild ? [] : cache.ids)
  const ids = resume.ids
  let from = resume.fromBlock
  while (from <= head) {
    const to = getIndexerBatchEnd(from, head, 2_000n)
    const events = await withRpcRetry(() => rpc.logs(from, to))
    if (isStale()) return undefined
    for (const id of events) ids.add(id)
    from = to + 1n
  }
  const campaigns: string[] = []
  for (const id of ids) {
    const campaign = await withRpcRetry(() => rpc.campaign(id))
    if (isStale()) return undefined
    campaigns.push(campaign)
  }
  const hash = await withRpcRetry(() => rpc.blockHash(head))
  if (isStale()) return undefined
  // No cache writes until every RPC operation has succeeded.
  cache.ids = [...ids]
  cache.cursor = head
  cache.hash = hash
  return campaigns
}

function mockRpc(overrides: Partial<Rpc> = {}): Rpc {
  return {
    head: vi.fn().mockResolvedValue(20n),
    blockHash: vi.fn().mockResolvedValue('0xnew'),
    logs: vi.fn().mockResolvedValue([1n]),
    campaign: vi.fn().mockResolvedValue('campaign-1'),
    ...overrides,
  }
}

describe('indexer recovery scenarios', () => {
  it('does not advance cached cursor after repeated event RPC failures', async () => {
    const cache: Cache = { cursor: 15n, hash: '0xold', ids: [3n] }
    const rpc = mockRpc({
      blockHash: vi.fn().mockResolvedValue('0xold'),
      logs: vi.fn().mockRejectedValue(new Error('RPC offline')),
    })
    await expect(runScan(cache, rpc)).rejects.toThrow('RPC offline')
    expect(cache).toEqual({ cursor: 15n, hash: '0xold', ids: [3n] })
    expect(rpc.logs).toHaveBeenCalledTimes(2)
  })

  it('does not commit partial campaigns when a contract read fails', async () => {
    const cache: Cache = { ids: [] }
    const rpc = mockRpc({
      logs: vi.fn().mockResolvedValue([1n, 2n]),
      campaign: vi.fn().mockImplementation((id: bigint) =>
        id === 2n ? Promise.reject(new Error('read failed')) : Promise.resolve('campaign-1')),
    })
    await expect(runScan(cache, rpc)).rejects.toThrow('read failed')
    expect(cache).toEqual({ ids: [] })
  })

  it('retries transient log failures then commits the completed scan', async () => {
    const cache: Cache = { ids: [] }
    const rpc = mockRpc({
      logs: vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce([1n]),
    })
    await expect(runScan(cache, rpc)).resolves.toEqual(['campaign-1'])
    expect(cache).toEqual({ cursor: 20n, hash: '0xnew', ids: [1n] })
    expect(rpc.logs).toHaveBeenCalledTimes(2)
  })

  it('rebuilds cached IDs when a shallow reorganization changes the checkpoint', async () => {
    const cache: Cache = { cursor: 15n, hash: '0xold', ids: [99n] }
    const rpc = mockRpc()
    await expect(runScan(cache, rpc)).resolves.toEqual(['campaign-1'])
    expect(cache.ids).toEqual([1n])
    expect(rpc.logs).toHaveBeenCalledWith(10n, 20n)
  })

  it('ignores late RPC results after cleanup and a new scan', async () => {
    const cache: Cache = { ids: [] }
    const scans = createScanGeneration()
    let resolveHead: (value: bigint) => void = () => {}
    const head = new Promise<bigint>((resolve) => { resolveHead = resolve })
    const rpc = mockRpc({ head: vi.fn().mockReturnValue(head) })
    const oldScan = runScan(cache, rpc, scans)
    scans.invalidate()
    const current = scans.begin()
    resolveHead(20n)
    await expect(oldScan).resolves.toBeUndefined()
    expect(scans.isCurrent(current)).toBe(true)
    expect(cache).toEqual({ ids: [] })
    expect(rpc.logs).not.toHaveBeenCalled()
  })
})
