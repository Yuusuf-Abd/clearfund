# ClearFund reviewer governance and threat model

**Status:** Design review only. Not an audit or Mainnet deployment evidence.

## Current trust model

The escrow has one global reviewer. Only that address can approve completed milestones or revoke approvals. The contract owner can rotate the reviewer via `setReviewer`. Organizers submit evidence and release approved milestones. Contributors fund active campaigns and claim refunds after cancellation.

Reviewer approval authorizes, but does not automatically execute, a payout. The organizer separately calls `releaseMilestone`.

## Threats and remaining risks

| Threat | Current control | Residual risk |
| --- | --- | --- |
| Reviewer key compromised | Owner can rotate reviewer | Already Approved milestones remain approved after rotation |
| Owner key compromised | Only owner can set reviewer | Attacker can appoint malicious reviewer |
| Organizer/reviewer collusion | Approval and release require different roles | Collusion can authorize improper payouts |
| Evidence changes | Edits rejected in Approved/Paid states | Linked offchain content might itself change |
| Cancellation after payout | Cancellation blocked after any payout | No closure or dispute route for partially paid campaigns |
| Reviewer unavailable | Owner can rotate reviewer | No independent fallback if owner also unavailable |

## Decisions required before custody of real funds

1. Define who controls owner and reviewer addresses, preferably independently governed multisignature wallets.
2. Define conflict-of-interest rules between campaign organizers and reviewers.
3. On suspected reviewer compromise, inspect and revoke suspicious outstanding approvals. Rotation **does not** invalidate approvals already granted.
4. Require immutable or content-addressed evidence and a human verification record.
5. Specify a dispute, abandonment, and partially paid campaign policy; the current contract has no general-purpose resolution mechanism.
6. Monitor `ReviewerSet`, `MilestoneApproved`, `ApprovalRevoked`, `MilestoneReleased`, and `CampaignCancelled` events.
7. Require independent security review before any real-funds use.

## Nonfinancial validation

- [x] Automated tests cover reviewer rotation and unauthorized reviewer changes.
- [x] Automated tests cover evidence lock and cancellation after payout.
- [ ] Test that existing Approved milestones persist across reviewer rotation and can be revoked by the replacement reviewer.
- [ ] Independently review the role and key-compromise threat model.
- [ ] Verify event monitoring and incident response in a controlled test environment.

Passing tests does not establish deployed Mainnet state or production safety.
