# ClearFund — Final Video Production Plan

**Target length:** 4–6 minutes
**Format:** Screen recording with voiceover narration
**Date prepared:** 2026-10-18

---

## Recording Checklist (Pre-Production)

- [ ] Browser window at 1280×720 or higher, Chrome or Firefox
- [ ] Arc Studio open with ClearFund project loaded
- [ ] Preview panel visible and app running
- [ ] Mic tested, no background noise
- [ ] Notifications silenced
- [ ] Browser notifications disabled
- [ ] No private information visible in open tabs
- [ ] DEMO mode active (no wallet connected, no escrow address set) for safe recording
- [ ] For mainnet section: **BLOCKED** until contract deployed — skip or substitute testnet if available

---

## Section-by-Section Production Guide

### Section 1 — Introduction (0:00–0:30)

**Screen:** Landing page hero section
**Actions:** Scroll slowly through hero, pause on headline
**Narration script:**
> "ClearFund is a milestone-based USDC crowdfunding platform built on Arc — Circle's blockchain where USDC is the native gas token. The idea is simple: funders don't release money to a project all at once. Instead, funds are held in a smart contract escrow and released only when specific milestones are completed and reviewed. Fund with clarity. Release with accountability."

---

### Section 2 — The Problem (0:30–1:00)

**Screen:** Scroll to the "How ClearFund Works" section on the landing page
**Actions:** Let the viewer read the four-stage workflow
**Narration script:**
> "Traditional crowdfunding has an accountability gap. Once a campaign raises money, contributors have no guarantee the funds will be used as promised. ClearFund solves this by requiring organizers to define milestones upfront. Each milestone is independently reviewed by an authorized reviewer before any USDC is released to the recipient."

---

### Section 3 — Arc Studio Workspace (1:00–1:45)

**Screen:** Switch to Arc Studio editor panel; show the file tree
**Actions:** Open `contracts/ClearFundEscrow.sol`, scroll through the contract structure, show the milestone status enum, the events, the `releaseMilestone` function
**Narration script:**
> "The entire project was built inside Arc Studio. Here's the Solidity smart contract — ClearFundEscrow.sol. It uses OpenZeppelin's Ownable and ReentrancyGuard, SafeERC20 for all token transfers, and implements a five-stage milestone status machine: InProgress, Completed, Approved, and Paid. Funds can only move to the recipient after the reviewer explicitly calls approveMilestone."

---

### Section 4 — Contract Architecture (1:45–2:15)

**Screen:** Still in the contract file; scroll to the authorization table comment at the top
**Actions:** Highlight the role table in the NatSpec comment; show `contribute()` and `releaseMilestone()`
**Narration script:**
> "Four roles: the owner sets the reviewer. The organizer creates campaigns and milestones. Contributors fund active campaigns. The reviewer — and only the reviewer — can approve milestones. This separation means an organizer cannot unilaterally release their own funds. Every payout requires an independent approval step enforced on-chain, not just in the UI."

---

### Section 5 — Contract Testing (2:15–2:45)

**Screen:** Arc Studio terminal panel
**Actions:** Run `forge test`; let the output scroll; pause on the summary line
**Narration script:**
> "The contract has 84 Foundry tests covering every function, all authorization paths, refund accounting, cross-campaign balance isolation, and two invariants verified over 256 runs with 128,000 calls each. Zero failures."

---

### Section 6 — Application Walkthrough (2:45–3:30)

**Screen:** Preview panel — navigate through the app
**Actions:**
1. Land on Landing page — show DEMO mode banner
2. Navigate to Dashboard — show campaign cards with DEMO badges, search/filter
3. Open a campaign — show milestone timeline, funding progress bar
4. Navigate to Proof Center — show evidence form

**Narration script:**
> "The public application runs in DEMO mode by default — clearly labeled so no one mistakes sample data for real blockchain activity. The Dashboard shows campaigns with funding progress and milestone statuses. Opening a campaign reveals its milestone timeline, each with its evidence and approval status. The Proof Center is where organizers submit off-chain evidence for reviewer inspection."

---

### Section 7 — Campaign and Milestone Workflow (3:30–4:00)

**Screen:** Navigate to Create Campaign wizard
**Actions:** Walk through Steps 1, 2, and 3; show validation; show the milestone builder; scroll to Step 3 review
**Narration script:**
> "Campaign creation is a three-step wizard: project details, milestone setup with per-milestone USDC allocations, and a final review. In testnet or mainnet mode, this fires a createCampaign transaction followed by sequential addMilestone transactions — each awaited and confirmed before the next. If any milestone fails, the app reports exactly which ones succeeded so the organizer can recover without re-creating the campaign."

---

### Section 8 — Reviewer Workflow (4:00–4:30)

**Screen:** Navigate to Reviewer Dashboard
**Actions:** Show the pending milestones list; show the approve and revoke buttons; show the single-reviewer limitation notice
**Narration script:**
> "The Reviewer Dashboard shows all milestones awaiting approval. The reviewer calls approveMilestone — a real on-chain transaction. They can also revoke an approval if they discover an issue. The app is transparent about the limitation: a single reviewer is a centralization point. For production use, a multi-sig wallet should be set as the reviewer address."

---

### Section 9 — Blockchain Transaction Evidence

> **STATUS: BLOCKED**
>
> This section requires a deployed contract on Arc Mainnet and at least one confirmed USDC-moving transaction.
>
> **When unblocked — record the following:**
> - Switch wallet to Arc Mainnet; show the network indicator in the wallet
> - Connect wallet in the app; ContractModeBanner switches to "Arc Mainnet" blue
> - Navigate to a campaign; click Contribute; approve USDC in wallet
> - Show the transaction pending state in ContributePanel
> - Show the confirmed state; navigate to Transaction Explorer
> - Click the explorer link; show explorer.arc.io with the confirmed transaction
> - Show the `Contributed` event decoded in the explorer
>
> **Narration when unblocked:**
> "Here's a real USDC contribution on Arc Mainnet — transaction [hash]. You can verify it at explorer.arc.io. The USDC moves from the contributor's wallet into the ClearFundEscrow contract. It stays there until a milestone is approved and the organizer calls releaseMilestone."

---

### Section 10 — GitHub Repository and Closing (4:30–5:00)

**Screen:** GitHub repository at https://github.com/Yuusuf-Abd/clearfund
**Actions:** Show the repo structure — contracts/, src/, docs/, README.md
**Narration script:**
> "The full source code — Solidity contracts, React frontend, Foundry tests, and documentation — is available on GitHub. The README covers local setup, test commands, deployment instructions, and known limitations. ClearFund is not an independent audit. It demonstrates what's possible when you build accountability directly into the contract: milestone-gated escrow, evidence-required approval, and verifiable on-chain release. Fund with clarity. Release with accountability."

---

## Evidence Verification Checklist

Before uploading the video, verify:

- [ ] No private keys, seed phrases, or API keys visible in any screen
- [ ] No real wallet balances shown unless explicitly mainnet and consented
- [ ] DEMO badge visible whenever demo data is shown
- [ ] No fake transaction hashes or fabricated explorer screens
- [ ] Section 9 is either recorded with real mainnet evidence OR explicitly noted as BLOCKED in the video description
- [ ] `forge test` output shown in the video matches actual test counts (84 tests, 0 failures)
- [ ] Arc Studio project URL included in video description

---

## Upload Checklist

- [ ] Title: "ClearFund — Milestone USDC Crowdfunding on Arc | Arc Studio Hackathon"
- [ ] Description: include project description from `docs/submission-package.md`
- [ ] Include GitHub URL, Arc Studio project URL, and public app URL (when available)
- [ ] Set visibility: Public
- [ ] Note in description if Section 9 (mainnet transaction) is not included and why
