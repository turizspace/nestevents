<script>
  import { eventsStore, profilesStore } from '../utils/store.js';
  import { get } from 'svelte/store';

  let searchQuery = '';
  let filteredEvents = [];

  // Function to handle search
  function handleSearch() {
    const allEvents = get(eventsStore); // Get all events from the store
    const searchLower = searchQuery.toLowerCase(); // Convert search query to lowercase

    filteredEvents = allEvents.filter(event => {
      const details = extractEventDetails(event.tags);

      // Check if any of the fields match the search query
      return (
        (details.title?.toLowerCase().includes(searchLower) || '') ||
        (details.name?.toLowerCase().includes(searchLower) || '') ||
        (details.description?.toLowerCase().includes(searchLower) || '') ||
        (details.category?.toLowerCase().includes(searchLower) || '') ||
        (details.time?.toLowerCase().includes(searchLower) || '') ||
        (details.location?.toLowerCase().includes(searchLower) || '') ||
        (details.organizer?.toLowerCase().includes(searchLower) || '') ||  // Additional field
        (details.tags?.toLowerCase().includes(searchLower) || '') // Additional field
      );
    });
  }

  // Function to clear the search and reset filtered events to empty
  function clearSearch() {
    searchQuery = '';  // Clear the search query
    filteredEvents = []; // Set filteredEvents to an empty array (no events)
  }

  // Extract event details including handling potential undefined fields
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
        case 'category':
          eventDetails.category = value;
          break;
        case 'time':
          eventDetails.time = value;
          break;
        case 'location':
          eventDetails.location = value;
          break;
        case 'organizer':
          eventDetails.organizer = value; // New field
          break;
        case 'tags':
          eventDetails.tags = value; // New field
          break;
        default:
          break;
      }
    });
    return eventDetails;
  }
</script>

<!-- Search bar and buttons -->
<div class="search-bar">
  <input type="text" bind:value={searchQuery} placeholder="Search events by title, name, description, etc." />
  <button on:click={handleSearch}>Search</button>
  <button on:click={clearSearch}>Clear</button> <!-- Clear button -->
</div>

<!-- Display filtered events -->
<div class="event-container">
  {#each filteredEvents as event (event.id)}
    <!-- Render each event's details -->
    <div class="content-card">
      <div class="profile-card">
        <!-- Get user profile info from profilesStore -->
        <img src={get(profilesStore)[event.pubkey]?.picture || 'https://via.placeholder.com/80'} alt="Profile Picture" class="profile-img">
        <div>
          <h3>{get(profilesStore)[event.pubkey]?.name || 'Unknown'}</h3>
        </div>
      </div>

      <!-- Event details -->
      <div class="event-details">
        <h4>{extractEventDetails(event.tags).title || extractEventDetails(event.tags).name}</h4>
        <p>{extractEventDetails(event.tags).description || 'No description available'}</p>
        <p><strong>Category:</strong> {extractEventDetails(event.tags).category || 'N/A'}</p>
        <p><strong>Time:</strong> {extractEventDetails(event.tags).time || 'N/A'}</p>
        <p><strong>Location:</strong> {extractEventDetails(event.tags).location || 'N/A'}</p>
        <p><strong>Organizer:</strong> {extractEventDetails(event.tags).organizer || 'N/A'}</p> <!-- Display organizer -->
        <p><strong>Tags:</strong> {extractEventDetails(event.tags).tags || 'N/A'}</p> <!-- Display tags -->
      </div>
    </div>
  {/each}
</div>

<style>
  .search-bar {
    display: flex;
    gap: 10px;
    margin: 0.5em;
  }

  .search-bar input {
    width: 69%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
  }

  .search-bar button {
    padding: 10px 15px;
    background-color: #E8D400;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
  }

  .search-bar button:last-child {
    background-color: #f44336; /* Red color for the clear button */
  }

  .event-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
  }

  .content-card {
    background: #FFF;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .profile-card {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .profile-img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
  }

  .event-details {
    margin-top: 10px;
  }

  .event-details p {
    margin: 5px 0;
  }

  .event-details strong {
    font-weight: bold;
  }
</style>
