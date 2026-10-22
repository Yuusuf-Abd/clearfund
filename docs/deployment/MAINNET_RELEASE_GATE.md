# ClearFund — Arc Mainnet release gate

**Status:** Not authorized for production release. A successful frontend build does not prove Mainnet connectivity or funds movement.

## Verified in GitHub Actions

- [x] TypeScript and frontend lint checks
- [x] Frontend Vitest tests (44 passed on commit 8ffc79b)
- [x] Foundry Solidity tests (82 standard tests and 1 invariant suite passed on commit 8ffc79b)
- [x] Mainnet-configured frontend production build
- [x] GitHub Actions run #8 on commit `3dc7921`: 44/44 Vitest, 82/82 Foundry tests, 1 invariant suite, TypeScript, lint, and production build passed

## Evidence required before promoting to production

- [x] User confirmed Vercel Production variable `VITE_CLEARFUND_CHAIN=mainnet` was added on 2026-10-22 (value entered as `mainnet`; saved successfully)
- [ ] Obtain a deployed Arc Mainnet escrow address and independently verify its code, constructor parameters, and reviewer governance on https://explorer.arc.io/
- [ ] **BLOCKED:** Vercel Production `VITE_CLEARFUND_ESCROW_ADDRESS` still points to historical Testnet address `0x3cfce9ad713a72ecd0a9f1199664fea8b4de209e`; replace only after verified Mainnet deployment
- [ ] **BLOCKED:** Vercel Production `VITE_CLEARFUND_DEPLOY_BLOCK` is still historical Testnet block `68143548`; replace only after verified Mainnet deployment
- [ ] Verify the production site is publicly accessible without a Vercel login
- [ ] Confirm production UI clearly distinguishes sample/demo records from verified Mainnet transactions
- [ ] Independently inspect an actual Mainnet transaction receipt involving the deployed escrow and USDC before claiming live activity
- [ ] Conduct a security review of reviewer permissions, milestone approval, payout, cancellation, and refund paths
- [ ] Obtain explicit authorization from an eligible account owner before any real-money deployment or transaction

## Known evidence gaps

- The historical address `0x3cfce9ad713a72ecd0a9f1199664fea8b4de209e` is a **Testnet** address, not Mainnet deployment evidence.
- A configured chain ID, transaction-hash-shaped string, or green CI badge does **not** establish a successful Mainnet transaction.
- Vercel's project environment-variable API currently returns 403 for the connected scope. The project owner supplied screenshots confirming variable names and Production scope, and supplied the historical escrow address and deploy block. The `mainnet` value was instructed and saved but cannot be independently inspected through the connected API.
- GitHub PR #1 contains code and test-gate changes, but is not a substitute for onchain verification.

## Safe release sequence

1. Review and merge code only after CI and security review.
2. Vercel Production network variable is configured, but the escrow address and deployment block are still Testnet values. Do not redeploy or present the app as Mainnet-connected until the Mainnet deployment is independently verified and both values are corrected.
3. Independently verify the Mainnet contract and deployment metadata.
4. Verify the public application and its read-only Mainnet views.
5. Separately document independently verified transaction evidence if available.
