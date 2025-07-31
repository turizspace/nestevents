<script>
  import { page } from '$app/stores';
  import { ndkStore } from '$lib/stores/ndkStore';
  import { eventsStore, profilesStore } from '../../../utils/store.js';
  import EventGrid from '../../../components/EventGrid.svelte';
  import Icon from '@iconify/svelte';
  import { fade } from 'svelte/transition';
  
  let events = [];
  let profile = null;
  let loading = true;
  let error = null;
  let loadingProfile = true;
  
  // Get pubkey from route params
  $: pubkey = $page.params.pubkey;

  // Get NDK instance
  let ndkInstance;
  ndkStore.subscribe(value => ndkInstance = value);

  // React to pubkey changes and NDK instance
  $: if (ndkInstance && pubkey) {
    loadOrganizerData(pubkey);
  }

  // Initialize data from stores first
  $: if (pubkey) {
    events = $eventsStore.filter(e => e.pubkey === pubkey);
    profile = $profilesStore[pubkey];
  }

  async function loadOrganizerData(pubkey) {
    try {
      loading = true;
      error = null;
      
      // Set up event subscription
      const eventSub = ndkInstance.subscribe({
        kinds: [31923],
        authors: [pubkey],
        since: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60 // Last 30 days
      });

      // Set up profile subscription
      const profileSub = ndkInstance.subscribe({
        kinds: [0],
        authors: [pubkey]
      });

      // Handle new events
      eventSub.on('event', (event) => {
        // Check both local events and store for duplicates
        if (!events.find(e => e.id === event.id)) {
          events = [...events, event];
          // Update store only if event doesn't exist
          eventsStore.update(store => {
            if (!store.find(e => e.id === event.id)) {
              return [...store, event];
            }
            return store;
          });
        }
      });

      // Handle profile updates
      profileSub.on('event', (event) => {
        try {
          const newProfile = JSON.parse(event.content);
          profile = { ...newProfile, pubkey: event.pubkey };
          profilesStore.update(store => ({ ...store, [event.pubkey]: profile }));
          loadingProfile = false;
        } catch (e) {
          console.error('Failed to parse profile:', e);
        }
      });

      // Initial fetch
      const [eventResults, profileResults] = await Promise.all([
        ndkInstance.fetchEvents({
          kinds: [31923],
          authors: [pubkey],
          since: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
        }),
        ndkInstance.fetchEvents({
          kinds: [0],
          authors: [pubkey],
          limit: 1
        })
      ]);

      // Process initial events
      const initialEvents = Array.from(eventResults);
      
      // First update local events with deduplication
      const seenIds = new Set(events.map(e => e.id));
      events = [
        ...events,
        ...initialEvents.filter(event => !seenIds.has(event.id))
      ];

      // Then update the store with deduplication
      eventsStore.update(store => {
        const storeIds = new Set(store.map(e => e.id));
        const newEvents = initialEvents.filter(event => !storeIds.has(event.id));
        return [...store, ...newEvents];
      });

      // Process initial profile
      const profileEvent = Array.from(profileResults)[0];
      if (profileEvent) {
        try {
          profile = JSON.parse(profileEvent.content);
          profilesStore.update(store => ({ ...store, [pubkey]: profile }));
        } catch (e) {
          console.error('Failed to parse profile:', e);
        }
      }

      loading = false;
      loadingProfile = false;

      return () => {
        eventSub.removeAllListeners();
        profileSub.removeAllListeners();
      };
    } catch (err) {
      console.error('Failed to load organizer data:', err);
      error = err.message;
      loading = false;
      loadingProfile = false;
    }
  }
</script>

<div class="organizer-page" transition:fade>
  <nav class="breadcrumb">
    <a href="/" class="back-link">
      <Icon icon="mdi:arrow-left" />
      Back to Events
    </a>
  </nav>

  {#if error}
    <div class="error" transition:fade>
      <Icon icon="mdi:alert-circle" />
      <p>{error}</p>
      <button class="retry-button" on:click={() => loadOrganizerData($page.params.pubkey)}>
        <Icon icon="mdi:refresh" />
        Retry
      </button>
    </div>
  {:else}
    <div class="organizer-header" class:loading-state={loading || loadingProfile}>
      <div class="profile-info">
        {#if loading || loadingProfile}
          <div class="profile-placeholder loading">
            <Icon icon="mdi:loading" class="animate-spin" />
          </div>
        {:else if profile?.picture}
          <img src={profile.picture} alt={profile.name || 'Organizer'} class="profile-picture" transition:fade />
        {:else}
          <div class="profile-placeholder" transition:fade>
            <Icon icon="mdi:account" />
          </div>
        {/if}
        <div class="profile-details">
          <h1>{profile?.name || 'Organizer'}</h1>
          {#if profile?.about}
            <p class="about" transition:fade>{profile.about}</p>
          {/if}
        </div>
      </div>
      <div class="stats" class:loading-state={loading}>
        <div class="stat">
          {#if loading}
            <Icon icon="mdi:loading" class="animate-spin" />
          {:else}
            <span class="value">{events.length}</span>
            <span class="label">Events</span>
          {/if}
        </div>
      </div>
    </div>

    <div class="events-section">
      <h2>Events by {profile?.name || 'Organizer'}</h2>
      {#if events.length > 0}
        {#key pubkey}
          <EventGrid events={events} profiles={{ [pubkey]: profile }} />
        {/key}
      {:else}
        <div class="no-events">
          <Icon icon="mdi:calendar-blank" />
          <p>No events found</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .organizer-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem;
    padding-top: calc(64px + 3.5rem); /* Navbar height + breadcrumb height */
  }

  .breadcrumb {
    position: fixed;
    top: 64px; /* Navbar height */
    left: 0;
    right: 0;
    z-index: 100; /* Ensure it's above other content */
    background: white;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #eee;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .back-link {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #3498db;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    background: #f0f7ff;
    transition: all 0.2s ease;
    color: #3498db;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    background: #f0f7ff;
    transition: all 0.2s ease;
  }

  .back-link:hover {
    background: #e1efff;
    transform: translateY(-1px);
  }

  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem;
    text-align: center;
    background: #fef2f2;
    border-radius: 12px;
    color: #dc2626;
  }

  .retry-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    background: #dc2626;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-button:hover {
    background: #b91c1c;
    transform: translateY(-1px);
  }

  .organizer-header {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
    transition: opacity 0.3s ease;
  }

  .loading-state {
    opacity: 0.7;
    pointer-events: none;
  }

  .profile-info {
    display: flex;
    gap: 2rem;
    align-items: center;
  }

  .profile-picture, .profile-placeholder {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    transition: all 0.3s ease;
  }

  .profile-placeholder {
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    color: #999;
  }

  .profile-placeholder.loading {
    background: #e5e7eb;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .profile-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .profile-details h1 {
    font-size: 2rem;
    font-weight: 600;
    color: #333;
    margin: 0;
  }

  .about {
    color: #666;
    max-width: 600px;
    line-height: 1.6;
  }

  .stats {
    display: flex;
    gap: 2rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 12px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .value {
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  .label {
    font-size: 0.875rem;
    color: #666;
  }

  .events-section {
    margin-top: 2rem;
  }

  .events-section h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 1.5rem;
  }

  .no-events {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem;
    background: white;
    border-radius: 12px;
    color: #666;
    font-size: 1.1rem;
  }

  @media (max-width: 768px) {
    .organizer-page {
      padding: 1rem;
    }

    .organizer-header {
      flex-direction: column;
      padding: 1.5rem;
    }

    .profile-info {
      flex-direction: column;
      text-align: center;
      gap: 1rem;
    }

    .stats {
      width: 100%;
      justify-content: center;
    }
  }
</style>
