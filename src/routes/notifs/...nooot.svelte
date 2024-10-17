<script>
  import { onMount, onDestroy } from 'svelte';
  import NDK, {NDKNip07Signer} from "@nostr-dev-kit/ndk";
  import { getZapEndpoint, makeZapRequest } from '../../utils/zapUtils.js';
  import { eventsStore, profilesStore } from '../../utils/store.js';

  let eventsKind1 = [];
  let profiles = {};
  let isLoading = true;

  let ndk;
  let subscriptionKind1;
  let subscriptionKind0;

  let nip07signer;
  let user; // Define user in the component scope
  let userPubKey; // Store user public key

  let showModal = false;
  let currentLud16 = '';
  let customZapComment = '';
  let customZapAmountMillisats = '';
  const defaultZapAmounts = [5000, 10000, 20000, 50000];

  // Set up NDK, fetch events and profiles
  onMount(async () => {
  nip07signer = new NDKNip07Signer();
  const user = await nip07signer.user();
  userPubKey = user.pubkey; // Store the user's public key



    try {

      // Initialize NDK
      ndk = new NDK({
        explicitRelayUrls: [
          'wss://relay.snort.social',
          'wss://relay.primal.net',
          'wss://nostr-02.dorafactory.org',
          'wss://relay.damus.io',
          'wss://relay.nostrplebs.com',
          'wss://nos.lol',
        ]
      });

      await ndk.connect();
      console.log("Connected to relay");

      // Subscribe to event kinds 7 and 17
      subscriptionKind1 = ndk.subscribe({ kinds: [7, 17], limit: 100, authors: [userPubKey] });
      subscriptionKind1.on('event', (event) => {
        eventsKind1 = [...eventsKind1, event];
        eventsStore.update(events => [...events, event]);
        isLoading = false;
        console.log(event);
      });

      // Subscribe to profile events (kind 0)
      subscriptionKind0 = ndk.subscribe({ kinds: [0] });
      subscriptionKind0.on('event', (event) => {
        try {
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

  // Cleanup subscriptions on destroy
  onDestroy(() => {
    if (subscriptionKind1) subscriptionKind1.off();
    if (subscriptionKind0) subscriptionKind0.off();
  });

  // Modal handling
  function openModal(lud16) {
    currentLud16 = lud16;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    customZapComment = '';
    customZapAmountMillisats = '';
  }

  // Extract image URLs from event tags
  function extractImageUrls(tags) {
    return tags.filter(tag => tag[0] === 'image').map(tag => tag[1]);
  }

  // Extract event details from tags
  function extractEventDetails(tags) {
    const eventDetails = {};
    tags.forEach(([key, value]) => {
      switch (key) {
        case 'title':
          eventDetails.p = value;
          break;
        case 'name':
          eventDetails.name = value;
          break;
        case 'description':
          eventDetails.e = value;
          break;
        case 'summary':
          eventDetails.summary = value;
          break;
        case 'start':
          eventDetails.start = new Date(parseInt(value) * 1000);
          break;
        case 'end':
          eventDetails.end = new Date(parseInt(value) * 1000);
          break;
        case 'location':
          eventDetails.location = value;
          break;
        case 'address':
          eventDetails.address = value;
          break;
        default:
          break;
      }
    });
    return eventDetails;
  }
</script>

<!-- Event Container -->
<div class="event-container">
  {#each eventsKind1 as event (event.id)}
    {#if profiles[event.pubkey]}
      <div class="content-card">
        <!-- Profile Info -->
        <div class="profile-card">
          <img src={profiles[event.pubkey].picture || 'https://via.placeholder.com/80'} alt="Profile Picture" class="profile-img">
          <div>
            <h3>{profiles[event.pubkey].name || 'Unknown'}</h3>
          </div>
        </div>

        <!-- Event Details -->
        <div class="event-details">
          {#each event.tags as tag}
            {#if tag[0] === 'p'}
              <p><strong>is attending</p>
            {/if}
            {#if tag[0] === 'e'}
              <p><strong>Event id:</strong> {tag[1]}</p>
            {/if}

          {/each}
        </div>

        <!-- Image Gallery -->
        <div class="image-gallery">
          {#each extractImageUrls(event.tags) as imageUrl}
            <img src={imageUrl} alt="Event Image" class="event-image">
          {/each}
        </div>
      </div>
    {/if}
  {/each}
</div>


<style>
  body {
    font-family: 'Arial', sans-serif;
    color: #333;
    line-height: 1.5;
    font-size: 16px;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  /* Container for events */
  .event-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 60em;
    margin: 0 auto;
    padding: 20px;
  }

  /* Card for individual events */
  .content-card {
    background-color: #E7E7EF;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    transition: transform 0.3s ease-in-out;
  }

  .content-card:hover {
    transform: translateY(-8px);
  }

  /* Profile card */
  .profile-card {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .profile-img {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  /* Event details */
  .event-details h4 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #333;
  }

  .event-details p {
    font-size: 1.1rem;
    color: #555;
  }

  .event-details strong {
    color: #000;
  }

  /* Image gallery */
  .image-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    margin-top: 16px;
  }

  .image-gallery img {
    width: 100%;
    height: 200px;
    border-radius: 8px;
    object-fit: cover;
    transition: transform 0.3s ease-in-out;
  }

  .image-gallery img:hover {
    transform: scale(1.05);
  }

  /* Modal styling */
  .modal {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
  }

  .modal-content {
    background: #fff;
    padding: 20px;
    border-radius: 10px;
    max-width: 500px;
    width: 100%;
    position: relative;
  }

  .close {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 24px;
    cursor: pointer;
  }

  .zap-amounts button {
    margin-right: 10px;
    padding: 10px 20px;
    background-color: #FFC107;
    border: none;
    border-radius: 5px;
    font-size: 1rem;
    cursor: pointer;
  }

  .zap-amounts button:hover {
    background-color: #FFB300;
  }

  input[type="text"],
  input[type="number"] {
    width: 100%;
    padding: 10px;
    margin-top: 10px;
    margin-bottom: 20px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 1rem;
  }

  button {
    padding: 10px 20px;
    background-color: #28A745;
    border: none;
    border-radius: 5px;
    color: #fff;
    cursor: pointer;
    font-size: 1rem;
  }

  button:hover {
    background-color: #218838;
  }
</style>
