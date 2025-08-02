<script lang="ts">
  import { goto } from '$app/navigation';
  import RSVP from './RSVP.svelte';
  import { ndkStore } from '$lib/stores/ndkStore';
  import Icon from '@iconify/svelte';
  import type { NDKEvent } from '@nostr-dev-kit/ndk';
  import type NDK from '@nostr-dev-kit/ndk';
  export let event: NDKEvent;
  export let profile: { name?: string } | undefined;
  export let minimal = false;
  
  // Get NDK instance from store
  let ndkInstance: NDK;
  ndkStore.subscribe(value => {
    ndkInstance = value;
  });

  // Extract image URLs from event tags
  function extractImageUrls(tags) {
    return tags
      .filter(tag => tag[0] === 'image')
      .map(tag => tag[1]);
  }

  function navigateToEventDetails() {
    goto(`/event/${event.id}`);
  }

  function navigateToOrganizer() {
    goto(`/organizer/${event.pubkey}`);
  }

  // Function to extract event details from tags
  function extractEventDetails(tags) {
    const eventDetails = {};
    tags.forEach(([key, value]) => {
      switch (key) {
        case 'title':
          eventDetails.title = value;
          break;
        case 'name':
          eventDetails.name = value;
          break;
        case 'description':
          eventDetails.description = value;
          break;
        case 'location':
          eventDetails.location = value;
          break;
        case 'address':
          eventDetails.address = value;
          break;
        case 'start':
          eventDetails.start = new Date(parseInt(value) * 1000); // Convert Unix timestamp
          break;
        case 'end':
          eventDetails.end = new Date(parseInt(value) * 1000); // Convert Unix timestamp
          break;
        default:
          break;
      }
    });
    return eventDetails;
  }
</script>

{#if minimal}
  <div 
    class="event-card minimal" 
    on:click={navigateToEventDetails}
    on:keydown={e => e.key === 'Enter' && navigateToEventDetails(e)}
    role="button"
    tabindex="0"
  >
    <div class="event-image-wrapper">
      <div class="event-image-container">
        {#if extractImageUrls(event.tags)[0]}
          <img src={extractImageUrls(event.tags)[0]} alt="Event" class="event-thumbnail" loading="lazy" />
        {:else}
          <div class="event-thumbnail placeholder">
            <span>No Image</span>
          </div>
        {/if}
      </div>
    </div>
    <div class="event-content">
      <h3 class="event-title">{extractEventDetails(event.tags).title || 'Event Title'}</h3>
      <div class="event-details-minimal">
        <div class="detail-row">
          <Icon icon="mdi:calendar" />
          <p class="value">
            <span class="time">
              <Icon icon="mdi:clock-time-four-outline" />
              {new Date(extractEventDetails(event.tags).start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </p>
        </div>
        {#if extractEventDetails(event.tags).location}
        <div class="detail-row location">
          <Icon icon="mdi:map-marker" />
          <p class="value">{extractEventDetails(event.tags).location}</p>
        </div>
        {/if}
        <button class="organizer-link" on:click|stopPropagation={navigateToOrganizer}>
          <Icon icon="mdi:account" />
          {profile?.name || 'Unknown'}
        </button>
      </div>
    </div>
  </div>
{:else}
  <!-- Full Event Details for the event details page -->
  <div class="event-card full">
    <div class="event-images">
      {#each extractImageUrls(event.tags) as imageUrl}
        <img src={imageUrl} alt="Event Image" class="event-image" />
      {/each}
    </div>
    <div class="event-content">
      <h2>{extractEventDetails(event.tags).title || 'Event Title'}</h2>
      <button class="organizer-link" on:click={navigateToOrganizer}>
        <Icon icon="mdi:account" />
        Organized by {profile?.name || 'Unknown'}
      </button>
      <div class="event-details">
        <p class="description">{extractEventDetails(event.tags).description}</p>
        <div class="details-grid">
          <div class="detail-item">
            <strong>Location:</strong>
            <p>{extractEventDetails(event.tags).location}</p>
            <p>{extractEventDetails(event.tags).address}</p>
          </div>
          <div class="detail-item">
            <strong>Date & Time:</strong>
            <p>Starts: {new Date(extractEventDetails(event.tags).start).toLocaleString()}</p>
            <p>Ends: {new Date(extractEventDetails(event.tags).end).toLocaleString()}</p>
          </div>
        </div>
        <div class="rsvp-container">
          <RSVP {event} {ndkInstance} />
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .event-card {
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    height: 100%;
    cursor: pointer;
  }

  .event-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
  }

  .event-image-wrapper {
    width: 100%;
    padding-top: 56.25%; /* 16:9 Aspect Ratio */
    position: relative;
  }

  .event-image-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #f5f5f5;
  }

  .event-thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, #f5f5f5, #ebebeb);
    color: #999;
    font-size: 0.9rem;
  }

  .event-content {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .event-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .event-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    font-size: 0.9rem;
    color: #666;
  }

  .date {
    margin: 0;
  }

  .organizer-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f0f7ff;
    border: none;
    color: #3498db;
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    cursor: pointer;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .organizer-link:hover {
    background: #e1efff;
    transform: translateY(-1px);
  }

  /* Full event details styles */
  .event-card.full {
    background-color: #fff;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    max-width: 1200px;
    margin: 0 auto;
  }

  .event-details {
    margin-top: 2rem;
  }



  .event-details p {
    margin: 1rem 0;
    line-height: 1.6;
  }

  .event-details strong {
    color: #000;
    font-weight: 600;
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
    padding: 1.5rem;
    background: #f8f9fa;
    border-radius: 12px;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .event-images {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 2rem 0;
  }

  .event-images img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease-in-out;
  }

  .event-images img:hover {
    transform: scale(1.05);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .event-card.full {
      padding: 1rem;
    }

    .details-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 1rem;
    }

    .event-images {
      grid-template-columns: 1fr;
    }
  }
</style>
