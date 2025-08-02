<script lang="ts">
  import { writable, type Writable } from 'svelte/store';
  import NDK, { NDKEvent, NDKNip07Signer } from "@nostr-dev-kit/ndk";
  import { v4 as uuidv4 } from 'uuid';
  import { onMount } from 'svelte';
  import GetLocation from './GetLocation.svelte';

  interface ExistingEventData {
    title: string;
    summary: string;
    geolocation: string;
    location: string;
    image: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    label: string;
    descriptiveLabel: string;
    hashtags: string;
    referenceLinks: string;
  }

  // Check if we're editing an existing event
  let isEditing = false;
  let eventId = '';
  let existingEventData = null;

  // Form fields
  let input = writable('');
  let uuid = writable('');
  let title = writable('');
  let summary = writable('');
  let geolocation = writable('');
  let location = writable('');
  let image = writable('');
  let startDate = writable('');
  let startTime = writable('');
  let endDate = writable('');
  let endTime = writable('');
  let eventLog: Writable<NDKEvent | null> = writable(null);

  function populateFormFields(data: ExistingEventData) {
    title.set(data.title || '');
    summary.set(data.summary || '');
    geolocation.set(data.geolocation || '');
    location.set(data.location || '');
    image.set(data.image || '');
    startDate.set(data.startDate || '');
    startTime.set(data.startTime || '');
    endDate.set(data.endDate || '');
    endTime.set(data.endTime || '');
    label.set(data.label || '');
    descriptiveLabel.set(data.descriptiveLabel || '');
    hashtags.set(data.hashtags || '');
    referenceLinks.set(data.referenceLinks || '');
  }

  onMount(() => {
    // Check URL for edit parameter
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId) {
      // Load event data from localStorage
      const savedEvent = localStorage.getItem('eventToEdit');
      if (savedEvent) {
        existingEventData = JSON.parse(savedEvent);
        isEditing = true;
        eventId = editId;
        
        // Populate form fields
        populateFormFields(existingEventData);
      }
    }
  });

  let label = writable('');
  let descriptiveLabel = writable('');
  let hashtags = writable('');
  let referenceLinks = writable('');

  let nip07signer

  interface LocationUpdateEvent {
    detail: {
      geolocation: string;
      location: string;
    };
  }

  const handleLocationUpdate = (event: LocationUpdateEvent) => {
    const { geolocation: newGeolocation, location: newLocation } = event.detail;
    geolocation.set(newGeolocation);  // Bind geolocation value
    location.set(newLocation);        // Bind location name
  };

  const getTimeZone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    // Validate dates
    const startDateTime = new Date(`${$startDate}T${$startTime}`);
    const endDateTime = new Date(`${$endDate}T${$endTime}`);

    if (isNaN(startDateTime.getTime())) {
      alert('Please enter a valid start date and time');
      return;
    }

    if (endDateTime && isNaN(endDateTime.getTime())) {
      alert('Please enter a valid end date and time');
      return;
    }

    if (endDateTime && endDateTime < startDateTime) {
      alert('End date must be after start date');
      return;
    }

    // Log form data for debugging
    console.log('Form data:', {
      title: $title,
      geolocation: $geolocation,
      location: $location,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      startTimestamp: Math.floor(startDateTime.getTime() / 1000),
      endTimestamp: Math.floor(endDateTime.getTime() / 1000)
    });


    nip07signer = new NDKNip07Signer();

    const ndk = new NDK({
      explicitRelayUrls: ["wss://relay.primal.net", "wss://relay.snort.social"],
      signer: nip07signer
    });

    await ndk.connect();
    console.log("NDK connected");

    const ndkEvent = new NDKEvent(ndk);
    ndkEvent.kind = 31923;
    ndkEvent.content = $input;

    // Generate UUID for the event
    const uuid = uuidv4();

    // Get the user's time zone
    const tzid = getTimeZone();

    // Convert dates to Unix timestamps (seconds since epoch)
    
    // Convert to seconds since epoch (NIP-52 requirement)
    const startTimestamp = Math.floor(startDateTime.getTime() / 1000);
    const endTimestamp = Math.floor(endDateTime.getTime() / 1000);

    ndkEvent.tags = [
      ["d", uuid], // Using generated UUID
      ["title", $title],
      ["summary", $summary],
      ['image', $image, "756x1008"],
      ["start", startTimestamp.toString()], // Unix timestamp in seconds
      ["end", endTimestamp.toString()], // Unix timestamp in seconds
      ["start_tzid", tzid],
      ["end_tzid", tzid],
      ["g", $geolocation],  // Ensure geolocation is updated
      ["location", $location],  // Ensure location is updated
      ["L", $label],
      ["l", $descriptiveLabel],
      ["t", ...$hashtags.split(',').map(tag => tag.trim())], // Handle multiple hashtags
      ["r", ...$referenceLinks.split(',').map(link => link.trim())], // Handle multiple reference links
    ];

    // Publish the event
    await ndk.publish(ndkEvent);

    // Log the created event
    eventLog.set(ndkEvent as NDKEvent);
    console.log("Event published:", ndkEvent);

  };
</script>

<div>
  <h2>Create an event in your area or neighborhood.</h2>


  <!-- Event Form -->
  <form on:submit={onSubmit}>
    <input type="text" placeholder="Title" bind:value={$title} />
    <input type="text" placeholder="About the event" bind:value={$input} />
    <input type="text" placeholder="Summary" bind:value={$summary} />

    <input type="text" placeholder="Co-ordinates" bind:value={$geolocation} readonly />
    <input type="text" placeholder="Location" bind:value={$location} readonly />
    <GetLocation on:updateLocation={handleLocationUpdate} />


    <div>
      <input type="date" placeholder="Start Date" bind:value={$startDate} />
      <input type="time" placeholder="Start Time" bind:value={$startTime} />
    </div>

    <div>
      <input type="date" placeholder="End Date" bind:value={$endDate} />
      <input type="time" placeholder="End Time" bind:value={$endTime} />
    </div>

    <input type="text" placeholder="Label" bind:value={$label} />
    <input type="text" placeholder="Description" bind:value={$descriptiveLabel} />
    <input type="text" placeholder="Tags - Separate with commas" bind:value={$hashtags} />
    <input type="text" placeholder="Reference Links - Separate with commas" bind:value={$referenceLinks} />
    <input type="text" placeholder="Image URL" bind:value={$image} />
    <button type="submit">Create Event</button>
  </form>

  {#if $eventLog}
    <div>
      <h3>Event Details:</h3>
      <pre>{$eventLog}</pre>
    </div>
  {/if}
</div>


<style>
  

  form {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #E7E7EF;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
  }

  h2 {
    font-size: 1.8rem;
    color: #333;
    margin-bottom: 1rem;
  }

  input, button {
    padding: 0.75rem;
    margin: 0.5rem 0;
    border-radius: 6px;
    border: 1px solid #ddd;
    font-size: 1rem;
    color: #333;
  }

  input:focus, button:focus {
    outline: none;
    border-color: #f7d74e;
  }

  input[type="text"], input[type="date"], input[type="time"] {
    width: 100%;
  }

  button {
    background-color: #f7d74e;
    color: #fff;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.3s ease;
  }

  button:hover {
    background-color: #f5c141;
  }

  /* Input placeholder styles */
  input::placeholder {
    color: #777;
    font-style: italic;
  }

  /* Group date/time inputs in row */
  div {
    display: flex;
    gap: 1rem;
  }

  

 

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    form {
      padding: 15px;
      width: 100%;
    }

  }
</style>
