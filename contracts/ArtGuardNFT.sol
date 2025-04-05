// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ArtGuardToken is ERC20, Ownable, ReentrancyGuard {
    // Events
    event EvidenceLogged(address indexed reporter, string ipfsHash, uint256 timestamp);
    event RewardMinted(address indexed reporter, uint256 amount);
    
    // Constants
    uint256 public constant REPORT_REWARD = 10 * 10**18; // 10 tokens per valid report
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18; // 1 million total supply
    
    // State variables
    mapping(string => bool) public evidenceHashes; // Track submitted evidence hashes
    mapping(address => uint256) public reporterStats; // Track reporter statistics
    
    constructor() ERC20("ArtGuard Token", "ARTV") {
        _mint(msg.sender, 100000 * 10**18); // Initial supply of 100,000 tokens
    }
    
    /**
     * Log evidence and mint reward tokens
     * @param ipfsHash IPFS hash of the evidence
     */
    function logEvidence(string memory ipfsHash) external nonReentrant {
        require(bytes(ipfsHash).length > 0, "Invalid IPFS hash");
        require(!evidenceHashes[ipfsHash], "Evidence already submitted");
        require(totalSupply() + REPORT_REWARD <= MAX_SUPPLY, "Max supply reached");
        
        // Record evidence
        evidenceHashes[ipfsHash] = true;
        reporterStats[msg.sender] += 1;
        
        // Mint reward tokens
        _mint(msg.sender, REPORT_REWARD);
        
        // Emit events
        emit EvidenceLogged(msg.sender, ipfsHash, block.timestamp);
        emit RewardMinted(msg.sender, REPORT_REWARD);
    }
    
    /**
     * Get reporter statistics
     * @param reporter Address of the reporter
     * @return Number of reports submitted
     */
    function getReporterStats(address reporter) external view returns (uint256) {
        return reporterStats[reporter];
    }
    
    /**
     * Check if evidence hash exists
     * @param ipfsHash IPFS hash to check
     * @return bool indicating if hash exists
     */
    function evidenceExists(string memory ipfsHash) external view returns (bool) {
        return evidenceHashes[ipfsHash];
    }
}