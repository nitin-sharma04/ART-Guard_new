// art-guard/hooks/useSyncProviders.ts
import { useSyncExternalStore } from "react";
import { store } from "./store";

/**
 * React hook to get the list of EIP-6963 discovered wallet providers
 * and subscribe to updates.
 */
export const useSyncProviders = () => {
    // useSyncExternalStore ensures the component re-renders when the store changes
    const providers = useSyncExternalStore(
        store.subscribe, // Function to subscribe to store changes
        store.value,     // Function to get the current value on the client
        store.value      // Function to get the current value on the server (same for client-side)
    );
    return providers;
};