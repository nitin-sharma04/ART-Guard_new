// art-guard/utils/index.ts

/**
 * Formats a raw wei balance string into a more readable ETH format (e.g., "1.23").
 * Assumes 18 decimal places.
 */
export const formatBalance = (rawBalance: string): string => {
    try {
        // Use BigInt for safety with large numbers if needed, or parseFloat for simplicity
        const balanceInEth = parseFloat(rawBalance) / 10**18;
        return balanceInEth.toFixed(2); // Adjust decimal places as needed
    } catch {
        return "0.00"; // Fallback on error
    }
};

/**
 * Converts a hexadecimal chain ID string (e.g., "0x1") to its number representation.
 */
export const formatChainAsNum = (chainIdHex: string): number => {
    try {
        return parseInt(chainIdHex, 16);
    } catch {
        return 0; // Fallback on error
    }
};

/**
 * Truncates an Ethereum address to the format "0x123...abc".
 */
export const formatAddress = (addr: string | null | undefined): string => {
    if (!addr || addr.length < 10) return ""; // Handle null/undefined/short addresses
    // Ensure '0x' prefix if missing, though unlikely for valid addresses
    const cleanAddr = addr.startsWith('0x') ? addr : '0x' + addr;
    if (cleanAddr.length < 10) return cleanAddr; // Handle cases like '0x' itself
    return `${cleanAddr.substring(0, 6)}...${cleanAddr.substring(cleanAddr.length - 4)}`;
};