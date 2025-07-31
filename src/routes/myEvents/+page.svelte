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

<div class="page-container">
  <div class="header-section">
    <h1>My Events</h1>
    <p class="subtitle">Manage and track your created events</p>
  </div>

  <div class="event-container">
    {#if isLoading}
      <div class="loading-state">
        <Icon icon="mdi:loading" class="spin" width="24" height="24" />
        <p>Loading your events...</p>
      </div>
    {:else if eventsKind1.length === 0}
      <div class="empty-state">
        <Icon icon="mdi:calendar-blank" width="48" height="48" />
        <h3>No Events Yet</h3>
        <p>You haven't created any events yet. Start by creating your first event!</p>
        <a href="/create" class="create-button">
          <Icon icon="mdi:plus" />
          Create Event
        </a>
      </div>
    {:else}
      {#each eventsKind1 as event (event.id)}
        {#if profiles[event.pubkey]}
          <div class="content-card">
            <!-- Event Header -->
            <div class="event-header">
              <h2>{extractEventDetails(event.tags).title || extractEventDetails(event.tags).name}</h2>
              <div class="event-status">
                {#if new Date(extractEventDetails(event.tags).start) > new Date()}
                  <span class="status upcoming">Upcoming</span>
                {:else if new Date(extractEventDetails(event.tags).end) < new Date()}
                  <span class="status ended">Ended</span>
                {:else}
                  <span class="status ongoing">Ongoing</span>
                {/if}
              </div>
            </div>

            <!-- Event Details -->
            <div class="event-details">
              <div class="detail-group">
                <div class="detail-item">
                  <Icon icon="mdi:clock-outline" />
                  <div class="detail-text">
                    <p class="label">Start</p>
                    <p class="value">{new Date(extractEventDetails(event.tags).start).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
                <div class="detail-item">
                  <Icon icon="mdi:clock-check-outline" />
                  <div class="detail-text">
                    <p class="label">End</p>
                    <p class="value">{new Date(extractEventDetails(event.tags).end).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
              </div>

              <div class="detail-group">
                <div class="detail-item">
                  <Icon icon="mdi:map-marker" />
                  <div class="detail-text">
                    <p class="label">Location</p>
                    <p class="value">{extractEventDetails(event.tags).location || 'Location not specified'}</p>
                  </div>
                </div>
                <div class="detail-item">
                  <Icon icon="mdi:map" />
                  <div class="detail-text">
                    <p class="label">Address</p>
                    <p class="value">{extractEventDetails(event.tags).address || 'Address not specified'}</p>
                  </div>
                </div>
              </div>

              <div class="description">
                <p>{event.content || 'No description available'}</p>
              </div>
            </div>

            <!-- Image Gallery -->
            {#if extractImageUrls(event.tags).length > 0}
              <div class="image-gallery">
                {#each extractImageUrls(event.tags) as imageUrl}
                  <div class="image-wrapper">
                    <img src={imageUrl} alt="Event" loading="lazy">
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Action Buttons -->
            <div class="event-actions">
              <button class="action-button edit">
                <Icon icon="mdi:pencil" />
                Edit Event
              </button>
              <button class="action-button share">
                <Icon icon="mdi:share-variant" />
                Share
              </button>
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>

{#if showModal}
  <div 
    class="modal" 
    on:click={closeModal}
    on:keydown={e => e.key === 'Escape' && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div 
      class="modal-content" 
      on:click|stopPropagation
      role="document"
    >
      <h2 id="modal-title">Zap User</h2>
      <p>Send a zap to {currentLud16}</p>
      <input type="number" bind:value={customZapAmountMillisats} placeholder="Amount in millisats" />
      <input type="text" bind:value={customZapComment} placeholder="Zap comment" />
      <button on:click={handleZap}>Send Zap</button>
      <button on:click={closeModal}>Close</button>
    </div>
  </div>
{/if}

<style>


a {
  text-decoration: none;
  color: inherit;
}

/* Page Layout */
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header-section {
  text-align: center;
  margin-bottom: 3rem;
}

.header-section h1 {
  font-size: 2.5rem;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.header-section .subtitle {
  color: #666;
  font-size: 1.1rem;
}

/* Loading and Empty States */
.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}


.empty-state {
  color: #666;
}

.empty-state h3 {
  margin: 1rem 0;
  font-size: 1.5rem;
  color: #333;
}

.empty-state .create-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #4F46E5;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  margin-top: 1.5rem;
  transition: background-color 0.2s;
}

.empty-state .create-button:hover {
  background: #4338CA;
}

/* Event Container and Cards */
.event-container {
  display: grid;
  gap: 2rem;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 600px), 1fr));
}

.content-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05),
              0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.content-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07),
              0 12px 20px -3px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .content-card {
    padding: 15px;
  }
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

/* Event Header */
.event-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.event-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.3;
}

.event-status {
  flex-shrink: 0;
  margin-left: 1rem;
}

.status {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status.upcoming {
  background: #ECFDF5;
  color: #047857;
}

.status.ongoing {
  background: #EFF6FF;
  color: #1D4ED8;
}

.status.ended {
  background: #FEF2F2;
  color: #DC2626;
}

/* Event Details */
.event-details {
  color: #4B5563;
}

.detail-group {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.detail-item :global(svg) {
  flex-shrink: 0;
  color: #6B7280;
  margin-top: 0.25rem;
}

.detail-text {
  flex-grow: 1;
  min-width: 0;
}

.detail-text .label {
  font-size: 0.875rem;
  color: #6B7280;
  margin: 0;
}

.detail-text .value {
  font-size: 1rem;
  color: #1F2937;
  margin: 0.25rem 0 0 0;
}

.description {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #E5E7EB;
  font-size: 1rem;
  line-height: 1.6;
  color: #4B5563;
}

/* Image Gallery */
.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}

.image-wrapper {
  position: relative;
  padding-top: 75%;
  border-radius: 8px;
  overflow: hidden;
  background: #F3F4F6;
}

.image-wrapper img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-wrapper:hover img {
  transform: scale(1.05);
}

/* Action Buttons */
.event-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #E5E7EB;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
}

.action-button.edit {
  background: #4F46E5;
  color: white;
}

.action-button.edit:hover {
  background: #4338CA;
}

.action-button.share {
  background: #F3F4F6;
  color: #374151;
}

.action-button.share:hover {
  background: #E5E7EB;
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
/* Animations */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-card {
  animation: fadeIn 0.3s ease-out;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .page-container {
    padding: 1.5rem;
  }

  .header-section h1 {
    font-size: 2rem;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 1rem;
  }

  .header-section {
    margin-bottom: 2rem;
  }

  .header-section h1 {
    font-size: 1.75rem;
  }

  .content-card {
    padding: 1.25rem;
  }

  .event-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .event-status {
    margin-left: 0;
  }

  .detail-group {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .event-actions {
    flex-direction: column;
  }

  .action-button {
    width: 100%;
    justify-content: center;
  }

  .image-gallery {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}

@media (max-width: 480px) {
  .header-section h1 {
    font-size: 1.5rem;
  }

  .content-card {
    padding: 1rem;
  }

  .image-gallery {
    grid-template-columns: 1fr;
  }
}

/* Accessibility Improvements */
@media (prefers-reduced-motion: reduce) {
  .content-card,
  .image-wrapper img,
  .action-button {
    transition: none;
  }

  .content-card:hover {
    transform: none;
  }

  .image-wrapper:hover img {
    transform: none;
  }

}

/* Print Styles */
@media print {
  .page-container {
    padding: 0;
  }

  .content-card {
    box-shadow: none;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .action-button {
    display: none;
  }
}
</style>
