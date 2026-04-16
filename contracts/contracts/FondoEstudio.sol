// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract FondoEstudio is Ownable, ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────────────
    IERC20 public immutable usdc;
    uint256 public constant MIN_MEMBERSHIP_DEPOSIT = 1_000_000; // 1 USDC (6 dec)
    uint256 public constant VOTING_DURATION = 48 hours;
    uint256 public constant QUORUM_PERCENT = 30; // 30% of members

    // ─── Structs ──────────────────────────────────────────────────────────────
    struct Request {
        uint256 id;
        address requester;
        string title;
        string description;
        string category; // "utiles" | "beca" | "uniforme" | "cuota" | "infraestructura" | "otro"
        uint256 amount; // USDC (6 decimals)
        address beneficiary;
        string evidenceUrl;
        uint256 votingDeadline;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        bool closed;
    }

    // ─── State ────────────────────────────────────────────────────────────────
    mapping(address => uint256) public memberDeposits;
    mapping(address => bool) public isMember;
    address[] public members;
    uint256 public totalPoolBalance;

    Request[] public requests;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public voteChoice; // true=yes

    // ─── Events ───────────────────────────────────────────────────────────────
    event Deposited(address indexed depositor, uint256 amount, bool becameMember);
    event RequestSubmitted(uint256 indexed requestId, address indexed requester, uint256 amount);
    event Voted(uint256 indexed requestId, address indexed voter, bool support);
    event RequestExecuted(uint256 indexed requestId, address indexed beneficiary, uint256 amount);
    event RequestClosed(uint256 indexed requestId, string reason);
    event Withdrawn(address indexed member, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    // ─── Core Actions ─────────────────────────────────────────────────────────

    /// @notice Deposit USDC to the pool. With >= 1 USDC accumulated, you become a member.
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        usdc.transferFrom(msg.sender, address(this), amount);
        memberDeposits[msg.sender] += amount;
        totalPoolBalance += amount;

        bool becameMember = false;
        if (!isMember[msg.sender] && memberDeposits[msg.sender] >= MIN_MEMBERSHIP_DEPOSIT) {
            isMember[msg.sender] = true;
            members.push(msg.sender);
            becameMember = true;
        }

        emit Deposited(msg.sender, amount, becameMember);
    }

    /// @notice Submit a funding request. Open to any address.
    function submitRequest(
        string calldata title,
        string calldata description,
        string calldata category,
        uint256 amount,
        address beneficiary,
        string calldata evidenceUrl
    ) external {
        require(bytes(title).length > 0 && bytes(title).length <= 100, "Invalid title length");
        require(bytes(description).length <= 500, "Description too long");
        require(amount > 0, "Amount must be > 0");
        require(amount <= totalPoolBalance, "Exceeds pool balance");
        require(beneficiary != address(0), "Invalid beneficiary");

        uint256 requestId = requests.length;
        requests.push(
            Request({
                id: requestId,
                requester: msg.sender,
                title: title,
                description: description,
                category: category,
                amount: amount,
                beneficiary: beneficiary,
                evidenceUrl: evidenceUrl,
                votingDeadline: block.timestamp + VOTING_DURATION,
                yesVotes: 0,
                noVotes: 0,
                executed: false,
                closed: false
            })
        );

        emit RequestSubmitted(requestId, msg.sender, amount);
    }

    /// @notice Vote on an active request. Members only, once per request.
    function vote(uint256 requestId, bool support) external {
        require(isMember[msg.sender], "Not a member");
        require(requestId < requests.length, "Invalid request ID");
        Request storage req = requests[requestId];
        require(block.timestamp < req.votingDeadline, "Voting period ended");
        require(!req.executed && !req.closed, "Request already finalized");
        require(!hasVoted[requestId][msg.sender], "Already voted");

        hasVoted[requestId][msg.sender] = true;
        voteChoice[requestId][msg.sender] = support;

        if (support) {
            req.yesVotes++;
        } else {
            req.noVotes++;
        }

        emit Voted(requestId, msg.sender, support);
    }

    /// @notice Execute a request after voting window closes.
    ///         Anyone can call. The contract decides if it approves or closes.
    function execute(uint256 requestId) external nonReentrant {
        require(requestId < requests.length, "Invalid request ID");
        Request storage req = requests[requestId];
        require(block.timestamp >= req.votingDeadline, "Voting still active");
        require(!req.executed && !req.closed, "Already finalized");
        require(req.amount <= totalPoolBalance, "Insufficient pool balance");

        uint256 totalVotes = req.yesVotes + req.noVotes;
        uint256 quorumNeeded = (members.length * QUORUM_PERCENT + 99) / 100; // ceil

        if (totalVotes >= quorumNeeded && req.yesVotes > req.noVotes) {
            req.executed = true;
            totalPoolBalance -= req.amount;
            usdc.transfer(req.beneficiary, req.amount);
            emit RequestExecuted(requestId, req.beneficiary, req.amount);
        } else {
            req.closed = true;
            string memory reason = totalVotes < quorumNeeded ? "No quorum reached" : "Majority rejected";
            emit RequestClosed(requestId, reason);
        }
    }

    // ─── Owner withdraw (excess not committed) ───────────────────────────────
    function ownerWithdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= totalPoolBalance, "Exceeds pool");
        totalPoolBalance -= amount;
        usdc.transfer(owner(), amount);
        emit Withdrawn(owner(), amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    function getRequests() external view returns (Request[] memory) {
        return requests;
    }

    function getMemberCount() external view returns (uint256) {
        return members.length;
    }

    function getRequestCount() external view returns (uint256) {
        return requests.length;
    }

    function getRequestStatus(uint256 requestId)
        external
        view
        returns (bool isActive, bool isPassed, bool isExecuted, bool isClosed)
    {
        Request storage req = requests[requestId];
        isActive = block.timestamp < req.votingDeadline && !req.executed && !req.closed;
        isPassed = !isActive && req.yesVotes > req.noVotes;
        isExecuted = req.executed;
        isClosed = req.closed;
    }
}
