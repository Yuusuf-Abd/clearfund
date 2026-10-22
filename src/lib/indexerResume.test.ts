import { describe, expect, it } from 'vitest'
import { getIndexerResumeState } from './indexerResume'

describe('getIndexerResumeState', () => {
  it('resumes immediately after a saved cursor with known IDs', () => {
    const result = getIndexerResumeState(100n, 500n, 300n, [1n, 2n])
    expect(result.fromBlock).toBe(301n)
    expect([...result.ids]).toEqual([1n, 2n])
  })

  it('rebuilds from deployment when RPC head rolls back', () => {
    const result = getIndexerResumeState(100n, 250n, 300n, [1n, 2n])
    expect(result.fromBlock).toBe(100n)
    expect([...result.ids]).toEqual([])
  })

  it('rescans from deployment for cursor-only caches', () => {
    const result = getIndexerResumeState(100n, 500n, 300n, [])
    expect(result.fromBlock).toBe(100n)
    expect([...result.ids]).toEqual([])
  })

  it('rescans from deployment if no cursor is stored', () => {
    const result = getIndexerResumeState(100n, 500n, undefined, [1n])
    expect(result.fromBlock).toBe(100n)
    expect([...result.ids]).toEqual([1n])
  })

  it('never resumes before the configured deployment block', () => {
    const result = getIndexerResumeState(400n, 500n, 200n, [1n])
    expect(result.fromBlock).toBe(400n)
  })

  it('handles a cursor at the current chain head', () => {
    const result = getIndexerResumeState(100n, 300n, 300n, [1n])
    expect(result.fromBlock).toBe(301n)
    expect([...result.ids]).toEqual([1n])
  })
})
