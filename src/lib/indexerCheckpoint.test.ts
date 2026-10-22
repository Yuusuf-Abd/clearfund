import { describe, expect, it } from 'vitest'
import { decodeIndexerCheckpoint, encodeIndexerCheckpoint } from './indexerCheckpoint'

const hash = `0x${'ab'.repeat(32)}`

describe('atomic indexer checkpoint', () => {
  it('round-trips cursor, hash and IDs together', () => {
    const checkpoint = { cursor: 12345678901234567890n, hash, ids: [1n, 3n] }
    expect(decodeIndexerCheckpoint(encodeIndexerCheckpoint(checkpoint))).toEqual(checkpoint)
  })

  it('rejects a legacy cursor-only cache', () => {
    expect(decodeIndexerCheckpoint('{"cursor":"20"}')).toBeUndefined()
  })

  it('rejects malformed JSON and absent storage', () => {
    expect(decodeIndexerCheckpoint('{')).toBeUndefined()
    expect(decodeIndexerCheckpoint(null)).toBeUndefined()
  })

  it('rejects invalid hashes, cursors and campaign IDs', () => {
    expect(decodeIndexerCheckpoint(JSON.stringify({ version: 1, cursor: '-1', hash, ids: [] }))).toBeUndefined()
    expect(decodeIndexerCheckpoint(JSON.stringify({ version: 1, cursor: '20', hash: '0xwrong', ids: [] }))).toBeUndefined()
    expect(decodeIndexerCheckpoint(JSON.stringify({ version: 1, cursor: '20', hash, ids: ['bad'] }))).toBeUndefined()
  })

  it('rejects duplicated campaign IDs', () => {
    expect(decodeIndexerCheckpoint(JSON.stringify({ version: 1, cursor: '20', hash, ids: ['1', '1'] }))).toBeUndefined()
  })

  it('keeps an older complete checkpoint valid when a new write fails', () => {
    const storage = new Map<string, string>()
    const key = 'checkpoint'
    const original = encodeIndexerCheckpoint({ cursor: 10n, hash, ids: [1n] })
    storage.set(key, original)
    const failedWrite = () => { throw new Error('storage quota exceeded') }
    expect(failedWrite).toThrow('storage quota exceeded')
    expect(decodeIndexerCheckpoint(storage.get(key) ?? null)).toEqual({
      cursor: 10n, hash, ids: [1n],
    })
  })
})
