<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import type { NDKEvent } from '@nostr-dev-kit/ndk';
import EventCard from './EventCard.svelte';
import { searchStore } from '../lib/stores/searchStore.js';
import { sortStore, type SortOption } from '../lib/stores/sortStore.js';

  interface EventDetails {
    title?: string;
    name?: string;
    description?: string;
    summary?: string;
    start?: Date;
    end?: Date;
    location?: string;
    address?: string;
  }

  export let events: NDKEvent[] = [];
  export let profiles: Record<string, any> = {};
  let sortOption: SortOption = 'upcoming';
  let searchQuery = '';
  let gridEvents: NDKEvent[] = [];
  
  // Infinite scroll state
  let pageSize = 12;
  let currentPage = 1;
  let loading = false;
  let hasMore = true;
  let observer: IntersectionObserver;
  let lastItemElement: HTMLElement;

  // Intersection observer action
  function observeLastItem(node: Element) {
    observer?.observe(node);
    
    return {
      destroy() {
        observer?.unobserve(node);
      }
    };
  }

  onMount(() => {
    console.log('EventGrid mounted');
    // Remove duplicates by event ID when component mounts
    events = dedupEvents(events);
    console.log('Initial events after dedup:', events);
    console.log('Initial profiles:', profiles);
    
    // Setup intersection observer for infinite scroll
    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading && hasMore) {
        loadMore();
      }
    }, {
      rootMargin: '100px'
    });

    filterAndSortEvents();
  });

  function loadMore() {
    if (loading || !hasMore) return;
    
    loading = true;
    currentPage++;
    filterAndSortEvents();
    loading = false;
  }

  interface SearchValue {
    query: string;
  }

  interface SortValue {
    option: SortOption;
  }

  // Subscribe to search store changes
  searchStore.subscribe((value: SearchValue) => {
    searchQuery = value.query;
    currentPage = 1; // Reset pagination
    filterAndSortEvents();
  });

  // Subscribe to sort store changes
  sortStore.subscribe((value: SortValue) => {
    sortOption = value.option;
    currentPage = 1; // Reset pagination
    filterAndSortEvents();
  });  function dedupEvents(eventList: NDKEvent[]): NDKEvent[] {
    const seen = new Map<string, boolean>();
    return eventList.reduce((unique: NDKEvent[], event) => {
      if (!seen.has(event.id)) {
        seen.set(event.id, true);
        unique.push(event);
      }
      return unique;
    }, []);
  }

  function extractEventDetails(tags: string[][]): EventDetails {
    const eventDetails: EventDetails = {
      title: undefined,
      name: undefined,
      description: undefined,
      summary: undefined,
      start: undefined,
      end: undefined,
      location: undefined,
      address: undefined
    };
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

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  function isThisWeek(date: Date): boolean {
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    return date >= today && date <= weekEnd;
  }

  function isThisWeekend(date: Date): boolean {
    const now = new Date();
    const friday = new Date(now);
    const sunday = new Date(now);
    
    const currentDay = now.getDay(); // 0 is Sunday, 6 is Saturday
    
    // Set to this week's Friday and Sunday
    friday.setDate(now.getDate() - currentDay + 5); // Go to this week's Friday
    friday.setHours(0, 0, 0, 0);
    
    sunday.setDate(now.getDate() - currentDay + 7); // Go to this week's Sunday
    sunday.setHours(23, 59, 59, 999);
    
    // If we're before Friday, get next weekend
    if (currentDay < 5) {
      // We're before Friday, so show next weekend
      friday.setDate(friday.getDate());
      sunday.setDate(sunday.getDate());
    }
    
    // If we're on Sunday, show next weekend
    if (currentDay === 0) {
      friday.setDate(friday.getDate() + 5);
      sunday.setDate(sunday.getDate() + 5);
    }

    return date >= friday && date <= sunday;
  }

  function filterAndSortEvents() {
    if (!events) return;
    
    // Reset pagination when filter/sort changes
    if (currentPage === 1) {
      gridEvents = [];
    }
    
    let filteredEvents = events.filter(event => {
      if (!event || !event.tags) return false;
      
      const title = event.tags.find(tag => tag[0] === 'title')?.[1]?.toLowerCase() || '';
      const description = event.tags.find(tag => tag[0] === 'description')?.[1]?.toLowerCase() || '';
      const location = event.tags.find(tag => tag[0] === 'location')?.[1]?.toLowerCase() || '';
      // Get start time from tags
      const startTime = new Date(parseInt(event.tags.find(tag => tag[0] === 'start')?.[1] || '0') * 1000);

      
      // Filter by search query
      const query = searchQuery?.toLowerCase() || '';
      const matchesSearch = !query || 
        title.includes(query) ||
        description.includes(query) ||
        location.includes(query);

      // Filter by date range
      const now = new Date();
      let matchesDateFilter = true;
      
      switch (sortOption) {
        case 'today':
          matchesDateFilter = isToday(startTime);
          break;
        case 'this-week':
          matchesDateFilter = isThisWeek(startTime);
          break;
        case 'this-weekend':
          matchesDateFilter = isThisWeekend(startTime);
          break;
        case 'upcoming':
          matchesDateFilter = startTime >= now;
          break;
        default:
          matchesDateFilter = true;
      }

      return matchesSearch && matchesDateFilter;
    });

    // Sort events by start time
    filteredEvents.sort((a, b) => {
      const aStart = parseInt(a.tags.find(tag => tag[0] === 'start')?.[1] || '0');
      const bStart = parseInt(b.tags.find(tag => tag[0] === 'start')?.[1] || '0');
      return aStart - bStart;
    });

    // Calculate pagination
    const startIndex = 0;
    const endIndex = currentPage * pageSize;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);
    
    // Update hasMore flag
    hasMore = filteredEvents.length > endIndex;
    
    // Append new events to existing grid
    gridEvents = [...new Set([...gridEvents, ...paginatedEvents])];
  }

  // React to changes in events prop
  $: {
    console.log('Events changed:', events);
    // Deduplicate events whenever the events prop changes
    events = dedupEvents(events);
    filterAndSortEvents();
  }
</script>

<div class="sort-controls">
  <button 
    class:active={sortOption === 'upcoming'} 
    on:click={() => sortStore.setOption('upcoming')}>
    Upcoming
  </button>
  <button 
    class:active={sortOption === 'today'} 
    on:click={() => sortStore.setOption('today')}>
    Today
  </button>
  <button 
    class:active={sortOption === 'this-week'} 
    on:click={() => sortStore.setOption('this-week')}>
    This Week
  </button>
  <button 
    class:active={sortOption === 'this-weekend'} 
    on:click={() => sortStore.setOption('this-weekend')}>
    This Weekend
  </button>
  <button 
    class:active={sortOption === 'all'} 
    on:click={() => sortStore.setOption('all')}>
    All Events
  </button>
</div>

<div class="event-grid">
  {#each gridEvents as event, i}
    <div class="grid-item">
      <EventCard {event} profile={profiles[event.pubkey]} minimal={true} />
    </div>
    {#if i === gridEvents.length - 1}
      <div bind:this={lastItemElement} use:observeLastItem class="intersection-observer-target"></div>
    {/if}
  {/each}
</div>

{#if loading}
  <div class="loading">
    <div class="loader"></div>
  </div>
{/if}

<style>
  .sort-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    justify-content: center;
    flex-wrap: wrap;
    padding: 0 2rem;
  }

  .sort-controls button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border, #ccc);
    border-radius: 20px;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .sort-controls button:hover {
    background: var(--color-bg-hover, #f0f0f0);
  }

  .sort-controls button.active {
    background: var(--color-primary, #3273dc);
    color: white;
    border-color: var(--color-primary, #3273dc);
  }

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

  .intersection-observer-target {
    width: 100%;
    height: 20px;
    grid-column: 1 / -1;
  }

  .loading {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }

  .loader {
    width: 40px;
    height: 40px;
    border: 4px solid var(--color-border, #ccc);
    border-top: 4px solid var(--color-primary, #3273dc);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
