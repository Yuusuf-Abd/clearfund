# Phase 5.4 — Targeted Technical Audit
**Date:** 2026-10-18  
**Auditor:** Phase 5.4 principal engineering review  
**Scope:** Full application — contracts, hooks, pages, data flow, demo separation, demo script

---

## 1. Methodology

Full source read of every file listed in scope before any change was made:

- `src/hooks/useClearFund.ts` — all 14 contract hooks
- `src/hooks/useCampaigns.ts` — localStorage store + shadow mechanism
- `src/hooks/useContractCampaigns.ts` — event indexer
- `src/lib/clearfundContract.ts` — ABI + mode detection
- `src/lib/campaignId.ts` — strict ID parser
- `src/pages/CampaignDetails.tsx`
- `src/pages/CreateCampaign.tsx`
- `src/pages/ReviewerDashboard.tsx`
- `src/pages/TxExplorer.tsx`
- `src/pages/ProofCenter.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Landing.tsx`
- `src/App.tsx`
- `contracts/ClearFundEscrow.sol`
- `contracts/test/ClearFundEscrow.t.sol`
- `docs/demo-script.md`

---

## 2. Issue Register

| ID | Severity | File | Finding | Status |
|----|----------|------|---------|--------|
| CF-5.4-01 | MEDIUM | `CreateCampaign.tsx:620` | Testnet mode banner said "prepared in Phase 4 (wallet signing step)" — stale internal dev note visible to end users | **FIXED** |
| CF-5.4-02 | MEDIUM | `CreateCampaign.tsx:256` | `<DemoBadge />` always rendered in the Create Campaign header, including in live testnet mode — misrepresents the mode to the user | **FIXED** |
| CF-5.4-03 | LOW | `TxExplorer.tsx:63` | All contribution rows had `verified: true` regardless of source. DEMO/local rows incorrectly showed a "verified" flag. | **FIXED** |
| CF-5.4-04 | LOW | `docs/demo-script.md:159` | Step 8 (Payout Panel) instructed the recorder to "show the Payout Panel" in DEMO mode — the panel is only rendered in testnet mode. Recorder would be showing an empty sidebar and might improvise. | **FIXED** |
| CF-5.4-05 | INFO | `ReviewerDashboard.tsx` | Demo approval/revocation is explicitly labelled "(DEMO)" on every button and banner. No issue. | PASS |
| CF-5.4-06 | INFO | `useClearFund.ts` | All 14 hooks check `isContractDeployed()` before making any RPC call. Safe DEMO fallback confirmed. | PASS |
| CF-5.4-07 | INFO | `useContractCampaigns.ts` | Indexer reads chain head before choosing start block; never crawls from block 0. | PASS |
| CF-5.4-08 | INFO | `useCampaigns.ts` | Shadow mechanism for sample campaign evidence uses `__shadow_` prefix — excluded from all visible campaign lists and TxExplorer. No double-counting risk. | PASS |
| CF-5.4-09 | INFO | `clearfundContract.ts` | `ESCROW_ADDRESS` evaluates to `''` (not `undefined`) when env var is absent. `isContractDeployed()` checks `startsWith('0x') && length === 42` — correctly rejects the empty string. | PASS |
| CF-5.4-10 | INFO | `ClearFundEscrow.sol` | ABI in `clearfundContract.ts` matches the deployed function signatures, argument order/types, events, and custom errors — verified against the Solidity source. | PASS |

---

## 3. Detailed Findings and Fixes

### CF-5.4-01 — Stale "Phase 4" text in testnet banner

**Root cause:** A development note written during Phase 4 was never updated after the feature was completed.

**Fix:** `CreateCampaign.tsx` line 620 — replaced with: "Submitting will record this campaign locally and send `createCampaign` + `addMilestone` transactions requiring wallet signatures."

---

### CF-5.4-02 — DemoBadge shown in testnet mode on Create Campaign

**Root cause:** `<DemoBadge />` was unconditional in the header. In testnet mode the form does NOT create a demo-only item — it prepares live contract transactions.

**Fix:** `CreateCampaign.tsx` — `{mode === 'demo' && <DemoBadge />}` conditional. Testnet mode shows a blue "Arc Testnet" pill instead, consistent with Reviewer Dashboard and other pages.

---

### CF-5.4-03 — TxExplorer `verified: true` on DEMO/local rows

**Root cause:** The `verified` field on contribution rows was hardcoded `true`. The field is used to determine whether a row can show an explorer link and is displayed as a status indicator in the table.

**Fix:** `TxExplorer.tsx` — `verified` is now `contributionSource === 'testnet'`. DEMO and local rows correctly show `verified: false`, preventing any implication that simulated data is onchain-confirmed.

**Impact:** The "verified" check for milestone release rows already correctly gates on `m.status === 'verified'` — no change needed there.

---

### CF-5.4-04 — Demo script step 8 instructed showing testnet-only UI in DEMO mode

**Root cause:** The demo script was written before the payout/refund panels were gated to testnet mode only. A recorder following the script in DEMO mode would find the sidebar empty and either skip the section or improvise inaccurate narration.

**Fix:** `docs/demo-script.md` step 8 now:
- Explicitly notes the panels are testnet-only
- Provides an alternative: narrate the two-step flow from the milestone timeline
- Adds a `NOTE FOR RECORDER` callout with explicit guidance

---

## 4. Contract / Frontend ABI Consistency

Verified every write hook in `useClearFund.ts` against `ClearFundEscrow.sol`:

| Hook | Function | Args verified | Events decoded |
|------|----------|---------------|----------------|
| `useCreateCampaignWithMilestones` | `createCampaign(address,uint256,string)` | ✅ | `CampaignCreated` — campaignId decoded from receipt |
| `useCreateCampaignWithMilestones` | `addMilestone(uint256,string,uint256)` | ✅ | `MilestoneAdded` |
| `useContribute` | `approve(address,uint256)` on USDC | ✅ | receipt awaited before contribute |
| `useContribute` | `contribute(uint256,uint256)` | ✅ | `Contributed` |
| `useSubmitEvidence` | `submitEvidence(uint256,uint256,string)` | ✅ | `EvidenceSubmitted` |
| `useReviewerActions.approve` | `approveMilestone(uint256,uint256)` | ✅ | `MilestoneApproved` |
| `useReviewerActions.revoke` | `revokeApproval(uint256,uint256)` | ✅ | `ApprovalRevoked` |
| `useReleaseMilestone` | `releaseMilestone(uint256,uint256)` | ✅ | `MilestoneReleased` |
| `useClaimRefund` | `claimRefund(uint256)` | ✅ | `RefundClaimed` |

All argument orders and types match. No fabricated hashes. Confirmed/failed state only set after `waitForTransactionReceipt`.

---

## 5. Data Isolation Verification

| Data type | Store | Visible to user as | Mixed with other types? |
|-----------|-------|-------------------|------------------------|
| DEMO sample campaigns | `SAMPLE_CAMPAIGNS` (static) | DEMO badge + yellow banner | No |
| User-created local campaigns | `localStorage` | "Your Campaign" badge | No — separate list section in Dashboard |
| Sample campaign evidence shadows | `localStorage` (`__shadow_` prefix) | Filtered out of visible list | No — excluded from `campaigns` visible list |
| Onchain campaigns | RPC via `useContractCampaigns` | "Arc Testnet" banner | No — rendered in separate Dashboard section |
| TxExplorer DEMO rows | `c.isDemo === true` | source: DEMO, no explorer link | No — source filter available |
| TxExplorer local rows | `!c.isDemo && !0x66char` | source: LOCAL, no explorer link | No |
| TxExplorer testnet rows | `0x` + 66 chars | source: TESTNET, explorer link | No |

Funding statistics in DEMO mode are explicitly labelled as simulated. No cross-contamination found.

---

## 6. Test Results

| Suite | Tests | Passed | Failed | Skipped |
|-------|-------|--------|--------|---------|
| Forge unit | 77 | 77 | 0 | 0 |
| Forge invariant | 2 (256 runs × 128,000 calls) | 2 | 0 | 0 |
| Vitest (campaignId parser) | 24 | 24 | 0 | 0 |
| **Total** | **103** | **103** | **0** | **0** |

Lint: 0 errors, 0 warnings.  
TypeScript: 0 errors.  
Production build: ✓ built in 16.68s.

---

## 7. Responsive Viewport Assessment

No new responsive regressions were introduced in this phase. Fixes were limited to text and logic changes only. The responsive baseline from Phase 4.1 and Phase 5.1 remains in effect:

- All grids use `grid-cols-1 sm:grid-cols-N` breakpoints
- Tables inside `overflow-x-auto` with `min-w` constraints
- Nav drawer has focus trap, Escape close, and focus restoration
- Touch targets ≥ 44px on all interactive elements

---

## 8. Security Limitations (unchanged from Phase 5.1)

1. **Single reviewer key** — one global address can approve all milestones. No multi-sig or governance mechanism. Losing the key permanently blocks approvals.
2. **No independent audit** — three automated audit passes during development. Not an external professional audit.
3. **Evidence URIs are strings** — stored in contract events but not on immutable storage (IPFS/Arweave). Off-chain evidence can be deleted.
4. **No dispute mechanism** — reviewer decision is final onchain.
5. **Frontend role checks are UX hints only** — the contract is the source of truth for all access control.
6. **Partial refunds** — if milestone payouts were released before cancellation, contributor refunds will be partial. Disclosed in the UI.

---

## 9. Public Deployment Readiness

| Item | Status | Notes |
|------|--------|-------|
| Production build | ✅ PASS | `bun run build` succeeds, `dist/` ready |
| DEMO mode (no contract) | ✅ PASS | All pages functional without env vars |
| SPA rewrite config | ✅ PASS | `vercel.json` and `netlify.toml` present |
| `.gitignore` | ✅ PASS | `.env`, `dist/`, `.circle/`, secrets excluded |
| `env.example` | ✅ PASS | All required vars documented |
| `README.md` | ✅ PASS | Build, deploy, test commands accurate |
| GitHub push | ⚠️ BLOCKED | Requires user to connect GitHub via Integrations |
| Public URL | ⚠️ BLOCKED | Requires user to connect Netlify/HF/Vercel via Integrations |
| Contract deployment | ⚠️ BLOCKED | Arc Studio deployer daily gas cap; user must deploy with own wallet |

---

## 10. Video Recording Readiness

| Section | Demonstrable in DEMO mode | Notes |
|---------|--------------------------|-------|
| Landing page | ✅ Yes | Full redesign visible |
| Campaign exploration | ✅ Yes | 3 sample campaigns with milestones |
| Campaign creation | ✅ Yes | 3-step wizard, localStorage save |
| Milestone setup | ✅ Yes | Budget tracker functional |
| Evidence submission | ✅ Yes | Status badge: Submitted |
| Reviewer workflow | ✅ Yes | DEMO buttons labelled, local state only |
| Payout/refund panels | ⚠️ Testnet only | Script now correctly documents this limitation |
| Transaction Explorer | ✅ Yes | DEMO source filter, no fake explorer links |
| Forge tests | ✅ Yes | `forge test` passes locally |
| Deployment status | ✅ Yes | Blocker clearly explained in README and script |

**Updated demo script:** `docs/demo-script.md` — step 8 now accurately describes what is demonstrable in DEMO mode.

---

## 11. Remaining Blockers

1. **Contract deployment** — requires deployer with Arc Testnet USDC. Deploy manually with `forge create` and set `VITE_CLEARFUND_ESCROW_ADDRESS` + `VITE_CLEARFUND_DEPLOY_BLOCK`.
2. **Public frontend URL** — connect Netlify, Hugging Face, or Vercel via the Integrations menu.
3. **GitHub repository** — connect and push via the Integrations menu.

No code-level blockers remain.
