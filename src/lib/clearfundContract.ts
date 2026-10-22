/**
 * ClearFund contract configuration and ABI.
 *
 * ─── HOW TO ACTIVATE ONCHAIN MODE ───────────────────────────────────────────
 * Testnet (development only):
 *   VITE_CLEARFUND_ESCROW_ADDRESS=0x<deployed_address>
 *   VITE_CLEARFUND_CHAIN=testnet
 *
 * Mainnet:
 *   VITE_CLEARFUND_ESCROW_ADDRESS=0x<mainnet_deployed_address>
 *   VITE_CLEARFUND_CHAIN=mainnet
 *
 * Restart the dev server after changing .env — Vite only reads .env at startup.
 *
 * While VITE_CLEARFUND_ESCROW_ADDRESS is absent or empty the app runs in
 * DEMO mode (localStorage only). All pages degrade gracefully.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Arc network parameters (verified against https://docs.arc.io Oct 2026):
 *   Testnet chain ID : 5042002
 *   Mainnet chain ID : 5042
 *   Testnet RPC      : https://rpc.testnet.arc.io
 *   Mainnet RPC      : https://rpc.mainnet.arc.io
 *   Testnet explorer : https://testnet.arcscan.app  (also https://explorer.testnet.arc.io)
 *   Mainnet explorer : https://explorer.arc.io
 *   USDC (ERC-20)    : 0x3600000000000000000000000000000000000000  (6 decimals, both networks)
 *   USDC (native gas): same address, 18 decimals precision — do NOT mix with ERC-20 units
 * ────────────────────────────────────────────────────────────────────────────
 */

import { arcTestnet, arc as arcMainnet } from 'viem/chains'
import { isAddress, zeroAddress } from 'viem'
import { getUsdc } from '@/onchain-facts'

// ── Canonical Arc chain IDs ───────────────────────────────────────────────────
// Use these constants everywhere instead of magic numbers or the optional
// `chain.testnet` boolean (which viem's mainnet chain omits).
export const ARC_TESTNET_CHAIN_ID = 5042002 as const
export const ARC_MAINNET_CHAIN_ID = 5042 as const

// ── Network selection ─────────────────────────────────────────────────────────
// Select the network explicitly; never silently fall back to Testnet in production.

const configuredChain = ((import.meta.env.VITE_CLEARFUND_CHAIN as string | undefined) ?? '').toLowerCase()
if (configuredChain && configuredChain !== 'mainnet' && configuredChain !== 'testnet') {
  throw new Error('ClearFund: unsupported VITE_CLEARFUND_CHAIN')
}
if (import.meta.env.PROD && configuredChain !== 'mainnet') {
  throw new Error('ClearFund: production requires explicit Arc Mainnet configuration')
}
export const CLEARFUND_CHAIN = configuredChain === 'mainnet' ? arcMainnet : arcTestnet

/** True when the configured chain is Arc Testnet (chain ID 5042002). */
export const isArcTestnet = (): boolean => CLEARFUND_CHAIN.id === ARC_TESTNET_CHAIN_ID

/** True when the configured chain is Arc Mainnet (chain ID 5042). */
export const isArcMainnet = (): boolean => CLEARFUND_CHAIN.id === ARC_MAINNET_CHAIN_ID

/** USDC ERC-20 address (6 decimals). Same on both Arc networks. */
const _usdcFact = getUsdc(CLEARFUND_CHAIN.id)
if (!_usdcFact) throw new Error('ClearFund: USDC address not found in onchain-facts for Arc network')
export const USDC_ADDRESS: `0x${string}` = _usdcFact.address as `0x${string}`

/**
 * Deployed ClearFundEscrow address.
 * Read from env at build time — undefined in DEMO mode.
 */
export const ESCROW_ADDRESS = (
  import.meta.env.VITE_CLEARFUND_ESCROW_ADDRESS || ''
) as `0x${string}` | ''

/** True when a syntactically valid nonzero escrow address is configured. This does not prove contract deployment. */
export const isContractDeployed = (): boolean =>
  typeof ESCROW_ADDRESS === 'string' &&
  isAddress(ESCROW_ADDRESS) &&
  ESCROW_ADDRESS.toLowerCase() !== zeroAddress

// ── ABI ──────────────────────────────────────────────────────────────────────
// Derived directly from the compiled contract. Every function, event, and
// custom error is included so downstream hooks can decode logs and reverts.

export const CLEARFUND_ESCROW_ABI = [
  // ── State-changing functions ─────────────────────────────────────────────
  {
    type: 'function',
    name: 'createCampaign',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient',    type: 'address' },
      { name: 'target',       type: 'uint256' },
      { name: 'metadataURI',  type: 'string'  },
    ],
    outputs: [{ name: 'campaignId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'addMilestone',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId',   type: 'uint256' },
      { name: 'description',  type: 'string'  },
      { name: 'amount',       type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'contribute',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'uint256' },
      { name: 'amount',     type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'submitEvidence',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId',     type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
      { name: 'evidenceURI',    type: 'string'  },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'markMilestoneComplete',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId',     type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'approveMilestone',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId',     type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokeApproval',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId',     type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'releaseMilestone',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId',     type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancelCampaign',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'campaignId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'updateRecipient',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId',   type: 'uint256' },
      { name: 'newRecipient', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimRefund',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'campaignId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setReviewer',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newReviewer', type: 'address' }],
    outputs: [],
  },
  // ── Read functions ────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'campaigns',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'organizer',        type: 'address' },
      { name: 'recipient',        type: 'address' },
      { name: 'target',           type: 'uint256' },
      { name: 'metadataURI',      type: 'string'  },
      { name: 'totalContributed', type: 'uint256' },
      { name: 'totalPaidOut',     type: 'uint256' },
      { name: 'active',           type: 'bool'    },
      { name: 'milestoneCount',   type: 'uint256' },
      { name: 'totalAllocated',   type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'milestones',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
    outputs: [
      { name: 'description', type: 'string'  },
      { name: 'amount',      type: 'uint256' },
      { name: 'status',      type: 'uint8'   },
      { name: 'evidenceURI', type: 'string'  },
      { name: 'paid',        type: 'bool'    },
    ],
  },
  {
    type: 'function',
    name: 'contributions',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'campaignBalance',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'nextCampaignId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'reviewer',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'usdcToken',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // ── Events ────────────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'CampaignCreated',
    inputs: [
      { name: 'campaignId', type: 'uint256', indexed: true  },
      { name: 'organizer',  type: 'address', indexed: true  },
      { name: 'recipient',  type: 'address', indexed: true  },
      { name: 'target',     type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneAdded',
    inputs: [
      { name: 'campaignId',     type: 'uint256', indexed: true  },
      { name: 'milestoneIndex', type: 'uint256', indexed: false },
      { name: 'amount',         type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Contributed',
    inputs: [
      { name: 'campaignId',  type: 'uint256', indexed: true  },
      { name: 'contributor', type: 'address', indexed: true  },
      { name: 'amount',      type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'EvidenceSubmitted',
    inputs: [
      { name: 'campaignId',     type: 'uint256', indexed: true  },
      { name: 'milestoneIndex', type: 'uint256', indexed: false },
      { name: 'evidenceURI',    type: 'string',  indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneCompleted',
    inputs: [
      { name: 'campaignId',     type: 'uint256', indexed: true  },
      { name: 'milestoneIndex', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneApproved',
    inputs: [
      { name: 'campaignId',     type: 'uint256', indexed: true  },
      { name: 'milestoneIndex', type: 'uint256', indexed: false },
      { name: 'approver',       type: 'address', indexed: true  },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneReleased',
    inputs: [
      { name: 'campaignId',     type: 'uint256', indexed: true  },
      { name: 'milestoneIndex', type: 'uint256', indexed: false },
      { name: 'recipient',      type: 'address', indexed: true  },
      { name: 'amount',         type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'CampaignCancelled',
    inputs: [{ name: 'campaignId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'ReviewerSet',
    inputs: [{ name: 'newReviewer', type: 'address', indexed: true }],
  },
  {
    type: 'event',
    name: 'RecipientUpdated',
    inputs: [
      { name: 'campaignId',   type: 'uint256', indexed: true  },
      { name: 'oldRecipient', type: 'address', indexed: true  },
      { name: 'newRecipient', type: 'address', indexed: true  },
    ],
  },
  {
    type: 'event',
    name: 'RefundClaimed',
    inputs: [
      { name: 'campaignId',  type: 'uint256', indexed: true  },
      { name: 'contributor', type: 'address', indexed: true  },
      { name: 'amount',      type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ApprovalRevoked',
    inputs: [
      { name: 'campaignId',     type: 'uint256', indexed: true  },
      { name: 'milestoneIndex', type: 'uint256', indexed: false },
      { name: 'revoker',        type: 'address', indexed: true  },
    ],
  },
  // ── Custom errors ─────────────────────────────────────────────────────────
  { type: 'error', name: 'ZeroAddress',               inputs: [] },
  { type: 'error', name: 'ZeroAmount',                inputs: [] },
  { type: 'error', name: 'InvalidCampaign',           inputs: [] },
  { type: 'error', name: 'NotOrganizer',              inputs: [] },
  { type: 'error', name: 'NotReviewer',               inputs: [] },
  { type: 'error', name: 'CampaignInactive',          inputs: [] },
  { type: 'error', name: 'CampaignStillActive',       inputs: [] },
  { type: 'error', name: 'MilestoneAllocationExceeded', inputs: [] },
  { type: 'error', name: 'TooManyMilestones',           inputs: [] },
  { type: 'error', name: 'ApprovedMilestoneBlocksCancel', inputs: [] },
  { type: 'error', name: 'PayoutAlreadyMadeBlocksCancel', inputs: [] },
  { type: 'error', name: 'EvidenceLockedAfterApproval', inputs: [] },
  { type: 'error', name: 'MissingMilestoneEvidence', inputs: [] },
  { type: 'error', name: 'InvalidMilestoneIndex',     inputs: [] },
  {
    type: 'error',
    name: 'InvalidMilestoneStatus',
    inputs: [
      { name: 'expected', type: 'uint8' },
      { name: 'actual',   type: 'uint8' },
    ],
  },
  { type: 'error', name: 'MilestoneAlreadyPaid',      inputs: [] },
  { type: 'error', name: 'InsufficientCampaignBalance', inputs: [] },
  { type: 'error', name: 'NothingToRefund',           inputs: [] },
  { type: 'error', name: 'ApprovedMilestonePending',  inputs: [] },
  { type: 'error', name: 'InsufficientRefundBalance', inputs: [] },
  // ── Constructor ───────────────────────────────────────────────────────────
  {
    type: 'constructor',
    inputs: [
      { name: 'usdcTokenAddress',  type: 'address' },
      { name: 'initialReviewer',   type: 'address' },
    ],
  },
] as const

// ── MilestoneStatus enum (mirrors the contract) ───────────────────────────────
export const MilestoneStatus = {
  Pending:    0,
  InProgress: 1,
  Completed:  2,
  Approved:   3,
  Paid:       4,
} as const
export type MilestoneStatusValue = typeof MilestoneStatus[keyof typeof MilestoneStatus]

export function milestoneStatusLabel(s: MilestoneStatusValue): string {
  const map: Record<MilestoneStatusValue, string> = {
    0: 'Pending',
    1: 'In Progress',
    2: 'Completed',
    3: 'Approved',
    4: 'Paid',
  }
  return map[s] ?? 'Unknown'
}

// ── ERC-20 USDC approve ABI (needed before contribute()) ─────────────────────
export const ERC20_APPROVE_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner',   type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const
