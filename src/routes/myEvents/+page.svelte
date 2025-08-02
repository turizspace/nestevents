<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import NDK, {
  NDKNip07Signer, 
  NDKEvent,
  NDKSubscription,
  NDKKind
} from "@nostr-dev-kit/ndk";
import type { NDKFilter } from "@nostr-dev-kit/ndk";
import Icon from '@iconify/svelte';
import { getZapEndpoint, makeZapRequest } from '../../utils/zapUtils.js';
import { eventsStore, profilesStore } from '../../utils/store.js';
import type { EventDetails, EditFormData } from '../../lib/types/events.js';


let eventsKind1: NDKEvent[] = [];
interface Profile {
  name?: string;
  about?: string;
  picture?: string;
  lud16?: string;
  [key: string]: any;
}

let profiles: Record<string, Profile> = {};
let isLoading = true;

let ndk: NDK;
let subscriptionKind1: NDKSubscription;
let subscriptionKind0: NDKSubscription;

// Modal states
let showZapModal = false;
let showEditModal = false;
let currentLud16 = '';
let customZapComment = '';
let customZapAmountMillisats = '';
const defaultZapAmounts = [5000, 10000, 20000, 50000];

// Edit modal state
let editingEvent: NDKEvent | null = null;
let editForm: EditFormData = {
  title: '',
  content: '',
  summary: '',
  location: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  image: ''
};


  let nip07signer: NDKNip07Signer;
  let user: { pubkey: string }; // Define user in the component scope
  let userPubKey: string; // Store user public key



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

      user = await nip07signer.user(); // Make sure nip07signer is initialized
      userPubKey = user.pubkey; // Get the user's public key

      // Connect to the relay
      await ndk.connect();
      console.log("Connected to relay");

      // Subscribe to events of kind 31923 (events of interest)
      subscriptionKind1 = ndk.subscribe({
        kinds: [31923 as NDKKind],
        authors: [userPubKey] // Use the actual userPubKey, not a string
      } as NDKFilter);

      // Handle events of kind 1
      subscriptionKind1.on('event', (event: NDKEvent) => {
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
      subscriptionKind0.on('event', (event: NDKEvent) => {
        try {
          const profile = JSON.parse(event.content) as Profile;
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
  try {
    if (subscriptionKind1) {
      subscriptionKind1.removeAllListeners();
    }
    if (subscriptionKind0) {
      subscriptionKind0.removeAllListeners();
    }
    // NDK will handle cleanup of connections automatically
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});

// Modal handling
function openModal(lud16) {
  currentLud16 = lud16;
  showZapModal = true;
}

function closeModal() {
  showZapModal = false;
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
function extractImageUrls(tags: string[][]): string[] {
  return tags
    .filter(tag => tag[0] === 'image')
    .map(tag => tag[1]);
}

  // Delete event function implementing NIP-09
  async function deleteEvent(event: NDKEvent) {
    if (!ndk || !nip07signer) {
      console.error('NDK or signer not initialized');
      alert('Cannot delete event: NDK or signer not initialized');
      return;
    }

    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      // Create deletion request event (NIP-09)
      const deletionEvent = new NDKEvent(ndk);
      deletionEvent.kind = 5; // Deletion request event kind
      deletionEvent.tags = [
        ['e', event.id], // Reference to event being deleted
        ['k', '31923'], // Kind of event being deleted (31923 for calendar events)
        ['p', event.pubkey] // Reference to the event author
      ];
      deletionEvent.content = 'Event deleted by author'; // Optional reason

      // Sign and publish deletion event
      await deletionEvent.sign();  // Sign the deletion event
      await ndk.publish(deletionEvent);
      console.log('Deletion event published:', deletionEvent);

      // Remove event from local state
      eventsKind1 = eventsKind1.filter(e => e.id !== event.id);
      
      // Update the global events store
      eventsStore.update(events => events.filter(e => e.id !== event.id));

      // Unsubscribe from the deleted event
      if (subscriptionKind1) {
        subscriptionKind1.removeFilter({ ids: [event.id] });
      }

      alert('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event: ' + error.message);
    }
  }

  // Edit event functions
  function openEditModal(event: NDKEvent) {
    editingEvent = event;
    const details = extractEventDetails(event.tags);
    
    // Convert timestamps to date and time strings
    const startDate = new Date(details.start);
    const endDate = new Date(details.end);

    editForm = {
      title: details.title || '',
      content: event.content || '',
      summary: details.summary || '',
      location: details.location || '',
      startDate: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endDate: endDate.toISOString().split('T')[0],
      endTime: endDate.toTimeString().slice(0, 5),
      image: event.tags.find(tag => tag[0] === 'image')?.[1] || ''
    };

    showEditModal = true;
  }

  async function handleEditSubmit() {
    if (!ndk || !editingEvent) return;

    try {
      // Create new event with updated content
      const ndkEvent = new NDKEvent(ndk);
      ndkEvent.kind = 31923;
      ndkEvent.content = editForm.content;
      
      // Convert dates to Unix timestamps
      const startDateTime = new Date(`${editForm.startDate}T${editForm.startTime}`);
      const endDateTime = new Date(`${editForm.endDate}T${editForm.endTime}`);
      const startTimestamp = Math.floor(startDateTime.getTime() / 1000);
      const endTimestamp = Math.floor(endDateTime.getTime() / 1000);
      
      ndkEvent.tags = [
        ['e', editingEvent.id, '', 'reply'],
        ['title', editForm.title],
        ['summary', editForm.summary],
        ['start', startTimestamp.toString()],
        ['end', endTimestamp.toString()],
        ['location', editForm.location]
      ];

      if (editForm.image) {
        ndkEvent.tags.push(['image', editForm.image]);
      }

      // Publish the updated event
      await ndk.publish(ndkEvent);

      // Create deletion request for the old event (NIP-09)
      const deletionEvent = new NDKEvent(ndk);
      deletionEvent.kind = 5;
      deletionEvent.tags = [
        ['e', editingEvent.id],
        ['k', '31923']
      ];
      deletionEvent.content = 'Event updated';
      await ndk.publish(deletionEvent);

      // Update local state
      eventsKind1 = eventsKind1.map(e => 
        e.id === editingEvent.id ? ndkEvent : e
      );

      showEditModal = false;
      editingEvent = null;
      alert('Event updated successfully');
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  function closeEditModal() {
    showEditModal = false;
    editingEvent = null;
  }

  // Function to extract event details
  function extractEventDetails(tags: string[][]): EventDetails {
    try {
      const eventDetails: EventDetails = {
        start: new Date(),  // Default to current date if not found
        end: new Date()     // Default to current date if not found
      };
      
      if (!Array.isArray(tags)) {
        console.error('Invalid tags format:', tags);
        return eventDetails;
      }

      tags.forEach(([key, value]) => {
        try {
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
              const startTimestamp = parseInt(value);
              if (!isNaN(startTimestamp)) {
                eventDetails.start = new Date(startTimestamp * 1000);
              }
              break;
            case 'end':
              const endTimestamp = parseInt(value);
              if (!isNaN(endTimestamp)) {
                eventDetails.end = new Date(endTimestamp * 1000);
              }
              break;
            case 'location':
              eventDetails.location = value;
              break;
            case 'address':
              eventDetails.address = value;
              break;
          }
        } catch (tagError) {
          console.error('Error processing tag:', key, value, tagError);
        }
      });
      return eventDetails;
    } catch (error) {
      console.error('Error extracting event details:', error);
      return {
        title: 'Error loading event',
        start: new Date(),
        end: new Date()
      };
    }
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
              <button class="action-button edit" on:click={() => openEditModal(event)}>
                <Icon icon="mdi:pencil" />
                Edit Event
              </button>
              <button class="action-button delete" on:click={() => deleteEvent(event)}>
                <Icon icon="mdi:delete" />
                Delete
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

{#if showEditModal}
  <dialog 
    class="modal edit-modal" 
    open
    on:close={closeEditModal}
    aria-labelledby="edit-modal-title"
  >
    <div 
      class="modal-content edit-form" 
      role="document"
    >
      <h2 id="edit-modal-title">Edit Event</h2>
      <form on:submit|preventDefault={handleEditSubmit}>
        <div class="form-group">
          <label for="title">Title</label>
          <input type="text" id="title" bind:value={editForm.title} required />
        </div>

        <div class="form-group">
          <label for="content">Description</label>
          <textarea id="content" bind:value={editForm.content} rows="4"></textarea>
        </div>

        <div class="form-group">
          <label for="summary">Summary</label>
          <input type="text" id="summary" bind:value={editForm.summary} />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="startDate">Start Date</label>
            <input type="date" id="startDate" bind:value={editForm.startDate} required />
          </div>
          <div class="form-group">
            <label for="startTime">Start Time</label>
            <input type="time" id="startTime" bind:value={editForm.startTime} required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="endDate">End Date</label>
            <input type="date" id="endDate" bind:value={editForm.endDate} required />
          </div>
          <div class="form-group">
            <label for="endTime">End Time</label>
            <input type="time" id="endTime" bind:value={editForm.endTime} required />
          </div>
        </div>

        <div class="form-group">
          <label for="location">Location</label>
          <input type="text" id="location" bind:value={editForm.location} />
        </div>

        <div class="form-group">
          <label for="image">Image URL</label>
          <input type="url" id="image" bind:value={editForm.image} />
        </div>

        <div class="modal-actions">
          <button type="submit" class="save-button">Save Changes</button>
          <button type="button" class="cancel-button" on:click={closeEditModal}>Cancel</button>
        </div>
      </form>
    </div>
  </dialog>
{/if}

{#if showZapModal}
  <dialog 
    class="modal" 
    open
    on:close={closeModal}
    aria-labelledby="modal-title"
  >
    <div 
      class="modal-content" 
      role="document"
    >
      <h2 id="modal-title">Zap User</h2>
      <p>Send a zap to {currentLud16}</p>
      <input type="number" bind:value={customZapAmountMillisats} placeholder="Amount in millisats" />
      <input type="text" bind:value={customZapComment} placeholder="Zap comment" />
      <button on:click={handleZap}>Send Zap</button>
      <button on:click={closeModal}>Close</button>
    </div>
  </dialog>
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

.action-button.delete {
  background: #FEE2E2;
  color: #DC2626;
}

.action-button.delete:hover {
  background: #FEE2E2;
  color: #B91C1C;
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

/* Edit Modal Styles */
.edit-modal .modal-content {
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

.edit-form h2 {
  margin-bottom: 1.5rem;
  color: #1a1a1a;
  font-size: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #4B5563;
  font-size: 0.875rem;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #4F46E5;
  outline: none;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #E5E7EB;
}

.save-button {
  background: #4F46E5 !important;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-button:hover {
  background: #4338CA !important;
}

.cancel-button {
  background: #F3F4F6 !important;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-button:hover {
  background: #E5E7EB !important;
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
