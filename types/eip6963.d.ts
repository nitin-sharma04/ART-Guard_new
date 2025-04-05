// art-guard/types/eip6963.d.ts

// Declare EIP-1193 Provider type (base interface for all wallet providers)
export interface EIP1193Provider {
    isStatus?: boolean;
    host?: string;
    path?: string;
    sendAsync?: (request: { method: string; params?: Array<unknown> }, callback: (error: Error | null, response: unknown) => void) => void;
    send?: (request: { method: string; params?: Array<unknown> }, callback: (error: Error | null, response: unknown) => void) => void;
    request: (request: { method: string; params?: Array<unknown> }) => Promise<unknown>;
    // Optional: Listener methods are common but not strictly in base EIP-1193
    on?: (eventName: string | symbol, listener: (...args: any[]) => void) => this;
    removeListener?: (eventName: string | symbol, listener: (...args: any[]) => void) => this;
}

// Declare EIP-6963 Provider Info
export interface EIP6963ProviderInfo {
    rdns: string;  // Reverse Domain Name Service identifier
    uuid: string;  // Universally Unique Identifier
    name: string;  // Wallet name (e.g., "MetaMask")
    icon: string;  // Wallet icon data URI (e.g., "data:image/svg+xml;base64,...")
}

// Declare EIP-6963 Provider Detail (combines info and provider)
export interface EIP6963ProviderDetail {
    info: EIP6963ProviderInfo;
    provider: EIP1193Provider;
}

// Declare the event structure for announcing providers
export type EIP6963AnnounceProviderEvent = Event & { // Use Event directly
    detail: {
        info: EIP6963ProviderInfo;
        provider: EIP1193Provider; // Make provider mutable if needed, else Readonly<>
    };
};

// Extend the global WindowEventMap to recognize the custom event
declare global {
    interface WindowEventMap {
        'eip6963:announceProvider': EIP6963AnnounceProviderEvent;
    }
}