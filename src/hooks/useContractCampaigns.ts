/**
 * useContractCampaigns — event-driven indexer for ClearFundEscrow campaigns.
 *
 * Scans CampaignCreated events from the deploy block forward and builds a list
 * of onchain campaign IDs. For each ID it reads the contract directly to load
 * the full campaign struct and balance.
 *
 * Design rules:
 * - Never starts from block 0. Reads current head first, then scans from
 *   DEPLOY_BLOCK_ENV (set alongside VITE_CLEARFUND_ESCROW_ADDRESS) or falls
 *   back to head - 10_000 for a recent-only scan.
 * - Batches getLogs in 2 000-block ranges to stay within RPC limits.
 * - Persists last-scanned block in localStorage so a refresh resumes rather
 *   than re-scanning.
 * - Returns empty array + isLoading=false when no contract is configured.
 * - NEVER mixes these results with sample-data raisedAmount totals.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { CLEARFUND_CHAIN, ESCROW_ADDRESS, CLEARFUND_ESCROW_ABI, isContractDeployed } from '../lib/clearfundContract'
import { getIndexerBatchEnd } from '../lib/indexerBatch'
import { getIndexerResumeState } from '../lib/indexerResume'
import { withRpcRetry } from '../lib/indexerRpcRetry'
import { shouldRebuildIndexer } from '../lib/indexerReorg'
import { createScanGeneration } from '../lib/indexerScanGeneration'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IndexedCampaign {
  onchainId: bigint
  organizer: `0x${string}`
  recipient: `0x${string}`
  target: bigint
  metadataURI: string
  totalContributed: bigint
  totalPaidOut: bigint
  active: boolean
  milestoneCount: bigint
  totalAllocated: bigint
  balance: bigint
}

export interface IndexerState {
  campaigns: IndexedCampaign[]
  isLoading: boolean
  currentBlock: bigint
  chainHead: bigint
  error: string | undefined
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INDEXER_SCOPE = `${CLEARFUND_CHAIN.id}_${ESCROW_ADDRESS.toLowerCase()}`
const LS_LAST_BLOCK_KEY = `clearfund_indexer_last_block_${INDEXER_SCOPE}`
const LS_CAMPAIGN_IDS_KEY = `clearfund_indexer_campaign_ids_${INDEXER_SCOPE}`
const LS_BLOCK_HASH_KEY = `clearfund_indexer_block_hash_${INDEXER_SCOPE}`
const BATCH_SIZE = 2_000n
const LOOKBACK = 50_000n   // default lookback when deploy block is unknown

// The deploy block can be set via VITE_CLEARFUND_DEPLOY_BLOCK after deployment.
// If absent, we use head - LOOKBACK so recent campaigns are always found.
function getDeployBlock(head: bigint): bigint {
  const env = String(import.meta.env.VITE_CLEARFUND_DEPLOY_BLOCK ?? '')
  if (env && /^\d+$/.test(env)) return BigInt(env)
  return head > LOOKBACK ? head - LOOKBACK : 0n
}

function loadLastBlock(): bigint | undefined {
  try {
    const v = localStorage.getItem(LS_LAST_BLOCK_KEY)
    if (v) return BigInt(v)
  } catch { /* ignore */ }
  return undefined
}

function saveLastBlock(block: bigint) {
  try { localStorage.setItem(LS_LAST_BLOCK_KEY, String(block)) } catch { /* ignore */ }
}

function loadCampaignIds(): bigint[] {
  try {
    const stored = localStorage.getItem(LS_CAMPAIGN_IDS_KEY)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string' && /^\d+$/.test(id)).map((id) => BigInt(id))
  } catch { return [] }
}

function saveCampaignIds(ids: Set<bigint>) {
  try { localStorage.setItem(LS_CAMPAIGN_IDS_KEY, JSON.stringify([...ids].map(String))) } catch { /* ignore */ }
}

const CAMPAIGN_CREATED_EVENT = parseAbiItem(
  'event CampaignCreated(uint256 indexed campaignId, address indexed organizer, address indexed recipient, uint256 target)'
)

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useContractCampaigns(): IndexerState {
  const [state, setState] = useState<IndexerState>({
    campaigns: [],
    isLoading: false,
    currentBlock: 0n,
    chainHead: 0n,
    error: undefined,
  })
  const scanGenerationRef = useRef(createScanGeneration())

  const scan = useCallback(async () => {
    if (!isContractDeployed()) return

    const generation = scanGenerationRef.current.begin()
    const isStale = () => !scanGenerationRef.current.isCurrent(generation)
    setState((s) => ({ ...s, isLoading: true, error: undefined }))

    // Build a public client for the configured Arc network using the proxy when available.
    const proxyChains: string[] = String(import.meta.env.VITE_RPC_PROXY_CHAINS ?? '').split(',').map((c) => c.trim())
    const compassKey = CLEARFUND_CHAIN.id === 5042 ? 'Arc_Mainnet' : 'Arc_Testnet'
    const proxyBase = String(import.meta.env.VITE_RPC_PROXY_BASE_URL ?? '').trim()
    const proxyToken = String(import.meta.env.VITE_RPC_PROXY_TOKEN ?? '').trim()
    const rpcUrl =
      proxyBase && proxyToken && proxyChains.includes(compassKey)
        ? `${proxyBase.replace(/\/$/, '')}/api/rpc/${compassKey}?_rpc_token=${encodeURIComponent(proxyToken)}`
        : CLEARFUND_CHAIN.rpcUrls.default.http[0]

    const client = createPublicClient({ chain: CLEARFUND_CHAIN, transport: http(rpcUrl) })

    try {
      // 1. Get chain head — never crawl from 0
      const head = await withRpcRetry(() => client.getBlockNumber())
      const deployBlock = getDeployBlock(head)
      const cachedIds = loadCampaignIds()
      // Old cursor-only caches cannot reconstruct previous campaigns; rescan once.
      const lastScanned = loadLastBlock()
      // Discard cached IDs if the chain head rolled behind the saved cursor.
      // Validate the previously scanned block against the current canonical chain.
      // A changed hash detects a shallow reorg even when the chain head increases.
      const savedHash = localStorage.getItem(LS_BLOCK_HASH_KEY) ?? undefined
      const observedHash = lastScanned !== undefined && lastScanned <= head
        ? (await withRpcRetry(() => client.getBlock({ blockNumber: lastScanned }))).hash
        : undefined
      if (isStale()) return
      const rebuild = shouldRebuildIndexer(lastScanned, head, savedHash, observedHash)
      const resume = getIndexerResumeState(deployBlock, head, rebuild ? undefined : lastScanned, rebuild ? [] : cachedIds)
      let fromBlock = resume.fromBlock
      const newIds = resume.ids

      while (fromBlock <= head) {
        if (isStale()) return
        const toBlock = getIndexerBatchEnd(fromBlock, head, BATCH_SIZE)

        const logs = await withRpcRetry(() => client.getLogs({
          address: ESCROW_ADDRESS as `0x${string}`,
          event: CAMPAIGN_CREATED_EVENT,
          fromBlock,
          toBlock,
        }))
        // The hook may unmount while an RPC request is pending.
        if (isStale()) return

        for (const log of logs) {
          if (log.args.campaignId !== undefined) newIds.add(log.args.campaignId)
        }

        setState((s) => ({ ...s, currentBlock: toBlock, chainHead: head }))
        fromBlock = toBlock + 1n
      }

      // Do not commit a scan from an unmounted or superseded hook.
      if (isStale()) return

      // 2. Load full campaign data for every discovered ID.
      // Keep the previous cursor until all reads succeed so a transient RPC
      // failure cannot mark an incomplete refresh as successfully indexed.
      const loaded: IndexedCampaign[] = []
      for (const id of newIds) {
        if (isStale()) return
        try {
          const [rawCampaign, rawBalance] = await Promise.all([
            withRpcRetry(() => client.readContract({
              address: ESCROW_ADDRESS as `0x${string}`,
              abi: CLEARFUND_ESCROW_ABI,
              functionName: 'campaigns',
              args: [id],
            })),
            withRpcRetry(() => client.readContract({
              address: ESCROW_ADDRESS as `0x${string}`,
              abi: CLEARFUND_ESCROW_ABI,
              functionName: 'campaignBalance',
              args: [id],
            })),
          ])
          if (isStale()) return
          const [organizer, recipient, target, metadataURI, totalContributed, totalPaidOut, active, milestoneCount, totalAllocated] = rawCampaign as [
            `0x${string}`, `0x${string}`, bigint, string, bigint, bigint, boolean, bigint, bigint
          ]
          loaded.push({
            onchainId: id, organizer, recipient, target, metadataURI,
            totalContributed, totalPaidOut, active, milestoneCount, totalAllocated,
            balance: rawBalance as bigint,
          })
        } catch (err) {
          if (isStale()) return
          // A temporary RPC failure must not silently turn a real campaign
          // into a missing row while reporting a successful index.
          throw new Error(`Unable to load campaign ${id.toString()}: ${err instanceof Error ? err.message : 'RPC error'}`)
        }
      }

      if (isStale()) return

      // Commit the cache only after the event scan AND campaign reads succeed.
      // Never advance a cursor for a failed or abandoned refresh.
      const checkpointHash = (await withRpcRetry(() => client.getBlock({ blockNumber: head }))).hash
      if (isStale()) return
      // Store the hash before the cursor: interrupted writes trigger a safe
      // rebuild on the next refresh rather than trusting an unverified cursor.
      try { localStorage.setItem(LS_BLOCK_HASH_KEY, checkpointHash) } catch { /* ignore */ }
      saveCampaignIds(newIds)
      saveLastBlock(head)

      // Sort by campaign ID descending (newest first)
      loaded.sort((a, b) => (a.onchainId > b.onchainId ? -1 : 1))

      setState({
        campaigns: loaded,
        isLoading: false,
        currentBlock: head,
        chainHead: head,
        error: undefined,
      })
    } catch (err) {
      if (isStale()) return
      const msg = (err as { message?: string }).message?.slice(0, 200) ?? 'RPC error'
      setState((s) => ({ ...s, isLoading: false, error: msg }))
    }
  }, [])

  useEffect(() => {
    if (!isContractDeployed()) return
    // oxlint-disable-next-line react/set-state-in-effect -- legitimate external-system sync (RPC fetch)
    void scan()
    return () => { scanGenerationRef.current.invalidate() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan])

  return state
}
