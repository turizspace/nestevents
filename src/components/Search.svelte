<script>
  import { createEventDispatcher } from 'svelte';
  import Icon from '@iconify/svelte';
  import { searchStore } from '../lib/stores/searchStore';

  const dispatch = createEventDispatcher();
  let searchQuery = '';
  let isSearchFocused = false;

  // Subscribe to searchStore changes to keep input in sync
  searchStore.subscribe(value => {
    if (value.query !== searchQuery) {
      searchQuery = value.query;
    }
  });

  // Function to handle search input
  function handleSearch() {
    dispatch('search', { query: searchQuery });
    searchStore.setQuery(searchQuery);
  }

  // Focus handler
  function handleFocus() {
    isSearchFocused = true;
  }

  function handleBlur() {
    setTimeout(() => {
      isSearchFocused = false;
    }, 200);
  }
</script>

<div class="search-container">
  <div class="search-input-wrapper {searchQuery ? 'has-value' : ''}">
    <Icon icon="mdi:magnify" class="search-icon" />
    <input
      class="search-input"
      type="text"
      bind:value={searchQuery}
      on:input={handleSearch}
      on:focus={handleFocus}
      on:blur={handleBlur}
      placeholder="Search events..."
    />
  </div>
</div>

<style>
  .search-container {
    position: relative;
    width: 100%;
    margin: 0 auto;
  }

  .search-input-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 1.25rem 0.75rem 3rem;
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    font-size: 1rem;
    background-color: white;
    transition: all 0.2s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: #E8D400;
    box-shadow: 0 0 0 3px rgba(232, 212, 0, 0.1);
  }





  @media (max-width: 768px) {
    .search-container {
      max-width: none;
      width: 100%;
    }

    .search-input-wrapper {
      width: 100%;
    }

    .search-input {
      width: 100%;
      font-size: 0.875rem;
      padding: 0.625rem 0.75rem 0.625rem 2.75rem;
    }

   
  }
</style>
