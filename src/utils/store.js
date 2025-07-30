// utils/store.js
import { writable } from 'svelte/store';

// Store for authenticated user state
export const userStore = writable({
    isAuthenticated: false,
    pubkey: null,
    profile: null,
    loading: true
});

// Store for all events
export const eventsStore = writable([]);

// Store for all profiles (kind 0)
export const profilesStore = writable({});

// Actions for user management
export const userActions = {
    setUser: (user) => {
        userStore.update(() => ({
            isAuthenticated: true,
            pubkey: user.pubkey,
            profile: user.profile || null,
            loading: false
        }));
    },
    updateProfile: (profile) => {
        userStore.update(state => ({
            ...state,
            profile
        }));
    },
    clearUser: () => {
        userStore.set({
            isAuthenticated: false,
            pubkey: null,
            profile: null,
            loading: false
        });
    }
};
