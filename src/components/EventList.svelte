<script>
import { onMount, onDestroy } from 'svelte';
import { fade } from 'svelte/transition';
import NDK from "@nostr-dev-kit/ndk";
import { eventsStore, profilesStore } from '../utils/store.js';
import { searchStore } from '../lib/stores/searchStore';
import EventGrid from './EventGrid.svelte';

let eventsKind1 = [];
let filteredEvents = [];
let profiles = {};
let isLoading = true;
let searchQuery = '';

let ndk;
let subscriptionKind1;
let subscriptionKind0;

// Subscribe to search store changes
searchStore.subscribe(value => {
  searchQuery = value.query;
  updateFilteredEvents();
});

function updateFilteredEvents() {
  if (!searchQuery) {
    filteredEvents = eventsKind1;
    return;
  }

  const searchLower = searchQuery.toLowerCase();
  filteredEvents = eventsKind1.filter(event => {
    const details = extractEventDetails(event.tags);
    return (
      details.title?.toLowerCase().includes(searchLower) ||
      details.description?.toLowerCase().includes(searchLower) ||
      details.location?.toLowerCase().includes(searchLower)
    );
  });
}

function handleSearchClear() {
  searchQuery = '';
  updateFilteredEvents();
}

function extractEventDetails(tags) {
  const eventDetails = {};
  if (!tags) return eventDetails;
  
  tags.forEach(([key, value]) => {
    switch (key) {
      case 'title':
        eventDetails.title = value;
        break;
      case 'description':
        eventDetails.description = value;
        break;
      case 'location':
        eventDetails.location = value;
        break;
    }
  });
  return eventDetails;
}

onMount(async () => {
  try {
    ndk = new NDK({
      explicitRelayUrls: [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.band'
      ]
    });

    await ndk.connect();
    console.log("Connected to relay");
    
    const seenEventIds = new Set();
    const subscribedPubkeys = new Set();

    const subscribeToProfiles = async (pubkeys) => {
      const newPubkeys = pubkeys.filter(pubkey => !subscribedPubkeys.has(pubkey));
      
      if (newPubkeys.length === 0) return;
      
      console.log("Subscribing to profiles for pubkeys:", newPubkeys);
      
      try {
        // First, try to fetch profiles directly
        const profileEvents = await ndk.fetchEvents({
          kinds: [0],
          authors: newPubkeys,
        });

        // Process any immediately available profiles
        for (const event of profileEvents) {
          try {
            const profile = JSON.parse(event.content);
            profiles = { ...profiles, [event.pubkey]: { ...profile, pubkey: event.pubkey } };
            profilesStore.set({ ...profiles }); // Update the store with all profiles
            subscribedPubkeys.add(event.pubkey);
          } catch (e) {
            console.error("Error parsing profile:", e);
          }
        }

        // Then subscribe for updates
        const sub = ndk.subscribe({
          kinds: [0],
          authors: newPubkeys,
        });

        // Clean up previous subscription but maintain existing profiles
        if (subscriptionKind0) {
          try {
            subscriptionKind0.removeAllListeners();
          } catch (e) {
            console.error("Error cleaning up previous profile subscription:", e);
          }
        }
        subscriptionKind0 = sub;

        sub.on('event', (event) => {
          try {
            const profile = JSON.parse(event.content);
            profiles = { ...profiles, [event.pubkey]: { ...profile, pubkey: event.pubkey } };
            profilesStore.set({ ...profiles }); // Update the store with all profiles
            subscribedPubkeys.add(event.pubkey);
          } catch (e) {
            console.error("Error parsing profile:", e);
          }
        });
      } catch (e) {
        console.error("Error fetching profiles:", e);
      }
    };

    const sub = ndk.subscribe({
      kinds: [31923],
      since: Math.floor(Date.now() / 1000) - 24 * 60 * 60
    });

    // Clean up previous subscription
    if (subscriptionKind1) {
      try {
        subscriptionKind1.removeAllListeners();
      } catch (e) {
        console.error("Error cleaning up previous events subscription:", e);
      }
    }
    subscriptionKind1 = sub;

    sub.on('event', (event) => {
      if (!seenEventIds.has(event.id)) {
        seenEventIds.add(event.id);
        eventsKind1 = [...eventsKind1, event];
        eventsStore.update(events => [...events, event]);
        
        if (!subscribedPubkeys.has(event.pubkey)) {
          subscribeToProfiles([event.pubkey]);
        }
      }
    });

    isLoading = false;
  } catch (error) {
    console.error("Error connecting to relay:", error);
    isLoading = false;
  }
});

onDestroy(() => {
  // Clean up subscriptions but preserve profile data
  if (subscriptionKind1) {
    try {
      subscriptionKind1.removeAllListeners();
      subscriptionKind1 = null;
    } catch (e) {
      console.error("Error cleaning up events subscription:", e);
    }
  }
  if (subscriptionKind0) {
    try {
      subscriptionKind0.removeAllListeners();
      subscriptionKind0 = null;
    } catch (e) {
      console.error("Error cleaning up profile subscription:", e);
    }
  }
  // Clean up NDK connection but ensure profiles are preserved
  if (ndk) {
    try {
      // Store current profiles before cleanup
      if (Object.keys(profiles).length > 0) {
        console.log("Preserving profiles before cleanup:", profiles);
        profilesStore.set({ ...profiles });
      }
      
      // Close all relay connections
      for (const relay of ndk.pool.relays.values()) {
        relay.disconnect();
      }
      ndk.pool.relays.clear();
    } catch (e) {
      console.error("Error cleaning up NDK connection:", e);
    }
  }
});

$: visibleEvents = filteredEvents.length > 0 ? filteredEvents : eventsKind1;
</script>

{#if isLoading}
  <div class="loading-overlay">
    <div class="loading-spinner"></div>
    <span>Loading events and profiles...</span>
  </div>
{:else if !searchQuery && eventsKind1.length === 0}
  <div class="no-results">
    <span>No events found in the last 24 hours.</span>
  </div>
{:else if searchQuery && filteredEvents.length === 0}
  <div class="no-results">
    <p>No events found matching "{searchQuery}"</p>
    <button class="clear-search" on:click={handleSearchClear}>
      Clear search
    </button>
  </div>
{:else}
  {#if searchQuery}
    <div class="search-header">
      <h2>Search Results for "{searchQuery}"</h2>
      <button class="clear-search" on:click={handleSearchClear}>
        Clear search
      </button>
    </div>
  {/if}
  <div class="events-container">
    <EventGrid events={visibleEvents} {profiles} />
  </div>
{/if}

<style>
  .loading-overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }

  .loading-spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .no-results {
    text-align: center;
    padding: 2rem;
  }

  .clear-search {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 1rem;
  }

  .clear-search:hover {
    background-color: #2980b9;
  }

  .search-header {
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .events-container {
    width: 100%;
  }
</style>
