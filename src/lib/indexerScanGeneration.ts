/**
 * Each scan receives its own generation. Cleanup invalidates that generation,
 * so an earlier RPC response cannot become current when a new scan begins.
 */
export function createScanGeneration() {
  let current = 0
  return {
    begin(): number {
      current += 1
      return current
    },
    invalidate(): void {
      current += 1
    },
    isCurrent(generation: number): boolean {
      return generation === current
    },
  }
}
