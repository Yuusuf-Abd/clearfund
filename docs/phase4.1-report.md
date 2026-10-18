# ClearFund Phase 4.1 Report
## Responsive Audit, Accessibility Fixes, addMilestone Completion, and Deployment Investigation

**Date:** 2026-10-18
**Status:** COMPLETE — 0 lint errors, 0 type errors, 79/79 Foundry tests passing

---

## 1. Responsive Design Audit (320px – 1440px+)

### Issues Found and Fixed

#### Nav (`src/components/Nav.tsx`)
| Issue | Fix |
|---|---|
| Mobile drawer had no `aria-expanded` or `role="dialog"` | Added `role="dialog"`, `aria-modal`, `aria-label` to overlay div; added `aria-expanded={isOpen}` and `aria-label` to hamburger button |
| DemoBadge `hidden sm:inline-flex` hid brand mark on 320px | Changed to `inline-flex` — always visible, no DEMO ambiguity |
| No `aria-label` on hamburger/close icon buttons | Added descriptive labels |

#### Landing (`src/pages/Landing.tsx`)
| Issue | Fix |
|---|---|
| `grid-cols-3` stats strip crushed to ~95px per cell at 320px | Changed to `grid-cols-1 sm:grid-cols-3` |
| Hero `<br />` tag created awkward forced line break at 320px | Removed; text reflows naturally |
| Stat numbers `text-3xl` too large at 320px with grid-cols-1 | No change needed once grid fixed — each cell now full-width on mobile |

#### Dashboard (`src/pages/Dashboard.tsx`)
| Issue | Fix |
|---|---|
| Category pill row showed native scrollbar on mobile | Added `scrollbar-hide` utility class (custom CSS in `index.css`) via `[&::-webkit-scrollbar]:hidden` inline style |
| Status toggle `flex gap-1` wrapped awkwardly at 320px | Added `flex-wrap` to prevent overflow |
| Stats sub-text `text-xs` label truncated on smallest screens | Added `truncate` class to stat labels |
| Onchain campaign `flex` rows could overflow at narrow widths | Added `min-w-0` on text content divs |

#### CreateCampaign (`src/pages/CreateCampaign.tsx`)
| Issue | Fix |
|---|---|
| Step 1 two-column form fields (Category+Target, Recipient+EndDate) squeezed to 140px each at 320px | Changed all `grid-cols-2` form grids to `grid-cols-1 sm:grid-cols-2` |
| Step 2 milestone card `grid-cols-2` Amount+Date squeezed at 320px | Changed to `grid-cols-1 sm:grid-cols-2` |
| Step indicator labels `whitespace-nowrap` overflowed at 320px | Removed `whitespace-nowrap`; labels now wrap on very narrow screens |
| Step 3 wallet address hard-wraps without `break-all` | Added `break-all` to address display spans |

#### ProofCenter (`src/pages/ProofCenter.tsx`)
| Issue | Fix |
|---|---|
| Summary stats `grid-cols-3` crushed to 95px at 320px with multi-line labels | Changed to `grid-cols-1 sm:grid-cols-3` |
| Evidence form `grid-cols-2` Title+Type at 320px | Changed to `grid-cols-1 sm:grid-cols-2` |

#### TxExplorer (`src/pages/TxExplorer.tsx`)
| Issue | Fix |
|---|---|
| Stats `grid-cols-3` crushed at 320px | Changed to `grid-cols-1 sm:grid-cols-3` |
| 8-column table overflowed without explicit `min-w` | Added `min-w-[700px]` to table — existing `overflow-x-auto` wrapper contains it |
| Icon-only copy/external-link buttons had no accessible labels | Added `aria-label="Copy hash"` / `aria-label="View on explorer"` |

#### CampaignDetails (`src/pages/CampaignDetails.tsx`)
| Issue | Fix |
|---|---|
| Recipient address overflowed at narrow widths | Added `break-all` class |
| `ConnectKitButton` expanded unpredictably in sidebar panels | Wrapped in `w-full` div with `block` display |

---

## 2. Accessibility Improvements

| Component | Issue | Fix |
|---|---|---|
| `Nav.tsx` | Hamburger/close buttons had no labels | `aria-label="Open menu"` / `aria-label="Close menu"` |
| `Nav.tsx` | Mobile drawer overlay had no ARIA role | `role="dialog"`, `aria-modal="true"`, `aria-label="Navigation menu"` |
| `Nav.tsx` | Drawer open state not exposed to screen readers | `aria-expanded={isOpen}` on trigger |
| `TxExplorer.tsx` | Icon-only action buttons (copy, external link) | `aria-label` added to each |
| All pages | `grid-cols-N` → single-column on mobile means logical tab/read order now matches visual order | No code change needed — default DOM order preserved |

---

## 3. `addMilestone` / Campaign ID Integration (PARTIAL → COMPLETE)

### Previous State
`useCreateCampaign` fired the `createCampaign` transaction but the returned `txHash` was not decoded to extract the real on-chain `campaignId`. The subsequent `addMilestone` calls were never fired — the code had a `// Phase 4 pending` comment at the integration point.

### What Was Built

**New hook: `useCreateCampaignWithMilestones`** (`src/hooks/useClearFund.ts`)

Provides a single `createAndAddMilestones(recipient, milestones)` function that:

1. Calls `createCampaign(recipient)` and awaits the public client receipt
2. Iterates the receipt logs and calls `decodeEventLog` on each using the `CampaignCreated` ABI signature — finds the log where `topics[0]` matches the event selector
3. Extracts the real `campaignId` from the decoded args
4. Calls `addMilestone(campaignId, title, targetAmount, deadline)` for each milestone in sequence, awaiting each receipt before the next
5. Surfaces the composite state via a `CreateCampaignResult` object:

```typescript
interface CreateCampaignResult {
  stage: TxStage          // overall state machine stage
  createTxHash?: Hash     // tx hash from createCampaign
  error?: string          // first error encountered
  campaignId?: bigint     // decoded from CampaignCreated event
  milestonesAdded: number // how many addMilestone calls succeeded
  milestonesTotal: number // total milestones to add
}
```

**Failure handling:**
- If the `CampaignCreated` event is not found in the receipt (shouldn't happen but guarded), stage → `'failed'` with a clear message
- If any `addMilestone` call fails, the function reports partial success (e.g. "2/3 milestones added") and sets the error — the campaign was already created on-chain so it's not a rollback, and the user can add remaining milestones separately
- `milestonesAdded` / `milestonesTotal` counters update live so the UI shows "Milestones: 2 / 3 added" during execution

**`CreateCampaign.tsx` updated:**
- Imports `useCreateCampaignWithMilestones` instead of `useCreateCampaign`
- `handleSubmit` calls `createAndAddMilestones(recipient, milestonesArray)` where `milestonesArray` is built from the Step 2 form state
- Step 3 UI shows a live milestone progress line during the transaction sequence

---

## 4. Deployment Limit Investigation

### Error Received (Previous Session)
```
exceeded max native token daily of the policy
```

### Root Cause
The `deploy_contract` tool uses a **Circle-managed shared deployer wallet** (`0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`). That wallet has a **per-day native gas (USDC) spending policy** enforced by Circle's Smart Contract Platform. The cap is shared across all Arc Studio sessions — hitting it blocks further deploys from that wallet until the daily reset.

**This is NOT a limit on:**
- Arc Testnet itself (no quota on Arc Testnet transactions)
- The user's own wallet
- The contract or contract size
- Arc Studio's API access

### How to Deploy

Deploy from your own wallet using one of these two methods:

#### Option A — Foundry `forge script` (recommended)
```bash
# In your local terminal (not Arc Studio sandbox)
# Install Arc Foundry: https://docs.arc.io/arc/tutorials/install-arc-foundry.md
arc-forge script contracts/script/DeployCreate2.s.sol:DeployCreate2 \
  --rpc-url https://rpc.testnet.arc.io \
  --broadcast \
  --private-key <YOUR_PRIVATE_KEY>
```
Get testnet USDC for gas: https://faucet.circle.com (select Arc Testnet)

#### Option B — Circle CLI
```bash
circle contract deploy \
  --network arc-testnet \
  --artifact contracts/out/ClearFundEscrow.sol/ClearFundEscrow.json \
  --constructor-args <USDC_ADDRESS> <REVIEWER_ADDRESS>
```

#### After Deployment
Once you have the contract address and deployment block, set them in `.env` and restart the dev server:
```
VITE_CLEARFUND_ESCROW_ADDRESS=0x<your_contract_address>
VITE_CLEARFUND_DEPLOY_BLOCK=<deployment_block_number>
```
The app detects these env vars and automatically switches from DEMO mode to Arc Testnet mode across all pages.

---

## 5. Foundry Remappings Fix

The `foundry.toml` was missing `node_modules` from `libs` and had remappings only in `remappings.txt`. When `forge test` runs from the project root (not `--root contracts`), Foundry reads `foundry.toml` from the current directory. Added inline `remappings` and `node_modules` to `libs` so both `@openzeppelin` and `forge-std` resolve correctly:

```toml
libs = ["lib", "node_modules"]
remappings = [
  "forge-std/=lib/forge-std/src/",
  "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/"
]
```

---

## 6. Test Results

```
Ran 2 test suites:
  77 unit tests  — PASS
  2 invariant tests (256 runs × 128k calls each) — PASS
Total: 79 / 79 PASS, 0 failed, 0 skipped
```

---

## 7. Quality Gates

| Gate | Result |
|---|---|
| `bun run lint` | 0 warnings, 0 errors |
| `bun run typecheck` | 0 errors |
| `forge test` (79 tests) | 79/79 PASS |
| Vite dev server | Running (PID 2192, port 5173) |

---

## Phase Status

| Phase | Status |
|---|---|
| Phase 1 — Frontend + Contract | COMPLETE |
| Phase 2 — Security Hardening | COMPLETE |
| Phase 3 — Contract Integration Layer | COMPLETE |
| Phase 4 — Testnet Wiring | COMPLETE |
| Phase 4.1 — Responsive + Accessibility + addMilestone | **COMPLETE** |
| Deployment | BLOCKED (daily gas cap) — user action required |
