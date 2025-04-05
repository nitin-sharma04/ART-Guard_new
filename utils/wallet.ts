// art-guard/utils/wallet.ts
import { ethers } from 'ethers';

// Define the structure for wallet status updates
export interface WalletStatus {
    isConnected: boolean;
    address: string | null;
    displayAddress?: string | null; // User-friendly truncated address
    error?: string | null;         // Error message if something went wrong
}

// --- Helper: Format address like 0x123...abc ---
const formatAddress = (address: string | null): string => {
    if (!address || address.length < 10) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// --- Helper: Get Web3 Provider ---
// This safely gets the provider injected by MetaMask (window.ethereum)
const getProvider = (): ethers.providers.Web3Provider | null => {
    if (typeof window !== 'undefined' && window.ethereum) {
        try {
            // Create provider; 'any' allows network changes without reloading
            return new ethers.providers.Web3Provider(window.ethereum, 'any');
        } catch (e) {
            console.error("Error creating Web3Provider:", e);
            return null;
        }
    }
    return null; // No provider found
}

/**
 * Connects to the user's wallet (e.g., MetaMask) by prompting them.
 * @returns {Promise<WalletStatus>} The connection status, including address if successful.
 */
export const connectWallet = async (): Promise<WalletStatus> => {
    console.log("[Ethers ConnectWallet] Attempting connection...");
    const provider = getProvider();

    if (!provider) {
        const errorMsg = "MetaMask is not installed or not detected.";
        console.error(`[Ethers ConnectWallet] Error: ${errorMsg}`);
        return { isConnected: false, address: null, error: errorMsg };
    }

    try {
        // Request account access - this prompts the user via MetaMask
        const accounts = await provider.send("eth_requestAccounts", []);

        if (accounts && accounts.length > 0) {
            const connectedAddress = accounts[0];
            console.log("[Ethers ConnectWallet] SUCCESS:", connectedAddress);
            return {
                isConnected: true,
                address: connectedAddress,
                displayAddress: formatAddress(connectedAddress),
            };
        } else {
            // Should generally not happen if request succeeds without error
            console.warn("[Ethers ConnectWallet] eth_requestAccounts returned empty array?");
            return { isConnected: false, address: null, error: "No accounts found after connection attempt." };
        }
    } catch (error: any) {
        console.error("[Ethers ConnectWallet] Error:", error);
        let errorMessage = "Failed to connect wallet.";
        // Check for common user rejection error code
        if (error.code === 4001) {
             errorMessage = "Wallet connection request rejected by user.";
        } else if (error.message) {
             errorMessage = error.message;
        }
        return { isConnected: false, address: null, error: errorMessage };
    }
};

/**
 * Checks if a wallet is already connected without prompting the user.
 * @returns {Promise<WalletStatus>} The connection status, including address if already connected.
 */
export const checkWalletConnection = async (): Promise<WalletStatus> => {
    console.log("[Ethers CheckWalletConnection] Checking status...");
    const provider = getProvider();

     if (!provider) {
        console.log("[Ethers CheckWalletConnection] MetaMask provider not found.");
        // Return the specific error message the UI expects
        return { isConnected: false, address: null, error: "MetaMask is not installed or not detected." };
    }

    try {
        // Check connected accounts without prompting (uses eth_accounts)
        const accounts = await provider.listAccounts();

        if (accounts && accounts.length > 0) {
            const connectedAddress = accounts[0];
            console.log("[Ethers CheckWalletConnection] Found connected account:", connectedAddress);
            return {
                isConnected: true,
                address: connectedAddress,
                displayAddress: formatAddress(connectedAddress),
            };
        } else {
            console.log("[Ethers CheckWalletConnection] Provider has NO connected accounts.");
            return { isConnected: false, address: null };
        }
    } catch (error: any) {
        console.error("[Ethers CheckWalletConnection] Error listing accounts:", error);
        return { isConnected: false, address: null, error: "Could not check wallet status via provider." };
    }
};

/**
 * Signals disconnection from the dApp's perspective (clears UI state).
 * Doesn't force MetaMask to disconnect from the site.
 * @returns {Promise<WalletStatus>} A status object indicating disconnection.
 */
export const disconnectWallet = async (): Promise<WalletStatus> => {
    console.log("[Ethers DisconnectWallet] Clearing client state...");
    // No actual provider disconnect method needed, just update UI state
    return Promise.resolve({ isConnected: false, address: null });
};

/**
 * Optional: Gets the ethers Signer object for the connected account.
 * Needed if you want to send transactions or sign messages later.
 * @returns {Promise<ethers.providers.JsonRpcSigner | null>} The signer or null if unavailable.
 */
export const getSigner = async (): Promise<ethers.providers.JsonRpcSigner | null> => {
     const provider = getProvider();
     if(!provider) {
         console.error("[Ethers GetSigner] Provider not available.");
         return null;
     }
     try {
        // Ensure we have accounts connected before getting signer
        const accounts = await provider.listAccounts();
        if(accounts && accounts.length > 0) {
            // Get the signer for the first connected account
            const signer = provider.getSigner(accounts[0]);
            console.log("[Ethers GetSigner] Signer obtained for:", accounts[0]);
            return signer;
        } else {
            console.warn("[Ethers GetSigner] No connected account to get signer for.");
            return null;
        }
     } catch (e) {
         console.error("[Ethers GetSigner] Error getting signer:", e);
         return null;
     }
}