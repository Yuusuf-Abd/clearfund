# ClearFund — Demo Script and Recording Checklist

**Tagline:** Fund with clarity. Release with accountability.
**Duration:** 5–8 minutes
**Mode:** DEMO (no wallet required for most steps; optional wallet connection for testnet section)

---

## Pre-Recording Checklist

- [ ] Clear browser localStorage (`localStorage.clear()` in DevTools console) to start fresh
- [ ] Open ClearFund at the preview URL
- [ ] Resize browser to a comfortable recording viewport (1280×800 or 1440×900)
- [ ] Open DevTools Network tab to show no real API calls (optional — demonstrates no backend)
- [ ] Have a second browser tab open with the Arc block explorer (https://explorer.testnet.arc.io) for the contract section
- [ ] Foundry installed and `forge test` ready to run in a terminal window

---

## Recording Script

### 1. Introduction (30 seconds)

**[Screen: Landing page]**

> "This is ClearFund — a milestone-based USDC funding protocol built on Arc.
> The core idea is simple: contributions are locked in a smart contract and
> released only when organizers submit verifiable evidence for each milestone
> and an independent reviewer approves it.
> The app is running in DEMO mode right now — all the sample campaigns you see
> are pre-loaded data. No real funds are involved."

- Point out the yellow DEMO banner at the top.
- Highlight the three stats: USDC raised, active campaigns, milestones verified.
- Click "Explore Campaigns" to navigate to the Dashboard.

---

### 2. Campaign Exploration (60 seconds)

**[Screen: Dashboard]**

> "The Dashboard shows all campaigns with live filtering.
> Each card shows the funding progress, milestone count, and status."

- Use the search box to filter for "Hydrology"
- Click on the "Open-Source Hydrology Sensor Network" campaign
- **[Screen: Campaign Details]**
- Point out the cover, funding progress bar, contributor count
- Scroll down the milestone timeline:
  - "Procurement & Lab Setup — Completed, $5,000 released"
  - "Field Deployment Phase 1 — Completed, $4,500 released"
  - "Field Deployment Phase 2 — In Progress, evidence needed"
  - "Public Data Portal — Pending"
- Click on the evidence attached to Milestone 1 — show the Submitted/Approved status
- Point out the Recipient panel on the right showing the wallet address

---

### 3. Campaign Creation (90 seconds)

**[Screen: Create Campaign — Step 1]**

> "Creating a campaign takes three steps: info, milestones, and review."

- Click "New Campaign" in the nav
- Fill in:
  - Title: "Rainforest Biodiversity Mapping Project"
  - Description: "Deploying acoustic sensors to map biodiversity across 500 hectares of rainforest in the Amazon basin and publish open data."
  - Category: Science
  - Target: 25000
  - Recipient Name: Amazon Science Collective
  - Recipient Address: 0x1234567890123456789012345678901234567890 (placeholder — explain this would be a real wallet)
  - End Date: (pick a future date)
- Click "Next: Add Milestones"

---

### 4. Milestone Setup (60 seconds)

**[Screen: Create Campaign — Step 2]**

> "Each milestone has a title, description, a USDC release amount, and a target date.
> The budget tracker ensures you don't allocate more than the campaign target."

- Add Milestone 1:
  - Title: "Sensor Procurement and Calibration"
  - Amount: 8000
  - Date: (one month out)
- Add Milestone 2:
  - Title: "Field Deployment — Phase 1"
  - Amount: 10000
  - Date: (two months out)
- Add Milestone 3:
  - Title: "Data Publication and Report"
  - Amount: 7000
  - Date: (three months out)
- Show the budget tracker updating: $25,000 allocated of $25,000 target
- Click "Review Campaign"

---

### 5. Campaign Review and Save (30 seconds)

**[Screen: Create Campaign — Step 3]**

> "Step 3 shows a full summary before saving.
> In DEMO mode this saves to localStorage only — no transaction is sent.
> With a deployed contract on Arc Testnet, this would submit createCampaign
> and addMilestone transactions requiring wallet signatures."

- Point out the LOCAL DRAFT notice (yellow box)
- Click "Save Campaign" — show the toast notification
- The app navigates to the campaign detail page for the new campaign

---

### 6. Evidence Submission (60 seconds)

**[Screen: Proof Center]**

> "Organizers submit evidence through the Proof Center.
> This is where accountability happens — evidence is attached to specific
> milestones and starts in Submitted status."

- Navigate to Proof Center
- Show the summary stats: milestones with evidence, awaiting evidence, total items
- Open the evidence form for an in-progress milestone from the demo campaigns
- Fill in:
  - Title: "Sensor Calibration Report"
  - Type: Document
  - Description: "Lab report confirming 24 sensors calibrated to ±0.1°C accuracy"
  - URL: https://example.com/calibration-report.pdf
- Point out the notice: "Evidence starts as Submitted. It will not be automatically approved."
- Click "Submit Evidence"
- Show the status badge: Submitted (blue)

---

### 7. Reviewer Workflow (60 seconds)

**[Screen: Reviewer Dashboard]**

> "The Reviewer Dashboard is where an authorized wallet approves or revokes milestone approvals.
> In DEMO mode the buttons update local state only.
> On Arc Testnet, only the wallet address set as reviewer at deploy time can approve — 
> the contract enforces this with a NotReviewer revert for any other wallet."

- Navigate to Reviewer Dashboard
- Point out the authorization model info box — single reviewer limitation warning
- Point out the "Awaiting Review" section
- Click "Approve (DEMO)" on a milestone
- Show the badge change to "Approved (DEMO)"
- Click "Revoke (DEMO)" — show it returning to Completed
- Explain: "Approval is reversible until the organizer calls releaseMilestone"

---

### 8. Funding Release and Refund Logic (45 seconds)

**[Screen: Campaign Details]**

> "Once a milestone is approved, the organizer calls releaseMilestone
> to transfer USDC to the recipient. These are two distinct steps —
> approval alone does not transfer funds."

> "The Payout and Refund panels are only rendered in Arc Testnet mode
> (when VITE_CLEARFUND_ESCROW_ADDRESS is set). In DEMO mode you can
> describe the two-step flow from the contract source or the README
> rather than showing the live UI."

- Navigate back to a campaign details page
- Read aloud from the CampaignDetails sidebar: explain the payout flow
  using the milestone timeline as a visual guide:
  - Pending → In Progress → Evidence submitted → Reviewer approves → Organizer releases
- If you have a deployed contract configured, show the Release Milestone
  and Claim Refund panels in the sidebar
- Explain the refund model: "If a campaign is cancelled, contributors call
  claimRefund themselves. The contract never sweeps funds to the owner.
  Refunds may be partial if milestone payouts were already released."
- **NOTE FOR RECORDER:** If the contract is not deployed (DEMO mode only),
  skip the live panel screenshots and reference the contract source and
  README instead. Do not claim the panels are visible when they are not.

---

### 9. Transaction Explorer (45 seconds)

**[Screen: Transaction Explorer]**

> "The Transaction Explorer shows all contributions and fund releases
> with clear source labels — DEMO sample data, local drafts, or
> verified Arc Testnet transactions."

- Show the filter by source: DEMO, LOCAL, Arc Testnet
- Filter to DEMO — show sample transactions with fabricated references
- Point out: "DEMO rows have fabricated references and no explorer link.
  Arc Testnet rows would have real 0x transaction hashes linked to the
  Arc block explorer."
- Point out the notice box that explains each label

---

### 10. Smart Contract Tests (45 seconds)

**[Screen: Terminal]**

> "The contract has 79 Foundry tests — 77 unit tests and 2 invariant fuzz tests.
> Let's run them."

```bash
forge test
```

- Show the output: `79 tests passed, 0 failed, 0 skipped`
- Point out the invariant tests: `invariant_BalanceNeverExceedsTotalContributed`
  and `invariant_ContractHoldsEnoughUSDC` — 256 runs × 128,000 calls each

---

### 11. Blockchain Deployment Status (30 seconds)

**[Screen: Arc Testnet Explorer or README]**

> "The contract is ready to deploy. The Arc Studio managed deployer wallet
> hit its daily USDC gas cap during our session.
> To deploy manually: `forge create` with your own wallet private key,
> then set VITE_CLEARFUND_ESCROW_ADDRESS in .env and restart the server.
> No mainnet deployment is planned — this is a testnet prototype."

- Show the deployment instructions from the README
- Point out the yellow DEMO banner and explain it would switch to blue Arc Testnet
  once the contract address is set

---

## Post-Recording Checklist

- [ ] Forge tests ran and all 79 passed — show terminal output
- [ ] Application is clearly labelled DEMO throughout
- [ ] No fabricated blockchain data was presented as real
- [ ] No real wallet addresses or private keys were shown
- [ ] The contract deployment blocker was honestly disclosed
- [ ] The single-reviewer limitation was mentioned

---

## Key Messages for Judges

1. **Real smart contract:** 314-line Solidity escrow with full test coverage. Not a mock.
2. **Genuine accountability mechanism:** Evidence → reviewer approval → fund release. Three distinct parties, not one.
3. **USDC on Arc:** Demonstrates Arc's USDC-as-gas model — no ETH required for any transaction.
4. **Security-first design:** No emergency withdraw, pull-pattern refunds, CEI throughout, ReentrancyGuard.
5. **Production-quality UI:** Fully responsive, accessible, dark navy + electric-blue design, DEMO/testnet mode clearly labelled.
6. **Honest status reporting:** Deployment is blocked by gas cap, not hidden. The workaround is documented.
