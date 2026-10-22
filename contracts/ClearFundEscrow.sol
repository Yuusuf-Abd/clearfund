// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title  ClearFundEscrow
 * @notice Milestone-based USDC escrow for the ClearFund platform on Arc.
 *
 * ## Authorization model
 *
 * | Role       | Who                    | Permitted actions                                         |
 * |------------|------------------------|-----------------------------------------------------------|
 * | owner      | Deployer (Ownable)     | setReviewer only. Cannot touch campaign funds.            |
 * | organizer  | Campaign creator       | addMilestone, markMilestoneComplete, submitEvidence,      |
 * |            |                        | releaseMilestone (post-approval), cancelCampaign,         |
 * |            |                        | updateRecipient (no pending approvals)                    |
 * | reviewer   | Single address set by  | approveMilestone (Completed → Approved) only.             |
 * |            | owner via setReviewer  |                                                           |
 * | contributor| Anyone                 | contribute (active campaigns), claimRefund (cancelled).   |
 *
 * ## Payout flow (enforced by status enum — cannot be reordered)
 *
 *   1. organizer  → addMilestone          (new milestone, status: InProgress)
 *   2. organizer  → markMilestoneComplete (InProgress → Completed)
 *   3. organizer  → submitEvidence        (records URI only, NO status change)
 *   4. reviewer   → approveMilestone      (Completed → Approved)  ← SOLE approval path
 *   5. organizer  → releaseMilestone      (Approved → Paid, USDC transferred to recipient)
 *
 * ## Refund flow
 *
 *   organizer → cancelCampaign  (active → inactive, contributions frozen)
 *   contributor → claimRefund   (returns their contributed USDC, zeroes their record)
 *
 * ## Known limitations (NOT an independent security audit)
 *
 *   - Single global reviewer: a compromised reviewer key can approve milestones across
 *     all campaigns. Mitigated in production by using a multi-sig as the reviewer address.
 *   - Owner can change reviewer: owner key compromise means a new reviewer can be set.
 *     Use a multi-sig or timelock as the owner for production deployments.
 *   - No funding deadline: campaigns do not expire. Organizer must cancel manually.
 *   - Cancellation is unavailable after any milestone payout; remaining funds
 *     stay committed to the active campaign. A separate closure policy is needed.
 *   - This contract has NOT been independently audited. Do not hold real funds without
 *     a professional third-party audit.
 */
contract ClearFundEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    enum MilestoneStatus {
        Pending,     // unused in current flow (milestones start InProgress)
        InProgress,  // milestone added, work not yet signalled as done
        Completed,   // organizer signalled done, awaiting reviewer approval
        Approved,    // reviewer approved, payout authorised
        Paid         // funds transferred to recipient
    }

    struct Campaign {
        address organizer;
        address recipient;
        uint256 target;
        string  metadataURI;
        uint256 totalContributed;
        uint256 totalPaidOut;
        bool    active;
        uint256 milestoneCount;
        uint256 totalAllocated;
    }

    struct Milestone {
        string          description;
        uint256         amount;
        MilestoneStatus status;
        string          evidenceURI;
        bool            paid;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice The USDC token this contract accepts. Immutable after deployment.
    IERC20 public immutable usdcToken;

    /// @notice Address authorised to approve milestones. Changeable by owner only.
    address public reviewer;

    /// @notice Maximum number of milestones allowed per campaign.
    /// @dev    Prevents unbounded O(n) loops in updateRecipient and cancelCampaign.
    uint256 public constant MAX_MILESTONES = 50;

    /// @notice Auto-incrementing campaign counter; also the next campaign ID.
    uint256 public nextCampaignId;

    /// @notice Campaign data keyed by campaign ID.
    mapping(uint256 => Campaign) public campaigns;

    /// @notice Milestone data: campaigns[id].milestones[index].
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;

    /**
     * @notice Per-campaign per-contributor contribution amounts.
     * @dev    Used exclusively for refund accounting. Never decremented on payouts.
     *         Zeroed per-contributor when claimRefund is called.
     */
    mapping(uint256 => mapping(address => uint256)) public contributions;

    /**
     * @notice Live USDC balance attributed to each campaign.
     * @dev    Incremented by contribute(), decremented by releaseMilestone() and
     *         claimRefund(). Invariant: campaignBalance[id] <= totalContributed[id].
     */
    mapping(uint256 => uint256) public campaignBalance;

    // ─────────────────────────────────────────────────────────────────────────
    // Custom errors
    // ─────────────────────────────────────────────────────────────────────────

    error ZeroAddress();
    error ZeroAmount();
    error InvalidCampaign();
    error NotOrganizer();
    error NotReviewer();
    error CampaignInactive();
    error CampaignStillActive();
    error MilestoneAllocationExceeded();
    error TooManyMilestones();
    error ApprovedMilestoneBlocksCancel();
    error PayoutAlreadyMadeBlocksCancel();
    error EvidenceLockedAfterApproval();
    error MissingMilestoneEvidence();
    error InvalidMilestoneIndex();
    error InvalidMilestoneStatus(MilestoneStatus expected, MilestoneStatus actual);
    error MilestoneAlreadyPaid();
    error InsufficientCampaignBalance();
    error NothingToRefund();
    error ApprovedMilestonePending();
    error InsufficientRefundBalance();

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event CampaignCreated(uint256 indexed campaignId, address indexed organizer, address indexed recipient, uint256 target);
    event MilestoneAdded(uint256 indexed campaignId, uint256 milestoneIndex, uint256 amount);
    event Contributed(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event EvidenceSubmitted(uint256 indexed campaignId, uint256 milestoneIndex, string evidenceURI);
    event MilestoneCompleted(uint256 indexed campaignId, uint256 milestoneIndex);
    event MilestoneApproved(uint256 indexed campaignId, uint256 milestoneIndex, address indexed approver);
    event MilestoneReleased(uint256 indexed campaignId, uint256 milestoneIndex, address indexed recipient, uint256 amount);
    event CampaignCancelled(uint256 indexed campaignId);
    event ReviewerSet(address indexed newReviewer);
    event RecipientUpdated(uint256 indexed campaignId, address indexed oldRecipient, address indexed newRecipient);
    event RefundClaimed(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event ApprovalRevoked(uint256 indexed campaignId, uint256 milestoneIndex, address indexed revoker);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Deploys the escrow.
     * @param usdcTokenAddress  Address of the USDC ERC-20 token (6 decimals on Arc).
     * @param initialReviewer   Address that may approve milestones.
     */
    constructor(address usdcTokenAddress, address initialReviewer) Ownable(msg.sender) {
        if (usdcTokenAddress == address(0) || initialReviewer == address(0)) revert ZeroAddress();
        usdcToken = IERC20(usdcTokenAddress);
        reviewer  = initialReviewer;
        emit ReviewerSet(initialReviewer);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Campaign management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Creates a new campaign.
     * @param recipient    Address that receives released milestone payouts.
     * @param target       Total campaign target in USDC base units (1 USDC = 1_000_000).
     * @param metadataURI  Off-chain reference to campaign title/description.
     * @return campaignId  The newly assigned campaign ID.
     */
    function createCampaign(
        address recipient,
        uint256 target,
        string calldata metadataURI
    ) external returns (uint256 campaignId) {
        if (recipient == address(0)) revert ZeroAddress();
        if (target == 0) revert ZeroAmount();

        campaignId = nextCampaignId;
        nextCampaignId = campaignId + 1;

        Campaign storage campaign = campaigns[campaignId];
        campaign.organizer   = msg.sender;
        campaign.recipient   = recipient;
        campaign.target      = target;
        campaign.metadataURI = metadataURI;
        campaign.active      = true;

        emit CampaignCreated(campaignId, msg.sender, recipient, target);
    }

    /**
     * @notice Adds a milestone to an active campaign.
     * @dev    The sum of all milestone amounts must not exceed the campaign target.
     * @param campaignId   ID of the campaign.
     * @param description  Off-chain milestone description.
     * @param amount       USDC allocation for this milestone (base units).
     */
    function addMilestone(
        uint256 campaignId,
        string calldata description,
        uint256 amount
    ) external {
        Campaign storage campaign = campaigns[campaignId];
        _requireValidCampaign(campaign);
        if (campaign.organizer != msg.sender) revert NotOrganizer();
        if (!campaign.active) revert CampaignInactive();
        if (amount == 0) revert ZeroAmount();
        if (campaign.milestoneCount >= MAX_MILESTONES) revert TooManyMilestones();

        uint256 newTotalAllocated = campaign.totalAllocated + amount;
        if (newTotalAllocated > campaign.target) revert MilestoneAllocationExceeded();

        uint256 milestoneIndex   = campaign.milestoneCount;
        campaign.milestoneCount  = milestoneIndex + 1;
        campaign.totalAllocated  = newTotalAllocated;

        Milestone storage m = milestones[campaignId][milestoneIndex];
        m.description = description;
        m.amount      = amount;
        m.status      = MilestoneStatus.InProgress;

        emit MilestoneAdded(campaignId, milestoneIndex, amount);
    }

    /**
     * @notice Cancels an active campaign.
     * @dev    After cancellation contributors may call claimRefund().
     *         No new contributions or milestones are accepted.
     *         Cancellation is BLOCKED after any payout, or while any milestone
     *         is in Approved status.
     *         Reason: releaseMilestone requires active=true, so Approved
     *         milestones must first be revoked by the reviewer. Releasing
     *         an Approved milestone instead permanently blocks cancellation.
     *         This conservative policy keeps full original refund claims
     *         backed by escrow funds on cancelled campaigns.
     * @param campaignId  ID of the campaign.
     */
    function cancelCampaign(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];
        _requireValidCampaign(campaign);
        if (campaign.organizer != msg.sender) revert NotOrganizer();
        if (!campaign.active) revert CampaignInactive();

        // Once funds have been paid out, full original contribution refunds
        // cannot be guaranteed. Prevent cancellation rather than allowing
        // order-dependent, undercollateralized refund claims.
        if (campaign.totalPaidOut != 0) revert PayoutAlreadyMadeBlocksCancel();

        // Block cancellation while any milestone is Approved but not yet Paid.
        // This prevents USDC from being permanently locked in the escrow.
        uint256 count = campaign.milestoneCount;
        for (uint256 i = 0; i < count; ++i) {
            if (milestones[campaignId][i].status == MilestoneStatus.Approved) {
                revert ApprovedMilestoneBlocksCancel();
            }
        }

        campaign.active = false;
        emit CampaignCancelled(campaignId);
    }

    /**
     * @notice Updates the payout recipient address.
     * @dev    Blocked when any milestone is in Approved status to prevent a
     *         malicious organizer from redirecting an imminent approved payout.
     *         Allowed on inactive campaigns that still hold a balance, so
     *         organisers can remediate a blocklisted recipient after cancellation.
     * @param campaignId   ID of the campaign.
     * @param newRecipient New address to receive future milestone payouts.
     */
    function updateRecipient(uint256 campaignId, address newRecipient) external {
        Campaign storage campaign = campaigns[campaignId];
        _requireValidCampaign(campaign);
        if (campaign.organizer != msg.sender) revert NotOrganizer();
        // Allow on inactive campaigns that still hold a balance (blocklist remediation).
        if (!campaign.active && campaignBalance[campaignId] == 0) revert CampaignInactive();
        if (newRecipient == address(0)) revert ZeroAddress();

        // Block if any milestone is awaiting payout (Approved but not yet Paid).
        uint256 count = campaign.milestoneCount;
        for (uint256 i = 0; i < count; ++i) {
            if (milestones[campaignId][i].status == MilestoneStatus.Approved) {
                revert ApprovedMilestonePending();
            }
        }

        address oldRecipient = campaign.recipient;
        campaign.recipient   = newRecipient;
        emit RecipientUpdated(campaignId, oldRecipient, newRecipient);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Contributions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Contributes USDC to an active campaign.
     * @dev    Caller must have approved this contract for at least `amount` USDC.
     *         Uses checks-effects-interactions: state is updated before safeTransferFrom.
     * @param campaignId  ID of the campaign.
     * @param amount      USDC base units to contribute.
     */
    function contribute(uint256 campaignId, uint256 amount) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        _requireValidCampaign(campaign);
        if (!campaign.active) revert CampaignInactive();
        if (amount == 0) revert ZeroAmount();

        campaign.totalContributed        += amount;
        contributions[campaignId][msg.sender] += amount;
        campaignBalance[campaignId]      += amount;

        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Contributed(campaignId, msg.sender, amount);
    }

    /**
     * @notice Returns a contributor's full contribution to a cancelled campaign.
     * @dev    Only callable when the campaign is inactive (cancelled).
     *         Zeroes the contributor's record before transferring to prevent double-refund.
     *         Uses checks-effects-interactions and nonReentrant guard.
     *         Cancellation is forbidden after a payout, so every contributor's
     *         full original claim remains backed by that campaign's balance.
     *         Cross-campaign isolation: only `campaignBalance[campaignId]` is touched;
     *         no other campaign's balance can be spent here.
     * @param campaignId  ID of the cancelled campaign.
     */
    function claimRefund(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        _requireValidCampaign(campaign);
        // Refunds only available after cancellation.
        if (campaign.active) revert CampaignStillActive();

        uint256 refundAmount = contributions[campaignId][msg.sender];
        if (refundAmount == 0) revert NothingToRefund();

        // Revert if campaign balance cannot cover this contributor's full entitlement.
        // Defense in depth: cancellation forbids prior payouts, so under normal
        // token behavior this balance is sufficient for every contributor.
        if (campaignBalance[campaignId] < refundAmount) revert InsufficientRefundBalance();

        // Checks-effects-interactions: decrement state before transfer.
        contributions[campaignId][msg.sender]  = 0;
        campaignBalance[campaignId]           -= refundAmount;

        usdcToken.safeTransfer(msg.sender, refundAmount);
        emit RefundClaimed(campaignId, msg.sender, refundAmount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Milestone lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Attaches or updates off-chain evidence for a milestone.
     * @dev    Recording evidence does NOT change milestone status.
     *         Only the reviewer can advance status to Approved.
     * @param campaignId     ID of the campaign.
     * @param milestoneIndex Index of the milestone within the campaign.
     * @param evidenceURI    Off-chain link (e.g. IPFS CID) to supporting evidence.
     */
    function submitEvidence(
        uint256 campaignId,
        uint256 milestoneIndex,
        string calldata evidenceURI
    ) external {
        Campaign storage campaign = campaigns[campaignId];
        _requireValidCampaign(campaign);
        if (!campaign.active) revert CampaignInactive();
        if (campaign.organizer != msg.sender) revert NotOrganizer();

        Milestone storage m = _getMilestone(campaign, campaignId, milestoneIndex);
        // Once a reviewer approves evidence, the organizer must not be able
        // to rewrite what was approved while approval remains in force.
        if (m.status == MilestoneStatus.Approved || m.status == MilestoneStatus.Paid) {
            revert EvidenceLockedAfterApproval();
        }
        m.evidenceURI = evidenceURI;
        emit EvidenceSubmitted(campaignId, milestoneIndex, evidenceURI);
    }

    /**
     * @notice Signals that a milestone's work is done and ready for reviewer inspection.
     * @dev    Advances status InProgress → Completed. Only organizer may call.
     * @param campaignId     ID of the campaign.
     * @param milestoneIndex Index of the milestone.
     */
    function markMilestoneComplete(uint256 campaignId, uint256 milestoneIndex) external {
        Campaign storage campaign = campaigns[campaignId];
        _requireValidCampaign(campaign);
        if (!campaign.active) revert CampaignInactive();
        if (campaign.organizer != msg.sender) revert NotOrganizer();

        Milestone storage m = _getMilestone(campaign, campaignId, milestoneIndex);
        if (m.status != MilestoneStatus.InProgress) {
            revert InvalidMilestoneStatus(MilestoneStatus.InProgress, m.status);
        }

        m.status = MilestoneStatus.Completed;
        emit MilestoneCompleted(campaignId, milestoneIndex);
    }

    /**
     * @notice Approves a completed milestone, authorising its payout.
     * @dev    ONLY the reviewer address may call this. Evidence submission alone
     *         does not trigger approval — this explicit call is required.
     *         Advances status Completed → Approved.
     * @param campaignId     ID of the campaign.
     * @param milestoneIndex Index of the milestone.
     */
    function approveMilestone(uint256 campaignId, uint256 milestoneIndex) external {
        if (msg.sender != reviewer) revert NotReviewer();

        Campaign storage campaign = campaigns[campaignId];
        _requireValidCampaign(campaign);
        if (!campaign.active) revert CampaignInactive();

        Milestone storage m = _getMilestone(campaign, campaignId, milestoneIndex);
        if (m.status != MilestoneStatus.Completed) {
            revert InvalidMilestoneStatus(MilestoneStatus.Completed, m.status);
        }

        if (bytes(m.evidenceURI).length == 0) revert MissingMilestoneEvidence();

        m.status = MilestoneStatus.Approved;
        emit MilestoneApproved(campaignId, milestoneIndex, msg.sender);
    }

    /**
     * @notice Revokes a milestone's Approved status, returning it to Completed.
     * @dev    Only the reviewer may call this. Intended as a remediation path when
     *         the recipient address becomes blocklisted or otherwise unreachable after
     *         approval: the reviewer revokes, the organizer calls updateRecipient
     *         (now allowed since no milestone is Approved), then marks complete again
     *         if needed, and the reviewer re-approves.
     *         This does NOT revert status further than Approved → Completed.
     * @param campaignId     ID of the campaign.
     * @param milestoneIndex Index of the milestone.
     */
    function revokeApproval(uint256 campaignId, uint256 milestoneIndex) external {
        if (msg.sender != reviewer) revert NotReviewer();

        Campaign storage campaign = campaigns[campaignId];
        _requireValidCampaign(campaign);
        if (!campaign.active) revert CampaignInactive();

        Milestone storage m = _getMilestone(campaign, campaignId, milestoneIndex);
        if (m.status != MilestoneStatus.Approved) {
            revert InvalidMilestoneStatus(MilestoneStatus.Approved, m.status);
        }

        m.status = MilestoneStatus.Completed;
        emit ApprovalRevoked(campaignId, milestoneIndex, msg.sender);
    }

    /**
     * @notice Releases approved milestone funds to the campaign recipient.
     * @dev    Requires: milestone.status == Approved, !milestone.paid,
     *         campaignBalance[id] >= milestone.amount.
     *         Uses checks-effects-interactions: all state updated before safeTransfer.
     *         nonReentrant guard applied.
     * @param campaignId     ID of the campaign.
     * @param milestoneIndex Index of the milestone.
     */
    function releaseMilestone(uint256 campaignId, uint256 milestoneIndex) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        _requireValidCampaign(campaign);
        if (campaign.organizer != msg.sender) revert NotOrganizer();
        // Payout blocked on cancelled campaigns — balance is reserved for contributor refunds.
        if (!campaign.active) revert CampaignInactive();

        Milestone storage m = _getMilestone(campaign, campaignId, milestoneIndex);
        if (m.status != MilestoneStatus.Approved) {
            revert InvalidMilestoneStatus(MilestoneStatus.Approved, m.status);
        }
        if (m.paid) revert MilestoneAlreadyPaid();
        if (campaignBalance[campaignId] < m.amount) revert InsufficientCampaignBalance();

        // Checks-effects-interactions
        m.paid    = true;
        m.status  = MilestoneStatus.Paid;
        campaign.totalPaidOut        += m.amount;
        campaignBalance[campaignId]  -= m.amount;

        usdcToken.safeTransfer(campaign.recipient, m.amount);
        emit MilestoneReleased(campaignId, milestoneIndex, campaign.recipient, m.amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Owner administration
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Replaces the global milestone reviewer.
     * @dev    The owner cannot touch campaign funds. Only this function and the
     *         inherited renounceOwnership / transferOwnership are available to owner.
     *         For production, use a multi-sig as the reviewer to avoid single-key risk.
     * @param newReviewer  Address to grant milestone-approval authority.
     */
    function setReviewer(address newReviewer) external onlyOwner {
        if (newReviewer == address(0)) revert ZeroAddress();
        reviewer = newReviewer;
        emit ReviewerSet(newReviewer);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _requireValidCampaign(Campaign storage campaign) internal view {
        if (campaign.organizer == address(0)) revert InvalidCampaign();
    }

    function _getMilestone(
        Campaign storage campaign,
        uint256 campaignId,
        uint256 milestoneIndex
    ) internal view returns (Milestone storage m) {
        if (milestoneIndex >= campaign.milestoneCount) revert InvalidMilestoneIndex();
        m = milestones[campaignId][milestoneIndex];
    }
}
