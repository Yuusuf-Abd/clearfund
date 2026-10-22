// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ClearFundEscrow} from "../ClearFundEscrow.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Invariant handler — drives random operations so the fuzzer can explore
// multi-step state transitions for the two invariants.
// ─────────────────────────────────────────────────────────────────────────────
contract EscrowHandler is Test {
    ClearFundEscrow public escrow;
    MockERC20       public usdc;

    address internal organizer;
    address internal reviewer;
    address internal recipient;
    address internal contributor;

    uint256 public campaignId;
    bool    public campaignCreated;

    // Ghost: sum of all contributions made through this handler
    uint256 public ghostTotalContributed;

    constructor(
        ClearFundEscrow _escrow,
        MockERC20       _usdc,
        address         _organizer,
        address         _reviewer,
        address         _recipient,
        address         _contributor
    ) {
        escrow      = _escrow;
        usdc        = _usdc;
        organizer   = _organizer;
        reviewer    = _reviewer;
        recipient   = _recipient;
        contributor = _contributor;
    }

    function createCampaign() external {
        if (campaignCreated) return;
        vm.prank(organizer);
        campaignId     = escrow.createCampaign(recipient, 1_000_000e6, "uri");
        campaignCreated = true;
    }

    function contribute(uint256 amount) external {
        if (!campaignCreated) return;
        amount = bound(amount, 1, 10_000e6);

        usdc.mint(contributor, amount);
        vm.startPrank(contributor);
        usdc.approve(address(escrow), amount);
        escrow.contribute(campaignId, amount);
        vm.stopPrank();

        ghostTotalContributed += amount;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main test contract
// ─────────────────────────────────────────────────────────────────────────────
contract ClearFundEscrowTest is Test {

    // ── Actors ──────────────────────────────────────────────────────────────
    address internal owner      = makeAddr("owner");
    address internal organizer  = makeAddr("organizer");
    address internal reviewer   = makeAddr("reviewer");
    address internal recipient  = makeAddr("recipient");
    address internal alice      = makeAddr("alice");    // contributor
    address internal bob        = makeAddr("bob");      // second contributor / wrong caller

    // ── Contracts ───────────────────────────────────────────────────────────
    MockERC20       internal usdc;
    ClearFundEscrow internal escrow;

    // ── Constants ───────────────────────────────────────────────────────────
    uint256 internal constant TARGET      = 500_000e6;  // 500 000 USDC
    uint256 internal constant MILESTONE_A = 100_000e6;  // 100 000 USDC
    uint256 internal constant MILESTONE_B = 200_000e6;  // 200 000 USDC
    uint256 internal constant CONTRIB     = 300_000e6;  // 300 000 USDC

    // ── Setup ────────────────────────────────────────────────────────────────
    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);

        vm.prank(owner);
        escrow = new ClearFundEscrow(address(usdc), reviewer);

        usdc.mint(alice, 10_000_000e6);
        usdc.mint(bob,   10_000_000e6);
        vm.prank(alice); usdc.approve(address(escrow), type(uint256).max);
        vm.prank(bob);   usdc.approve(address(escrow), type(uint256).max);
    }

    // ════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════════

    function _createCampaign() internal returns (uint256 id) {
        vm.prank(organizer);
        id = escrow.createCampaign(recipient, TARGET, "uri");
    }

    /// Adds one InProgress milestone and contributes CONTRIB.
    function _setupContributedCampaign() internal returns (uint256 id) {
        id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(alice);     escrow.contribute(id, CONTRIB);
    }

    /// Advances a milestone all the way to Approved.
    function _advanceToApproved(uint256 id, uint256 mIdx) internal {
        vm.prank(organizer); escrow.submitEvidence(id, mIdx, "ipfs://verified-evidence");
        vm.prank(organizer); escrow.markMilestoneComplete(id, mIdx);
        vm.prank(reviewer);  escrow.approveMilestone(id, mIdx);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 1. Deployment & initialisation
    // ════════════════════════════════════════════════════════════════════════

    function test_Deployment_StateVars() public view {
        assertEq(address(escrow.usdcToken()), address(usdc));
        assertEq(escrow.reviewer(), reviewer);
        assertEq(escrow.nextCampaignId(), 0);
        assertEq(escrow.owner(), owner);
    }

    function test_Deployment_RevertsOnZeroUSDC() public {
        vm.prank(owner);
        vm.expectRevert(ClearFundEscrow.ZeroAddress.selector);
        new ClearFundEscrow(address(0), reviewer);
    }

    function test_Deployment_RevertsOnZeroReviewer() public {
        vm.prank(owner);
        vm.expectRevert(ClearFundEscrow.ZeroAddress.selector);
        new ClearFundEscrow(address(usdc), address(0));
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. createCampaign
    // ════════════════════════════════════════════════════════════════════════

    function test_CreateCampaign_SetsState() public {
        vm.prank(organizer);
        uint256 id = escrow.createCampaign(recipient, TARGET, "ipfs://meta");

        assertEq(id, 0);
        assertEq(escrow.nextCampaignId(), 1);

        (
            address org, address rec, uint256 tgt, string memory uri,
            uint256 totalContrib, uint256 totalPaid, bool active,
            uint256 mCount, uint256 totalAllocated
        ) = escrow.campaigns(0);

        assertEq(org, organizer);
        assertEq(rec, recipient);
        assertEq(tgt, TARGET);
        assertEq(uri, "ipfs://meta");
        assertEq(totalContrib, 0);
        assertEq(totalPaid, 0);
        assertTrue(active);
        assertEq(mCount, 0);
        assertEq(totalAllocated, 0);
    }

    function test_CreateCampaign_RevertsZeroRecipient() public {
        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.ZeroAddress.selector);
        escrow.createCampaign(address(0), TARGET, "uri");
    }

    function test_CreateCampaign_RevertsZeroTarget() public {
        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.ZeroAmount.selector);
        escrow.createCampaign(recipient, 0, "uri");
    }

    function test_CreateCampaign_EmitsCampaignCreated() public {
        vm.prank(organizer);
        vm.expectEmit(true, true, true, true, address(escrow));
        emit ClearFundEscrow.CampaignCreated(0, organizer, recipient, TARGET);
        escrow.createCampaign(recipient, TARGET, "uri");
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. addMilestone
    // ════════════════════════════════════════════════════════════════════════

    function test_AddMilestone_SetsState() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "Milestone 0", MILESTONE_A);

        (
            string memory desc, uint256 amt,
            ClearFundEscrow.MilestoneStatus status,
            string memory evURI, bool paid
        ) = escrow.milestones(id, 0);

        assertEq(desc, "Milestone 0");
        assertEq(amt, MILESTONE_A);
        assertEq(uint256(status), uint256(ClearFundEscrow.MilestoneStatus.InProgress));
        assertEq(evURI, "");
        assertFalse(paid);

        (, , , , , , , uint256 mCount, uint256 totalAllocated) = escrow.campaigns(id);
        assertEq(mCount, 1);
        assertEq(totalAllocated, MILESTONE_A);
    }

    function test_AddMilestone_RevertsNonOrganizer() public {
        uint256 id = _createCampaign();
        vm.prank(bob);
        vm.expectRevert(ClearFundEscrow.NotOrganizer.selector);
        escrow.addMilestone(id, "m", MILESTONE_A);
    }

    function test_AddMilestone_RevertsAllocationExceeded() public {
        uint256 id = _createCampaign();
        vm.startPrank(organizer);
        escrow.addMilestone(id, "m0", MILESTONE_A);
        escrow.addMilestone(id, "m1", MILESTONE_B);
        vm.expectRevert(ClearFundEscrow.MilestoneAllocationExceeded.selector);
        escrow.addMilestone(id, "m2", 300_000e6);
        vm.stopPrank();
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. contribute
    // ════════════════════════════════════════════════════════════════════════

    function test_Contribute_UpdatesBalances() public {
        uint256 id = _createCampaign();
        vm.prank(alice); escrow.contribute(id, CONTRIB);

        assertEq(escrow.campaignBalance(id), CONTRIB);
        assertEq(escrow.contributions(id, alice), CONTRIB);

        (, , , , uint256 totalContrib, , , ,) = escrow.campaigns(id);
        assertEq(totalContrib, CONTRIB);
        assertEq(usdc.balanceOf(address(escrow)), CONTRIB);
    }

    function test_Contribute_RevertsZeroAmount() public {
        uint256 id = _createCampaign();
        vm.prank(alice);
        vm.expectRevert(ClearFundEscrow.ZeroAmount.selector);
        escrow.contribute(id, 0);
    }

    function test_Contribute_RevertsInactiveCampaign() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.cancelCampaign(id);
        vm.prank(alice);
        vm.expectRevert(ClearFundEscrow.CampaignInactive.selector);
        escrow.contribute(id, 1e6);
    }

    function test_Contribute_EmitsContributed() public {
        uint256 id = _createCampaign();
        vm.prank(alice);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit ClearFundEscrow.Contributed(id, alice, CONTRIB);
        escrow.contribute(id, CONTRIB);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. submitEvidence
    // ════════════════════════════════════════════════════════════════════════

    function test_SubmitEvidence_RevertsAfterApproval() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);
        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.EvidenceLockedAfterApproval.selector);
        escrow.submitEvidence(id, 0, "ipfs://tampered");
    }

    function test_SubmitEvidence_RevertsAfterPayment() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);
        vm.prank(organizer);
        escrow.releaseMilestone(id, 0);
        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.EvidenceLockedAfterApproval.selector);
        escrow.submitEvidence(id, 0, "ipfs://tampered");
    }

    function test_SubmitEvidence_EditableAfterReviewerRevokesApproval() public {
        uint256 id = _setupContributedCampaign();
        vm.prank(organizer);
        escrow.submitEvidence(id, 0, "ipfs://original");
        _advanceToApproved(id, 0);

        vm.prank(reviewer);
        escrow.revokeApproval(id, 0);

        vm.prank(organizer);
        escrow.submitEvidence(id, 0, "ipfs://corrected");
        (, , ClearFundEscrow.MilestoneStatus status, string memory evidence,) = escrow.milestones(id, 0);
        assertEq(uint256(status), uint256(ClearFundEscrow.MilestoneStatus.Completed));
        assertEq(evidence, "ipfs://corrected");

        vm.prank(reviewer);
        escrow.approveMilestone(id, 0);
        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.EvidenceLockedAfterApproval.selector);
        escrow.submitEvidence(id, 0, "ipfs://tampered-again");
    }

    function test_SubmitEvidence_SetsURI() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.submitEvidence(id, 0, "ipfs://evidence");

        (, , , string memory evURI,) = escrow.milestones(id, 0);
        assertEq(evURI, "ipfs://evidence");
    }

    function test_SubmitEvidence_RevertsNonOrganizer() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(bob);
        vm.expectRevert(ClearFundEscrow.NotOrganizer.selector);
        escrow.submitEvidence(id, 0, "ipfs://evidence");
    }

    // Evidence submission does NOT change milestone status
    function test_SubmitEvidence_DoesNotChangeStatus() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.submitEvidence(id, 0, "ipfs://evidence");

        (, , ClearFundEscrow.MilestoneStatus status, ,) = escrow.milestones(id, 0);
        assertEq(uint256(status), uint256(ClearFundEscrow.MilestoneStatus.InProgress));
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. markMilestoneComplete
    // ════════════════════════════════════════════════════════════════════════

    function test_MarkMilestoneComplete_SetsStatus() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.markMilestoneComplete(id, 0);

        (, , ClearFundEscrow.MilestoneStatus status, ,) = escrow.milestones(id, 0);
        assertEq(uint256(status), uint256(ClearFundEscrow.MilestoneStatus.Completed));
    }

    function test_MarkMilestoneComplete_RevertsWrongStatus() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.markMilestoneComplete(id, 0); // now Completed

        vm.prank(organizer);
        vm.expectRevert(
            abi.encodeWithSelector(
                ClearFundEscrow.InvalidMilestoneStatus.selector,
                ClearFundEscrow.MilestoneStatus.InProgress,
                ClearFundEscrow.MilestoneStatus.Completed
            )
        );
        escrow.markMilestoneComplete(id, 0);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 7. approveMilestone
    // ════════════════════════════════════════════════════════════════════════

    function test_CancelledCampaign_RejectsMilestoneMutations() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.submitEvidence(id, 0, "ipfs://proof");
        vm.prank(organizer); escrow.markMilestoneComplete(id, 0);
        vm.prank(organizer); escrow.cancelCampaign(id);

        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.CampaignInactive.selector);
        escrow.submitEvidence(id, 0, "ipfs://changed");

        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.CampaignInactive.selector);
        escrow.markMilestoneComplete(id, 0);

        vm.prank(reviewer);
        vm.expectRevert(ClearFundEscrow.CampaignInactive.selector);
        escrow.approveMilestone(id, 0);

        vm.prank(reviewer);
        vm.expectRevert(ClearFundEscrow.CampaignInactive.selector);
        escrow.revokeApproval(id, 0);
    }

    function test_ApproveMilestone_RevertsWithoutEvidence() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.markMilestoneComplete(id, 0);

        vm.prank(reviewer);
        vm.expectRevert(ClearFundEscrow.MissingMilestoneEvidence.selector);
        escrow.approveMilestone(id, 0);

        vm.prank(organizer); escrow.submitEvidence(id, 0, "ipfs://verified-evidence");
        vm.prank(reviewer); escrow.approveMilestone(id, 0);
        (, , ClearFundEscrow.MilestoneStatus status, ,) = escrow.milestones(id, 0);
        assertEq(uint256(status), uint256(ClearFundEscrow.MilestoneStatus.Approved));
    }

    function test_ApproveMilestone_SetsStatus() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.submitEvidence(id, 0, "ipfs://verified-evidence");
        vm.prank(organizer); escrow.markMilestoneComplete(id, 0);
        vm.prank(reviewer);  escrow.approveMilestone(id, 0);

        (, , ClearFundEscrow.MilestoneStatus status, ,) = escrow.milestones(id, 0);
        assertEq(uint256(status), uint256(ClearFundEscrow.MilestoneStatus.Approved));
    }

    // REGRESSION: unauthorized milestone approval
    function test_ApproveMilestone_RevertsNonReviewer() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.markMilestoneComplete(id, 0);

        vm.prank(bob);
        vm.expectRevert(ClearFundEscrow.NotReviewer.selector);
        escrow.approveMilestone(id, 0);
    }

    // REGRESSION: organizer cannot approve their own milestone
    function test_ApproveMilestone_RevertsOrganizer() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.markMilestoneComplete(id, 0);

        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.NotReviewer.selector);
        escrow.approveMilestone(id, 0);
    }

    // REGRESSION: owner cannot approve milestones
    function test_ApproveMilestone_RevertsOwner() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.markMilestoneComplete(id, 0);

        vm.prank(owner);
        vm.expectRevert(ClearFundEscrow.NotReviewer.selector);
        escrow.approveMilestone(id, 0);
    }

    function test_ApproveMilestone_RevertsNotCompleted() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);

        vm.prank(reviewer);
        vm.expectRevert(
            abi.encodeWithSelector(
                ClearFundEscrow.InvalidMilestoneStatus.selector,
                ClearFundEscrow.MilestoneStatus.Completed,
                ClearFundEscrow.MilestoneStatus.InProgress
            )
        );
        escrow.approveMilestone(id, 0);
    }

    function test_ApproveMilestone_EmitsMilestoneApproved() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.submitEvidence(id, 0, "ipfs://verified-evidence");
        vm.prank(organizer); escrow.markMilestoneComplete(id, 0);

        vm.prank(reviewer);
        vm.expectEmit(true, false, true, true, address(escrow));
        emit ClearFundEscrow.MilestoneApproved(id, 0, reviewer);
        escrow.approveMilestone(id, 0);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 8. revokeApproval
    // ════════════════════════════════════════════════════════════════════════

    function test_RevokeApproval_MovesBackToCompleted() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        vm.prank(reviewer); escrow.revokeApproval(id, 0);
        (, , ClearFundEscrow.MilestoneStatus status, ,) = escrow.milestones(id, 0);
        assertEq(uint256(status), uint256(ClearFundEscrow.MilestoneStatus.Completed));
    }

    function test_RevokeApproval_RevertsNonReviewer() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        vm.prank(bob);
        vm.expectRevert(ClearFundEscrow.NotReviewer.selector);
        escrow.revokeApproval(id, 0);
    }

    function test_RevokeApproval_RevertsWrongStatus() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        // Status is InProgress, not Approved

        vm.prank(reviewer);
        vm.expectRevert(
            abi.encodeWithSelector(
                ClearFundEscrow.InvalidMilestoneStatus.selector,
                ClearFundEscrow.MilestoneStatus.Approved,
                ClearFundEscrow.MilestoneStatus.InProgress
            )
        );
        escrow.revokeApproval(id, 0);
    }

    // After revoking, updateRecipient is now unblocked
    function test_RevokeApproval_UnblocksRecipientUpdate() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        // updateRecipient blocked while Approved
        address newRecip = makeAddr("newRecip");
        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.ApprovedMilestonePending.selector);
        escrow.updateRecipient(id, newRecip);

        // Revoke: now update is allowed
        vm.prank(reviewer);  escrow.revokeApproval(id, 0);
        vm.prank(organizer); escrow.updateRecipient(id, newRecip);

        (, address rec, , , , , , ,) = escrow.campaigns(id);
        assertEq(rec, newRecip);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 9. releaseMilestone
    // ════════════════════════════════════════════════════════════════════════

    function test_ReleaseMilestone_TransfersFundsToRecipient() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        uint256 recipientBefore = usdc.balanceOf(recipient);
        vm.prank(organizer); escrow.releaseMilestone(id, 0);

        assertEq(usdc.balanceOf(recipient), recipientBefore + MILESTONE_A);
        assertEq(escrow.campaignBalance(id), CONTRIB - MILESTONE_A);

        (, , , , , uint256 totalPaid, , ,) = escrow.campaigns(id);
        assertEq(totalPaid, MILESTONE_A);

        (, , ClearFundEscrow.MilestoneStatus status, , bool paid) = escrow.milestones(id, 0);
        assertEq(uint256(status), uint256(ClearFundEscrow.MilestoneStatus.Paid));
        assertTrue(paid);
    }

    function test_ReleaseMilestone_RevertsNotApproved() public {
        uint256 id = _setupContributedCampaign();

        vm.prank(organizer);
        vm.expectRevert(
            abi.encodeWithSelector(
                ClearFundEscrow.InvalidMilestoneStatus.selector,
                ClearFundEscrow.MilestoneStatus.Approved,
                ClearFundEscrow.MilestoneStatus.InProgress
            )
        );
        escrow.releaseMilestone(id, 0);
    }

    function test_ReleaseMilestone_RevertsInsufficientBalance() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        // No contributions
        vm.prank(organizer); escrow.submitEvidence(id, 0, "ipfs://verified-evidence");
        vm.prank(organizer); escrow.markMilestoneComplete(id, 0);
        vm.prank(reviewer);  escrow.approveMilestone(id, 0);

        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.InsufficientCampaignBalance.selector);
        escrow.releaseMilestone(id, 0);
    }

    // REGRESSION: duplicate payout blocked
    function test_ReleaseMilestone_RevertsDoubleRelease() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        vm.prank(organizer); escrow.releaseMilestone(id, 0);

        vm.prank(organizer);
        vm.expectRevert(
            abi.encodeWithSelector(
                ClearFundEscrow.InvalidMilestoneStatus.selector,
                ClearFundEscrow.MilestoneStatus.Approved,
                ClearFundEscrow.MilestoneStatus.Paid
            )
        );
        escrow.releaseMilestone(id, 0);
    }

    // REGRESSION: release blocked on cancelled campaign.
    // Since S-02 fix, cancel with Approved milestone is itself blocked.
    // Correct path: reviewer revokes approval → organizer cancels → release reverts with CampaignInactive.
    function test_ReleaseMilestone_RevertsOnCancelledCampaign() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        // Revoke the approval first (required by S-02 fix)
        vm.prank(reviewer); escrow.revokeApproval(id, 0);

        // Now cancel is allowed (no Approved milestones remain)
        vm.prank(organizer); escrow.cancelCampaign(id);

        // The campaign is now inactive; releaseMilestone checks active first.
        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.CampaignInactive.selector);
        escrow.releaseMilestone(id, 0);
    }

    // REGRESSION: invalid recipient — createCampaign already blocks zero address;
    // test that the guard holds
    function test_ReleaseMilestone_RevertsZeroRecipientAtCreation() public {
        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.ZeroAddress.selector);
        escrow.createCampaign(address(0), TARGET, "uri");
    }

    function test_ReleaseMilestone_EmitsMilestoneReleased() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        vm.prank(organizer);
        vm.expectEmit(true, false, true, true, address(escrow));
        emit ClearFundEscrow.MilestoneReleased(id, 0, recipient, MILESTONE_A);
        escrow.releaseMilestone(id, 0);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 10. cancelCampaign
    // ════════════════════════════════════════════════════════════════════════

    function test_CancelCampaign_DeactivatesCampaign() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.cancelCampaign(id);

        (, , , , , , bool active, ,) = escrow.campaigns(id);
        assertFalse(active);
    }

    function test_CancelCampaign_RevertsNonOrganizer() public {
        uint256 id = _createCampaign();
        vm.prank(bob);
        vm.expectRevert(ClearFundEscrow.NotOrganizer.selector);
        escrow.cancelCampaign(id);
    }

    // REGRESSION: unauthorized emergency withdrawal — no emergencyWithdraw function exists
    function test_NoEmergencyWithdraw_FunctionAbsent() public {
        // Verify the function does not exist at the ABI level by checking the interface.
        // We do this by ensuring the selector is not present in the deployed bytecode.
        // The selector for emergencyWithdraw(uint256) is 0x4e6a3bf0.
        bytes4 sel = bytes4(keccak256("emergencyWithdraw(uint256)"));
        address escrowAddr = address(escrow);
        bool found;
        assembly {
            // Call with just the selector — if the function exists it returns data or succeeds.
            // If absent, the fallback / receive reverts, or the call returns false.
            let result := staticcall(5000, escrowAddr, 0, 0, 0, 0)
            // We actually encode the full call in memory to be accurate:
            mstore(0x00, sel)
            mstore(0x04, 0) // campaignId = 0
            // staticcall with the selector
            result := staticcall(5000, escrowAddr, 0x00, 0x24, 0, 0)
            found := result
        }
        // The owner calling emergencyWithdraw(0) should revert because the function doesn't exist.
        assertFalse(found, "emergencyWithdraw must not exist");
    }

    // ════════════════════════════════════════════════════════════════════════
    // 11. claimRefund — happy path + regression tests
    // ════════════════════════════════════════════════════════════════════════

    // Happy path: full refund after cancel with no payouts
    function test_ClaimRefund_ReturnsFullContribution() public {
        uint256 id = _createCampaign();
        vm.prank(alice); escrow.contribute(id, CONTRIB);
        vm.prank(organizer); escrow.cancelCampaign(id);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice); escrow.claimRefund(id);

        assertEq(usdc.balanceOf(alice), aliceBefore + CONTRIB);
        assertEq(escrow.campaignBalance(id), 0);
        assertEq(escrow.contributions(id, alice), 0);
    }

    // REGRESSION: duplicate refund attempt
    function test_ClaimRefund_RevertsDuplicateRefund() public {
        uint256 id = _createCampaign();
        vm.prank(alice); escrow.contribute(id, CONTRIB);
        vm.prank(organizer); escrow.cancelCampaign(id);

        vm.prank(alice); escrow.claimRefund(id);

        vm.prank(alice);
        vm.expectRevert(ClearFundEscrow.NothingToRefund.selector);
        escrow.claimRefund(id); // second attempt must revert
    }

    // REGRESSION: refund on active campaign blocked
    function test_ClaimRefund_RevertsOnActiveCampaign() public {
        uint256 id = _createCampaign();
        vm.prank(alice); escrow.contribute(id, CONTRIB);
        // Campaign is still active

        vm.prank(alice);
        vm.expectRevert(ClearFundEscrow.CampaignStillActive.selector);
        escrow.claimRefund(id);
    }

    // REGRESSION: contributor with zero contribution cannot refund
    function test_ClaimRefund_RevertsNothingToRefund() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.cancelCampaign(id);

        vm.prank(bob); // bob never contributed
        vm.expectRevert(ClearFundEscrow.NothingToRefund.selector);
        escrow.claimRefund(id);
    }

    // REGRESSION: refund cannot spend another campaign's balance
    function test_ClaimRefund_CampaignBalanceIsolation() public {
        // Campaign A: alice contributes
        uint256 idA = _createCampaign();
        vm.prank(alice); escrow.contribute(idA, CONTRIB);

        // Campaign B: bob contributes
        address organizer2 = makeAddr("organizer2");
        address recipient2 = makeAddr("recipient2");
        vm.prank(organizer2);
        uint256 idB = escrow.createCampaign(recipient2, TARGET, "B");
        vm.prank(bob); escrow.contribute(idB, CONTRIB);

        // Cancel campaign A only
        vm.prank(organizer); escrow.cancelCampaign(idA);

        // Alice refunds from A
        vm.prank(alice); escrow.claimRefund(idA);

        // Campaign B's balance is untouched
        assertEq(escrow.campaignBalance(idB), CONTRIB);
        assertEq(usdc.balanceOf(address(escrow)), CONTRIB); // only B's funds remain
    }

    // Multiple contributors can each independently refund
    function test_ClaimRefund_MultipleContributors() public {
        uint256 id = _createCampaign();
        uint256 aliceAmt = 100_000e6;
        uint256 bobAmt   = 150_000e6;
        vm.prank(alice); escrow.contribute(id, aliceAmt);
        vm.prank(bob);   escrow.contribute(id, bobAmt);
        vm.prank(organizer); escrow.cancelCampaign(id);

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 bobBefore   = usdc.balanceOf(bob);

        vm.prank(alice); escrow.claimRefund(id);
        vm.prank(bob);   escrow.claimRefund(id);

        assertEq(usdc.balanceOf(alice), aliceBefore + aliceAmt);
        assertEq(usdc.balanceOf(bob),   bobBefore   + bobAmt);
        assertEq(escrow.campaignBalance(id), 0);
    }

    // Partial-paid scenario: one milestone released, then cancel → claimRefund reverts
    // for contributors whose full contribution exceeds remaining balance, preserving their
    // record so they know there is a shortfall.
    function test_ClaimRefund_CannotBecomeUndercollateralizedAfterPayout() public {
        uint256 id = _createCampaign();
        vm.prank(alice); escrow.contribute(id, 50_000e6);
        vm.prank(bob); escrow.contribute(id, CONTRIB);
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        _advanceToApproved(id, 0);
        vm.prank(organizer); escrow.releaseMilestone(id, 0);

        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.PayoutAlreadyMadeBlocksCancel.selector);
        escrow.cancelCampaign(id);

        // Failed cancellation leaves the campaign active and the accounting unchanged.
        (, , , , , uint256 paidOut, bool active, ,) = escrow.campaigns(id);
        assertTrue(active);
        assertEq(paidOut, MILESTONE_A);
        assertEq(escrow.campaignBalance(id), 250_000e6);
        vm.prank(alice);
        vm.expectRevert(ClearFundEscrow.CampaignStillActive.selector);
        escrow.claimRefund(id);
    }

    // RefundClaimed event
    function test_ClaimRefund_EmitsRefundClaimed() public {
        uint256 id = _createCampaign();
        vm.prank(alice); escrow.contribute(id, CONTRIB);
        vm.prank(organizer); escrow.cancelCampaign(id);

        vm.prank(alice);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit ClearFundEscrow.RefundClaimed(id, alice, CONTRIB);
        escrow.claimRefund(id);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 12. setReviewer
    // ════════════════════════════════════════════════════════════════════════

    // Reviewer rotation must immediately revoke approval authority from the old key.
    function test_SetReviewer_RotationRevokesOldReviewer() public {
        uint256 id = _setupContributedCampaign();
        vm.prank(organizer);
        escrow.submitEvidence(id, 0, "ipfs://verified-evidence");
        vm.prank(organizer);
        escrow.markMilestoneComplete(id, 0);

        address replacement = makeAddr("replacementReviewer");
        vm.prank(owner);
        escrow.setReviewer(replacement);

        vm.prank(reviewer);
        vm.expectRevert(ClearFundEscrow.NotReviewer.selector);
        escrow.approveMilestone(id, 0);

        vm.prank(replacement);
        escrow.approveMilestone(id, 0);
        (, , ClearFundEscrow.MilestoneStatus status, ,) = escrow.milestones(id, 0);
        assertEq(uint256(status), uint256(ClearFundEscrow.MilestoneStatus.Approved));
    }

    // Only the owner may rotate reviewers; failed attempts leave authority unchanged.
    function test_SetReviewer_ExistingApprovalCanBeRevokedByReplacement() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        address replacement = makeAddr("replacementForExistingApproval");
        vm.prank(owner);
        escrow.setReviewer(replacement);

        // Rotation does not automatically revoke a previously approved milestone.
        (, , ClearFundEscrow.MilestoneStatus beforeStatus, ,) = escrow.milestones(id, 0);
        assertEq(uint256(beforeStatus), uint256(ClearFundEscrow.MilestoneStatus.Approved));

        vm.prank(reviewer);
        vm.expectRevert(ClearFundEscrow.NotReviewer.selector);
        escrow.revokeApproval(id, 0);

        vm.prank(replacement);
        escrow.revokeApproval(id, 0);
        (, , ClearFundEscrow.MilestoneStatus afterStatus, ,) = escrow.milestones(id, 0);
        assertEq(uint256(afterStatus), uint256(ClearFundEscrow.MilestoneStatus.Completed));
    }

    function test_SetReviewer_NonOwnerCannotRotateAuthority() public {
        address originalReviewer = escrow.reviewer();
        vm.prank(organizer);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, organizer)
        );
        escrow.setReviewer(makeAddr("attackerReviewer"));
        assertEq(escrow.reviewer(), originalReviewer);
    }

    function test_SetReviewer_UpdatesReviewer() public {
        address newRev = makeAddr("newReviewer");
        vm.prank(owner); escrow.setReviewer(newRev);
        assertEq(escrow.reviewer(), newRev);
    }

    function test_SetReviewer_RevertsNonOwner() public {
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob)
        );
        escrow.setReviewer(makeAddr("x"));
    }

    function test_SetReviewer_RevertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(ClearFundEscrow.ZeroAddress.selector);
        escrow.setReviewer(address(0));
    }

    // ════════════════════════════════════════════════════════════════════════
    // 13. updateRecipient
    // ════════════════════════════════════════════════════════════════════════

    function test_UpdateRecipient_UpdatesOnActiveCampaign() public {
        uint256 id = _createCampaign();
        address newRecip = makeAddr("newRecipient");
        vm.prank(organizer); escrow.updateRecipient(id, newRecip);

        (, address rec, , , , , , ,) = escrow.campaigns(id);
        assertEq(rec, newRecip);
    }

    function test_UpdateRecipient_PayoutGoesToNewRecipient() public {
        uint256 id = _setupContributedCampaign();

        address newRecip = makeAddr("newRecipient");
        vm.prank(organizer); escrow.updateRecipient(id, newRecip);

        _advanceToApproved(id, 0);

        uint256 oldBefore = usdc.balanceOf(recipient);
        uint256 newBefore = usdc.balanceOf(newRecip);

        vm.prank(organizer); escrow.releaseMilestone(id, 0);

        assertEq(usdc.balanceOf(newRecip),  newBefore + MILESTONE_A);
        assertEq(usdc.balanceOf(recipient), oldBefore);             // old address got nothing
    }

    function test_UpdateRecipient_RevertsInactiveCampaignZeroBalance() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.cancelCampaign(id);

        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.CampaignInactive.selector);
        escrow.updateRecipient(id, makeAddr("x"));
    }

    function test_UpdateRecipient_AllowedInactiveWithBalance() public {
        uint256 id = _createCampaign();
        vm.prank(alice); escrow.contribute(id, CONTRIB);
        vm.prank(organizer); escrow.cancelCampaign(id);

        address newRecip = makeAddr("newRecipient");
        vm.prank(organizer); escrow.updateRecipient(id, newRecip); // must not revert

        (, address rec, , , , , , ,) = escrow.campaigns(id);
        assertEq(rec, newRecip);
    }

    // REGRESSION: updateRecipient blocked while any milestone is Approved
    function test_UpdateRecipient_RevertsApprovedMilestonePending() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.ApprovedMilestonePending.selector);
        escrow.updateRecipient(id, makeAddr("sneaky"));
    }

    // ════════════════════════════════════════════════════════════════════════
    // 14. Accounting consistency after refunds and payouts
    // ════════════════════════════════════════════════════════════════════════

    function test_Accounting_PartialPayoutPreventsCancellation() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.addMilestone(id, "m1", MILESTONE_B);
        vm.prank(alice); escrow.contribute(id, 300_000e6);
        vm.prank(bob); escrow.contribute(id, 200_000e6);
        _advanceToApproved(id, 0);
        vm.prank(organizer); escrow.releaseMilestone(id, 0);
        assertEq(escrow.campaignBalance(id), 400_000e6);

        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.PayoutAlreadyMadeBlocksCancel.selector);
        escrow.cancelCampaign(id);

        (, , , , , uint256 paidOut, bool active, ,) = escrow.campaigns(id);
        assertTrue(active);
        assertEq(paidOut, MILESTONE_A);
        assertEq(escrow.campaignBalance(id), 400_000e6);
        assertEq(usdc.balanceOf(address(escrow)), 400_000e6);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 15. Full end-to-end happy path
    // ════════════════════════════════════════════════════════════════════════

    function test_EndToEnd_FullMilestoneFlow() public {
        vm.prank(organizer);
        uint256 id = escrow.createCampaign(recipient, TARGET, "ipfs://campaign");

        vm.prank(organizer); escrow.addMilestone(id, "Deliverable #1", MILESTONE_A);
        vm.prank(alice);     escrow.contribute(id, CONTRIB);
        assertEq(escrow.campaignBalance(id), CONTRIB);

        vm.prank(organizer); escrow.submitEvidence(id, 0, "ipfs://evidence");
        (, , , string memory evURI,) = escrow.milestones(id, 0);
        assertEq(evURI, "ipfs://evidence");

        vm.prank(organizer); escrow.markMilestoneComplete(id, 0);
        (, , ClearFundEscrow.MilestoneStatus s, ,) = escrow.milestones(id, 0);
        assertEq(uint256(s), uint256(ClearFundEscrow.MilestoneStatus.Completed));

        vm.prank(reviewer); escrow.approveMilestone(id, 0);
        (, , s, ,) = escrow.milestones(id, 0);
        assertEq(uint256(s), uint256(ClearFundEscrow.MilestoneStatus.Approved));

        uint256 recBefore = usdc.balanceOf(recipient);
        vm.prank(organizer); escrow.releaseMilestone(id, 0);
        assertEq(usdc.balanceOf(recipient), recBefore + MILESTONE_A);
        assertEq(escrow.campaignBalance(id), CONTRIB - MILESTONE_A);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 16. Multiple campaigns — balance isolation
    // ════════════════════════════════════════════════════════════════════════

    function test_MultipleCampaigns_SeparateBalances() public {
        uint256 idA = _createCampaign();

        address organizer2 = makeAddr("organizer2");
        address recipient2 = makeAddr("recipient2");
        vm.prank(organizer2);
        uint256 idB = escrow.createCampaign(recipient2, TARGET, "B");

        vm.prank(alice); escrow.contribute(idA, CONTRIB);
        assertEq(escrow.campaignBalance(idA), CONTRIB);
        assertEq(escrow.campaignBalance(idB), 0);

        vm.prank(bob); escrow.contribute(idB, 50_000e6);
        assertEq(escrow.campaignBalance(idA), CONTRIB);
        assertEq(escrow.campaignBalance(idB), 50_000e6);
    }

    // REGRESSION: campaign B's milestone release cannot touch campaign A's balance
    function test_MultipleCampaigns_ReleaseDoesNotCrossBalance() public {
        // Campaign A: alice contributes
        uint256 idA = _createCampaign();
        vm.prank(alice); escrow.contribute(idA, CONTRIB);

        // Campaign B: bob contributes, has a milestone to release
        address organizer2 = makeAddr("organizer2");
        address recipient2 = makeAddr("recipient2");
        vm.prank(organizer2);
        uint256 idB = escrow.createCampaign(recipient2, TARGET, "B");
        vm.prank(organizer2); escrow.addMilestone(idB, "mB", MILESTONE_A);
        vm.prank(bob); escrow.contribute(idB, CONTRIB);

        vm.prank(organizer2); escrow.submitEvidence(idB, 0, "ipfs://verified-evidence");
        vm.prank(organizer2); escrow.markMilestoneComplete(idB, 0);
        vm.prank(reviewer);   escrow.approveMilestone(idB, 0);
        vm.prank(organizer2); escrow.releaseMilestone(idB, 0);

        // Campaign A's balance is untouched
        assertEq(escrow.campaignBalance(idA), CONTRIB);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 17. Fuzz: contribute amount reflected in balance
    // ════════════════════════════════════════════════════════════════════════

    function testFuzz_ContributeAmountReflectedInBalance(uint256 amount) public {
        amount = bound(amount, 1, 1e18);
        usdc.mint(alice, amount);
        vm.prank(alice); usdc.approve(address(escrow), type(uint256).max);

        vm.prank(organizer);
        uint256 id = escrow.createCampaign(recipient, type(uint256).max, "uri");
        vm.prank(alice); escrow.contribute(id, amount);

        assertEq(escrow.campaignBalance(id), amount);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 18. Fuzz: MilestoneAllocationExceeded never bypassed
    // ════════════════════════════════════════════════════════════════════════

    function testFuzz_MilestoneAllocationNotBypassed(
        uint256 target,
        uint256 amt1,
        uint256 amt2
    ) public {
        target = bound(target, 1, 1e30);
        amt1   = bound(amt1, 1, target);
        uint256 remaining = target - amt1;
        amt2 = bound(
            amt2,
            remaining + 1,
            remaining + 1e30 > type(uint256).max ? type(uint256).max : remaining + 1e30
        );
        if (amt2 == 0) return;

        vm.prank(organizer);
        uint256 id = escrow.createCampaign(recipient, target, "uri");

        vm.startPrank(organizer);
        escrow.addMilestone(id, "m0", amt1);
        vm.expectRevert(ClearFundEscrow.MilestoneAllocationExceeded.selector);
        escrow.addMilestone(id, "m1", amt2);
        vm.stopPrank();
    }

    // ════════════════════════════════════════════════════════════════════════
    // 19. Fuzz: claimRefund never pays more than contribution amount
    // ════════════════════════════════════════════════════════════════════════

    function testFuzz_ClaimRefundNeverExceedsContribution(uint256 amount) public {
        amount = bound(amount, 1, 1e18);
        usdc.mint(alice, amount);
        vm.prank(alice); usdc.approve(address(escrow), type(uint256).max);

        vm.prank(organizer);
        uint256 id = escrow.createCampaign(recipient, type(uint256).max, "uri");
        vm.prank(alice); escrow.contribute(id, amount);
        vm.prank(organizer); escrow.cancelCampaign(id);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice); escrow.claimRefund(id);
        uint256 aliceAfter = usdc.balanceOf(alice);

        // alice gets back exactly her contribution, never more
        assertEq(aliceAfter - aliceBefore, amount);
        assertEq(escrow.contributions(id, alice), 0);
        assertEq(escrow.campaignBalance(id), 0);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 20. S-02 regression: cancelCampaign blocked by Approved milestone
    // ════════════════════════════════════════════════════════════════════════

    // REGRESSION S-02: cancelling while a milestone is Approved must revert.
    // Without this guard, USDC would be permanently locked (Approved milestone
    // cannot be released on an inactive campaign; no refund path covers it).
    function test_CancelCampaign_RevertsApprovedMilestone() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.ApprovedMilestoneBlocksCancel.selector);
        escrow.cancelCampaign(id);
    }

    // Cancellation after any payout must fail to protect full refund solvency.
    function test_CancelCampaign_RevertsAfterReleaseOfApprovedMilestone() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        vm.prank(organizer); escrow.releaseMilestone(id, 0);

        vm.prank(organizer);
        vm.expectRevert(ClearFundEscrow.PayoutAlreadyMadeBlocksCancel.selector);
        escrow.cancelCampaign(id);

        (, , , , , , bool active, ,) = escrow.campaigns(id);
        assertTrue(active);
    }

    // Cancel is allowed after the reviewer revokes the approval.
    function test_CancelCampaign_AllowedAfterRevokeApproval() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        // Reviewer revokes approval
        vm.prank(reviewer); escrow.revokeApproval(id, 0);

        // Now cancel must succeed
        vm.prank(organizer); escrow.cancelCampaign(id);
        (, , , , , , bool active, ,) = escrow.campaigns(id);
        assertFalse(active);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 21. S-03 regression: MAX_MILESTONES cap
    // ════════════════════════════════════════════════════════════════════════

    // REGRESSION S-03: adding more than MAX_MILESTONES milestones must revert.
    function test_AddMilestone_RevertsAtMaxMilestones() public {
        uint256 id = _createCampaign();
        uint256 max = escrow.MAX_MILESTONES();
        // Each milestone = 1 USDC base unit; target = 500_000e6 — well above max * 1
        vm.startPrank(organizer);
        for (uint256 i = 0; i < max; ++i) {
            escrow.addMilestone(id, "m", 1);
        }
        // The (MAX_MILESTONES + 1)th must revert
        vm.expectRevert(ClearFundEscrow.TooManyMilestones.selector);
        escrow.addMilestone(id, "overflow", 1);
        vm.stopPrank();
    }

    // MAX_MILESTONES == 50 (the agreed cap)
    function test_MaxMilestones_Is50() public view {
        assertEq(escrow.MAX_MILESTONES(), 50);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 22. Phase 3 integration tests
    // ════════════════════════════════════════════════════════════════════════

    // ── Campaign creation ────────────────────────────────────────────────────

    /// @dev IDs are assigned sequentially starting at 0.
    function test_Phase3_CreateCampaign_ReturnsIncrementingId() public {
        vm.prank(organizer);
        uint256 id0 = escrow.createCampaign(recipient, TARGET, "first");
        assertEq(id0, 0, "first campaign ID should be 0");

        address organizer2 = makeAddr("p3organizer2");
        address recipient2 = makeAddr("p3recipient2");
        vm.prank(organizer2);
        uint256 id1 = escrow.createCampaign(recipient2, TARGET, "second");
        assertEq(id1, 1, "second campaign ID should be 1");

        assertEq(escrow.nextCampaignId(), 2);
    }

    /// @dev milestoneCount increments correctly as milestones are added.
    function test_Phase3_AddMilestone_AfterCampaignCreation() public {
        uint256 id = _createCampaign();

        vm.startPrank(organizer);
        escrow.addMilestone(id, "Phase 3 Milestone A", MILESTONE_A);
        escrow.addMilestone(id, "Phase 3 Milestone B", MILESTONE_B);
        vm.stopPrank();

        (, , , , , , , uint256 mCount,) = escrow.campaigns(id);
        assertEq(mCount, 2, "milestoneCount should be 2 after adding two milestones");
    }

    // ── Contribution accounting ──────────────────────────────────────────────

    /// @dev totalContributed reflects the sum of two independent contributions.
    function test_Phase3_Contribute_TotalContributedAccurate() public {
        uint256 id = _createCampaign();
        uint256 aliceAmt = 120_000e6;
        uint256 bobAmt   =  80_000e6;

        vm.prank(alice); escrow.contribute(id, aliceAmt);
        vm.prank(bob);   escrow.contribute(id, bobAmt);

        (, , , , uint256 totalContrib, , , ,) = escrow.campaigns(id);
        assertEq(totalContrib, aliceAmt + bobAmt, "totalContributed should equal sum of contributions");
    }

    /// @dev campaignBalance equals totalContributed when no payouts have occurred.
    function test_Phase3_Contribute_CampaignBalanceAccurate() public {
        uint256 id = _createCampaign();
        uint256 aliceAmt = 120_000e6;
        uint256 bobAmt   =  80_000e6;

        vm.prank(alice); escrow.contribute(id, aliceAmt);
        vm.prank(bob);   escrow.contribute(id, bobAmt);

        (, , , , uint256 totalContrib, , , ,) = escrow.campaigns(id);
        uint256 bal = escrow.campaignBalance(id);
        assertEq(bal, totalContrib, "campaignBalance should equal totalContributed when no payouts have occurred");
    }

    // ── Evidence submission ──────────────────────────────────────────────────

    /// @dev evidenceURI is persisted and readable via milestones().
    function test_Phase3_SubmitEvidence_URIStoredCorrectly() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);

        string memory uri = "ipfs://QmPhase3Evidence";
        vm.prank(organizer); escrow.submitEvidence(id, 0, uri);

        (, , , string memory storedURI,) = escrow.milestones(id, 0);
        assertEq(storedURI, uri, "evidenceURI should be stored as submitted");
    }

    /// @dev submitEvidence must NOT advance the milestone status.
    function test_Phase3_SubmitEvidence_DoesNotChangeStatus() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.submitEvidence(id, 0, "ipfs://evidence");

        (, , ClearFundEscrow.MilestoneStatus status, ,) = escrow.milestones(id, 0);
        assertEq(
            uint256(status),
            uint256(ClearFundEscrow.MilestoneStatus.InProgress),
            "status must remain InProgress after submitEvidence"
        );
    }

    // ── Reviewer approval ────────────────────────────────────────────────────

    /// @dev Authorized reviewer can approve; a non-reviewer reverts NotReviewer.
    function test_Phase3_ApproveMilestone_AuthorizedReviewerOnly() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "m0", MILESTONE_A);
        vm.prank(organizer); escrow.submitEvidence(id, 0, "ipfs://verified-evidence");
        vm.prank(organizer); escrow.markMilestoneComplete(id, 0);

        // Non-reviewer attempt must revert.
        address nonReviewer = makeAddr("p3NonReviewer");
        vm.prank(nonReviewer);
        vm.expectRevert(ClearFundEscrow.NotReviewer.selector);
        escrow.approveMilestone(id, 0);

        // Authorized reviewer must succeed.
        vm.prank(reviewer); escrow.approveMilestone(id, 0);
        (, , ClearFundEscrow.MilestoneStatus status, ,) = escrow.milestones(id, 0);
        assertEq(
            uint256(status),
            uint256(ClearFundEscrow.MilestoneStatus.Approved),
            "status should be Approved after reviewer approves"
        );
    }

    /// @dev Authorized reviewer can revoke; a non-reviewer reverts NotReviewer.
    function test_Phase3_RevokeApproval_ReviewerOnly() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);

        // Non-reviewer attempt must revert.
        address nonReviewer = makeAddr("p3NonReviewer2");
        vm.prank(nonReviewer);
        vm.expectRevert(ClearFundEscrow.NotReviewer.selector);
        escrow.revokeApproval(id, 0);

        // Authorized reviewer must succeed.
        vm.prank(reviewer); escrow.revokeApproval(id, 0);
        (, , ClearFundEscrow.MilestoneStatus status, ,) = escrow.milestones(id, 0);
        assertEq(
            uint256(status),
            uint256(ClearFundEscrow.MilestoneStatus.Completed),
            "status should revert to Completed after reviewer revokes"
        );
    }

    // ── Payout status ────────────────────────────────────────────────────────

    /// @dev After releaseMilestone: paid == true and status == Paid.
    function test_Phase3_ReleaseMilestone_PaidFlagSetAfterRelease() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);
        vm.prank(organizer); escrow.releaseMilestone(id, 0);

        (, , ClearFundEscrow.MilestoneStatus status, , bool paid) = escrow.milestones(id, 0);
        assertTrue(paid, "paid flag should be true after release");
        assertEq(
            uint256(status),
            uint256(ClearFundEscrow.MilestoneStatus.Paid),
            "status should be Paid after release"
        );
    }

    /// @dev Approval alone (without release) must NOT move totalPaidOut.
    function test_Phase3_ReleaseMilestone_ApprovalNotSufficientWithoutRelease() public {
        uint256 id = _setupContributedCampaign();
        _advanceToApproved(id, 0);   // milestone is now Approved but NOT released

        (, , , , , uint256 totalPaid, , ,) = escrow.campaigns(id);
        assertEq(totalPaid, 0, "totalPaidOut must be 0: approval alone does not pay out");
    }

    // ── Refund after cancellation ────────────────────────────────────────────

    /// @dev Contributor gets their full contribution back after campaign is cancelled.
    function test_Phase3_ClaimRefund_AfterCancel_FullAmount() public {
        uint256 id       = _createCampaign();
        uint256 contribAmt = 250_000e6;
        vm.prank(alice); escrow.contribute(id, contribAmt);
        vm.prank(organizer); escrow.cancelCampaign(id);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice); escrow.claimRefund(id);

        assertEq(usdc.balanceOf(alice), aliceBefore + contribAmt, "alice should receive exact contribution back");
        assertEq(escrow.contributions(id, alice), 0, "contribution record should be zeroed after refund");
        assertEq(escrow.campaignBalance(id), 0, "campaign balance should be zero after full refund");
    }

    /// @dev Second claimRefund call on the same campaign reverts NothingToRefund.
    function test_Phase3_ClaimRefund_DuplicateReverts() public {
        uint256 id = _createCampaign();
        vm.prank(alice); escrow.contribute(id, 100_000e6);
        vm.prank(organizer); escrow.cancelCampaign(id);

        vm.prank(alice); escrow.claimRefund(id);  // first call succeeds

        vm.prank(alice);
        vm.expectRevert(ClearFundEscrow.NothingToRefund.selector);
        escrow.claimRefund(id);                   // second call must revert
    }

    // ── Cross-campaign balance isolation ────────────────────────────────────

    /// @dev Contributions to campaign 0 must not affect campaign 1's balance.
    function test_Phase3_TwoCampaigns_BalancesStrictlyIsolated() public {
        // Campaign 0
        uint256 id0 = _createCampaign();

        // Campaign 1 — different organizer
        address organizer2 = makeAddr("p3org2");
        address recipient2 = makeAddr("p3rec2");
        vm.prank(organizer2);
        uint256 id1 = escrow.createCampaign(recipient2, TARGET, "campaign-1");

        // Contribute only to campaign 0
        vm.prank(alice); escrow.contribute(id0, CONTRIB);

        assertEq(escrow.campaignBalance(id0), CONTRIB, "campaign 0 balance should reflect contribution");
        assertEq(escrow.campaignBalance(id1), 0,       "campaign 1 balance must remain 0");
    }

    // ── Demo-data read invariant ─────────────────────────────────────────────

    /// @dev Fresh deployment: nextCampaignId starts at zero.
    function test_Phase3_NextCampaignId_StartsAtZero() public {
        // Deploy a brand-new escrow instance with its own USDC mock to guarantee a fresh state.
        MockERC20 freshUsdc = new MockERC20("Fresh USDC", "fUSDC", 6);
        address freshReviewer = makeAddr("p3freshReviewer");
        vm.prank(owner);
        ClearFundEscrow freshEscrow = new ClearFundEscrow(address(freshUsdc), freshReviewer);

        assertEq(freshEscrow.nextCampaignId(), 0, "nextCampaignId must be 0 on a fresh deployment");
    }

    // ── Data persistence across reads ────────────────────────────────────────

    // ── Helpers for test_Phase3_CampaignDataPersistsAcrossReads ─────────────
    // Each helper reads a small slice of the 9-field campaigns() tuple so the
    // compiler never has more than a few locals on the stack at once.

    function _p3ReadOrganizer(uint256 id) internal view returns (address org) {
        (org, , , , , , , ,) = escrow.campaigns(id);
    }

    function _p3ReadRecipient(uint256 id) internal view returns (address rec) {
        (, rec, , , , , , ,) = escrow.campaigns(id);
    }

    function _p3ReadTarget(uint256 id) internal view returns (uint256 tgt) {
        (, , tgt, , , , , ,) = escrow.campaigns(id);
    }

    function _p3ReadTotalContributed(uint256 id) internal view returns (uint256 v) {
        (, , , , v, , , ,) = escrow.campaigns(id);
    }

    function _p3ReadTotalPaidOut(uint256 id) internal view returns (uint256 v) {
        (, , , , , v, , ,) = escrow.campaigns(id);
    }

    function _p3ReadActive(uint256 id) internal view returns (bool v) {
        (, , , , , , v, ,) = escrow.campaigns(id);
    }

    function _p3ReadMilestoneCount(uint256 id) internal view returns (uint256 v) {
        (, , , , , , , v,) = escrow.campaigns(id);
    }

    function _p3ReadTotalAllocated(uint256 id) internal view returns (uint256 v) {
        (, , , , , , , , v) = escrow.campaigns(id);
    }

    /// @dev Reading campaign state from two different callers returns identical data.
    function test_Phase3_CampaignDataPersistsAcrossReads() public {
        uint256 id = _createCampaign();
        vm.prank(organizer); escrow.addMilestone(id, "Persistent Milestone", MILESTONE_A);
        vm.prank(alice);     escrow.contribute(id, CONTRIB);

        // All reads go through view helpers — no local tuples, so no stack pressure.
        // (vm.prank is not needed for view calls, but using different callers via prank
        //  confirms that the caller identity does not alter the returned data.)

        vm.prank(alice); assertEq(_p3ReadOrganizer(id),        _p3ReadOrganizer(id),        "organizer");
        vm.prank(alice); assertEq(_p3ReadRecipient(id),        _p3ReadRecipient(id),        "recipient");
        vm.prank(alice); assertEq(_p3ReadTarget(id),           _p3ReadTarget(id),           "target");
        vm.prank(alice); assertEq(_p3ReadTotalContributed(id), _p3ReadTotalContributed(id), "totalContributed");
        vm.prank(alice); assertEq(_p3ReadTotalPaidOut(id),     _p3ReadTotalPaidOut(id),     "totalPaidOut");
        vm.prank(alice); assertEq(_p3ReadActive(id),           _p3ReadActive(id),           "active");
        vm.prank(alice); assertEq(_p3ReadMilestoneCount(id),   _p3ReadMilestoneCount(id),   "milestoneCount");
        vm.prank(alice); assertEq(_p3ReadTotalAllocated(id),   _p3ReadTotalAllocated(id),   "totalAllocated");

        // Additionally confirm the core values are correct (not just self-equal).
        assertEq(_p3ReadOrganizer(id),        organizer, "organizer should be set");
        assertEq(_p3ReadTotalContributed(id), CONTRIB,   "totalContributed should equal CONTRIB");
        assertEq(_p3ReadMilestoneCount(id),   1,         "milestoneCount should be 1");
        assertTrue(_p3ReadActive(id),                    "campaign should still be active");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Invariant tests
// ─────────────────────────────────────────────────────────────────────────────
contract ClearFundEscrowInvariantTest is Test {
    MockERC20       internal usdc;
    ClearFundEscrow internal escrow;
    EscrowHandler   internal handler;

    address internal owner       = makeAddr("inv_owner");
    address internal organizer   = makeAddr("inv_organizer");
    address internal reviewer    = makeAddr("inv_reviewer");
    address internal recipient   = makeAddr("inv_recipient");
    address internal contributor = makeAddr("inv_contributor");

    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        vm.prank(owner);
        escrow = new ClearFundEscrow(address(usdc), reviewer);

        handler = new EscrowHandler(
            escrow, usdc, organizer, reviewer, recipient, contributor
        );
        handler.createCampaign();
        targetContract(address(handler));
    }

    /// INVARIANT: campaignBalance never exceeds totalContributed.
    function invariant_BalanceNeverExceedsTotalContributed() public view {
        if (!handler.campaignCreated()) return;
        uint256 id  = handler.campaignId();
        uint256 bal = escrow.campaignBalance(id);
        (, , , , uint256 totalContrib, , , ,) = escrow.campaigns(id);
        assertLe(bal, totalContrib);
    }

    /// INVARIANT: contract's USDC balance >= campaignBalance (single-campaign handler).
    function invariant_ContractHoldsEnoughUSDC() public view {
        if (!handler.campaignCreated()) return;
        uint256 id          = handler.campaignId();
        uint256 campaignBal = escrow.campaignBalance(id);
        assertGe(usdc.balanceOf(address(escrow)), campaignBal);
    }
}
