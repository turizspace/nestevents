<script>
  import { onMount } from 'svelte';
  import { eventsStore, profilesStore } from '../utils/store.js'; // Make sure the paths are correct
  import NDK, { NDKNip07Signer } from "@nostr-dev-kit/ndk";
  import Icon from '@iconify/svelte';

  export let userPubKey = ''; // Accept userPubKey as a prop
  let eventsKind1 = [];
  let profiles = {};
  let isLoading = true;

  let ndk;
  let subscriptionKind1;
  let subscriptionKind0;

  // Helper function to extract specific tag data
  function getTagValue(tags, key) {
    const tag = tags.find(t => t[0] === key);
    return tag ? tag[1] : null;
  }

  onMount(async () => {
    try {
      // Initialize NDK and connect to relays
      const nip07signer = new NDKNip07Signer();
      ndk = new NDK({
        explicitRelayUrls: [
          'wss://relay.snort.social',
          'wss://relay.primal.net',
          'wss://nostr-02.dorafactory.org',
          'wss://relay.snort.social',
          'wss://relay.damus.io',
          'wss://relay.nostrplebs.com',
          'wss://nos.lol',
        ],
        signer: nip07signer
      });

      // Connect to the relay
      await ndk.connect();

      // Subscribe to events of kind 31923
      subscriptionKind1 = ndk.subscribe({
        kinds: [31923],
        authors: [userPubKey] // Use userPubKey passed as a prop
      });

      // Handle events of kind 1
      subscriptionKind1.on('event', (event) => {
        eventsKind1 = [...eventsKind1, event];
        eventsStore.update(events => [...events, event]);
        isLoading = false;
        console.log(event);
      });

      // Subscribe to profile events (kind 0)
      subscriptionKind0 = ndk.subscribe({
        kinds: [0],
        authors: [userPubKey]
      });

      // Handle profile events (kind 0)
      subscriptionKind0.on('event', (event) => {
        try {
          console.log(event);
          const profile = JSON.parse(event.content);
          profiles[event.pubkey] = profile;
          profilesStore.update(p => ({ ...p, [event.pubkey]: profile }));
        } catch (error) {
          console.error("Error parsing profile:", error);
        }
      });
    } catch (error) {
      console.error("Error during onMount:", error);
    }
  });
</script>

{#if isLoading}
  <div class="loading-overlay">
    <div class="loading-spinner"></div>
    <span>Loading your events...</span>
  </div>
{:else if eventsKind1.length === 0}
  <div class="loading-overlay">
    <span>You haven't created any events yet.</span>
  </div>
{:else}
  <div class="event-container">
    {#each eventsKind1 as event}
      <div class="content-card">
        <!-- Profile Section -->
        <div class="profile-card">
          <div class="profile-img-container">
            <img
              src={profiles[event.pubkey]?.picture || 'https://via.placeholder.com/80'}
              alt="Profile picture"
              class="profile-img"
              loading="lazy"
            />
          </div>
          <div class="profile-info">
            <h3 class="profile-name">{profiles[event.pubkey]?.name || 'You'}</h3>
            <div class="profile-meta">
              <Icon icon="mdi:calendar-clock" class="icon" />
              <span>Event Organizer</span>
            </div>
          </div>
        </div>

        <!-- Event Details -->
        <div class="event-details">
          <h2 class="event-title">
            <Icon icon="mdi:calendar-star" class="icon" />
            {getTagValue(event.tags, 'title')}
          </h2>
          
          <p class="event-description">
            {event.content || 'No description available'}
          </p>
          
          <div class="details-grid">
            <div class="detail-section location-section">
              <div class="detail-header">
                <Icon icon="mdi:map-marker" class="icon" />
                <strong>Location Details</strong>
              </div>
              {#if getTagValue(event.tags, 'location')}
                <p class="detail-item">
                  <span class="detail-label">Venue:</span>
                  <span class="detail-value">{getTagValue(event.tags, 'location')}</span>
                </p>
              {/if}
              {#if getTagValue(event.tags, 'address')}
                <p class="detail-item">
                  <span class="detail-label">Address:</span>
                  <span class="detail-value">{getTagValue(event.tags, 'address')}</span>
                </p>
              {/if}
            </div>
            
            <div class="detail-section time-section">
              <div class="detail-header">
                <Icon icon="mdi:calendar-clock" class="icon" />
                <strong>Time Details</strong>
              </div>
              <div class="time-details">
                <p class="detail-item">
                  <Icon icon="mdi:clock-start" class="icon-small" />
                  <span class="detail-label">Starts:</span>
                  <span class="detail-value">
                    {new Date(parseInt(getTagValue(event.tags, 'start')) * 1000).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    <span class="time-badge">
                      {new Date(parseInt(getTagValue(event.tags, 'start')) * 1000).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </span>
                </p>
                
                <p class="detail-item">
                  <Icon icon="mdi:clock-end" class="icon-small" />
                  <span class="detail-label">Ends:</span>
                  <span class="detail-value">
                    {new Date(parseInt(getTagValue(event.tags, 'end')) * 1000).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    <span class="time-badge">
                      {new Date(parseInt(getTagValue(event.tags, 'end')) * 1000).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Image Gallery -->
        {#if getTagValue(event.tags, 'imeta')}
          <div class="image-gallery">
            <img 
              src={getTagValue(event.tags, 'imeta').split(' ')[1]} 
              alt="Event" 
              class="event-image"
              loading="lazy"
            />
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  /* Container for events */
  .event-container {
    display: grid;
    gap: 32px;
    max-width: 70em;
    margin: 0 auto;
    padding: 24px;
    word-wrap: break-word;
  }

  /* Card styling */
  .content-card {
    --card-padding: clamp(24px, 4vw, 32px);
    --card-radius: 24px;
    --card-bg: rgba(255, 255, 255, 0.98);
    --card-border: rgba(0, 0, 0, 0.06);
    --card-shadow: 
      0 4px 6px rgba(0, 0, 0, 0.02),
      0 8px 24px rgba(0, 0, 0, 0.04),
      0 16px 32px rgba(0, 0, 0, 0.01);
    --transition-base: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --gradient-primary: linear-gradient(135deg, #2196f3, #21d4fd);
    
    background: var(--card-bg);
    border-radius: var(--card-radius);
    box-shadow: var(--card-shadow);
    padding: var(--card-padding);
    display: grid;
    gap: 28px;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--card-border);
    backdrop-filter: blur(20px);
  }

  /* Profile section */
  .profile-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding-bottom: var(--card-padding);
    border-bottom: 1px solid var(--card-border);
  }

  .profile-img-container {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
  }

  .profile-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .profile-name {
    font-size: 1.3rem;
    font-weight: 600;
    margin: 0;
  }

  .profile-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #666;
    font-size: 0.9rem;
  }

  /* Event details */
  .event-details {
    display: grid;
    gap: 24px;
  }

  .event-title {
    font-size: 1.8rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #1a1a1a;
  }

  .event-description {
    font-size: 1.1rem;
    line-height: 1.6;
    color: #444;
    background: rgba(33, 150, 243, 0.03);
    padding: 20px;
    border-radius: 16px;
    margin: 0;
  }

  /* Details grid */
  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    background: rgba(33, 150, 243, 0.02);
    padding: 24px;
    border-radius: 20px;
  }

  .detail-section {
    background: white;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--card-border);
  }

  .detail-item {
    display: grid;
    grid-template-columns: minmax(80px, auto) 1fr;
    gap: 16px;
    margin: 16px 0;
    line-height: 1.6;
    width: 100%;
    min-width: 0;
  }

  .detail-label {
    color: #666;
    font-weight: 500;
  }

  .detail-value {
    color: #1a1a1a;
    font-weight: 500;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    max-width: 100%;
  }

  .time-badge {
    background: rgba(33, 150, 243, 0.1);
    color: #2196f3;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    margin-left: 8px;
  }

  /* Image gallery */
  .image-gallery {
    display: grid;
    gap: 16px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 16px;
  }

  .event-image {
    width: 100%;
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    object-fit: cover;
  }

  /* Icons */
  .icon {
    color: #2196f3;
    width: 24px;
    height: 24px;
  }

  .icon-small {
    color: #2196f3;
    width: 18px;
    height: 18px;
  }

  /* Loading state */
  .loading-overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    gap: 16px;
    color: #666;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #2196f3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .event-container {
      padding: 16px;
      gap: 24px;
    }

    .content-card {
      padding: 20px;
      --card-radius: 16px;
    }

    .details-grid {
      grid-template-columns: 1fr;
      padding: 16px;
      gap: 16px;
    }

    .event-title {
      font-size: 1.5rem;
    }

    .detail-item {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .time-badge {
      margin-left: 0;
      margin-top: 4px;
    }
  }

  /* Small devices (phones) */
  @media (max-width: 480px) {
    .event-container {
      padding: 12px;
      gap: 16px;
    }

    .content-card {
      padding: 16px;
      gap: 20px;
      --card-radius: 12px;
    }

    .profile-card {
      padding-bottom: 16px;
      gap: 12px;
    }

    .profile-img-container {
      width: 60px;
      height: 60px;
    }

    .profile-name {
      font-size: 1.1rem;
    }

    .profile-meta {
      font-size: 0.8rem;
    }

    .event-title {
      font-size: 1.3rem;
    }

    .event-description {
      font-size: 0.95rem;
      padding: 16px;
      border-radius: 12px;
    }

    .details-grid {
      padding: 12px;
      gap: 12px;
    }

    .detail-section {
      padding: 16px;
      border-radius: 12px;
    }

    .detail-header {
      margin-bottom: 16px;
      padding-bottom: 8px;
    }

    .detail-header strong {
      font-size: 1rem;
    }

    .detail-label {
      font-size: 0.9rem;
    }

    .detail-value {
      font-size: 0.95rem;
    }

    .time-badge {
      font-size: 0.85rem;
      padding: 3px 10px;
    }

    .image-gallery {
      padding: 12px;
      gap: 12px;
    }

    .event-image {
      border-radius: 8px;
    }

    .icon {
      width: 20px;
      height: 20px;
    }

    .icon-small {
      width: 16px;
      height: 16px;
    }

    .loading-overlay {
      padding: 24px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border-width: 3px;
    }
  }
</style>
