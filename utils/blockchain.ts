import { ethers } from 'ethers';
import { uploadToIPFS } from './ipfs';

// Contract ABI - import from artifacts after compilation
const ABI = [
    "event EvidenceLogged(address indexed reporter, string ipfsHash, uint256 timestamp)",
    "event RewardMinted(address indexed reporter, uint256 amount)",
    "function logEvidence(string memory ipfsHash) external nonReentrant",
    "function getReporterStats(address reporter) external view returns (uint256)",
    "function evidenceExists(string memory ipfsHash) external view returns (bool)"
];

// Contract addresses
const CONTRACT_ADDRESS = {
    mumbai: '0x...', // Add deployed contract address
    polygon: '0x...' // Add deployed contract address
};

export class BlockchainService {
    private provider?: ethers.providers.Web3Provider;
    private contract?: ethers.Contract;
    private signer?: ethers.Signer;
    private isInitialized: boolean = false;

    constructor() {}

    private async initProvider() {
        const { connectWithWeb3Modal } = await import('./web3modal');
        const connection = await connectWithWeb3Modal();
        this.provider = connection.provider;
        this.signer = connection.signer;
    }

    /**
     * Initialize the blockchain service
     */
    async init() {
        if (this.isInitialized) return;

        try {
            await this.initProvider();
            
            // Verify network and get contract address
            const network = await this.provider!.getNetwork();
            if (network.chainId !== 80001 && network.chainId !== 137) {
                throw new Error('Please switch to Mumbai testnet or Polygon mainnet');
            }
            
            const address = network.chainId === 80001 ? CONTRACT_ADDRESS.mumbai : CONTRACT_ADDRESS.polygon;
            if (!address || address === '0x...') {
                throw new Error('Contract address not configured for this network');
            }
            
            this.contract = new ethers.Contract(address, ABI, this.signer);
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize blockchain service:', error);
            this.isInitialized = false;
            throw new Error(
                error instanceof Error 
                    ? error.message 
                    : 'Failed to connect to wallet. Please ensure your Web3 wallet is installed and unlocked.'
            );
        }
    }

    /**
     * Log evidence to blockchain and mint tokens
     * @param imageData - Base64 image data or URL
     * @param metadata - Additional metadata
     * @returns Transaction hash
     */
    async logEvidence(imageData: string, metadata: Record<string, any>): Promise<string> {
        try {
            if (!this.isInitialized || !this.contract || !this.signer) {
                await this.init();
            }

            if (!this.isInitialized) {
                throw new Error('Blockchain service not properly initialized');
            }

            // Upload to IPFS first
            const ipfsUri = await uploadToIPFS(imageData, metadata);
            
            // Log evidence on blockchain
            const tx = await this.contract!.logEvidence(ipfsUri);
            await tx.wait();
            
            return tx.hash;
            
        } catch (error) {
            console.error('Failed to log evidence:', error);
            throw new Error(
                error instanceof Error
                    ? error.message
                    : 'Failed to log evidence. Please ensure your wallet is connected and has sufficient funds.'
            );
        }
    }

    /**
     * Get reporter statistics
     * @param address - Reporter's address
     * @returns Number of reports
     */
    async getReporterStats(address: string): Promise<number> {
        try {
            if (!this.isInitialized || !this.contract || !this.signer) {
                await this.init();
            }

            if (!this.isInitialized) {
                throw new Error('Blockchain service not properly initialized');
            }

            const stats = await this.contract!.getReporterStats(address);
            return stats.toNumber();
        } catch (error) {
            console.error('Failed to get reporter stats:', error);
            throw new Error(
                error instanceof Error
                    ? error.message
                    : 'Failed to get reporter statistics. Please ensure your wallet is connected.'
            );
        }
    }

    /**
     * Check if evidence exists
     * @param ipfsHash - IPFS hash to check
     * @returns boolean indicating if evidence exists
     */
    async evidenceExists(ipfsHash: string): Promise<boolean> {
        try {
            if (!this.isInitialized || !this.contract || !this.signer) {
                await this.init();
            }

            if (!this.isInitialized) {
                throw new Error('Blockchain service not properly initialized');
            }

            return await this.contract!.evidenceExists(ipfsHash);
        } catch (error) {
            console.error('Failed to check evidence:', error);
            throw new Error(
                error instanceof Error
                    ? error.message
                    : 'Failed to check evidence. Please ensure your wallet is connected.'
            );
        }
    }
}

// Export singleton instance
export const blockchainService = new BlockchainService();