/**
 * An event scan is only safe to checkpoint when its ending block still
 * belongs to the same canonical chain observed at scan start.
 */
export function isIndexerHeadStable(before: string, after: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(before) &&
    /^0x[0-9a-fA-F]{64}$/.test(after) &&
    before.toLowerCase() === after.toLowerCase()
}
