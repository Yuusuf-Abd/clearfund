# ClearFund Phase 1 — Smart Contract Report

> **Fund with clarity. Release with accountability.**
>
> This document covers the Phase 1 smart contract deliverable only.
> No contracts have been deployed to mainnet or testnet. No real funds are involved.

---

## 1. Files Created

| Path | Purpose |
|---|---|
| `contracts/ClearFundEscrow.sol` | Main escrow contract — campaigns, milestones, USDC flows |
| `contracts/test/ClearFundEscrow.t.sol` | 46 Foundry unit + fuzz + invariant tests |
| `contracts/test-helpers/MockERC20.sol` | Mock ERC20 (6 decimals) used by tests — never deployed |

### Technology stack
- Solidity `0.8.28`, EVM target `paris` (Arc-compatible)
- OpenZeppelin 5.1.0: `Ownable`, `ReentrancyGuard`, `IERC20`, `SafeERC20`
- Foundry (forge) for compilation and testing

---

## 2. Main Contract Functions

### Campaign lifecycle

| Function | Caller | What it does |
|---|---|---|
| `createCampaign(recipient, target, metadataURI)` | Anyone | Creates a campaign. Returns `campaignId`. Stores organizer, recipient, and funding target. |
| `addMilestone(campaignId, description, amount)` | Organizer | Adds a milestone with an allocated USDC amount. Sum of all milestone amounts must not exceed the campaign target. |
| `cancelCampaign(campaignId)` | Organizer | Marks campaign inactive. Stops contributions and new milestones. Does not move funds. |
| `updateRecipient(campaignId, newRecipient)` | Organizer | Changes the payout address. Works on both active campaigns and inactive campaigns that still hold a balance (for blocked-recipient recovery). |

### Contribution

| Function | Caller | What it does |
|---|---|---|
| `contribute(campaignId, amount)` | Anyone | Transfers USDC from caller to the contract. Credits `campaignBalance[campaignId]`. Requires active campaign and amount > 0. |

### Milestone progression

| Function | Caller | What it does |
|---|---|---|
| `submitEvidence(campaignId, milestoneIndex, evidenceURI)` | Organizer | Stores an off-chain evidence URI. **Does not change milestone status.** Does not release funds. |
| `markMilestoneComplete(campaignId, milestoneIndex)` | Organizer | Advances milestone from `InProgress → Completed`. Signals readiness for reviewer approval. |
| `approveMilestone(campaignId, milestoneIndex)` | Reviewer | Advances milestone from `Completed → Approved`. Only this address can approve. |
| `releaseMilestone(campaignId, milestoneIndex)` | Organizer | Transfers the milestone's USDC to the campaign recipient. Requires status `Approved`, not already paid, and sufficient campaign balance. |

### Admin

| Function | Caller | What it does |
|---|---|---|
| `setReviewer(newReviewer)` | Owner | Changes the global reviewer address. |
| `emergencyWithdraw(campaignId)` | Owner | Last-resort recovery. Only callable on **inactive** campaigns with a non-zero balance. Sends funds to the campaign's current recipient (not the owner). |

---

## 3. Authorization and Payout Mechanism

### Role table

| Role | Who | Capabilities |
|---|---|---|
| `owner` | Deployer | Set reviewer, emergency withdraw on inactive campaigns |
| `organizer` | Campaign creator | Add milestones, mark complete, submit evidence, release (post-approval), cancel, update recipient |
| `reviewer` | Single address set by owner | Approve completed milestones |
| `contributor` | Anyone | Send USDC to active campaigns |

### Payout flow — five required steps

```
1. Organizer:  markMilestoneComplete()   — status InProgress → Completed
2. Organizer:  submitEvidence()          — records off-chain proof URI (no status change)
3. Reviewer:   approveMilestone()        — status Completed → Approved  ← ONLY step that grants approval
4. Organizer:  releaseMilestone()        — transfers USDC to recipient
```

Evidence submission **cannot** trigger approval. The reviewer is the sole approval authority. The organizer cannot release until the reviewer has approved. No step can be skipped or reordered.

### Per-campaign balance accounting

Every `contribute()` call increments `campaignBalance[campaignId]`. Every `releaseMilestone()` call decrements it by the milestone amount. `releaseMilestone()` checks `campaignBalance[id] >= milestone.amount` — it never reads the contract's total ERC-20 balance. Campaign balances cannot bleed into each other.

### Double-payout prevention

`milestone.paid` is set to `true` and `milestone.status` is set to `Paid` **before** the `safeTransfer` call (checks-effects-interactions pattern). A second `releaseMilestone()` call on the same milestone reverts immediately on the `paid` check.

### Reentrancy protection

`contribute()` and `releaseMilestone()` are both guarded by OpenZeppelin's `nonReentrant` modifier. The transfer in `releaseMilestone()` occurs after all state changes (CEI pattern), so even a malicious ERC-20 token that re-enters finds the milestone already marked `Paid`.

---

## 4. Build and Test Results

### Compilation

```
forge build — 0 errors, 0 warnings
Slither 102 detectors — 0 findings
```

### Unit test results

```
Ran 46 tests in ClearFundEscrow.t.sol
46 passed, 0 failed, 0 skipped
```

Coverage includes:
- Full end-to-end happy path (create → contribute → complete → evidence → approve → release)
- All revert paths (21 distinct error conditions)
- Event emission verification for `CampaignCreated`, `Contributed`, `MilestoneApproved`, `MilestoneReleased`
- Separate-campaign balance isolation
- `updateRecipient` — active campaign and inactive-with-balance scenarios
- `emergencyWithdraw` — active-campaign gate, zero-balance gate, non-owner gate
- Fuzz: `contribute` balance accuracy (256 runs)
- Fuzz: milestone allocation cap cannot be bypassed (256 runs)
- Invariant: `campaignBalance[id] <= campaign.totalContributed` (256 runs × 500 depth)
- Invariant: contract's ERC-20 balance >= sum of all campaign balances (256 runs × 500 depth)

---

## 5. Security Limitations

The following are known limitations for Phase 1. They are not hidden defects — they are design scope decisions appropriate for a testnet prototype.

| Limitation | Detail |
|---|---|
| **Single global reviewer** | One address can approve milestones across all campaigns. If the reviewer key is compromised, every campaign is at risk. A multi-reviewer or per-campaign reviewer model would be stronger for production. |
| **No contributor refunds** | If a campaign is cancelled or never reaches its target, contributors cannot reclaim their USDC on-chain. Phase 2 should add a refund or withdrawal mechanism. |
| **No funding deadline enforcement** | The contract does not automatically enforce campaign end dates. Contributions remain accepted on inactive campaigns if the check is removed — currently `require(campaign.active)` guards this. |
| **Organizer trust** | The organizer controls recipient updates and milestone releases. A malicious organizer could update the recipient to a colluding address before release. The reviewer approval step provides a check but does not verify the recipient. |
| **Owner emergency power** | `emergencyWithdraw` sends funds to `campaign.recipient` (not the owner), gated behind campaign inactivity. However, it gives the owner unilateral power to accelerate fund disbursement by cancelling a campaign and then calling emergency withdraw. In production, a timelock or multi-sig on the owner role is advisable. |
| **No independent audit** | This contract has been through an automated security review but has NOT been independently audited by a professional third-party firm. Do not deploy to mainnet or use for real funds without a paid audit. |
| **Blocklisted recipient on Arc** | If a recipient address is USDC-blocklisted after contributions are made, `releaseMilestone` will revert. The mitigation is: organizer calls `updateRecipient` to a clean address, then the organizer proceeds with release. If the campaign has been cancelled, `updateRecipient` still works as long as `campaignBalance > 0`. |

---

## 6. Frontend Integration Plan

The React frontend connects to the deployed contract address via `wagmi` + `viem` hooks already available in the project.

### Environment variable
After deployment (Phase 2), add to `.env`:
```
VITE_CLEARFUND_ESCROW_ADDRESS=0x<deployed_address>
```

### Key integration points

| Frontend action | Contract call |
|---|---|
| Create Campaign wizard (Step 3 "Submit") | `createCampaign(recipient, target * 1e6, ipfsURI)` |
| Add Milestone (Step 2) | `addMilestone(campaignId, description, amount * 1e6)` |
| Contribute button on Campaign Details | `approve(escrowAddress, amount)` then `contribute(campaignId, amount)` |
| "Mark Complete" button (organizer view) | `markMilestoneComplete(campaignId, milestoneIndex)` |
| Submit Evidence (Proof Center) | `submitEvidence(campaignId, milestoneIndex, evidenceURI)` |
| Approve Milestone (reviewer dashboard) | `approveMilestone(campaignId, milestoneIndex)` |
| Release Milestone (organizer view) | `releaseMilestone(campaignId, milestoneIndex)` |

USDC amounts: the frontend stores values as whole-number USD (e.g. `1500`). Before calling the contract, multiply by `1_000_000` (6 decimals). Use `parseUsdc()` from `src/onchain-money.ts` which is already in the project.

The `localStorage` campaigns in the frontend will be supplemented (not replaced) in Phase 2: on-chain campaigns will be indexed by listening to `CampaignCreated` events from the deployment block.

---

## 7. Remaining Competition Requirements (Phase 2+)

| Item | Status | Notes |
|---|---|---|
| Deploy to Arc Testnet | Not yet | Ready to deploy after user confirms |
| Wallet connection (ConnectKit) | Ready | Already wired in `src/main.tsx` |
| Real USDC contributions via frontend | Blocked on deploy | USDC token address in `.env` after deploy |
| On-chain campaign indexing | Pending | Read `CampaignCreated` events from deployment block |
| Reviewer dashboard | Pending | New page for `approveMilestone` calls |
| Organizer release UI | Pending | Button on milestone card in Campaign Details |
| Transaction explorer — real tx hashes | Pending | Replace DEMO refs with on-chain tx hashes after deploy |
| USDC ERC-20 approval UX | Pending | User must approve escrow contract before `contribute()` |
| Phase 2 refund mechanism | Future | Contributor withdrawal when campaign is cancelled |

---

*This is a prototype for the Arc Microgrants: Built with Arc Studio competition. No real funds are involved at this stage.*
