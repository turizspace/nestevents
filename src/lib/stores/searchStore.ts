import { writable } from 'svelte/store';
import type { SearchFilters } from '$lib/types';

function createSearchStore() {
  const { subscribe, set, update } = writable<SearchFilters>({
    query: '',
    dateRange: undefined,
    location: undefined,
    tags: []
  });

  let debounceTimer: NodeJS.Timeout;

  return {
    subscribe,
    setQuery: (query: string) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        update(state => ({ ...state, query }));
      }, 300); // 300ms debounce
    },
    setDateRange: (start: Date, end: Date) => {
      update(state => ({
        ...state,
        dateRange: { start, end }
      }));
    },
    setLocation: (location: string) => {
      update(state => ({ ...state, location }));
    },
    setTags: (tags: string[]) => {
      update(state => ({ ...state, tags }));
    },
    reset: () => {
      set({
        query: '',
        dateRange: undefined,
        location: undefined,
        tags: []
      });
    }
  };
}

export const searchStore = createSearchStore();
