// art-guard/hooks/store.ts
import type { EIP6963ProviderDetail, EIP6963AnnounceProviderEvent, EIP1193Provider } from "../types/eip6963";

// Use a simple in-memory array. This resets when the popup closes,
// but the discovery runs again when it reopens.
let providers: EIP6963ProviderDetail[] = [];

export const store = {
    // Get the current list of providers
    value: () => providers,

    // Subscribe to changes (new providers announced)
    subscribe: (callback: () => void): (() => void) => { // Return cleanup function type

        function onAnnouncement(event: EIP6963AnnounceProviderEvent) {
            // Ensure we have detail and info (type guard)
            if (event.detail?.info) {
                 // Prevent duplicates based on UUID
                if (!providers.some((p) => p.info.uuid === event.detail.info.uuid)) {
                    providers = [...providers, event.detail];
                    callback(); // Notify subscribers (React components) of the change
                }
            }
        }

        // Listen for EIP-6963 announcements
        window.addEventListener("eip6963:announceProvider", onAnnouncement);
        // Immediately request providers in case wallets are already loaded
        window.dispatchEvent(new Event("eip6963:requestProvider"));

        // Return a cleanup function to remove the listener when the subscriber unmounts
        return () => {
            window.removeEventListener("eip6963:announceProvider", onAnnouncement);
        }
    },
};