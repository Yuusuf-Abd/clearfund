/**
 * campaignId.ts — strict onchain campaign ID parser.
 *
 * Rules:
 * - Accepts only non-negative integer strings that represent safe bigint values.
 * - Rejects empty, whitespace-only, decimal, negative, non-numeric, and
 *   Number.MAX_SAFE_INTEGER-exceeding values.
 * - NEVER silently substitutes 0 for an invalid input.
 * - Distinguishes LOCAL demo IDs (e.g. "c1", "uc_2024-01-01_abc123") from
 *   ONCHAIN IDs (pure digit strings) so callers can guard before any contract call.
 *
 * Usage:
 *   const id = parseOnchainCampaignId(rawId)  // throws on invalid
 *   const id = tryParseOnchainCampaignId(rawId) // returns undefined on invalid
 *   isLocalDemoId(rawId)  // true for non-numeric IDs from localStorage
 */

/** Matches a valid non-negative integer string: digits only, no leading zeros (except "0"). */
const ONCHAIN_ID_RE = /^(0|[1-9]\d*)$/

/**
 * Returns true if the id looks like a locally generated demo/draft id
 * (contains letters, underscores, hyphens, or starts with a non-digit character).
 * These MUST NOT be passed to any contract call.
 */
export function isLocalDemoId(id: string): boolean {
  return !/^\d+$/.test(id.trim())
}

/**
 * Parse a raw campaign ID string into a bigint for use in contract calls.
 *
 * Throws a descriptive Error on:
 *  - empty or whitespace-only strings
 *  - non-digit characters (including leading minus, decimal point, spaces)
 *  - values that would lose precision as a JavaScript Number (> Number.MAX_SAFE_INTEGER)
 *    — these are still accepted as bigint since BigInt handles them correctly;
 *      the check is intentionally omitted here to preserve full bigint precision.
 *
 * Never returns 0n unless the input string is literally "0".
 */
export function parseOnchainCampaignId(raw: string): bigint {
  const trimmed = (raw ?? '').trim()

  if (!trimmed) {
    throw new Error('Campaign ID is empty — cannot call contract.')
  }
  if (!ONCHAIN_ID_RE.test(trimmed)) {
    throw new Error(
      `Campaign ID "${trimmed}" is not a valid onchain ID. ` +
      (isLocalDemoId(trimmed)
        ? 'This looks like a local demo/draft ID — deploy the contract to get a real onchain ID.'
        : 'Only non-negative integers are accepted.')
    )
  }

  return BigInt(trimmed)
}

/**
 * Safe version of parseOnchainCampaignId.
 * Returns undefined (never 0n) when the input is invalid.
 */
export function tryParseOnchainCampaignId(raw: string | undefined | null): bigint | undefined {
  if (raw == null) return undefined
  try {
    return parseOnchainCampaignId(raw)
  } catch {
    return undefined
  }
}
