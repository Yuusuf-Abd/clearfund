# ClearFund — Competition Submission Package

**Competition:** Arc Microgrants: Built with Arc Studio
**Prepared:** 2026-10-18

Copy the values below directly into the submission form.
Fields marked `[PLACEHOLDER — REQUIRED]` must be filled before submission.

---

## Project Details

**Project Name:**
ClearFund

**Tagline:**
Fund with clarity. Release with accountability.

**Short Description (140 chars):**
Milestone-based USDC crowdfunding on Arc. Funds held in escrow, released only after on-chain reviewer approval. Transparent. Accountable.

**Detailed Description:**

ClearFund is a milestone-based USDC crowdfunding platform built on Arc — Circle's blockchain where USDC is the native gas token.

The core problem: traditional crowdfunding gives backers no guarantee their funds are used as promised. ClearFund solves this with smart contract escrow: contributors fund campaigns, but USDC stays locked until each milestone is independently reviewed and approved on-chain.

**How it works:**
1. An organizer creates a campaign with a USDC target and defines milestones, each with a USDC allocation.
2. Contributors fund the campaign by approving and transferring USDC to the escrow contract.
3. When a milestone is complete, the organizer submits evidence (an off-chain URI) and marks the milestone complete.
4. An authorized reviewer inspects the evidence and calls `approveMilestone` on-chain.
5. Only after approval can the organizer call `releaseMilestone` to transfer USDC to the recipient.
6. If the campaign is cancelled, contributors can claim full refunds (subject to prior milestone payouts).

**Key properties:**
- All funds held in `ClearFundEscrow.sol` — no custodial risk from the platform
- Reviewer authorization enforced entirely on-chain — cannot be bypassed by the UI
- Per-campaign balance accounting — no cross-campaign fund leakage
- CEI pattern + reentrancy guard on all payouts and refunds
- 84 Foundry tests including 3 fuzz functions and 2 invariant tests

**Technology stack:**
- Smart contracts: Solidity 0.8.28, OpenZeppelin 5.1.0, Foundry
- Frontend: React 18, TypeScript, Vite, wagmi v2, viem, ConnectKit, Tailwind CSS
- Chain: Arc Testnet (chain ID 5042002) / Arc Mainnet (chain ID 5042)
- USDC: 6-decimal ERC-20 at `0x3600000000000000000000000000000000000000`
- Built entirely in Arc Studio

---

## Submission URLs

**Arc Studio Project URL:**
`[PLACEHOLDER — REQUIRED: generate share link from Arc Studio]`

**Public Application URL:**
`[PLACEHOLDER — REQUIRED: deploy to Netlify/Vercel/HF and paste URL]`

**GitHub Repository URL:**
https://github.com/Yuusuf-Abd/clearfund
*(Confirm repo is public before submission)*

---

## Contract Information

**Contract Name:** ClearFundEscrow

**Contract Address (Arc Mainnet):**
`[PLACEHOLDER — REQUIRED: 0x... after mainnet deployment]`

**Contract Address (Arc Testnet):**
`[PLACEHOLDER — set if deployed to testnet]`

**Deployment Transaction Hash:**
`[PLACEHOLDER — from forge create output or explorer]`

**Explorer Transaction URL:**
`[PLACEHOLDER — https://explorer.arc.io/tx/0x... for mainnet, https://explorer.testnet.arc.io/tx/0x... for testnet]`

---

## Video Evidence

**Demo Video URL:**
`[PLACEHOLDER — upload to YouTube/Loom and paste URL]`

**Video covers (mark when recorded):**
- [ ] Arc Studio development environment
- [ ] ClearFund Solidity contract walkthrough
- [ ] `forge test` execution showing 84/0 pass/fail
- [ ] Full application walkthrough (Landing → Dashboard → Campaign → ProofCenter → Reviewer → TxExplorer)
- [ ] Campaign creation wizard
- [ ] Reviewer approval flow
- [BLOCKED] Mainnet USDC transaction evidence

---

## Builder Profile

**Builder Name:** [your name]
**GitHub Profile:** https://github.com/Yuusuf-Abd
**Other Profile (optional):** [LinkedIn / Twitter / Discord]

---

## Technical Architecture

### Smart Contract

```
ClearFundEscrow.sol
├── Roles: owner (setReviewer only), organizer, reviewer, contributor
├── Campaign lifecycle: active → inactive (cancelled)
├── Milestone lifecycle: InProgress → Completed → Approved → Paid
├── USDC flow: contribute() → (reviewer approves) → releaseMilestone()
├── Refund flow: cancelCampaign() → claimRefund()
├── Security: ReentrancyGuard, CEI, SafeERC20, per-campaign balance accounting
└── Limits: MAX_MILESTONES=50, cancelCampaign blocked by Approved milestones
```

### Frontend

```
React SPA (Vite + TypeScript)
├── pages/: Landing, Dashboard, CreateCampaign, CampaignDetails,
│          ProofCenter, ReviewerDashboard, TxExplorer
├── hooks/: useClearFund (14 contract hooks), useCampaigns (localStorage),
│          useContractCampaigns (event indexer)
├── lib/: clearfundContract.ts (ABI + config), campaignId.ts (strict ID parser)
├── components/: Nav, ContractModeBanner, WrongNetworkBanner,
│               TxStatusBadge, ContributePanel, DemoBadge, ...
└── Modes: DEMO (no contract) | TESTNET (contract on Arc Testnet) | future MAINNET
```

---

## Testing Evidence

| Suite | Command | Result |
|-------|---------|--------|
| Foundry unit tests | `forge test` | 82/82 PASS |
| Foundry invariant tests | `forge test` | 2/2 PASS (256 runs × 128k calls) |
| Foundry fuzz tests | `forge test` | 3 fuzz functions, all PASS |
| Vitest unit tests | `bunx vitest run` | 24/24 PASS |
| TypeScript typecheck | `tsc --noEmit` | 0 errors |
| Lint (oxlint) | `oxlint src` | 0 errors, 0 warnings |
| Production build | `bun run build` | ✓ succeeded |

---

## Security Limitations

1. **Single global reviewer:** A compromised reviewer key can approve milestones across all campaigns. Recommended mitigation: use a multi-sig as the reviewer address.
2. **Owner can change reviewer:** Use a multi-sig or timelock as the contract owner.
3. **No independent audit:** This contract has NOT been audited by a third-party security firm. Do not use for real funds without a professional audit.
4. **Partial refund shortfall:** If milestone payouts reduce the campaign balance below a contributor's record, that contributor cannot be fully refunded. This is documented on-chain.
5. **No funding deadline:** Campaigns do not expire; organizers must cancel manually.

---

## Remaining Eligibility Requirements

Before submitting, complete:

1. [ ] Deploy contract to Arc Mainnet (or Arc Testnet minimum) using your own wallet
2. [ ] Record at least one USDC-moving transaction (contribute or releaseMilestone)
3. [ ] Set `VITE_CLEARFUND_ESCROW_ADDRESS` in hosting environment
4. [ ] Deploy frontend publicly (Netlify, Vercel, or Hugging Face)
5. [ ] Push latest code to GitHub; confirm repo is public
6. [ ] Record the demo video (follow `docs/final-video-production.md`)
7. [ ] Fill all `[PLACEHOLDER]` fields above
8. [ ] Submit before competition deadline
