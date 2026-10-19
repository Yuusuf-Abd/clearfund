# ClearFund — Final Video Production Plan

**Target length:** 4–6 minutes
**Format:** Screen recording with voiceover narration
**Live app:** https://clearfund-five.vercel.app/
**GitHub:** https://github.com/Yuusuf-Abd/clearfund
**Date updated:** 2026-10-18

---

## Pre-Recording Checklist

- [ ] Screen resolution: 1280×720 minimum, 1920×1080 preferred
- [ ] Browser: Chrome or Firefox, zoom at 100%
- [ ] Arc Studio open with ClearFund project loaded (Code panel + Preview panel visible)
- [ ] Arc Studio terminal panel ready (for `forge test`)
- [ ] Live app open in a separate browser tab: https://clearfund-five.vercel.app/
- [ ] Mic tested — no background noise
- [ ] Notifications silenced (OS + browser)
- [ ] No private information in open tabs
- [ ] No private keys, wallet seeds, or API keys visible anywhere
- [ ] DEMO mode active on the live site (no wallet connected = default)
- [ ] **Section 9 status:** BLOCKED until Arc Mainnet contract is deployed — see decision below

**Decision for Section 9 (blockchain transaction evidence):**
If you have a deployed contract and at least one confirmed USDC transaction by recording time, record Section 9 with real evidence. If not, do one of the following:
- A) Record Sections 1–8 + 10 only; note in the video description that mainnet deployment is pending
- B) Show Arc Testnet activity if you have deployed to testnet manually
- C) Record the full script with Section 9 marked on-screen as "Coming: Mainnet deployment"

Do NOT fabricate transaction hashes or show fake explorer screens.

---

## Section-by-Section Production Guide

---

### Section 1 — Introduction (0:00–0:30)

**Where to record:** Live app — https://clearfund-five.vercel.app/ landing page
**On-screen actions:**
1. Open the live URL — let the hero section load
2. Scroll slowly past the headline to the "How ClearFund Works" row
3. Pause on the tagline

**On-screen label:** None needed (DEMO badge is visible on campaigns)

**Narration:**
> "ClearFund is a milestone-based USDC crowdfunding platform built on Arc — Circle's blockchain where USDC is the native gas token. The idea is simple: contributors don't release money upfront. Funds are held in a smart contract escrow and released only when each milestone is independently reviewed and approved on-chain. Fund with clarity. Release with accountability."

---

### Section 2 — The Problem (0:30–1:00)

**Where to record:** Live app — scroll to the Transparency section
**On-screen actions:**
1. Scroll past Featured Campaigns to the Transparency Showcase section
2. Pause on the six-step evidence lifecycle widget
3. Point to the "Single-reviewer limitation" disclosure

**On-screen label:** None needed

**Narration:**
> "Traditional crowdfunding has an accountability gap. Once a campaign raises money, backers have no way to verify funds are used as promised and no recourse when they are not. ClearFund solves this with three guarantees: evidence must be submitted before a milestone can be marked complete; an independent reviewer — not the organiser — calls approve on-chain; and every fund release is a verifiable blockchain transaction. There are no off-chain overrides."

---

### Section 3 — Arc Studio Workspace (1:00–1:40)

**Where to record:** Arc Studio — Code panel
**On-screen actions:**
1. Switch to Arc Studio; show the file tree on the left
2. Open `contracts/ClearFundEscrow.sol`
3. Scroll to the top — show the NatSpec authorization table comment
4. Scroll to the milestone status enum
5. Scroll to `releaseMilestone` — show the `Approved → Paid` check
6. Briefly show `src/hooks/useClearFund.ts` in the tree — mention 14 contract hooks

**On-screen label:** Text overlay: "Built entirely in Arc Studio"

**Narration:**
> "The entire project was built inside Arc Studio. Here's the Solidity smart contract — ClearFundEscrow.sol — 527 lines, Solidity 0.8.28, OpenZeppelin 5.1.0. The authorization table at the top documents the four roles: owner, organiser, reviewer, and contributor. Only the reviewer can call approveMilestone. This isn't enforced by the UI — it's enforced by the contract. A milestone can only be released after it reaches the Approved status. No shortcuts."

---

### Section 4 — Contract Testing (1:40–2:10)

**Where to record:** Arc Studio — Terminal panel
**On-screen actions:**
1. Open the terminal in Arc Studio
2. Type: `forge test` — press Enter
3. Let the output scroll (takes ~15 seconds)
4. Pause on the final summary line: `84 tests passed, 0 failed, 0 skipped`
5. Scroll up briefly to show the invariant test section (256 runs × 128,000 calls)

**On-screen label:** Text overlay on the summary line: "84 tests, 0 failures"

**Narration:**
> "The contract has 84 Foundry tests — 82 unit tests covering every function, authorization path, and failure case, plus two invariant tests that ran 256 times with 128,000 contract calls each. The invariants verify two things: the campaign balance never exceeds what contributors actually paid in, and the contract always holds enough USDC to cover all campaigns. Zero failures."

---

### Section 5 — Campaign Exploration (2:10–2:50)

**Where to record:** Live app
**On-screen actions:**
1. Navigate to the Dashboard
2. Show the three DEMO-badged campaign cards — point to the DEMO badges
3. Use the search filter to type "solar" — show the filtered result
4. Open the Solar Water Purification campaign
5. Show the milestone timeline — Completed, In Review, Pending states
6. Scroll to the funding progress bar

**On-screen label:** Keep DEMO badges visible — do not hide them

**Narration:**
> "The live application is running in DEMO mode — clearly labeled so no one mistakes sample data for real blockchain activity. The Dashboard shows campaigns with funding progress, milestone statuses, and category tags. Opening a campaign reveals its milestone timeline. Each milestone has a distinct status: In Progress, Completed pending review, Approved, or Paid. Contributors see exactly where their funds stand at every step."

---

### Section 6 — Campaign Creation Wizard (2:50–3:20)

**Where to record:** Live app
**On-screen actions:**
1. Click "Start Campaign" in the nav
2. Step 1: Fill in title ("Demo Campaign"), category, target amount ($5,000), recipient name, end date
3. Click Next — Step 2: Add two milestones with amounts and descriptions
4. Click Next — Step 3: Show the review summary with the full budget breakdown
5. Point to the "DEMO mode — saves to localStorage" notice

**On-screen label:** Step indicators visible at the top

**Narration:**
> "Campaign creation is a three-step wizard: project details, milestone setup with per-milestone USDC allocations that must sum to the funding target, and a final review. In testnet or mainnet mode, this fires a createCampaign transaction, decodes the campaign ID from the CampaignCreated event receipt, then adds each milestone sequentially — each confirmed before the next. If any milestone fails, the app reports exactly which ones succeeded so the organiser can recover without recreating the campaign."

---

### Section 7 — Evidence and Reviewer Workflow (3:20–4:00)

**Where to record:** Live app
**On-screen actions:**
1. Navigate to Proof Center
2. Show an in-progress milestone ready for evidence submission
3. Show the evidence form — title, type, URL fields
4. Submit sample evidence — show the confirmation (DEMO mode = browser state)
5. Navigate to Reviewer Dashboard
6. Show the pending approval queue
7. Click Approve on a milestone — show the confirmation
8. Point to the "Single-reviewer limitation" disclosure notice

**On-screen label:** "DEMO — browser state only" overlay when actions are taken

**Narration:**
> "The Proof Center is where organisers submit evidence. In testnet or mainnet mode, this calls submitEvidence on-chain, recording the URI permanently in a contract event. The Reviewer Dashboard shows all milestones awaiting approval. The reviewer calls approveMilestone — a real on-chain transaction. They can also revoke an approval before the organiser releases funds. The application is transparent about the limitation: a single reviewer is a centralisation point — for production use, a multi-sig should be the reviewer address."

---

### Section 8 — Transaction Explorer (4:00–4:20)

**Where to record:** Live app
**On-screen actions:**
1. Navigate to Transaction Explorer
2. Show the three source labels: DEMO / LOCAL / TESTNET
3. Show that DEMO rows have no explorer links (correctly)
4. Point to the "Source" column — explain the distinction

**On-screen label:** Point explicitly to the source labels

**Narration:**
> "The Transaction Explorer shows all activity with clear source labels: DEMO for sample data, LOCAL for browser-stored draft actions, and TESTNET or MAINNET for verified on-chain transactions. DEMO rows have no explorer links — it would be misleading to link simulated activity to a real blockchain explorer. Only genuine transactions get links to explorer.arc.io."

---

### Section 9 — Blockchain Transaction Evidence

> **⚠️ STATUS: BLOCKED**
>
> This section requires a deployed contract on Arc Mainnet or Arc Testnet and at least one confirmed USDC-moving transaction with a real transaction hash.
>
> **Do not record this section with fabricated evidence.**

**When unblocked — exact actions to record:**
1. Show MetaMask (or your wallet) switched to Arc Mainnet
2. Connect wallet in the app — ContractModeBanner switches from yellow DEMO to blue Arc Mainnet
3. Navigate to an active campaign → Contribute panel
4. Enter a USDC amount → click Contribute → approve USDC in wallet popup
5. Show the 5-state transaction badge: preparing → pending signature → pending confirmation → confirmed
6. Navigate to Transaction Explorer — show the TESTNET/MAINNET row with a real tx hash
7. Click the explorer link — show explorer.arc.io with the confirmed transaction and decoded Contributed event

**Narration when recorded:**
> "Here's a real USDC contribution on Arc — transaction [hash]. You can verify it at explorer.arc.io. The USDC moves from the contributor's wallet into the ClearFundEscrow contract. It stays locked there until a milestone is approved and the organiser calls releaseMilestone. Every step of the funding lifecycle is verifiable on-chain."

**If recording before mainnet deployment — add this title card:**
> On-screen text: "Arc Mainnet deployment in progress. Contract and test evidence: github.com/Yuusuf-Abd/clearfund"

---

### Section 10 — GitHub and Closing (4:20–5:00)

**Where to record:** GitHub — https://github.com/Yuusuf-Abd/clearfund
**On-screen actions:**
1. Open the GitHub repository
2. Show the file tree: contracts/, src/, docs/, README.md, LICENSE
3. Click on `contracts/ClearFundEscrow.sol` — show the first screen of code
4. Click on `contracts/test/ClearFundEscrow.t.sol` — show the test count in comments
5. Return to the repo root — show the README overview

**Narration:**
> "The full source code — Solidity contracts, React frontend, 84 Foundry tests, and documentation — is publicly available on GitHub under the MIT license. The README covers local setup, test commands, deployment instructions, and known limitations. ClearFund is not a finished product and has not been independently audited. What it demonstrates is what's possible when you build accountability directly into the contract: milestone-gated escrow, evidence-required approval, verifiable on-chain release. Fund with clarity. Release with accountability."

---

## Evidence Verification Checklist (before uploading)

- [ ] No private keys, seed phrases, or API keys visible in any frame
- [ ] No real wallet balances shown unless it is mainnet and you have consented
- [ ] DEMO badges visible whenever demo data is shown
- [ ] No fabricated transaction hashes or explorer screenshots
- [ ] Section 9: either recorded with real evidence OR explicitly noted as BLOCKED in video description
- [ ] `forge test` output shown matches actual count (84 tests, 0 failures)
- [ ] Arc Studio project URL included in video description
- [ ] Live app URL (https://clearfund-five.vercel.app/) in video description
- [ ] GitHub URL (https://github.com/Yuusuf-Abd/clearfund) in video description

---

## YouTube / Loom Upload Checklist

- [ ] **Title:** `ClearFund — Milestone USDC Crowdfunding on Arc | Arc Microgrants Submission`
- [ ] **Description:** Use the full description from `docs/dorahacks-project-description.md`
- [ ] Include links: live app, GitHub, Arc Studio project URL, DoraHacks submission
- [ ] Note in description if Section 9 (mainnet transaction) is not yet recorded and why
- [ ] Visibility: **Public**
- [ ] Thumbnail: screenshot of the live app hero section (optional but recommended)
