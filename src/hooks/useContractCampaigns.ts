/**
 * useContractCampaigns — event-driven indexer for ClearFundEscrow campaigns.
 *
 * Scans CampaignCreated events from the deploy block forward and builds a list
 * of onchain campaign IDs. For each ID it calls useOnchainCampaign to load the
 * full campaign struct + balance.
 *
 * Design rules:
 * - Never starts from block 0. Reads current head first, then scans from
 *   DEPLOY_BLOCK_ENV (set alongside VITE_CLEARFUND_ESCROW_ADDRESS) or falls
 *   back to head - 10_000 for a recent-only scan.
 * - Batches getLogs in 2 000-block ranges to stay within RPC limits.
 * - Persists last-scanned block in localStorage so a refresh resumes rather
 *   than re-scanning.
 * - Returns empty array + isLoading=false in DEMO mode (no RPC calls made).
 * - NEVER mixes these results with sample-data raisedAmount totals.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { CLEARFUND_CHAIN, ESCROW_ADDRESS, CLEARFUND_ESCROW_ABI, isContractDeployed } from '../lib/clearfundContract'

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
  const abortRef = useRef(false)

  const scan = useCallback(async () => {
    if (!isContractDeployed()) return

    abortRef.current = false
    setState((s) => ({ ...s, isLoading: true, error: undefined }))

    // Build a public client for the configured Arc network using the proxy when available.
    const proxyChains: string[] = String(import.meta.env.VITE_RPC_PROXY_CHAINS ?? '').split(',')
    const compassKey = CLEARFUND_CHAIN.id === 5042 ? 'Arc_Mainnet' : 'Arc_Testnet'
    const rpcUrl =
      import.meta.env.VITE_RPC_PROXY_BASE_URL && proxyChains.some((c) => c === compassKey)
        ? `${import.meta.env.VITE_RPC_PROXY_BASE_URL}/api/rpc/${compassKey}?_rpc_token=${import.meta.env.VITE_RPC_PROXY_TOKEN}`
        : CLEARFUND_CHAIN.rpcUrls.default.http[0]

    const client = createPublicClient({ chain: CLEARFUND_CHAIN, transport: http(rpcUrl) })

    try {
      // 1. Get chain head — never crawl from 0
      const head = await client.getBlockNumber()
      const deployBlock = getDeployBlock(head)
      const cachedIds = loadCampaignIds()
      // Old cursor-only caches cannot reconstruct previous campaigns; rescan once.
      const lastScanned = loadLastBlock()
      const resumeBlock = cachedIds.length && lastScanned !== undefined ? lastScanned + 1n : deployBlock

      // start from the later of resume block and deploy block
      let fromBlock = resumeBlock > deployBlock ? resumeBlock : deployBlock

      // Collect new campaign IDs from events
      const newIds = new Set<bigint>(cachedIds)

      while (fromBlock <= head) {
        if (abortRef.current) return
        const toBlock = fromBlock + BATCH_SIZE > head ? head : fromBlock + BATCH_SIZE

        const logs = await client.getLogs({
          address: ESCROW_ADDRESS as `0x${string}`,
          event: CAMPAIGN_CREATED_EVENT,
          fromBlock,
          toBlock,
        })

        for (const log of logs) {
          if (log.args.campaignId !== undefined) newIds.add(log.args.campaignId)
        }

        setState((s) => ({ ...s, currentBlock: toBlock, chainHead: head }))
        fromBlock = toBlock + 1n
      }

      // Persist IDs before advancing the cursor so refreshes never lose campaigns.
      saveCampaignIds(newIds)
      saveLastBlock(head)

      if (abortRef.current) return

      // 2. Load full campaign data for every discovered ID
      const loaded: IndexedCampaign[] = []
      for (const id of newIds) {
        if (abortRef.current) return
        try {
          const [rawCampaign, rawBalance] = await Promise.all([
            client.readContract({
              address: ESCROW_ADDRESS as `0x${string}`,
              abi: CLEARFUND_ESCROW_ABI,
              functionName: 'campaigns',
              args: [id],
            }),
            client.readContract({
              address: ESCROW_ADDRESS as `0x${string}`,
              abi: CLEARFUND_ESCROW_ABI,
              functionName: 'campaignBalance',
              args: [id],
            }),
          ])
          const [organizer, recipient, target, metadataURI, totalContributed, totalPaidOut, active, milestoneCount, totalAllocated] = rawCampaign as [
            `0x${string}`, `0x${string}`, bigint, string, bigint, bigint, boolean, bigint, bigint
          ]
          loaded.push({
            onchainId: id, organizer, recipient, target, metadataURI,
            totalContributed, totalPaidOut, active, milestoneCount, totalAllocated,
            balance: rawBalance as bigint,
          })
        } catch {
          // skip campaigns that fail to load (e.g. RPC hiccup)
        }
      }

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
      const msg = (err as { message?: string }).message?.slice(0, 200) ?? 'RPC error'
      setState((s) => ({ ...s, isLoading: false, error: msg }))
    }
  }, [])

  useEffect(() => {
    if (!isContractDeployed()) return
    // oxlint-disable-next-line react/set-state-in-effect -- legitimate external-system sync (RPC fetch)
    void scan()
    return () => { abortRef.current = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan])

  return state
}
