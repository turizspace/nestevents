<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import EventCard from '../../../components/EventCard.svelte';
  import { eventsStore, profilesStore } from '../../../utils/store.js';
  import { fade } from 'svelte/transition';
  import Icon from '@iconify/svelte';

  let event;
  let profile;
  
  // React to changes in route parameter and stores
  $: {
    const eventId = $page.params.id;
    event = $eventsStore.find(e => e.id === eventId);
    if (event) {
      profile = $profilesStore[event.pubkey];
    }
  }

  // Add scroll to top when route changes
  $: if ($page.params.id) {
    window.scrollTo(0, 0);
  }
</script>

<div class="event-details-page">
  {#if event}
    <a href="/" class="back-link">
      <Icon icon="mdi:arrow-left" />
      <span>Back to Events</span>
    </a>
    
    <div class="event-container" transition:fade|local>      
      {#key event.id}
        <div class="event-content" transition:fade>
          <EventCard {event} {profile} minimal={false} />
        </div>
      {/key}
      
      <div class="related-events" transition:fade>
        <div class="section-header">
          <h3>More events by {profile?.name || 'this organizer'}</h3>
          <a href="/organizer/{event.pubkey}" class="view-all">
            <Icon icon="mdi:chevron-right" />
            View all events
          </a>
        </div>
        <div class="related-grid">
          {#if $eventsStore.filter(e => e.pubkey === event.pubkey && e.id !== event.id).length === 0}
            <div class="no-events">
              <Icon icon="mdi:calendar-blank" />
              <p>No other events from this organizer</p>
            </div>
          {:else}
            {#each $eventsStore.filter(e => e.pubkey === event.pubkey && e.id !== event.id).slice(0, 3) as relatedEvent}
              <div class="related-item">
                <EventCard event={relatedEvent} profile={profile} minimal={true} />
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="loading-state" transition:fade>
      <div class="loading-spinner"></div>
      <p>Loading event details...</p>
    </div>
  {/if}
</div>

<style>
  .event-details-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    padding-top: calc(64px + 1rem); /* Navbar height + padding */
    position: relative;
  }

  .event-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .event-content {
    display: flex;
    flex-direction: column;
  }

  .back-link {
    position: fixed;
    top: 76px; /* Navbar height + 12px */
    left: 1.5rem;
    color: #3498db;
    text-decoration: none;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: color 0.2s ease;
    padding: 0.5rem;
    border-radius: 8px;
    z-index: 100;
  }

  .back-link:hover {
    color: #2980b9;
  }

  .back-link:hover {
    background: #e1efff;
    transform: translateY(-1px);
  }

  .related-events {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #eee;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h3 {
    font-size: 1.5rem;
    color: #333;
    margin: 0;
  }

  .view-all {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #3498db;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    background: #f0f7ff;
    transition: all 0.2s ease;
  }

  .view-all:hover {
    background: #e1efff;
    transform: translateY(-1px);
  }

  .no-events {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem;
    background: #f8f9fa;
    border-radius: 12px;
    color: #666;
    text-align: center;
  }

  .no-events :global(svg) {
    font-size: 2rem;
    color: #999;
  }

  .related-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
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

  @media (max-width: 768px) {
    .event-details-page {
      padding: 1rem;
    }

    .related-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
</style>
