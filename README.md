# ClearFund

**Fund with clarity. Release with accountability.**

ClearFund is a milestone-based USDC funding protocol built on Arc — Circle's purpose-built Layer-1 blockchain where USDC is the native gas token. Contributors lock funds that are released after an authorized reviewer approves a completed milestone and the organizer initiates payout. Evidence URIs can be submitted, but the current contract does not enforce nonempty evidence before approval.

---

## The Problem

Traditional crowdfunding and grant systems release funds upfront with no mechanism for ongoing accountability. Donors, backers, and communities have no way to verify that funds are being used as promised, and no recourse when they are not.

## ClearFund's Solution

- **Milestone-locked escrow:** USDC is held in a smart contract and released only per milestone, never in a lump sum.
- **Evidence review workflow:** Organizers can attach proof links or documents for reviewer inspection. The current contract does not enforce nonempty evidence or verify linked content; this is an outstanding release risk.
- **Independent reviewer:** A dedicated reviewer address (ideally a multi-sig) approves or revokes milestone approvals. The frontend role check is a UX hint only — the contract enforces access.
- **Pull-pattern refunds:** If a campaign is cancelled before any payout, contributors can claim their full recorded contribution themselves. Cancellation is blocked after any milestone payout; the contract never sweeps funds to the owner.
- **Full transparency:** Every contribution, milestone approval, and fund release is recorded onchain with a transaction reference linkable to the Arc block explorer.

---

## Features

| Feature | Status |
|---|---|
| Campaign creation wizard (3-step) | ✅ |
| Milestone-based budget allocation | ✅ |
| Evidence submission with status tracking | ✅ |
| Reviewer dashboard (approve / revoke) | ✅ |
| USDC contribution flow (approve + contribute) | ✅ |
| Milestone fund release | ✅ |
| Contributor refund claim | ✅ |
| Transaction Explorer with source labels | ✅ |
| DEMO mode (no wallet, no contract) | ✅ |
| Arc Testnet mode (live contract) | Code available; historical Testnet deployment requires separate verification |
| Arc Mainnet live escrow | Not deployed or independently verified |

---

## Technology Stack

| Layer | Choice |
|---|---|
| Blockchain | Arc Testnet (5042002) for development; Arc Mainnet (5042) configuration gated |
| Smart contract | Solidity 0.8.28, OpenZeppelin 5.1.0 |
| Contract tests | Foundry (forge) plus invariant tests; current CI status in GitHub Actions |
| Frontend | React 18, TypeScript, Vite |
| Onchain hooks | wagmi v2, viem, ConnectKit |
| USDC | ERC-20 on Arc Testnet (`0x3600000000000000000000000000000000000000`) |
| Styling | Tailwind CSS v3, CSS custom properties |
| State persistence | localStorage (DEMO), wagmi/viem (chain-dependent onchain mode) |

---

## Smart Contract Architecture

**`contracts/ClearFundEscrow.sol`** — Solidity 0.8.28

### Key design decisions

- **Per-campaign balance accounting:** The contract tracks `campaignBalance[id]` separately from the global USDC balance, preventing cross-campaign fund mixing.
- **CEI pattern throughout:** All state changes precede external calls (Checks-Effects-Interactions) to eliminate reentrancy.
- **OZ ReentrancyGuard:** Applied to external token-transfer functions as a defence-in-depth layer.
- **No emergency sweep:** The `emergencyWithdraw` function was deliberately removed during internal security review. The owner cannot drain funds — only the designated recipient and contributors (via refund) can receive USDC.
- **Approval ≠ payout:** A reviewer calling `approveMilestone` does not transfer funds. The organizer must then call `releaseMilestone` — two distinct steps preventing accidental payouts.
- **Revocable approvals:** The reviewer can call `revokeApproval` to undo an approval that was made in error, before the organizer calls release.

### State machine per milestone

```
in_progress → completed → (reviewer) → approved → (organizer release) → paid
                                  ↑                         |
                                  └─────── revokeApproval ──┘
```

### Functions

| Function | Who can call | Effect |
|---|---|---|
| `createCampaign` | Anyone | Creates a new campaign |
| `addMilestone` | Campaign organizer | Adds a milestone to a campaign |
| `contribute` | Anyone | Transfers USDC into campaign escrow |
| `submitEvidence` | Campaign organizer | Records an evidence URI onchain |
| `markMilestoneComplete` | Campaign organizer | Marks milestone ready for review |
| `approveMilestone` | Reviewer only | Approves a completed milestone |
| `revokeApproval` | Reviewer only | Reverts an approval to Completed |
| `releaseMilestone` | Campaign organizer only (after reviewer approval) | Releases USDC to recipient |
| `cancelCampaign` | Campaign organizer | Cancels and enables refunds |
| `claimRefund` | Contributor | Claims full original contribution after pre-payout cancellation |
| `updateRecipient` | Campaign organizer | Changes recipient (blocked if approved milestones exist) |
| `setReviewer` | Contract owner | Updates the global reviewer address |

---

## Milestone Funding Workflow

```
1. Organizer creates campaign + adds milestones
2. Contributors send USDC (approve ERC-20 allowance → contribute)
3. Organizer marks milestone in_progress, completes work, submits evidence URI
4. Reviewer inspects evidence off-chain and calls approveMilestone
5. Organizer calls releaseMilestone → USDC transferred to recipient
6. If campaign is cancelled before payout, contributors call claimRefund
```

---

## Running Locally

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [Foundry](https://getfoundry.sh) (forge/cast/anvil)

### Setup

```bash
# Clone and install
git clone https://github.com/Yuusuf-Abd/clearfund
cd clearfund
bun install

# Copy environment template
cp env.example .env
# (optional) edit .env to set VITE_CLEARFUND_ESCROW_ADDRESS if you have a deployed contract

# Start the dev server
bun run dev
```

The app runs at `http://localhost:5173`. Without `VITE_CLEARFUND_ESCROW_ADDRESS` set, it starts in **DEMO mode** — all sample data, no wallet required.

### Build for production

```bash
bun run build      # outputs to dist/
bun run preview    # preview the production build locally on port 4173
```

### Lint + Typecheck

```bash
bun run check
```

---

## Deploying the Frontend

### Vercel

**Release warning:** Production builds require explicit `VITE_CLEARFUND_CHAIN=mainnet`. A historical Testnet address must never be reused as proof of a Mainnet escrow. See [Mainnet release gate](docs/deployment/MAINNET_RELEASE_GATE.md) and [reviewer governance](docs/deployment/REVIEWER_GOVERNANCE.md). The current project is not verified for real-funds Mainnet use.

1. Import the repository on [vercel.com](https://vercel.com).
2. Vercel auto-detects `vercel.json`. Build command: `bun run build`. Output: `dist`.
3. Add `VITE_CLEARFUND_ESCROW_ADDRESS` and `VITE_CLEARFUND_DEPLOY_BLOCK` in Environment Variables when you have a deployed contract. Leave blank for DEMO mode.

### Netlify

1. Import the repository on [netlify.com](https://netlify.com).
2. `netlify.toml` configures build command and SPA redirects automatically.
3. Add env vars in Site Settings → Environment Variables.

### Hugging Face Spaces (Docker)

1. Create a new **Docker** Space.
2. Push the repository. The `start` script (`vite preview --port 7860 --host`) runs the production build on the port HF expects.
3. Set `VITE_CLEARFUND_ESCROW_ADDRESS` in Space Secrets for testnet mode.

> **Note:** An unset escrow address enables sample-data DEMO behavior, but production builds still require explicit `VITE_CLEARFUND_CHAIN=mainnet`. DEMO mode does not prove a deployed escrow.

---

## Running Contract Tests

```bash
# From the project root
forge test

# Verbose output
forge test -vvv

# Gas report
forge test --gas-report
```

Test counts evolve as regression coverage grows. Check the latest GitHub Actions run for verified results.

---

## Contract Deployment Status

No Arc Mainnet escrow has been independently verified for this release. The historical Testnet address is not proof of a Mainnet deployment. This repository supports contract compilation, Foundry tests, and a local demonstration without custody of real funds.

Before any future production use, consult [the Mainnet release gate](docs/deployment/MAINNET_RELEASE_GATE.md), obtain an independent security review, and have an eligible authorized operator verify the intended network, deployed bytecode, constructor parameters, reviewer governance, and release policy. Do not paste private keys into documentation, source files, or support chats.

---

## DEMO vs Testnet vs Mainnet

| Mode | How to activate | What happens |
|---|---|---|
| **DEMO** | Default (no env vars set) | All data in localStorage. No wallet needed. Sample campaigns shown. |
| **Arc Testnet** | Explicit `VITE_CLEARFUND_CHAIN=testnet` and a verified Testnet escrow address in a development build | Testnet-only wallet and contract interactions. |
| **Arc Mainnet** | Release gate not satisfied | Not currently verified for live escrow or real-funds use. |

---

## Known Limitations

1. **Single reviewer key:** The contract uses one global reviewer address. In production this should be a multi-sig or a governance-controlled DAO. Losing the reviewer key permanently blocks milestone approvals.
2. **No IPFS/Arweave storage:** Evidence URIs are stored as plain strings in contract events. Off-chain storage (IPFS, Arweave) is required for truly immutable evidence — currently the app stores metadata URIs as JSON strings onchain.
3. **No milestone editing after creation:** Once `addMilestone` is called, the milestone title and target amount are fixed. There is no `updateMilestone` function.
4. **No dispute mechanism:** The reviewer's decision is final. There is no on-chain appeals process.
5. **`claimRefund` is proportional to contributions, not to remaining balance:** If previous milestone payouts reduced the campaign balance below the total contributed, refunds are partial. This is documented in the UI.
6. **Arc Studio deployer daily limit:** The Arc Studio managed deployer wallet hit its daily USDC gas cap. Deploy manually as described above.

---

## Security Considerations

- The contract has not been independently audited. Do not use it with real funds.
- Three automated audit passes (rule-corpus + functional auditor) were completed during development and their findings were addressed.
- Key invariants verified by Foundry fuzz tests: `campaignBalance[id]` never exceeds `totalContributed[id]`; the contract USDC balance always covers the sum of all campaign balances.
- CEI pattern and `ReentrancyGuard` are applied consistently.
- No `emergencyWithdraw` — the owner cannot drain funds.
- Frontend role checks are UX hints only. The contract is the source of truth for all access control.

---

## Current Deployment Status

| Item | Status |
|---|---|
| Contract source | ✅ Complete |
| Foundry tests (84/84) | ✅ Passing |
| Arc Testnet deployment | ❌ Blocked — deployer wallet gas cap |
| Frontend (DEMO mode) | ✅ Fully functional |
| Frontend (Testnet mode) | ⚠️ Wired — requires deployed contract |
| Mainnet | ❌ Not applicable |

---

## Project Structure

```
├── contracts/
│   ├── ClearFundEscrow.sol          # Main escrow contract
│   ├── test/ClearFundEscrow.t.sol   # 84 Foundry tests
│   └── test-helpers/MockERC20.sol   # 6-decimal mock USDC for tests
├── src/
│   ├── components/                  # Reusable UI components
│   ├── hooks/                       # wagmi/onchain hooks
│   ├── lib/                         # ABI, contract config
│   ├── pages/                       # Full page components
│   ├── data/sampleData.ts           # DEMO campaign data + types
│   └── config.ts                    # wagmi Arc Testnet config
├── docs/                            # Phase reports
├── env.example                      # Environment variable template
└── foundry.toml                     # Foundry project config
```

---

## Built With

- [Arc](https://docs.arc.io) — Layer-1 blockchain with USDC as native gas
- [Circle USDC](https://developers.circle.com/stablecoins/what-is-usdc) — Stablecoin infrastructure
- [Arc Studio](https://studio.arc.io) — AI-powered onchain app builder
- [OpenZeppelin Contracts v5](https://openzeppelin.com/contracts/) — Audited smart contract libraries
- [Foundry](https://getfoundry.sh) — Smart contract testing framework
- [wagmi v2](https://wagmi.sh) + [ConnectKit](https://docs.family.co/connectkit) — React wallet connection
