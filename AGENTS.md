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

## Phase 1 Status (contract — NOT DEPLOYED)

- Contract: `contracts/ClearFundEscrow.sol`
- Deployed address: NOT YET DEPLOYED (update after Phase 2 deploy)
- Chain: Arc Testnet (Chain ID 5042002) — target for Phase 2
- USDC: `0x3600000000000000000000000000000000000000` (Arc Testnet, 6 decimals)
- Env var to add after deploy: `VITE_CLEARFUND_ESCROW_ADDRESS=0x<address>`

## Contract Constructor Args (for deploy)

```
usdcToken:        0x3600000000000000000000000000000000000000
initialReviewer:  <reviewer wallet address — must be set before deploy>
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
