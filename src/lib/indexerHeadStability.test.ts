import { describe, expect, it } from 'vitest'
import { isIndexerHeadStable } from './indexerHeadStability'

const first = `0x${'ab'.repeat(32)}`
const second = `0x${'cd'.repeat(32)}`

describe('indexer head stability', () => {
  it('accepts a stable canonical head', () => {
    expect(isIndexerHeadStable(first, first)).toBe(true)
  })

  it('accepts case-insensitive hashes', () => {
    expect(isIndexerHeadStable(first, first.toUpperCase().replace('0X', '0x'))).toBe(true)
  })

  it('rejects a mid-scan reorganization', () => {
    expect(isIndexerHeadStable(first, second)).toBe(false)
  })

  it('rejects missing or malformed hashes', () => {
    expect(isIndexerHeadStable('', first)).toBe(false)
    expect(isIndexerHeadStable(first, '0x123')).toBe(false)
  })
})
