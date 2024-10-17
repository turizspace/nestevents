// utils/store.js
import { writable } from 'svelte/store';

export const eventsStore = writable([]);  // Holds all events
export const profilesStore = writable({});  // Holds profiles from kind 0
