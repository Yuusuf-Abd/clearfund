# ClearFund — Proof-Based Funding on Arc

> "Fund with clarity. Release with accountability."
> Built with Arc Studio for the Arc Microgrants: Built with Arc Studio competition.

This is the **project memory** — what Arc Studio remembers about building this app.

---

## What This App Does

ClearFund is a transparent milestone-based group funding platform on Arc. Supporters contribute USDC to campaigns. Funds are held in a smart contract escrow and released to recipients only when a designated reviewer approves each milestone. Every step is evidenced and recorded on-chain.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` — Router + store wiring
- `src/hooks/useCampaigns.ts` — All campaign/milestone/evidence state + localStorage persistence
- `src/data/sampleData.ts` — TypeScript types + DEMO sample campaigns
- `src/components/` — Nav, CampaignCard, Select, Badge, ProgressBar, DemoBadge
- `src/pages/` — Landing, Dashboard, CreateCampaign, CampaignDetails, ProofCenter, TxExplorer
- `src/config.ts` — wagmi config (Arc Testnet + mainnet for ENS)
- `contracts/ClearFundEscrow.sol` — Phase 2 security-corrected escrow contract (NOT YET DEPLOYED)
- `contracts/test/ClearFundEscrow.t.sol` — 79 Foundry tests (all passing, Phase 3 added 15)
- `src/lib/clearfundContract.ts` — Contract ABI, address env var, MilestoneStatus enum
- `src/hooks/useClearFund.ts` — All wagmi/viem hooks: reads, writes, tx state machine
- `src/components/TxStatusBadge.tsx` — 5-state tx status indicator
- `src/components/ContractModeBanner.tsx` — DEMO / Arc Testnet mode banner
- `src/pages/ReviewerDashboard.tsx` — Reviewer interface (DEMO + testnet-ready)
- `docs/phase1-contract-report.md` — Phase 1 contract documentation
- `docs/phase2-security-report.md` — Phase 2 security corrections report
- `docs/phase3-integration-report.md` — Phase 3 integration documentation

## Onchain config (Phase 4 — NOT YET SET)
- Set VITE_CLEARFUND_ESCROW_ADDRESS=0x<deployed_address> after deploy
- Set VITE_CLEARFUND_DEPLOY_BLOCK=<block_number> for efficient indexing
- Restart dev server after editing .env (Vite reads env at startup only)

## Phase 4 new files
- `src/hooks/useContractCampaigns.ts` — event-driven indexer (CampaignCreated scan)
- `src/components/ContributePanel.tsx` — USDC contribution widget (testnet only)
- `docs/phase4-integration-report.md` — Phase 4 documentation

## Contract Deployment Status — LIVE on Arc Testnet

| Field | Value |
|-------|-------|
| Contract | `contracts/ClearFundEscrow.sol` |
| **Address** | **`0x3cfce9ad713a72ecd0a9f1199664fea8b4de209e`** |
| **Deploy tx** | **`0x179fc72ff5cd0106e933957708d26a3affb1d4279497374a479d01718fe0d98f`** |
| Deploy block | `68143548` |
| Chain | Arc Testnet (Chain ID 5042002) |
| Explorer | https://explorer.testnet.arc.io/address/0x3cfce9ad713a72ecd0a9f1199664fea8b4de209e |
| Tx explorer | https://explorer.testnet.arc.io/tx/0x179fc72ff5cd0106e933957708d26a3affb1d4279497374a479d01718fe0d98f |
| USDC | `0x3600000000000000000000000000000000000000` (6 decimals) |
| Reviewer | `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42` |
| Owner | `0xa3039A54856ed74B5AEc999EeF3fc954Ab010Cf6` |
| Deployed | 2026-10-19T11:44:38.168Z |

**Active env vars (set in `.env`):**
```
VITE_CLEARFUND_ESCROW_ADDRESS=0x3cfce9ad713a72ecd0a9f1199664fea8b4de209e
VITE_CLEARFUND_DEPLOY_BLOCK=68143548
```

**To activate on Vercel:** Settings → Environment Variables → add both vars above → redeploy.

## Contract Constructor Args

```
usdcToken:        0x3600000000000000000000000000000000000000
initialReviewer:  0x5B12Ce46C7194aD57d143bC22847224047b1Ef42
```

## To Run

```bash
bun install
bun run dev

# Build contracts
bun run contracts:build   # forge build

# Run contract tests
bun run contracts:test    # forge test
```
