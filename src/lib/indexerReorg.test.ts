import { describe, expect, it } from 'vitest'
import { shouldRebuildIndexer } from './indexerReorg'

describe('shouldRebuildIndexer', () => {
  it('detects a shallow reorg with an unchanged chain height', () => {
    expect(shouldRebuildIndexer(100n, 100n, '0xaaa', '0xbbb')).toBe(true)
  })

  it('detects a reorg even when the head advances', () => {
    expect(shouldRebuildIndexer(100n, 105n, '0xaaa', '0xbbb')).toBe(true)
  })

  it('resumes when the checkpoint hash matches', () => {
    expect(shouldRebuildIndexer(100n, 105n, '0xABC', '0xabc')).toBe(false)
  })

  it('rebuilds old cursor caches without a checkpoint', () => {
    expect(shouldRebuildIndexer(100n, 105n, undefined, '0xabc')).toBe(true)
  })

  it('rebuilds when the RPC cannot supply a checkpoint hash', () => {
    expect(shouldRebuildIndexer(100n, 105n, '0xabc', undefined)).toBe(true)
  })

  it('rebuilds when the chain head rolls behind the cursor', () => {
    expect(shouldRebuildIndexer(100n, 99n, '0xabc', '0xabc')).toBe(true)
  })

  it('starts without a reorg check when no cursor exists', () => {
    expect(shouldRebuildIndexer(undefined, 100n, undefined, undefined)).toBe(false)
  })
})
