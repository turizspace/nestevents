<script>
  export let event;
  export let profile;
  let showEventDetails = false;

  // Function to toggle event details visibility
  function toggleEventDetails() {
    showEventDetails = !showEventDetails;
  }

  // Extract image URLs from event tags
  function extractImageUrls(tags) {
    return tags
      .filter(tag => tag[0] === 'image')
      .map(tag => tag[1]);
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

<div class="event-card" on:click={toggleEventDetails}>
  <!-- Event Preview (Shortened) -->
  <div class="event-header">
    <h3>{profile.name || 'Unknown'}</h3>
    <p>{extractEventDetails(event.tags).title || 'Event Title'}</p>
    <p>{extractEventDetails(event.tags).start.toLocaleString()}</p>
  </div>

  {#if showEventDetails}
    <!-- Full Event Details -->
    <div class="event-details">
      <h4>{extractEventDetails(event.tags).title || 'Event Details'}</h4>
      <p><strong>Description:</strong> {extractEventDetails(event.tags).description}</p>
      <p><strong>Location:</strong> {extractEventDetails(event.tags).location}</p>
      <p><strong>Address:</strong> {extractEventDetails(event.tags).address}</p>
      <p><strong>Start:</strong> {extractEventDetails(event.tags).start.toLocaleString()}</p>
      <p><strong>End:</strong> {extractEventDetails(event.tags).end.toLocaleString()}</p>
      <div class="event-images">
        {#each extractImageUrls(event.tags) as imageUrl}
          <img src={imageUrl} alt="Event Image" class="event-image" />
        {/each}
      </div>
      <!-- RSVP Button -->
      <RSVP event={event} />
    </div>
  {/if}
</div>

<style>
  .event-card {
    background-color: #fff;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: transform 0.3s ease;
  }

  .event-card:hover {
    transform: translateY(-5px);
  }

  .event-header {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .event-details {
    margin-top: 20px;
    font-size: 1rem;
  }

  .event-details h4 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #333;
  }

  .event-details p {
    margin: 5px 0;
  }

  .event-details strong {
    color: #000;
  }

  .event-images {
    margin-top: 10px;
  }

  .event-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 8px;
    margin-bottom: 10px;
  }

  .event-image:hover {
    transform: scale(1.05);
    transition: transform 0.3s ease-in-out;
  }
</style>
