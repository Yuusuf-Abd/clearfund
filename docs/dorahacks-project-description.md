# ClearFund — DoraHacks Project Description

> Copy the sections below into the DoraHacks submission form.
> Fields marked `[CONFIRM BEFORE SUBMITTING]` require you to verify the value before use.

---

## Project Name

ClearFund

---

## Tagline (one line)

Fund with clarity. Release with accountability.

---

## Short Description (≤ 280 characters)

Milestone-based USDC crowdfunding on Arc. Contributors' funds are held in a smart contract escrow and released only after each milestone is independently reviewed and approved on-chain. No upfront payouts. No unverifiable promises.

---

## Full Project Description

### The Problem

Traditional crowdfunding and grant programs share a fundamental accountability gap: once a campaign raises money, contributors have no mechanism to verify that funds are being used as promised. Platforms collect fees and host pages, but they do not enforce milestone completion. When a project fails to deliver, contributors have no recourse.

This problem is especially acute in public goods funding, community grants, and emerging-market fundraising, where trust between organisers and backers is low and third-party auditing is expensive or unavailable.

### The Solution: ClearFund

ClearFund replaces trust-based crowdfunding with verifiable accountability enforced by a smart contract on Arc — Circle's Layer-1 blockchain where USDC is the native gas token.

**How it works:**

1. **Campaign creation.** An organiser creates a campaign with a USDC funding target and defines milestones, each with a fixed USDC allocation and a description of what will be delivered.

2. **Contributor funding.** Contributors approve and transfer USDC directly into the `ClearFundEscrow` smart contract. Funds are held in per-campaign escrow — they never touch the organiser's wallet until a milestone is approved.

3. **Evidence submission.** When a milestone is complete, the organiser marks it complete on-chain and submits a verifiable evidence URI (a document link, report, or on-chain proof). This is recorded in a contract event.

4. **Independent review.** An authorised reviewer address (intended to be a multi-sig wallet or a DAO) inspects the evidence and calls `approveMilestone`. This step cannot be skipped — the organiser cannot approve their own milestones.

5. **Conditional release.** Only after on-chain approval can anyone call `releaseMilestone`, which transfers the milestone's USDC allocation to the designated recipient. Approval does not automatically release funds — it is a two-step process to prevent accidental payouts.

6. **Refunds on cancellation.** If a campaign is cancelled, contributors can claim proportional refunds of the unspent balance. The contract never sweeps funds to the owner — refunds are pull-pattern, preventing griefing.

### What Makes This Different

- **Contract-enforced accountability:** The reviewer authorisation is enforced entirely on-chain. No UI change, no admin override, and no reviewer key compromise can release funds without meeting the status machine requirements.
- **No platform custodianship:** ClearFund does not hold funds. The `ClearFundEscrow` contract holds funds. The platform has no special withdrawal privilege — the `emergencyWithdraw` function was deliberately removed during the security audit phase.
- **Transparent by default:** Every contribution, approval, revocation, and release is an on-chain event, linkable to the Arc block explorer. There are no off-chain databases that could be manipulated.
- **Partial failure safety:** If a previous milestone has already been paid out and the campaign is cancelled, the contract accurately reports the remaining balance and allows proportional refunds. It does not over-promise full refunds.

### Technical Architecture

**Smart Contract: `ClearFundEscrow.sol`**

- Language: Solidity 0.8.28
- Dependencies: OpenZeppelin 5.1.0 (`Ownable`, `ReentrancyGuard`, `SafeERC20`)
- Chain: Arc (USDC as native gas token, chain ID 5042 mainnet / 5042002 testnet)
- USDC address (Arc Testnet): `0x3600000000000000000000000000000000000000`
- Key properties:
  - Per-campaign balance accounting (no cross-campaign fund mixing)
  - Checks-Effects-Interactions (CEI) pattern on all payouts and refunds
  - `ReentrancyGuard` on `contribute`, `releaseMilestone`, `claimRefund`
  - `MAX_MILESTONES = 50` per campaign
  - `cancelCampaign` blocked when any milestone is in `Approved` status (prevents permanent fund lock)
  - 84 Foundry tests: 82 unit tests + 2 invariant tests (256 runs × 128,000 calls each)

**Milestone status machine:**
```
InProgress → Completed → Approved → Paid
                    ↑         |
                    └── revokeApproval ──┘
```

**Frontend: React + wagmi v2 + viem**

- Built entirely in Arc Studio
- 7 pages: Landing, Dashboard, Create Campaign, Campaign Details, Proof Center, Reviewer Dashboard, Transaction Explorer
- Three operating modes:
  - **DEMO** (default): localStorage, no wallet required, clearly labeled sample campaigns
  - **Arc Testnet**: live contract calls, wagmi v2 wallet connection, real USDC test tokens
  - **Arc Mainnet**: same frontend, production contract address (requires deployment)
- Strict campaign ID parser (`src/lib/campaignId.ts`) prevents any non-numeric demo ID from reaching a contract call
- Wrong-network detection with one-click chain switch
- Full transaction status machine: `idle → preparing → pendingSignature → pendingConfirmation → confirmed/failed`

**Arc ecosystem integration:**

- Arc is specifically chosen because USDC is the native gas token — contributors and organisers only need USDC to participate. No secondary gas token is required, eliminating a common UX barrier in USDC-first applications.
- The contract and frontend are both configured for Arc Testnet (chain ID 5042002) with Arc Mainnet support ready via environment variable.

### Security Considerations and Known Limitations

1. **Not independently audited.** The contract has undergone three automated audit passes (rule-corpus + functional auditors) with all findings addressed. It has NOT been reviewed by a third-party security firm. Do not use for real funds without a professional audit.
2. **Single global reviewer.** One reviewer address governs all campaigns. A compromised reviewer key is a significant centralisation risk. Production deployments should use a multi-sig (e.g. Gnosis Safe) as the reviewer address.
3. **Owner can replace reviewer.** The contract owner can call `setReviewer`. For production use, the owner should also be a multi-sig or a timelock.
4. **No funding deadline.** Campaigns do not expire automatically. Organiser must cancel manually to enable refunds.
5. **No milestone editing.** Once `addMilestone` is called, milestone titles and allocations are fixed.
6. **Partial refund risk.** If milestone payouts reduce the campaign balance below a contributor's record, that contributor's refund will be partial. This is disclosed on-chain and in the UI.
7. **Evidence off-chain.** Evidence URIs are stored as plain strings in contract events. Truly immutable evidence requires IPFS/Arweave — not currently implemented.

### Potential Real-World Impact

- **Community grants and public goods funding:** DAOs and foundations can run milestone-gated grant programmes without trusting individual grantees.
- **Freelance and service contracts:** Clients can escrow USDC for deliverable-based projects with verifiable completion steps.
- **Emerging market fundraising:** Communities where platform trust is low can use on-chain evidence review as a substitute for institutional trust.
- **Participatory budgeting:** Municipal or organisational budgets allocated to milestones with citizen-reviewer approval.

### Current Implementation Status

| Component | Status |
|-----------|--------|
| Smart contract (`ClearFundEscrow.sol`) | ✅ Complete, 84 tests passing |
| Frontend (DEMO mode) | ✅ Live at https://clearfund-five.vercel.app/ |
| Frontend (Arc Testnet mode) | ✅ Wired and ready — requires deployed contract |
| Arc Testnet deployment | ⚠️ Blocked — Arc Studio managed deployer hit daily gas policy. Manual deployment via `forge create` is prepared. |
| Arc Mainnet deployment | ⚠️ Requires: independent audit, multi-sig reviewer/owner, and manual deployment |
| GitHub repository | https://github.com/Yuusuf-Abd/clearfund `[CONFIRM PUBLIC VISIBILITY]` |
| Demo video | 🎬 Production guide complete — recording pending |

### Built With Arc Studio

The entire project — Solidity contract, React frontend, Foundry tests, and all documentation — was built using Arc Studio, Circle's AI-powered onchain application builder. Arc Studio provided:

- Solidity contract generation and iterative security auditing
- Wagmi v2 / viem integration patterns for Arc Testnet
- Foundry test scaffolding and invariant test design
- Responsive frontend component architecture
- Deployment configuration for Vercel (current host)

---

## Links

| Resource | URL |
|----------|-----|
| Live application | https://clearfund-five.vercel.app/ |
| GitHub repository | https://github.com/Yuusuf-Abd/clearfund |
| Arc Studio project | `[PLACEHOLDER — generate share link from Arc Studio project menu]` |
| Demo video | `[PLACEHOLDER — upload and paste URL]` |
| Contract address (Arc Testnet) | `[PLACEHOLDER — after deployment: 0x...]` |
| Contract address (Arc Mainnet) | `[PLACEHOLDER — after deployment: 0x...]` |
| Explorer tx (Arc Mainnet) | `[PLACEHOLDER — after first USDC transaction]` |
