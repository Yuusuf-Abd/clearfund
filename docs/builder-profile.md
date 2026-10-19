# Builder Profile — Yusuf Abdulmatin

> Use this as the basis for your DoraHacks builder profile, GitHub bio, and competition submission.
> Edit to match your own voice. Only include credentials you can verify.

---

## Name

Yusuf Abdulmatin

---

## GitHub

https://github.com/Yuusuf-Abd

---

## One-Line Bio

Frontend developer and smart contract builder. Created ClearFund — a milestone-based USDC escrow platform on Arc — to bring verifiable accountability to crowdfunding.

---

## Short Profile (for DoraHacks submission)

I'm a frontend developer with a focus on practical, user-facing technology. I built ClearFund as my first full-stack blockchain project, writing the Solidity smart contract, React frontend, and Foundry test suite from scratch using Arc Studio.

ClearFund addresses a problem I find genuinely important: traditional crowdfunding gives backers no guarantee their funds are used as promised. The solution — milestone-locked USDC escrow with on-chain reviewer approval — is simple in concept but requires getting the security and UX details right. That's what this project is about.

During development I went through three automated security audit cycles, fixed a fund-lock vulnerability (cancelling a campaign with approved milestones), added invariant tests covering 128,000 fuzzing calls per invariant, and built a strict campaign ID parser to prevent frontend code from silently targeting the wrong onchain campaign. I care about correctness as much as functionality.

**What I built on ClearFund:**
- `ClearFundEscrow.sol` — 527-line Solidity 0.8.28 escrow contract with CEI pattern, ReentrancyGuard, SafeERC20, per-campaign balance accounting, and MAX_MILESTONES cap
- 84 Foundry tests (82 unit + 2 invariant, 256 runs × 128,000 calls each, 0 failures)
- React 18 + TypeScript + Vite frontend (7 pages, 3 operating modes)
- wagmi v2 + viem + ConnectKit for Arc Testnet wallet integration
- Full transaction status machine with 5 states and honest error reporting
- Responsive, accessible dark-navy design from 320px to 1920px

**Tech stack:** Solidity, React, TypeScript, Vite, wagmi v2, viem, Foundry, Tailwind CSS, Arc Studio.

---

## Extended Profile (optional — for personal website or LinkedIn)

Frontend developer and problem-solver interested in the intersection of practical UX and blockchain accountability. I approach engineering as a craft: systems should be correct before they are clever, and honest before they are impressive.

**ClearFund** (2026) is my most complete project to date — a full-stack Web3 application built over five structured engineering phases:

- Phase 1: React frontend architecture + Solidity contract first draft
- Phase 2: Security audit + fund-lock fixes + pull-pattern refunds
- Phase 3: Contract integration layer (14 React hooks, 5-state tx machine)
- Phase 4: Onchain event indexing, contribution flow, ProofCenter wiring
- Phase 5: Responsive design audit, campaign ID safety, wrong-network detection, competition preparation

The project demonstrates a disciplined approach to building onchain applications: no shortcuts on security, honest documentation of limitations, and automated tests before deployment.

---

## What I'm Looking to Do Next

- Deploy ClearFund to Arc Mainnet with a multi-sig reviewer and owner setup
- Add IPFS/Arweave evidence storage for truly immutable milestone records
- Explore per-campaign reviewer addresses to reduce centralisation
- Contribute to public goods tooling in the Arc and Circle ecosystem

---

## Contact

- GitHub: https://github.com/Yuusuf-Abd
- `[Add LinkedIn / Twitter / Discord if you want]`

---

> **Note:** This profile is prepared as a template. Review and edit before publishing. Do not add credentials, roles, or achievements that are not accurate.
