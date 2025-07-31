import { writable } from 'svelte/store';
import NDK from '@nostr-dev-kit/ndk';

// Create a writable store for the NDK instance
export const ndkStore = writable<NDK | null>(null);

// Initialize NDK instance
export async function initializeNDK() {
    try {
        const ndk = new NDK({
            explicitRelayUrls: [
                'wss://relay.damus.io',
                'wss://nos.lol',
                'wss://relay.nostr.band'
            ]
        });
        
        await ndk.connect();
        ndkStore.set(ndk);
        return ndk;
    } catch (error) {
        console.error('Failed to initialize NDK:', error);
        return null;
    }
}
