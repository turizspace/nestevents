<script>
  import { onMount } from 'svelte';
  import { searchStore } from '../lib/stores/searchStore';
  import EventCard from './EventCard.svelte';

  export let events = [];
  export let profiles = {};

  let gridEvents = [];
  let searchQuery = '';

  onMount(() => {
    console.log('EventGrid mounted');
    // Remove duplicates by event ID when component mounts
    events = dedupEvents(events);
    console.log('Initial events after dedup:', events);
    console.log('Initial profiles:', profiles);
    filterEvents();
  });

  // Subscribe to search store changes
  searchStore.subscribe(value => {
    searchQuery = value.query;
    filterEvents();
  });

  function dedupEvents(eventList) {
    const seen = new Map();
    return eventList.reduce((unique, event) => {
      if (!seen.has(event.id)) {
        seen.set(event.id, true);
        unique.push(event);
      }
      return unique;
    }, []);
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

  function filterEvents() {
    console.log('Filtering events. Search query:', searchQuery);
    if (!searchQuery) {
      gridEvents = events;
      return;
    }

    const searchLower = searchQuery.toLowerCase();
    gridEvents = events.filter(event => {
      const details = extractEventDetails(event.tags);
      return (
        details.title?.toLowerCase().includes(searchLower) ||
        details.description?.toLowerCase().includes(searchLower) ||
        details.location?.toLowerCase().includes(searchLower)
      );
    });
    console.log('Filtered events:', gridEvents);
  }

  // React to changes in events prop
  $: {
    console.log('Events changed:', events);
    // Deduplicate events whenever the events prop changes
    events = dedupEvents(events);
    filterEvents();
  }
</script>

<div class="event-grid">
  {#each gridEvents as event}
    <div class="grid-item">
      <EventCard {event} profile={profiles[event.pubkey]} minimal={true} />
    </div>
  {/each}
</div>

<style>
  .event-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
    padding: 2rem;
    width: 100%;
  }

  .grid-item {
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 768px) {
    .event-grid {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      padding: 1rem;
    }
  }
</style>
