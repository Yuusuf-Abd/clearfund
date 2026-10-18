# ClearFund — Competition Requirements Traceability Matrix

**Competition:** Arc Microgrants: Built with Arc Studio
**Project:** ClearFund — Fund with clarity. Release with accountability.
**Repository:** https://github.com/Yuusuf-Abd/clearfund
**Date:** 2026-10-18

---

## Requirements Matrix

### R01 — Solidity contracts authored using Arc Studio

| Field | Value |
|-------|-------|
| **Status** | PASS |
| **Evidence required** | Solidity source file(s) authored within Arc Studio workspace |
| **Evidence available** | `contracts/ClearFundEscrow.sol` (314 lines, Solidity 0.8.28) authored and iteratively refined across Phases 1–5.5 entirely within this Arc Studio project |
| **Files** | `contracts/ClearFundEscrow.sol` |
| **Remaining work** | None |
| **Responsible party** | Builder |
| **External action required** | No |

---

### R02 — Solidity contracts tested using Arc Studio

| Field | Value |
|-------|-------|
| **Status** | PASS |
| **Evidence required** | Test files authored in Arc Studio; test run output |
| **Evidence available** | `contracts/test/ClearFundEscrow.t.sol` — 84 Foundry tests (82 unit + 2 invariant), all passing. Run: `forge test` → `84 passed; 0 failed`. Fuzz tests included (`testFuzz_*`, 3 fuzz functions). Invariant tests: 256 runs × 128,000 calls each. |
| **Files** | `contracts/test/ClearFundEscrow.t.sol`, `contracts/test-helpers/MockERC20.sol` |
| **Remaining work** | None |
| **Responsible party** | Builder |
| **External action required** | No |

---

### R03 — Contracts deployed to Arc Mainnet

| Field | Value |
|-------|-------|
| **Status** | BLOCKED |
| **Evidence required** | Verified contract address on Arc Mainnet (chain ID 5042), deployment transaction hash, Blockscout verification |
| **Evidence available** | None. Arc Testnet deployment was also blocked (deployer wallet daily gas cap). No mainnet deployment has been attempted. |
| **Files** | `contracts/ClearFundEscrow.sol`, `foundry.toml` |
| **Remaining work** | 1. Obtain Arc Mainnet USDC (bridge via CCTP or purchase). 2. Deploy with your own wallet: `forge create contracts/ClearFundEscrow.sol:ClearFundEscrow --constructor-args <USDC_ADDR> <REVIEWER_ADDR> --rpc-url https://rpc.mainnet.arc.io --private-key <KEY>`. 3. Verify on explorer.arc.io. 4. Set `VITE_CLEARFUND_ESCROW_ADDRESS` in production env. |
| **Responsible party** | Builder (requires own wallet + mainnet USDC for gas) |
| **External action required** | Yes — mainnet deployment requires the builder's own wallet credentials and must be performed outside Arc Studio |

---

### R04 — Working public application built using Arc Studio

| Field | Value |
|-------|-------|
| **Status** | PARTIAL |
| **Evidence required** | Publicly accessible URL of the deployed frontend |
| **Evidence available** | Application is fully built in Arc Studio (React/Vite/TypeScript, all pages complete, production build passes). Not yet publicly deployed — no hosting integration connected. |
| **Files** | `src/` (all pages and components), `package.json` (`build`/`start` scripts ready), `vercel.json`, `netlify.toml` |
| **Remaining work** | Connect Netlify, Vercel, or Hugging Face in Arc Studio Integrations and deploy. |
| **Responsible party** | Builder |
| **External action required** | Yes — connect a hosting account via the Arc Studio Integrations menu |

---

### R05 — Public application connected to deployed contracts

| Field | Value |
|-------|-------|
| **Status** | BLOCKED (depends on R03 and R04) |
| **Evidence required** | Live public URL showing the app in Arc Testnet/Mainnet mode, connected to a deployed contract |
| **Evidence available** | Connection logic is fully implemented: `src/lib/clearfundContract.ts`, `src/hooks/useClearFund.ts` (14 hooks), `src/hooks/useContractCampaigns.ts` (event indexer). App activates testnet mode automatically when `VITE_CLEARFUND_ESCROW_ADDRESS` is set. |
| **Files** | `src/lib/clearfundContract.ts`, `src/hooks/useClearFund.ts`, `.env` (deploy address placeholder) |
| **Remaining work** | Deploy contract (R03), set env var in hosting platform, redeploy frontend (R04). |
| **Responsible party** | Builder |
| **External action required** | Yes — requires contract deployment and hosting configuration |

---

### R06 — Genuine Arc Mainnet USDC-moving transaction

| Field | Value |
|-------|-------|
| **Status** | NOT STARTED |
| **Evidence required** | Transaction hash of a `contribute()` or `releaseMilestone()` call on Arc Mainnet with verified USDC movement |
| **Evidence available** | None. No mainnet deployment exists. |
| **Files** | N/A |
| **Remaining work** | After R03 and R05: connect wallet with USDC, call `contribute()` on a live campaign, record the tx hash from explorer.arc.io |
| **Responsible party** | Builder |
| **External action required** | Yes — requires mainnet deployment and real USDC |

---

### R07 — Valid Arc Mainnet contract addresses

| Field | Value |
|-------|-------|
| **Status** | NOT STARTED |
| **Evidence required** | `0x...` address of `ClearFundEscrow` deployed on Arc Mainnet (chain ID 5042) |
| **Evidence available** | None |
| **Files** | `AGENTS.md` (placeholder), `.env` (placeholder) |
| **Remaining work** | Complete R03 |
| **Responsible party** | Builder |
| **External action required** | Yes |

---

### R08 — Valid explorer.arc.io transaction evidence

| Field | Value |
|-------|-------|
| **Status** | NOT STARTED |
| **Evidence required** | Public explorer.arc.io URL for at least one USDC-moving transaction |
| **Evidence available** | None. Arc Testnet explorer URL pattern is implemented: `https://explorer.testnet.arc.io/tx/<hash>` |
| **Files** | `src/hooks/useClearFund.ts` (`arcTestnetExplorerUrl`), `src/pages/TxExplorer.tsx` |
| **Remaining work** | Complete R06. Explorer links auto-generate from tx hashes in the Transaction Explorer page. |
| **Responsible party** | Builder |
| **External action required** | Yes |

---

### R09 — Public GitHub repository

| Field | Value |
|-------|-------|
| **Status** | PARTIAL |
| **Evidence required** | Public GitHub URL with frontend source, contracts, tests, and documentation |
| **Evidence available** | Repository exists at https://github.com/Yuusuf-Abd/clearfund (referenced in project files). Not confirmed public or up-to-date from Arc Studio. `.gitignore`, `README.md`, `env.example` are all in place. |
| **Files** | `.gitignore`, `README.md`, `env.example`, all source files |
| **Remaining work** | Push latest code: `git add -A && git commit -m "Phase 5.5 hardening" && git push`. Confirm repo is public on GitHub. |
| **Responsible party** | Builder |
| **External action required** | Yes — git push from local or Arc Studio GitHub integration |

---

### R10 — Public Arc Studio project URL

| Field | Value |
|-------|-------|
| **Status** | PARTIAL |
| **Evidence required** | Shareable Arc Studio project URL |
| **Evidence available** | Project exists in Arc Studio. Public sharing URL depends on Arc Studio's sharing feature (not confirmed available in this session). |
| **Files** | N/A |
| **Remaining work** | Locate the "Share project" option in Arc Studio and generate a public link, or confirm the project is visible via the competition submission form's Arc Studio project field. |
| **Responsible party** | Builder |
| **External action required** | Yes — Arc Studio UI action |

---

### R11 — Video showing Arc Studio development

| Field | Value |
|-------|-------|
| **Status** | NOT STARTED |
| **Evidence required** | Screen recording showing Arc Studio workspace, contract writing, and testing |
| **Evidence available** | `docs/final-video-production.md` (recording plan and script) |
| **Files** | `docs/final-video-production.md`, `docs/demo-script.md` |
| **Remaining work** | Record the video following the script. Upload to YouTube or similar. |
| **Responsible party** | Builder |
| **External action required** | Yes — screen recording and upload |

---

### R12 — Video demonstrating verified blockchain activity

| Field | Value |
|-------|-------|
| **Status** | BLOCKED (depends on R03, R06) |
| **Evidence required** | Video clip showing a real contract interaction on Arc (transaction hash visible, explorer confirmed) |
| **Evidence available** | None — no contract deployed |
| **Files** | `docs/final-video-production.md` (section 9 marked BLOCKED until mainnet evidence available) |
| **Remaining work** | Complete R03 and R06, then record that portion of the video |
| **Responsible party** | Builder |
| **External action required** | Yes |

---

### R13 — Complete project description

| Field | Value |
|-------|-------|
| **Status** | PASS |
| **Evidence required** | Detailed project description suitable for submission form |
| **Evidence available** | `README.md` (full description, architecture, usage). `docs/submission-package.md` (pre-filled description fields). |
| **Files** | `README.md`, `docs/submission-package.md` |
| **Remaining work** | None — copy from `docs/submission-package.md` into the submission form |
| **Responsible party** | Builder |
| **External action required** | No |

---

### R14 — Public builder profile

| Field | Value |
|-------|-------|
| **Status** | NOT STARTED |
| **Evidence required** | Public profile URL (GitHub, LinkedIn, or competition platform) |
| **Evidence available** | GitHub account implied by repository ownership (Yuusuf-Abd). |
| **Files** | N/A |
| **Remaining work** | Confirm GitHub profile is public at https://github.com/Yuusuf-Abd. Ensure it has a name/bio. |
| **Responsible party** | Builder |
| **External action required** | Yes — GitHub profile settings |

---

### R15 — Submission completed before deadline

| Field | Value |
|-------|-------|
| **Status** | NOT STARTED |
| **Evidence required** | Submission confirmation from the competition platform |
| **Evidence available** | All content ready except R03/R06/R07/R08 (mainnet deployment and transactions) |
| **Files** | `docs/submission-package.md` |
| **Remaining work** | Complete R03 → R04 → R06 → R07 → R08 → R09 → R10 → R11/R12 → submit |
| **Responsible party** | Builder |
| **External action required** | Yes |

---

## Summary

| Status | Count | Requirements |
|--------|-------|-------------|
| PASS | 4 | R01, R02, R13 (+ test evidence for R02) |
| PARTIAL | 3 | R04, R09, R10 |
| BLOCKED | 4 | R03, R05, R06, R12 |
| NOT STARTED | 4 | R06, R07, R11, R14, R15 |

**Critical path:** R03 (mainnet deploy) unblocks R05, R06, R07, R08, and R12.
R04 (public deployment) and R09 (GitHub push) are independent and can be done now.
