import { describe, expect, it } from 'vitest'
import { createScanGeneration } from './indexerScanGeneration'

describe('createScanGeneration', () => {
  it('marks a newly started scan current', () => {
    const scans = createScanGeneration()
    const first = scans.begin()
    expect(scans.isCurrent(first)).toBe(true)
  })

  it('invalidates a scan on cleanup', () => {
    const scans = createScanGeneration()
    const first = scans.begin()
    scans.invalidate()
    expect(scans.isCurrent(first)).toBe(false)
  })

  it('keeps an old scan invalid after a new scan starts', () => {
    const scans = createScanGeneration()
    const first = scans.begin()
    scans.invalidate()
    const second = scans.begin()
    expect(scans.isCurrent(first)).toBe(false)
    expect(scans.isCurrent(second)).toBe(true)
  })

  it('supersedes an overlapping scan without cleanup', () => {
    const scans = createScanGeneration()
    const first = scans.begin()
    const second = scans.begin()
    expect(scans.isCurrent(first)).toBe(false)
    expect(scans.isCurrent(second)).toBe(true)
  })

  it('rejects late completion of an interrupted request', async () => {
    const scans = createScanGeneration()
    const first = scans.begin()
    let resolveRequest: (value: string) => void = () => {}
    const request = new Promise<string>((resolve) => { resolveRequest = resolve })
    scans.invalidate()
    const second = scans.begin()
    resolveRequest('stale RPC data')
    await request
    expect(scans.isCurrent(first)).toBe(false)
    expect(scans.isCurrent(second)).toBe(true)
  })
})
