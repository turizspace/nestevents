<script>
import { onMount, onDestroy } from 'svelte';
import NDK, {NDKNip07Signer} from "@nostr-dev-kit/ndk";
import Icon from '@iconify/svelte';
import { getZapEndpoint, makeZapRequest } from '../../utils/zapUtils.js';
import { eventsStore, profilesStore } from '../../utils/store.js';


let eventsKind1 = [];
let profiles = {};
let isLoading = true;

let ndk;
let subscriptionKind1;
let subscriptionKind0;

let showModal = false;
let currentLud16 = '';
let customZapComment = '';
let customZapAmountMillisats = '';
const defaultZapAmounts = [5000, 10000, 20000, 50000];


  let nip07signer;
  let user; // Define user in the component scope
  let userPubKey; // Store user public key



  onMount(async () => {
    try {
      // Initialize NDK with relay URLs
      nip07signer = new NDKNip07Signer(); // Ensure nip07signer is instantiated properly

      if (!nip07signer) {
        throw new Error("NIP-07 signer is not initialized");
      }

      ndk = new NDK({
        explicitRelayUrls: [
          'wss://relay.snort.social',
          'wss://relay.primal.net',
          'wss://nostr-02.dorafactory.org',
          'wss://relay.snort.social',
          'wss://relay.damus.io',
          'wss://relay.nostrplebs.com',
          'wss://nos.lol',
        ],
        signer: nip07signer
      });

      const user = await nip07signer.user(); // Make sure nip07signer is initialized
      const userPubKey = user.pubkey; // Get the user's public key

      // Connect to the relay
      await ndk.connect();
      console.log("Connected to relay");

      // Subscribe to events of kind 31923 (events of interest)
      subscriptionKind1 = ndk.subscribe({
        kinds: [31923],
        authors: [userPubKey] // Use the actual userPubKey, not a string
      });

      // Handle events of kind 1
      subscriptionKind1.on('event', (event) => {
        eventsKind1 = [...eventsKind1, event];
        eventsStore.update(events => [...events, event]);
        isLoading = false;
        console.log(event);
      });

      // Subscribe to events of kind 0 (profile events)
      subscriptionKind0 = ndk.subscribe({
        kinds: [0],
        authors: [userPubKey] // Use the actual userPubKey, not a string
      });

      // Handle profile events (kind 0)
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


onDestroy(() => {
  // Clean up subscriptions

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

// Send zap (payment)
async function handleZap() {
  if (!ndk) {
    console.error('NDK is not defined');
    return;
  }

  const metadata = {
    content: JSON.stringify({ lud16: currentLud16, comment: customZapComment })
  };
  const callback = await getZapEndpoint(metadata);

  if (callback) {
    const amountToSend = customZapAmountMillisats;
    if (!amountToSend) {
      console.error('Please enter a zap amount.');
      return;
    }

    const zapRequest = makeZapRequest({
      profile: currentLud16,
      event: null,
      amount: amountToSend,
      comment: customZapComment,
      relays: ['wss://relay.damus.io']
    });

    const response = await fetch(`${callback}?amount=${amountToSend}`);
    const { pr: invoice } = await response.json();

    console.log('Invoice:', invoice);

    try {
      if (window.webln) {
        await window.webln.enable();
        await window.webln.sendPayment(invoice);
        console.log('Payment sent successfully via WebLN!');
      } else {
        console.error('WebLN not available.');
        alert('WebLN not available.');
      }
    } catch (err) {
      console.error('WebLN error:', err);
      alert('Failed to send payment via WebLN.');
    }

  } else {
    console.error('Failed to get zap endpoint.');
  }

  closeModal();
}

// Extract image URLs from tags
function extractImageUrls(tags) {
  return tags
    .filter(tag => tag[0] === 'image')
    .map(tag => tag[1]);
}
  // Function to extract event details
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
        case 'summary':
          eventDetails.summary = value;
          break;
        case 'start':
          eventDetails.start = new Date(parseInt(value) * 1000); // Convert Unix timestamp
          break;
        case 'end':
          eventDetails.end = new Date(parseInt(value) * 1000); // Convert Unix timestamp
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

<div class="event-container">
  {#each eventsKind1 as event (event.id)}
    {#if profiles[event.pubkey]}
      <div class="content-card">
        <div class="profile-card">
          <img src={profiles[event.pubkey].picture || 'https://via.placeholder.com/80'} alt="Profile Picture" class="profile-img">
          <div>
            <h3>{profiles[event.pubkey].name || 'Unknown'}</h3>
          </div>
        </div>

        <!-- Event Details -->
        <div class="event-details">
          <h4>{extractEventDetails(event.tags).title || extractEventDetails(event.tags).name}</h4>
          <p>{event.content || 'No description available'}</p>
          <p><strong>Location:</strong> {extractEventDetails(event.tags).location}</p>
          <p><strong>Address:</strong> {extractEventDetails(event.tags).address}</p>
          <p><strong>Start:</strong> {extractEventDetails(event.tags).start.toLocaleString()}</p>
          <p><strong>End:</strong> {extractEventDetails(event.tags).end.toLocaleString()}</p>
        </div>

        <!-- Image Gallery -->
        <div class="image-gallery">
          {#each extractImageUrls(event.tags) as imageUrl}
            <img src={imageUrl} alt="Image from event" class="event-image">
          {/each}
        </div>

      </div>
    {/if}
  {/each}
</div>

{#if showModal}
  <div class="modal" on:click={closeModal}>
    <div class="modal-content" on:click|stopPropagation>
      <h2>Zap User</h2>
      <p>Send a zap to {currentLud16}</p>
      <input type="number" bind:value={customZapAmountMillisats} placeholder="Amount in millisats" />
      <input type="text" bind:value={customZapComment} placeholder="Zap comment" />
      <button on:click={handleZap}>Send Zap</button>
      <button on:click={closeModal}>Close</button>
    </div>
  </div>
{/if}

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
  word-wrap: break-word; /* Prevent text overflow */
}

@media (max-width: 768px) {
  .event-container {
    max-width: 100%;
    padding: 10px;
  }
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
  word-wrap: break-word; /* Prevent text overflow */
}

.content-card:hover {
  transform: translateY(-8px);
}

@media (max-width: 768px) {
  .content-card {
    padding: 15px;
  }
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

.profile-card div h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.profile-card div p {
  font-size: 0.95rem;
  color: #777;
}

@media (max-width: 768px) {
  .profile-card div h3 {
    font-size: 1rem;
  }

  .profile-card div p {
    font-size: 0.85rem;
  }
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

@media (max-width: 768px) {
  .event-details h4 {
    font-size: 1.3rem;
  }

  .event-details p {
    font-size: 1rem;
  }
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

/* Zap Button */
.zap-button {
  background-color: #f7d74e;
  border: none;
  padding: 12px 24px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  transition: background-color 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.zap-button:hover {
  background-color: #f5c141;
}

.zap-icon {
  margin-left: 8px;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background-color: #fff;
  padding: 25px;
  border-radius: 12px;
  width: 350px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-content input {
  margin: 10px 0;
  padding: 12px;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.modal-content button {
  margin-top: 20px;
  padding: 12px 24px;
  background-color: #f7d74e;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.modal-content button:hover {
  background-color: #f5c141;
}

/* Responsive Design - Adjustments for small screens */
@media (max-width: 768px) {
  .event-container {
    max-width: 100%;
    padding: 15px;
  }

  .content-card {
    padding: 15px;
  }

  .zap-button {
    width: 100%;
  }

  .modal-content {
    width: 80%;
  }

  .image-gallery {
    grid-template-columns: 1fr 1fr;
  }
}

.content-card pre {
  white-space: pre-wrap;
  word-break: break-word;
}

.close {
  cursor: pointer;
  font-size: 20px;
  color: #333;
}
</style>
