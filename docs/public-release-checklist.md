# ClearFund — Public Release Checklist

**Project:** ClearFund — Fund with clarity. Release with accountability.
**Live app:** https://clearfund-five.vercel.app/
**GitHub:** https://github.com/Yuusuf-Abd/clearfund
**Last updated:** 2026-10-18

Use this checklist before making the GitHub repository public and before submitting to any competition or publishing links.

---

## A. Code Quality and Safety

- [x] TypeScript: 0 errors (`tsc --noEmit`)
- [x] Lint: 0 errors, 0 warnings (`oxlint src`)
- [x] Production build succeeds (`bun run build`)
- [x] Foundry tests: 84/84 pass (`forge test`)
- [x] Vitest unit tests: 24/24 pass (`bunx vitest run`)
- [x] No private keys or secrets in any source file
- [x] `.env` is in `.gitignore`
- [x] `contracts/out/` (compiled artifacts) is in `.gitignore`
- [x] `*.jsonl` runtime capture files are in `.gitignore`
- [x] `node_modules/` is in `.gitignore`
- [x] `dist/` (build output) is in `.gitignore`
- [x] `scripts/self-deploy.ts` reads credentials from `process.env` only — no hardcoded secrets

---

## B. Repository Structure

- [x] `contracts/ClearFundEscrow.sol` — complete, compiles clean
- [x] `contracts/test/ClearFundEscrow.t.sol` — 84 tests
- [x] `contracts/test-helpers/MockERC20.sol` — test mock only, clearly named
- [x] `src/` — full React frontend source
- [x] `docs/` — phase reports, competition docs, video guide, submission package
- [x] `README.md` — comprehensive, accurate test counts, no fabricated claims
- [x] `LICENSE` — MIT, 2026 Yusuf Abdulmatin
- [x] `env.example` — no secrets, correct placeholder format
- [x] `foundry.toml` — correct remappings and lib paths
- [x] `package.json` — `build`, `preview`, `start`, `check`, `test` scripts
- [x] `vercel.json` — SPA rewrite configured
- [x] `netlify.toml` — SPA redirect configured

---

## C. Documentation Accuracy

- [x] README test count matches actual (84)
- [x] README deployment section describes manual `forge create` path (Arc Studio deployer blocked)
- [x] README DEMO/Testnet/Mainnet table is accurate
- [x] README Known Limitations section is complete and honest
- [x] README Security Considerations says "not independently audited"
- [x] `env.example` RPC proxy variables explained correctly
- [x] `docs/submission-package.md` — public app URL confirmed (https://clearfund-five.vercel.app/)
- [ ] `docs/submission-package.md` — Arc Studio project URL: **PENDING** (generate share link)
- [ ] `docs/submission-package.md` — contract address: **PENDING** (deploy first)
- [ ] `docs/submission-package.md` — video URL: **PENDING** (record first)

---

## D. GitHub Repository

- [x] Repository exists at https://github.com/Yuusuf-Abd/clearfund
- [ ] **Repository visibility is set to Public** — verify in GitHub Settings → General → Visibility `[MUST CONFIRM MANUALLY]`
- [ ] GitHub repository description set: "Milestone-based USDC crowdfunding on Arc. Escrow-locked funds released only after on-chain reviewer approval."
- [ ] GitHub repository topics set: `arc`, `usdc`, `solidity`, `crowdfunding`, `escrow`, `defi`, `foundry`, `react`, `vite`, `wagmi`
- [ ] GitHub repository website set: https://clearfund-five.vercel.app/
- [ ] GitHub profile bio updated (see `docs/builder-profile.md`)

---

## E. Deployment Configuration

- [x] Vercel deployment live: https://clearfund-five.vercel.app/
- [x] Vercel `vercel.json` — SPA rewrite: `/* → /index.html`
- [x] App starts in DEMO mode when `VITE_CLEARFUND_ESCROW_ADDRESS` is not set
- [x] No wallet required in DEMO mode
- [x] All DEMO data is labeled (DEMO badges, ContractModeBanner)
- [ ] **After contract deployment:** set `VITE_CLEARFUND_ESCROW_ADDRESS` in Vercel Environment Variables
- [ ] **After contract deployment:** set `VITE_CLEARFUND_DEPLOY_BLOCK` in Vercel Environment Variables
- [ ] Redeploy Vercel after setting env vars

---

## F. Smart Contract Deployment Readiness

> These steps require YOUR OWN wallet and cannot be completed within Arc Studio's managed deployer (daily gas policy hit).

- [x] Contract source complete and compiles: `forge build`
- [x] All 84 tests pass: `forge test`
- [x] No `emergencyWithdraw` function (removed — owner cannot drain funds)
- [x] `MAX_MILESTONES = 50` enforced
- [x] `cancelCampaign` blocked by Approved milestones (fund-lock prevention)
- [x] Constructor arguments documented: `(address usdcToken, address reviewer)`
- [ ] Decide on reviewer address — **strongly recommended: use a Gnosis Safe multi-sig**
- [ ] Decide on deployer wallet — must hold USDC for Arc gas
- [ ] Arc Testnet deployment (optional but recommended before mainnet):
  - [ ] Fund deployer wallet with Arc Testnet USDC from https://faucet.circle.com
  - [ ] Run: `forge create contracts/ClearFundEscrow.sol:ClearFundEscrow --rpc-url https://rpc.testnet.arc.io --private-key $PRIVATE_KEY --constructor-args $USDC $REVIEWER`
  - [ ] Record deployed address and deployment block number
  - [ ] Test: createCampaign → contribute → submitEvidence → approveMilestone → releaseMilestone
- [ ] Arc Mainnet deployment:
  - [ ] **WARNING:** Mainnet uses real USDC. Obtain an independent security audit before holding real funds.
  - [ ] Fund deployer wallet with mainnet USDC for gas (Arc: USDC is the gas token)
  - [ ] Run `forge create` with mainnet RPC: `https://rpc.arc.io`
  - [ ] Record transaction hash and deployment block from `forge create` output
  - [ ] Record at least one USDC-moving transaction (contribute or releaseMilestone) for competition evidence

---

## G. Competition Submission

- [ ] Arc Studio project URL generated (share link from Arc Studio)
- [ ] Demo video recorded (follow `docs/final-video-production.md`)
- [ ] Video uploaded to YouTube or Loom — URL obtained
- [ ] DoraHacks project description submitted (use `docs/dorahacks-project-description.md`)
- [ ] All placeholders in `docs/submission-package.md` filled
- [ ] Builder profile complete on DoraHacks (use `docs/builder-profile.md`)
- [ ] Submission submitted before competition deadline

---

## H. Outstanding Blockers (cannot be resolved in Arc Studio)

| Blocker | Root cause | Resolution |
|---------|------------|------------|
| Contract deployment | Arc Studio managed deployer hit daily gas policy | Deploy from own wallet via `forge create` |
| Arc Mainnet USDC transaction | Requires deployed contract | Complete contract deployment first |
| Competition tx evidence | Requires mainnet contract + real USDC | Complete mainnet deployment first |
| Arc Studio project URL | Share link generated from Arc Studio UI | Go to project menu → Share |
| Demo video | Not recorded | Follow `docs/final-video-production.md` |
| GitHub visibility | Must be set manually | GitHub Settings → General → Visibility → Public |

---

## Summary Status

| Category | Status |
|----------|--------|
| Code quality | ✅ All checks pass |
| Security (automated) | ✅ 3 audit passes, findings addressed |
| Independent audit | ❌ Not done — required before real funds |
| Foundry tests | ✅ 84/84 pass |
| Frontend (DEMO) | ✅ Live and working |
| Frontend (Testnet) | ⚠️ Ready — needs deployed contract |
| GitHub repo | ⚠️ Exists — confirm public visibility |
| LICENSE | ✅ MIT added |
| Vercel deployment | ✅ Live |
| Contract deployment | ❌ Blocked — manual deployment required |
| Competition video | ❌ Not recorded |
| Submission complete | ❌ Multiple fields pending |
