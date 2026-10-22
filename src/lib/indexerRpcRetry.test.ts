import { describe, expect, it, vi } from 'vitest'
import { withRpcRetry } from './indexerRpcRetry'

describe('withRpcRetry', () => {
  it('returns a successful first response without retrying', async () => {
    const request = vi.fn().mockResolvedValue([1n])
    await expect(withRpcRetry(request)).resolves.toEqual([1n])
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('recovers when a transient RPC request fails once', async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error('RPC unavailable')).mockResolvedValueOnce([2n])
    await expect(withRpcRetry(request)).resolves.toEqual([2n])
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('propagates repeated failures rather than returning empty results', async () => {
    const request = vi.fn().mockRejectedValue(new Error('RPC unavailable'))
    await expect(withRpcRetry(request)).rejects.toThrow('RPC unavailable')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('does not retry a successful empty event batch', async () => {
    const request = vi.fn().mockResolvedValue([])
    await expect(withRpcRetry(request)).resolves.toEqual([])
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid retry counts', async () => {
    await expect(withRpcRetry(() => Promise.resolve(1), 0)).rejects.toThrow(RangeError)
    await expect(withRpcRetry(() => Promise.resolve(1), 1.5)).rejects.toThrow(RangeError)
  })

  it('supports one attempt when requested', async () => {
    const request = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(withRpcRetry(request, 1)).rejects.toThrow('offline')
    expect(request).toHaveBeenCalledTimes(1)
  })
})
