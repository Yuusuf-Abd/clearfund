/**
 * useClearFund — wagmi/viem integration hooks for ClearFundEscrow.
 *
 * All hooks check `isContractDeployed()` before making any onchain call.
 * When the contract is not configured they return safe defaults so the
 * existing DEMO UI continues to work unchanged.
 *
 * Tx state machine:
 *   idle → preparing → pendingSignature → pendingConfirmation → confirmed | failed
 *
 * These hooks NEVER:
 *   - Fabricate transaction hashes.
 *   - Display a pending/confirmed state without a real tx hash.
 *   - Auto-approve evidence or bypass reviewer gating.
 */

import { useCallback, useState } from 'react'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
  usePublicClient,
} from 'wagmi'
import { decodeEventLog } from 'viem'
import { parseUsdc } from '@/onchain-money'
import {
  CLEARFUND_ESCROW_ABI,
  ERC20_APPROVE_ABI,
  ESCROW_ADDRESS,
  USDC_ADDRESS,
  CLEARFUND_CHAIN,
  isContractDeployed,
  isArcTestnet,
  isArcMainnet,
  MilestoneStatus,
  type MilestoneStatusValue,
} from '../lib/clearfundContract'

// ── Types ─────────────────────────────────────────────────────────────────────

export type TxStage =
  | 'idle'
  | 'preparing'
  | 'pendingSignature'
  | 'pendingConfirmation'
  | 'confirmed'
  | 'failed'

export interface TxState {
  stage: TxStage
  txHash: `0x${string}` | undefined
  error: string | undefined
}

export interface OnchainCampaign {
  id: bigint
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

export interface OnchainMilestone {
  description: string
  amount: bigint
  status: MilestoneStatusValue
  evidenceURI: string
  paid: boolean
}

const IDLE_TX: TxState = { stage: 'idle', txHash: undefined, error: undefined }

function extractRevertReason(err: unknown): string {
  if (!err) return 'Unknown error'
  const msg = (err as { shortMessage?: string; message?: string })
  if (msg.shortMessage) return msg.shortMessage
  if (msg.message) {
    const m = msg.message.slice(0, 200)
    // surface the custom error name when present
    const match = m.match(/error\s+"?(\w+)"?/i)
    if (match) return match[1]
    return m
  }
  if (typeof err === 'string') return err
  return 'Unexpected error'
}

// ── Mode detection ────────────────────────────────────────────────────────────

/**
 * Returns the current operating mode:
 * - 'demo'    : no contract address configured → fully DEMO
 * - 'testnet' : VITE_CLEARFUND_ESCROW_ADDRESS set, CLEARFUND_CHAIN.id === 5042002
 * - 'mainnet' : VITE_CLEARFUND_ESCROW_ADDRESS set, CLEARFUND_CHAIN.id === 5042
 *
 * Uses canonical Arc chain IDs (ARC_TESTNET_CHAIN_ID / ARC_MAINNET_CHAIN_ID)
 * rather than the optional `chain.testnet` boolean property, which viem omits
 * from its Arc Mainnet chain definition and which would silently misidentify
 * the network when that property is absent.
 *
 * IMPORTANT: mode is determined by the contract address configuration and the
 * configured chain ID — NOT by the connected wallet's current chain. A visitor
 * without a wallet must still see the correct mode. Write-operation chain gating
 * is handled separately by WrongNetworkBanner + write hook guards.
 */
export function useClearFundMode(): 'demo' | 'testnet' | 'mainnet' {
  if (!isContractDeployed()) return 'demo'
  if (isArcTestnet()) return 'testnet'
  if (isArcMainnet()) return 'mainnet'
  // Configured chain is neither known Arc network — treat as demo to prevent
  // silent interaction with an unexpected chain.
  return 'demo'
}

// ── Read hooks ────────────────────────────────────────────────────────────────

/** Read all fields of a campaign + its current balance. */
export function useOnchainCampaign(campaignId: bigint | undefined): {
  campaign: OnchainCampaign | undefined
  isLoading: boolean
} {
  const enabled = isContractDeployed() && campaignId !== undefined

  const { data: raw, isLoading: loadingCampaign } = useReadContract({
    address: ESCROW_ADDRESS as `0x${string}`,
    abi: CLEARFUND_ESCROW_ABI,
    functionName: 'campaigns',
    args: [campaignId ?? 0n],
    query: { enabled },
  })

  const { data: balance, isLoading: loadingBalance } = useReadContract({
    address: ESCROW_ADDRESS as `0x${string}`,
    abi: CLEARFUND_ESCROW_ABI,
    functionName: 'campaignBalance',
    args: [campaignId ?? 0n],
    query: { enabled },
  })

  if (!enabled || !raw) {
    return { campaign: undefined, isLoading: loadingCampaign || loadingBalance }
  }

  const [organizer, recipient, target, metadataURI, totalContributed, totalPaidOut, active, milestoneCount, totalAllocated] = raw as [
    `0x${string}`, `0x${string}`, bigint, string, bigint, bigint, boolean, bigint, bigint
  ]

  return {
    campaign: {
      id: campaignId,
      organizer,
      recipient,
      target,
      metadataURI,
      totalContributed,
      totalPaidOut,
      active,
      milestoneCount,
      totalAllocated,
      balance: (balance as bigint) ?? 0n,
    },
    isLoading: false,
  }
}

/** Read a single milestone. */
export function useOnchainMilestone(
  campaignId: bigint | undefined,
  milestoneIndex: bigint | undefined
): { milestone: OnchainMilestone | undefined; isLoading: boolean } {
  const enabled =
    isContractDeployed() && campaignId !== undefined && milestoneIndex !== undefined

  const { data: raw, isLoading } = useReadContract({
    address: ESCROW_ADDRESS as `0x${string}`,
    abi: CLEARFUND_ESCROW_ABI,
    functionName: 'milestones',
    args: [campaignId ?? 0n, milestoneIndex ?? 0n],
    query: { enabled },
  })

  if (!enabled || !raw) return { milestone: undefined, isLoading }

  const [description, amount, status, evidenceURI, paid] = raw as [string, bigint, number, string, boolean]
  return {
    milestone: {
      description,
      amount,
      status: status as MilestoneStatusValue,
      evidenceURI,
      paid,
    },
    isLoading: false,
  }
}

/** How much USDC the connected wallet contributed to a campaign (for refund eligibility). */
export function useContributorBalance(campaignId: bigint | undefined): {
  contributed: bigint
  isLoading: boolean
} {
  const { address } = useAccount()
  const enabled = isContractDeployed() && campaignId !== undefined && !!address

  const { data, isLoading } = useReadContract({
    address: ESCROW_ADDRESS as `0x${string}`,
    abi: CLEARFUND_ESCROW_ABI,
    functionName: 'contributions',
    args: [campaignId ?? 0n, address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled },
  })

  return { contributed: (data as bigint | undefined) ?? 0n, isLoading }
}

/** Total number of campaigns on the contract. */
export function useNextCampaignId(): { nextId: bigint; isLoading: boolean } {
  const { data, isLoading } = useReadContract({
    address: ESCROW_ADDRESS as `0x${string}`,
    abi: CLEARFUND_ESCROW_ABI,
    functionName: 'nextCampaignId',
    query: { enabled: isContractDeployed() },
  })
  return { nextId: (data as bigint | undefined) ?? 0n, isLoading }
}

/** Current reviewer address. */
export function useReviewerAddress(): `0x${string}` | undefined {
  const { data } = useReadContract({
    address: ESCROW_ADDRESS as `0x${string}`,
    abi: CLEARFUND_ESCROW_ABI,
    functionName: 'reviewer',
    query: { enabled: isContractDeployed() },
  })
  return data as `0x${string}` | undefined
}

// ── Write hooks ───────────────────────────────────────────────────────────────

/**
 * useCreateCampaign — wraps createCampaign.
 * Caller must also call addMilestone for each milestone separately.
 *
 * @returns { tx, create }
 * tx.stage drives the 5-state UI indicator.
 * tx.txHash is only set after the wallet signs.
 */
export function useCreateCampaign(): {
  tx: TxState
  create: (recipient: `0x${string}`, targetUsdc: string, metadataURI: string) => Promise<void>
  reset: () => void
} {
  const [tx, setTx] = useState<TxState>(IDLE_TX)
  const { writeContractAsync } = useWriteContract()

  const create = useCallback(
    async (recipient: `0x${string}`, targetUsdc: string, metadataURI: string) => {
      if (!isContractDeployed()) {
        setTx({ stage: 'failed', txHash: undefined, error: 'Contract not deployed — running in DEMO mode.' })
        return
      }
      setTx({ stage: 'preparing', txHash: undefined, error: undefined })
      try {
        const target = parseUsdc(targetUsdc)
        setTx({ stage: 'pendingSignature', txHash: undefined, error: undefined })
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: CLEARFUND_ESCROW_ABI,
          functionName: 'createCampaign',
          args: [recipient, target, metadataURI],
        })
        setTx({ stage: 'pendingConfirmation', txHash: hash, error: undefined })
      } catch (err) {
        setTx({ stage: 'failed', txHash: undefined, error: extractRevertReason(err) })
      }
    },
    [writeContractAsync]
  )

  const reset = useCallback(() => setTx(IDLE_TX), [])
  return { tx, create, reset }
}

/**
 * Milestone data passed from the CreateCampaign wizard.
 */
export interface MilestoneInput {
  title: string
  description: string
  targetAmount: string  // human-readable USDC, e.g. "5000"
  dueDate?: string
}

/**
 * Result of useCreateCampaignWithMilestones — includes partial completion state.
 * If campaign creation succeeds but a milestone addMilestone tx fails, the hook
 * surfaces exactly what was and was not recorded onchain, so the user can recover.
 */
export interface CreateCampaignResult {
  /** Stage of the overall flow (matches TxStage semantics). */
  stage: TxStage
  /** Onchain campaign ID decoded from CampaignCreated event — set after campaign tx is mined. */
  onchainCampaignId: bigint | undefined
  /** Number of milestones successfully added onchain. */
  milestonesAdded: number
  /** Total milestones to add. */
  milestonesTotal: number
  /** Error string if any step failed. */
  error: string | undefined
  /** Tx hash of the createCampaign tx (for explorer link). */
  createTxHash: `0x${string}` | undefined
}

const IDLE_RESULT: CreateCampaignResult = {
  stage: 'idle',
  onchainCampaignId: undefined,
  milestonesAdded: 0,
  milestonesTotal: 0,
  error: undefined,
  createTxHash: undefined,
}

/**
 * useCreateCampaignWithMilestones — full onchain campaign creation flow.
 *
 * Steps:
 * 1. createCampaign() → wait for receipt → decode CampaignCreated event → extract campaignId
 * 2. For each milestone: addMilestone(campaignId, description, amount)
 *    — fired sequentially (each awaited) to avoid nonce conflicts
 *    — partial failure is surfaced honestly: milestonesAdded shows how many succeeded
 *
 * All states are derived from real tx receipts — nothing is assumed confirmed until mined.
 */
export function useCreateCampaignWithMilestones(): {
  result: CreateCampaignResult
  createAndAddMilestones: (
    recipient: `0x${string}`,
    targetUsdc: string,
    metadataURI: string,
    milestones: MilestoneInput[],
  ) => Promise<bigint | undefined>
  reset: () => void
} {
  const [result, setResult] = useState<CreateCampaignResult>(IDLE_RESULT)
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()

  const createAndAddMilestones = useCallback(
    async (
      recipient: `0x${string}`,
      targetUsdc: string,
      metadataURI: string,
      milestones: MilestoneInput[],
    ): Promise<bigint | undefined> => {
      if (!isContractDeployed()) {
        setResult({ ...IDLE_RESULT, stage: 'failed', error: 'Contract not deployed — running in DEMO mode.' })
        return undefined
      }
      if (!publicClient) {
        setResult({ ...IDLE_RESULT, stage: 'failed', error: 'No RPC client available.' })
        return undefined
      }

      setResult({ ...IDLE_RESULT, stage: 'preparing', milestonesTotal: milestones.length })

      try {
        // ── Step 1: createCampaign ───────────────────────────────────────────
        const target = parseUsdc(targetUsdc)
        setResult((r) => ({ ...r, stage: 'pendingSignature' }))

        const createHash = await writeContractAsync({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: CLEARFUND_ESCROW_ABI,
          functionName: 'createCampaign',
          args: [recipient, target, metadataURI],
        })

        setResult((r) => ({ ...r, stage: 'pendingConfirmation', createTxHash: createHash }))

        // Wait for the receipt to extract the campaignId from logs
        const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash })

        // Decode CampaignCreated event from logs
        let onchainCampaignId: bigint | undefined
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: CLEARFUND_ESCROW_ABI,
              data: log.data,
              topics: log.topics,
              eventName: 'CampaignCreated',
            })
            onchainCampaignId = ((decoded.args as unknown) as { campaignId: bigint }).campaignId
            break
          } catch {
            // log doesn't match CampaignCreated — try next
          }
        }

        if (onchainCampaignId === undefined) {
          setResult((r) => ({
            ...r,
            stage: 'failed',
            error: 'Campaign created but campaignId could not be decoded from receipt. Check the Tx Explorer.',
          }))
          return undefined
        }

        setResult((r) => ({ ...r, onchainCampaignId }))

        // ── Step 2: addMilestone for each milestone ─────────────────────────
        let added = 0
        for (const ms of milestones) {
          const amount = parseUsdc(ms.targetAmount || '0')
          setResult((r) => ({ ...r, stage: 'pendingSignature', milestonesAdded: added }))
          try {
            const msHash = await writeContractAsync({
              address: ESCROW_ADDRESS as `0x${string}`,
              abi: CLEARFUND_ESCROW_ABI,
              functionName: 'addMilestone',
              args: [onchainCampaignId, ms.description || ms.title, amount],
            })
            setResult((r) => ({ ...r, stage: 'pendingConfirmation' }))
            await publicClient.waitForTransactionReceipt({ hash: msHash })
            added++
            setResult((r) => ({ ...r, milestonesAdded: added }))
          } catch (err) {
            // Partial failure — surface exactly what was added vs total
            setResult((r) => ({
              ...r,
              stage: 'failed',
              milestonesAdded: added,
              error: `Campaign created (ID #${String(onchainCampaignId)}) but milestone ${added + 1}/${milestones.length} failed: ${extractRevertReason(err)}. You can add remaining milestones later from the campaign page.`,
            }))
            return onchainCampaignId
          }
        }

        setResult((r) => ({ ...r, stage: 'confirmed' }))
        return onchainCampaignId

      } catch (err) {
        setResult((r) => ({ ...r, stage: 'failed', error: extractRevertReason(err) }))
        return undefined
      }
    },
    [writeContractAsync, publicClient],
  )

  const reset = useCallback(() => setResult(IDLE_RESULT), [])
  return { result, createAndAddMilestones, reset }
}

/**
 * useContribute — wraps USDC approve() then contribute().
 * The caller passes amountUsdc as a human-readable string, e.g. "100.5".
 * Must be called when the wallet is connected and on Arc Testnet.
 */
export function useContribute(): {
  tx: TxState
  contribute: (campaignId: bigint, amountUsdc: string) => Promise<void>
  reset: () => void
} {
  const [tx, setTx] = useState<TxState>(IDLE_TX)
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const { isSuccess: rcptSuccess, isError: rcptError } = useWaitForTransactionReceipt({ hash: tx.txHash })

  const contributeStage: TxStage =
    tx.stage === 'pendingConfirmation' && rcptSuccess ? 'confirmed'
    : tx.stage === 'pendingConfirmation' && rcptError  ? 'failed'
    : tx.stage

  const contribute = useCallback(
    async (campaignId: bigint, amountUsdc: string) => {
      if (!isContractDeployed()) {
        setTx({ stage: 'failed', txHash: undefined, error: 'Contract not deployed — running in DEMO mode.' })
        return
      }
      if (!publicClient) {
        setTx({ stage: 'failed', txHash: undefined, error: 'No RPC client available.' })
        return
      }
      setTx({ stage: 'preparing', txHash: undefined, error: undefined })
      try {
        const amount = parseUsdc(amountUsdc)

        // Step 1: approve — must be mined before contribute() reads the allowance.
        setTx({ stage: 'pendingSignature', txHash: undefined, error: undefined })
        let approveHash: `0x${string}`
        try {
          approveHash = await writeContractAsync({
            address: USDC_ADDRESS,
            abi: ERC20_APPROVE_ABI,
            functionName: 'approve',
            args: [ESCROW_ADDRESS as `0x${string}`, amount],
          })
        } catch (err) {
          setTx({ stage: 'failed', txHash: undefined, error: `Approval failed: ${extractRevertReason(err)}` })
          return
        }

        // Wait for the approval to be mined so the allowance is visible to the next call.
        setTx({ stage: 'pendingConfirmation', txHash: approveHash, error: undefined })
        await publicClient.waitForTransactionReceipt({ hash: approveHash })

        // Step 2: contribute
        setTx({ stage: 'pendingSignature', txHash: undefined, error: undefined })
        let contributeHash: `0x${string}`
        try {
          contributeHash = await writeContractAsync({
            address: ESCROW_ADDRESS as `0x${string}`,
            abi: CLEARFUND_ESCROW_ABI,
            functionName: 'contribute',
            args: [campaignId, amount],
          })
        } catch (err) {
          setTx({ stage: 'failed', txHash: undefined, error: `Contribution failed: ${extractRevertReason(err)}` })
          return
        }
        setTx({ stage: 'pendingConfirmation', txHash: contributeHash, error: undefined })
      } catch (err) {
        setTx({ stage: 'failed', txHash: undefined, error: extractRevertReason(err) })
      }
    },
    [writeContractAsync, publicClient]
  )

  const reset = useCallback(() => setTx(IDLE_TX), [])
  return { tx: { ...tx, stage: contributeStage }, contribute, reset }
}

/**
 * useSubmitEvidence — wraps submitEvidence.
 * Records an off-chain URI only; does NOT change milestone status.
 * Awaits the receipt so the confirmed state is only set after the tx is mined.
 */
export function useSubmitEvidence(): {
  tx: TxState
  submit: (campaignId: bigint, milestoneIndex: bigint, evidenceURI: string) => Promise<void>
  reset: () => void
} {
  const [tx, setTx] = useState<TxState>(IDLE_TX)
  const { writeContractAsync } = useWriteContract()
  const { isSuccess, isError } = useWaitForTransactionReceipt({ hash: tx.txHash })

  const stage: TxStage =
    tx.stage === 'pendingConfirmation' && isSuccess ? 'confirmed'
    : tx.stage === 'pendingConfirmation' && isError  ? 'failed'
    : tx.stage

  const submit = useCallback(
    async (campaignId: bigint, milestoneIndex: bigint, evidenceURI: string) => {
      if (!isContractDeployed()) {
        setTx({ stage: 'failed', txHash: undefined, error: 'Contract not deployed — running in DEMO mode.' })
        return
      }
      setTx({ stage: 'pendingSignature', txHash: undefined, error: undefined })
      try {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: CLEARFUND_ESCROW_ABI,
          functionName: 'submitEvidence',
          args: [campaignId, milestoneIndex, evidenceURI],
        })
        setTx({ stage: 'pendingConfirmation', txHash: hash, error: undefined })
      } catch (err) {
        setTx({ stage: 'failed', txHash: undefined, error: extractRevertReason(err) })
      }
    },
    [writeContractAsync]
  )

  const reset = useCallback(() => setTx(IDLE_TX), [])
  return { tx: { ...tx, stage }, submit, reset }
}

/**
 * useReviewerActions — approveMilestone and revokeApproval.
 * The contract enforces reviewer-only access; the frontend check is a
 * UX hint only and must never replace the contract authorization.
 * Receipt is awaited so confirmed state is only set after the tx is mined.
 */
export function useReviewerActions(): {
  tx: TxState
  approve: (campaignId: bigint, milestoneIndex: bigint) => Promise<void>
  revoke: (campaignId: bigint, milestoneIndex: bigint) => Promise<void>
  reset: () => void
} {
  const [tx, setTx] = useState<TxState>(IDLE_TX)
  const { writeContractAsync } = useWriteContract()
  const { isSuccess, isError } = useWaitForTransactionReceipt({ hash: tx.txHash })

  const stage: TxStage =
    tx.stage === 'pendingConfirmation' && isSuccess ? 'confirmed'
    : tx.stage === 'pendingConfirmation' && isError  ? 'failed'
    : tx.stage

  const approve = useCallback(
    async (campaignId: bigint, milestoneIndex: bigint) => {
      if (!isContractDeployed()) {
        setTx({ stage: 'failed', txHash: undefined, error: 'Contract not deployed — running in DEMO mode.' })
        return
      }
      setTx({ stage: 'pendingSignature', txHash: undefined, error: undefined })
      try {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: CLEARFUND_ESCROW_ABI,
          functionName: 'approveMilestone',
          args: [campaignId, milestoneIndex],
        })
        setTx({ stage: 'pendingConfirmation', txHash: hash, error: undefined })
      } catch (err) {
        setTx({ stage: 'failed', txHash: undefined, error: extractRevertReason(err) })
      }
    },
    [writeContractAsync]
  )

  const revoke = useCallback(
    async (campaignId: bigint, milestoneIndex: bigint) => {
      if (!isContractDeployed()) {
        setTx({ stage: 'failed', txHash: undefined, error: 'Contract not deployed — running in DEMO mode.' })
        return
      }
      setTx({ stage: 'pendingSignature', txHash: undefined, error: undefined })
      try {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: CLEARFUND_ESCROW_ABI,
          functionName: 'revokeApproval',
          args: [campaignId, milestoneIndex],
        })
        setTx({ stage: 'pendingConfirmation', txHash: hash, error: undefined })
      } catch (err) {
        setTx({ stage: 'failed', txHash: undefined, error: extractRevertReason(err) })
      }
    },
    [writeContractAsync]
  )

  const reset = useCallback(() => setTx(IDLE_TX), [])
  return { tx: { ...tx, stage }, approve, revoke, reset }
}

/**
 * useReleaseMilestone — wraps releaseMilestone.
 * Only callable by organizer after reviewer approval.
 * Displays confirmed state only when the transaction is mined.
 */
export function useReleaseMilestone(): {
  tx: TxState
  release: (campaignId: bigint, milestoneIndex: bigint) => Promise<void>
  reset: () => void
} {
  const [tx, setTx] = useState<TxState>(IDLE_TX)
  const { writeContractAsync } = useWriteContract()
  const { isSuccess, isError } = useWaitForTransactionReceipt({ hash: tx.txHash })

  // Promote pendingConfirmation → confirmed/failed when receipt arrives
  const stage: TxStage =
    tx.stage === 'pendingConfirmation' && isSuccess ? 'confirmed'
    : tx.stage === 'pendingConfirmation' && isError  ? 'failed'
    : tx.stage

  const release = useCallback(
    async (campaignId: bigint, milestoneIndex: bigint) => {
      if (!isContractDeployed()) {
        setTx({ stage: 'failed', txHash: undefined, error: 'Contract not deployed — running in DEMO mode.' })
        return
      }
      setTx({ stage: 'pendingSignature', txHash: undefined, error: undefined })
      try {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: CLEARFUND_ESCROW_ABI,
          functionName: 'releaseMilestone',
          args: [campaignId, milestoneIndex],
        })
        setTx({ stage: 'pendingConfirmation', txHash: hash, error: undefined })
      } catch (err) {
        setTx({ stage: 'failed', txHash: undefined, error: extractRevertReason(err) })
      }
    },
    [writeContractAsync]
  )

  const reset = useCallback(() => setTx(IDLE_TX), [])
  return { tx: { ...tx, stage }, release, reset }
}

/**
 * useClaimRefund — wraps claimRefund.
 * Only callable by a contributor after the campaign is cancelled.
 * Shows confirmed state only after the tx is mined.
 */
export function useClaimRefund(): {
  tx: TxState
  claim: (campaignId: bigint) => Promise<void>
  reset: () => void
} {
  const [tx, setTx] = useState<TxState>(IDLE_TX)
  const { writeContractAsync } = useWriteContract()
  const { isSuccess, isError } = useWaitForTransactionReceipt({ hash: tx.txHash })

  const stage: TxStage =
    tx.stage === 'pendingConfirmation' && isSuccess ? 'confirmed'
    : tx.stage === 'pendingConfirmation' && isError  ? 'failed'
    : tx.stage

  const claim = useCallback(
    async (campaignId: bigint) => {
      if (!isContractDeployed()) {
        setTx({ stage: 'failed', txHash: undefined, error: 'Contract not deployed — running in DEMO mode.' })
        return
      }
      setTx({ stage: 'pendingSignature', txHash: undefined, error: undefined })
      try {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: CLEARFUND_ESCROW_ABI,
          functionName: 'claimRefund',
          args: [campaignId],
        })
        setTx({ stage: 'pendingConfirmation', txHash: hash, error: undefined })
      } catch (err) {
        setTx({ stage: 'failed', txHash: undefined, error: extractRevertReason(err) })
      }
    },
    [writeContractAsync]
  )

  const reset = useCallback(() => setTx(IDLE_TX), [])
  return { tx: { ...tx, stage }, claim, reset }
}

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Human-readable label for each tx stage.
 * Use this in buttons / status badges, not a hand-rolled switch.
 */
export function txStageLabel(stage: TxStage, action: string): string {
  switch (stage) {
    case 'preparing':           return 'Preparing...'
    case 'pendingSignature':    return 'Confirm in wallet...'
    case 'pendingConfirmation': return 'Confirming on-chain...'
    case 'confirmed':           return `${action} confirmed`
    case 'failed':              return 'Transaction failed'
    default:                    return action
  }
}

/**
 * Explorer URL for a tx hash on Arc Testnet.
 * Returns undefined until txHash is defined.
 */
export function arcTestnetExplorerUrl(txHash: `0x${string}` | undefined): string | undefined {
  if (!txHash) return undefined
  const base = CLEARFUND_CHAIN.blockExplorers?.default?.url
  return base ? `${base}/tx/${txHash}` : undefined
}

// Re-export for convenience
export { isContractDeployed, MilestoneStatus }
export type { MilestoneStatusValue }
