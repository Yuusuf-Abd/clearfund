import { describe, expect, it } from 'vitest'
import { getIndexerBatchEnd } from './indexerBatch'

describe('getIndexerBatchEnd', () => {
  it('includes exactly 2,000 blocks in a full batch', () => {
    expect(getIndexerBatchEnd(100n, 10_000n, 2_000n)).toBe(2_099n)
  })

  it('clamps the final batch to the chain head', () => {
    expect(getIndexerBatchEnd(2_100n, 2_150n, 2_000n)).toBe(2_150n)
  })

  it('handles a one-block range', () => {
    expect(getIndexerBatchEnd(42n, 42n, 2_000n)).toBe(42n)
  })

  it('does not overlap adjacent batches', () => {
    const first = getIndexerBatchEnd(0n, 5_000n, 2_000n)
    const secondStart = first + 1n
    expect(first).toBe(1_999n)
    expect(secondStart).toBe(2_000n)
    expect(getIndexerBatchEnd(secondStart, 5_000n, 2_000n)).toBe(3_999n)
  })

  it('rejects invalid batch size or inverted range', () => {
    expect(() => getIndexerBatchEnd(0n, 10n, 0n)).toThrow(RangeError)
    expect(() => getIndexerBatchEnd(11n, 10n, 2_000n)).toThrow(RangeError)
  })
})
