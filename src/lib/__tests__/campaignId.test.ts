/**
 * Unit tests for src/lib/campaignId.ts
 *
 * Run with:  bunx vitest run src/lib/__tests__/campaignId.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  parseOnchainCampaignId,
  tryParseOnchainCampaignId,
  isLocalDemoId,
} from '../campaignId'

// ── isLocalDemoId ──────────────────────────────────────────────────────────────

describe('isLocalDemoId', () => {
  it('returns true for sample DEMO IDs ("c1", "c2")', () => {
    expect(isLocalDemoId('c1')).toBe(true)
    expect(isLocalDemoId('c2')).toBe(true)
  })

  it('returns true for user-created local IDs with underscores', () => {
    expect(isLocalDemoId('uc_2024-01-01_abc123')).toBe(true)
  })

  it('returns true for IDs with hyphens', () => {
    expect(isLocalDemoId('campaign-1')).toBe(true)
  })

  it('returns false for numeric-only strings', () => {
    expect(isLocalDemoId('0')).toBe(false)
    expect(isLocalDemoId('1')).toBe(false)
    expect(isLocalDemoId('42')).toBe(false)
    expect(isLocalDemoId('999999')).toBe(false)
  })

  it('returns false for large numeric-only IDs', () => {
    expect(isLocalDemoId('115792089237316195423570985008687907853269984665640564039457584007913129639935')).toBe(false)
  })
})

// ── parseOnchainCampaignId ────────────────────────────────────────────────────

describe('parseOnchainCampaignId', () => {
  it('parses "0" to 0n', () => {
    expect(parseOnchainCampaignId('0')).toBe(0n)
  })

  it('parses "1" to 1n', () => {
    expect(parseOnchainCampaignId('1')).toBe(1n)
  })

  it('parses large uint256 strings without precision loss', () => {
    const big = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
    expect(parseOnchainCampaignId(big)).toBe(BigInt(big))
  })

  it('parses strings with leading/trailing whitespace', () => {
    expect(parseOnchainCampaignId('  7  ')).toBe(7n)
  })

  it('throws on empty string', () => {
    expect(() => parseOnchainCampaignId('')).toThrow('Campaign ID is empty')
  })

  it('throws on whitespace-only string', () => {
    expect(() => parseOnchainCampaignId('   ')).toThrow('Campaign ID is empty')
  })

  it('throws on demo ID "c1"', () => {
    expect(() => parseOnchainCampaignId('c1')).toThrow('local demo/draft ID')
  })

  it('throws on user local ID "uc_2024-01-01_abc"', () => {
    expect(() => parseOnchainCampaignId('uc_2024-01-01_abc')).toThrow()
  })

  it('throws on negative string "-1"', () => {
    expect(() => parseOnchainCampaignId('-1')).toThrow()
  })

  it('throws on decimal string "1.5"', () => {
    expect(() => parseOnchainCampaignId('1.5')).toThrow()
  })

  it('throws on leading zero "01" (ambiguous)', () => {
    expect(() => parseOnchainCampaignId('01')).toThrow()
  })

  it('throws on "NaN"', () => {
    expect(() => parseOnchainCampaignId('NaN')).toThrow()
  })

  it('throws on "0x1a" (hex notation)', () => {
    expect(() => parseOnchainCampaignId('0x1a')).toThrow()
  })

  it('throws on space-embedded string "1 2"', () => {
    expect(() => parseOnchainCampaignId('1 2')).toThrow()
  })

  it('never returns 0n for an invalid input (no silent fallback)', () => {
    const invalids = ['', 'c1', '-5', '1.0', 'abc', '01']
    for (const v of invalids) {
      expect(() => parseOnchainCampaignId(v)).toThrow()
    }
  })
})

// ── tryParseOnchainCampaignId ─────────────────────────────────────────────────

describe('tryParseOnchainCampaignId', () => {
  it('returns the bigint for valid IDs', () => {
    expect(tryParseOnchainCampaignId('42')).toBe(42n)
    expect(tryParseOnchainCampaignId('0')).toBe(0n)
  })

  it('returns undefined for invalid IDs — never 0n', () => {
    expect(tryParseOnchainCampaignId('c1')).toBeUndefined()
    expect(tryParseOnchainCampaignId('')).toBeUndefined()
    expect(tryParseOnchainCampaignId('-1')).toBeUndefined()
    expect(tryParseOnchainCampaignId('1.5')).toBeUndefined()
    expect(tryParseOnchainCampaignId('01')).toBeUndefined()
  })

  it('returns undefined for null/undefined input', () => {
    expect(tryParseOnchainCampaignId(null)).toBeUndefined()
    expect(tryParseOnchainCampaignId(undefined)).toBeUndefined()
  })

  it('never silently returns 0n for invalid inputs', () => {
    const invalids = ['c1', '', '-5', 'uc_2024_abc', '0x00', '1.0']
    for (const v of invalids) {
      expect(tryParseOnchainCampaignId(v)).not.toBe(0n)
    }
  })
})
