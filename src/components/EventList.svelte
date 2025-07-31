<script>
import { onMount, onDestroy } from 'svelte';
import { fade, slide } from 'svelte/transition';
import NDK from "@nostr-dev-kit/ndk";
import Icon from '@iconify/svelte';
import { getZapEndpoint, makeZapRequest } from '../utils/zapUtils.js';
import { eventsStore, profilesStore } from '../utils/store.js';

import RSVP from './RSVP.svelte'

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

onMount(async () => {
  try {
    // Initialize NDK with relay URLs
    ndk = new NDK({
      explicitRelayUrls: [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.band'
      ]
    });

    // Connect to the relay
    await ndk.connect();
    console.log("Connected to relay");
    
    // Set to track seen event IDs and subscribed pubkeys
    const seenEventIds = new Set();
    const subscribedPubkeys = new Set();

    // Function to subscribe to profiles
    const subscribeToProfiles = (pubkeys) => {
      // Filter out pubkeys we've already subscribed to
      const newPubkeys = pubkeys.filter(pubkey => !subscribedPubkeys.has(pubkey));
      
      if (newPubkeys.length === 0) {
        console.log("No new pubkeys to subscribe to");
        return;
      }
      
      console.log("Subscribing to profiles for pubkeys:", newPubkeys);
      
      // Mark these pubkeys as subscribed
      newPubkeys.forEach(pubkey => subscribedPubkeys.add(pubkey));
      
      // Subscribe to events of kind 0 (profile events) for specific pubkeys
      subscriptionKind0 = ndk.subscribe({
        kinds: [0],
        authors: newPubkeys,
      });

      // Handle profile events (kind 0)
      subscriptionKind0.on('event', (event) => {
        try {
          console.log("Received profile event:", event);
          const profile = JSON.parse(event.content);
          profiles = { ...profiles, [event.pubkey]: { ...profile, pubkey: event.pubkey } };
          profilesStore.update(p => ({ ...p, [event.pubkey]: { ...profile, pubkey: event.pubkey } }));
          console.log("Profile received for pubkey:", event.pubkey);
          console.log("Total profiles loaded:", Object.keys(profiles).length);
        } catch (error) {
          console.error("Error parsing profile:", error);
          console.error("Profile content:", event.content);
        }
      });
    };

    // Subscribe to events of kind 31923 (events of interest)
    subscriptionKind1 = ndk.subscribe({
      kinds: [31923],
      since: Math.floor(Date.now() / 1000) - 24 * 60 * 60 // Last 24 hours
    });

    console.log("Subscribed to events");

    // Handle events of kind 31923
    subscriptionKind1.on('event', (event) => {
      // Skip if we've already seen this event
      if (seenEventIds.has(event.id)) {
        console.log("Skipping duplicate event:", event.id);
        return;
      }
      
      // Add to seen events
      seenEventIds.add(event.id);

      console.log("Received event:", event);
      console.log("Event kind:", event.kind);
      console.log("Event tags:", JSON.stringify(event.tags, null, 2));
      
      // Update events list
      eventsKind1 = [...eventsKind1, event];
      eventsStore.update(events => [...events, event]);
      console.log("Current events in eventsKind1:", eventsKind1.length);
      
      // Subscribe to profile for this event's author
      subscribeToProfiles([event.pubkey]);
      
      isLoading = false;
    });

    // Add error handling for subscription
    subscriptionKind1.on('error', (error) => {
      console.error("Subscription error:", error);
      isLoading = false;
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
  try {
    if (!ndk) {
      throw new Error('NDK is not initialized');
    }

    if (!currentLud16) {
      throw new Error('No Lightning address provided');
    }

    if (!customZapAmountMillisats || customZapAmountMillisats <= 0) {
      throw new Error('Please enter a valid amount');
    }

    // Check for WebLN availability first
    if (typeof window === 'undefined' || !window.webln) {
      throw new Error('WebLN is not available. Please install a Lightning browser extension.');
    }

    try {
      await window.webln.enable();
    } catch (error) {
      throw new Error('Failed to enable WebLN. Please check your Lightning wallet.');
    }

    // Get the zap endpoint
    const callback = await getZapEndpoint({ lud16: currentLud16 });
    if (!callback) {
      throw new Error('Could not get Lightning address details');
    }

    // Create the zap request
    const zapRequest = await makeZapRequest({
      profile: currentLud16,
      amount: customZapAmountMillisats,
      comment: customZapComment || '',
      relays: ['wss://relay.damus.io']
    });

    // Get the invoice
    const response = await fetch(`${callback}?amount=${customZapAmountMillisats}`);
    if (!response.ok) {
      throw new Error('Failed to get invoice');
    }

    const data = await response.json();
    if (!data.pr) {
      throw new Error('Invalid invoice received');
    }

    // Send the payment
    await window.webln.sendPayment(data.pr);
    alert('⚡️ Zap sent successfully!');
    closeModal();
  } catch (error) {
    console.error('Zap error:', error);
    alert(error.message || 'Failed to send zap');
  }
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
  {#if isLoading}
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>Loading events and profiles...</span>
    </div>
  {:else if eventsKind1.length === 0}
    <div class="loading-overlay">
      <span>No events found in the last 24 hours.</span>
    </div>
  {:else}
    <div style="display: none;">
      {console.log("Rendering events, total count:", eventsKind1.length)}
    </div>
    {#each eventsKind1 as event (event.id)}
      <div style="display: none;">
        {console.log("Checking profile for event:", event.id, "pubkey:", event.pubkey, "has profile:", !!profiles[event.pubkey])}
      </div>
      {#if profiles[event.pubkey]}
        <div class="content-card" transition:fade
             on:mousemove={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const x = ((e.clientX - rect.left) / rect.width) * 100;
               const y = ((e.clientY - rect.top) / rect.height) * 100;
               e.currentTarget.style.setProperty('--mouse-x', x + '%');
               e.currentTarget.style.setProperty('--mouse-y', y + '%');
             }}>
          <div class="profile-card">
            <div class="profile-img-container">
              <img
                src={profiles[event.pubkey].picture || 'https://via.placeholder.com/80'}
                alt={`${profiles[event.pubkey].name || 'Unknown'}'s profile picture`}
                class="profile-img"
                loading="lazy"
              />
            </div>
            <div class="profile-info">
              <h3 class="profile-name">{profiles[event.pubkey].name || 'Unknown'}</h3>
              <div class="profile-meta">
                <Icon icon="mdi:calendar-clock" class="icon" />
                <span>Event Organizer</span>
              </div>
            </div>
          </div>

          <!-- Event Details -->
          <div class="event-details">
            <h2 class="event-title">
              <Icon icon="mdi:calendar-star" class="icon" />
              {extractEventDetails(event.tags).title || extractEventDetails(event.tags).name}
            </h2>
            
            <p class="event-description">
              {event.content || 'No description available'}
            </p>
            
            <div class="details-grid">
              <div class="detail-section location-section">
                <div class="detail-header">
                  <Icon icon="mdi:map-marker" class="icon" />
                  <strong>Location Details</strong>
                </div>
                {#if extractEventDetails(event.tags).location}
                  <p class="detail-item">
                    <span class="detail-label">Venue:</span>
                    <span class="detail-value">{extractEventDetails(event.tags).location}</span>
                  </p>
                {/if}
                {#if extractEventDetails(event.tags).address}
                  <p class="detail-item">
                    <span class="detail-label">Address:</span>
                    <span class="detail-value">{extractEventDetails(event.tags).address}</span>
                  </p>
                {/if}
              </div>
              <div class="detail-section time-section">
                <div class="detail-header">
                  <Icon icon="mdi:calendar-clock" class="icon" />
                  <strong>Time Details</strong>
                </div>
                <div class="time-details">
                  <p class="detail-item">
                    <Icon icon="mdi:clock-start" class="icon-small" />
                    <span class="detail-label">Starts:</span>
                    <span class="detail-value">
                      {new Date(extractEventDetails(event.tags).start).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      <span class="time-badge">
                        {new Date(extractEventDetails(event.tags).start).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </span>
                  </p>
                  
                  <p class="detail-item">
                    <Icon icon="mdi:clock-end" class="icon-small" />
                    <span class="detail-label">Ends:</span>
                    <span class="detail-value">
                      {new Date(extractEventDetails(event.tags).end).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      <span class="time-badge">
                        {new Date(extractEventDetails(event.tags).end).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Image Gallery -->
          {#if extractImageUrls(event.tags).length > 0}
            <div class="image-gallery" transition:slide>
              {#each extractImageUrls(event.tags) as imageUrl}
                <img
                  src={imageUrl}
                  alt="Event"
                  class="event-image"
                  loading="lazy"
                />
              {/each}
            </div>
          {/if}

          <!-- Interactive Elements -->
          <div class="interactive-elements">
            <RSVP {event} ndkInstance={ndk} />
            {#if profiles[event.pubkey]?.lud16}
              <button
                class="zap-button"
                on:click={() => openModal(profiles[event.pubkey].lud16)}
                title="Send a Zap payment"
              >
                Zap
                <Icon icon="mdi:lightning-bolt" class="icon" />
              </button>
            {:else}
              <button
                class="zap-button disabled"
                disabled
                title="This user cannot receive Zaps"
              >
                Zap not available
                <Icon icon="mdi:lightning-bolt-off" class="icon" />
              </button>
            {/if}
          </div>
        </div>
      {/if}
    {/each}
  {/if}
</div>

{#if showModal}
  <div class="modal" on:click={closeModal} transition:fade>
    <div class="modal-content" on:click|stopPropagation transition:slide>
      <button class="close" on:click={closeModal}>×</button>
      <h2>⚡️ Send Zap</h2>
      <p>Lightning Address: <strong>{currentLud16}</strong></p>
      
      <div class="amount-selector">
        <label for="amount">Amount (sats)</label>
        <input 
          id="amount"
          type="number" 
          bind:value={customZapAmountMillisats} 
          placeholder="Enter amount in sats"
          min="1"
        />
        <div class="quick-amounts">
          {#each defaultZapAmounts as amount}
            <button 
              class="amount-btn" 
              on:click={() => customZapAmountMillisats = amount}
            >
              {amount} sats
            </button>
          {/each}
        </div>
      </div>

      <div class="comment-section">
        <label for="comment">Message (optional)</label>
        <input 
          id="comment"
          type="text" 
          bind:value={customZapComment} 
          placeholder="Add a message with your zap"
        />
      </div>

      <div class="modal-actions">
        <button class="send-zap" on:click={handleZap}>
          <Icon icon="mdi:lightning-bolt" class="icon" />
          Send Zap
        </button>
        <button class="cancel" on:click={closeModal}>Cancel</button>
      </div>
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
  display: grid;
  gap: 32px;
  max-width: 70em;
  margin: 0 auto;
  padding: 24px;
  word-wrap: break-word;
}

@media (max-width: 768px) {
  .event-container {
    max-width: 100%;
    padding: 16px;
    gap: 24px;
  }
}

/* Card for individual events */
.content-card {
  --card-padding: clamp(24px, 4vw, 32px);
  --card-radius: 24px;
  --card-bg: rgba(255, 255, 255, 0.98);
  --card-border: rgba(0, 0, 0, 0.06);
  --card-shadow: 
    0 4px 6px rgba(0, 0, 0, 0.02),
    0 8px 24px rgba(0, 0, 0, 0.04),
    0 16px 32px rgba(0, 0, 0, 0.01);
  --transition-base: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --gradient-primary: linear-gradient(135deg, #2196f3, #21d4fd);
  
  background: var(--card-bg);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: var(--card-padding);
  display: grid;
  gap: 28px;
  transition: 
    transform var(--transition-base),
    box-shadow var(--transition-base);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--card-border);
  backdrop-filter: blur(20px);
  transform-origin: center;
  will-change: transform, box-shadow;
}

.content-card:hover {
  --card-shadow: 
    0 8px 12px rgba(0, 0, 0, 0.03),
    0 16px 32px rgba(0, 0, 0, 0.06),
    0 32px 64px rgba(0, 0, 0, 0.02);
  transform: translateY(-2px) scale(1.002);
}

.content-card::before,
.content-card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  transition: opacity var(--transition-base);
}

.content-card::before {
  background: var(--gradient-primary);
  opacity: 0;
  mask: linear-gradient(to bottom, 
    black 0%, black 4px, 
    transparent 4px, transparent 100%
  );
}

.content-card::after {
  background: radial-gradient(
    circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(33, 150, 243, 0.08) 0%,
    transparent 60%
  );
  opacity: 0;
}

.content-card:hover::before {
  opacity: 1;
}

.content-card:hover::after {
  opacity: 1;
}

@media (max-width: 768px) {
  .content-card {
    padding: 15px;
  }
}

/* Profile card */
.profile-card {
  --avatar-size: clamp(48px, 8vw, 80px);
  --avatar-border: 3px;
  
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: var(--card-padding);
  position: relative;
}

.profile-card::after {
  content: '';
  position: absolute;
  left: calc(var(--card-padding) * -1);
  right: calc(var(--card-padding) * -1);
  bottom: 0;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    var(--card-border) 20%,
    var(--card-border) 80%,
    transparent
  );
}

.profile-img-container {
  position: relative;
  width: var(--avatar-size);
  height: var(--avatar-size);
  border-radius: 50%;
}

.profile-img-container::before {
  content: '';
  position: absolute;
  inset: calc(var(--avatar-border) * -1);
  border-radius: inherit;
  background: var(--gradient-primary);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.profile-img-container:hover::before {
  opacity: 1;
}

.profile-img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  border: var(--avatar-border) solid white;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.05),
    0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform var(--transition-base);
  will-change: transform;
  position: relative;
  z-index: 1;
}

.profile-img:hover {
  transform: scale(0.95);
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-size: clamp(1.25rem, 3vw, 1.5rem);
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.profile-meta {
  font-size: 0.95rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.profile-meta .icon {
  width: 16px;
  height: 16px;
  color: #2196f3;
}

/* Event details */
.event-details {
  --content-spacing: clamp(16px, 3vw, 24px);
  
  display: grid;
  gap: var(--content-spacing);
  animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.event-title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin: 0;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% auto;
  transition: background-position var(--transition-base);
}

.content-card:hover .event-title {
  background-position: right center;
}

.event-description {
  font-size: clamp(1rem, 2.5vw, 1.125rem);
  color: #444;
  line-height: 1.7;
  margin: 0;
  padding: clamp(16px, 3vw, 24px);
  background: rgba(33, 150, 243, 0.03);
  border-radius: calc(var(--card-radius) / 2);
  border: 1px solid rgba(33, 150, 243, 0.08);
  position: relative;
}

.event-description::before {
  content: '"';
  position: absolute;
  top: 0;
  left: 16px;
  font-size: 3em;
  line-height: 1;
  color: rgba(33, 150, 243, 0.2);
  font-family: Georgia, serif;
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

@media (max-width: 768px) {
  .profile-card {
    padding-bottom: 20px;
    gap: 16px;
  }

  .profile-img {
    width: 60px;
    height: 60px;
  }

  .profile-card div h3 {
    font-size: 1.2rem;
  }

  .event-details h4 {
    font-size: 1.5rem;
  }

  .event-details p {
    font-size: 1rem;
    flex-direction: column;
    gap: 4px;
  }

  .event-details strong {
    min-width: auto;
  }
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
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 24px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 16px;
}

.image-gallery img {
  width: 100%;
  height: 240px;
  border-radius: 12px;
  object-fit: cover;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-gallery img:hover {
  transform: scale(1.03);
  border-color: #2196f3;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* Interactive elements container */
.interactive-elements {
  --button-height: 48px;
  --button-padding: 24px;
  --button-radius: 16px;
  
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(12px, 3vw, 20px);
  margin-top: var(--content-spacing);
  padding-top: var(--content-spacing);
  position: relative;
}

.interactive-elements::before {
  content: '';
  position: absolute;
  top: 0;
  left: calc(var(--card-padding) * -1);
  right: calc(var(--card-padding) * -1);
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    var(--card-border) 20%,
    var(--card-border) 80%,
    transparent
  );
}

/* Base button styles */
.button {
  height: var(--button-height);
  padding: 0 var(--button-padding);
  border: none;
  border-radius: var(--button-radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

.button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.2));
  opacity: 0;
  transition: opacity var(--transition-base);
}

.button:hover::before {
  opacity: 1;
}

/* Zap Button */
.zap-button {
  composes: button;
  background: linear-gradient(135deg, #f7d74e, #f5c141);
  color: #000;
  box-shadow: 
    0 2px 4px rgba(245, 193, 65, 0.2),
    0 4px 16px rgba(245, 193, 65, 0.15);
  transform-origin: center;
  will-change: transform, box-shadow;
}

.zap-button:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 
    0 4px 8px rgba(245, 193, 65, 0.25),
    0 8px 24px rgba(245, 193, 65, 0.2);
}

.zap-button:active {
  transform: translateY(1px) scale(0.98);
}

.zap-button .icon {
  width: 20px;
  height: 20px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.zap-button:hover .icon {
  transform: rotate(-12deg) scale(1.2);
}

.zap-button.disabled {
  background: linear-gradient(135deg, #e0e0e0, #f0f0f0);
  color: #999;
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.8;
}

.zap-button.disabled:hover {
  transform: none;
  box-shadow: none;
}

.zap-button.disabled .icon {
  opacity: 0.5;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  background-color: #fff;
  padding: 32px;
  border-radius: 20px;
  width: 400px;
  text-align: center;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.modal-content h2 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;
}

.modal-content p {
  color: #666;
  margin-bottom: 24px;
  font-size: 1.1rem;
}

.modal-content input {
  margin: 12px 0;
  padding: 14px;
  width: 100%;
  border: 2px solid #eee;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.modal-content input:focus {
  border-color: #2196f3;
  outline: none;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.modal-content button {
  margin: 8px;
  padding: 14px 28px;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-content button:first-of-type {
  background: linear-gradient(135deg, #f7d74e 0%, #f5c141 100%);
  color: #000;
  box-shadow: 0 4px 12px rgba(245, 193, 65, 0.3);
}

.modal-content button:last-of-type {
  background: #f5f5f5;
  color: #666;
}

.modal-content button:hover {
  transform: translateY(-2px);
}

.modal-content button:first-of-type:hover {
  box-shadow: 0 8px 24px rgba(245, 193, 65, 0.4);
}

.amount-selector, .comment-section {
  margin: 20px 0;
  text-align: left;
}

.amount-selector label, .comment-section label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

.quick-amounts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.amount-btn {
  background: #f5f5f5;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.amount-btn:hover {
  background: #ebebeb;
  transform: translateY(-1px);
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.send-zap {
  flex: 1;
  background: linear-gradient(135deg, #f7d74e 0%, #f5c141 100%);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.cancel {
  flex: 0.5;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Responsive Design - Adjustments for small screens */
.profile-img-container {
  position: relative;
  width: 80px;
  height: 80px;
}

.details-grid {
  --grid-min: min(300px, 100%);
  --section-gap: clamp(20px, 4vw, 32px);
  
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--grid-min), 1fr));
  gap: var(--section-gap);
  background: linear-gradient(rgba(33, 150, 243, 0.03), rgba(33, 150, 243, 0.01));
  border-radius: calc(var(--card-radius) - 4px);
  padding: var(--section-gap);
  margin-top: calc(var(--content-spacing) / 2);
}

.detail-section {
  background: white;
  border-radius: calc(var(--card-radius) - 8px);
  padding: calc(var(--card-padding) * 0.8);
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.02),
    0 4px 16px rgba(0, 0, 0, 0.03);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  will-change: transform, box-shadow;
}

.detail-section:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.06);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: calc(var(--section-gap) * 0.7);
  padding-bottom: calc(var(--section-gap) * 0.5);
  border-bottom: 1px solid var(--card-border);
}

.detail-header strong {
  font-size: 1.1rem;
  color: #1a1a1a;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.detail-header .icon {
  color: #2196f3;
  width: 24px;
  height: 24px;
}

.detail-item {
  display: grid;
  grid-template-columns: minmax(80px, auto) 1fr;
  gap: 16px;
  margin: 16px 0;
  line-height: 1.6;
  position: relative;
  width: 100%;
  min-width: 0;
}

.detail-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -8px;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    var(--card-border) 15%,
    var(--card-border) 85%,
    transparent
  );
}

.detail-label {
  color: #666;
  font-weight: 500;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

  .detail-value {
  color: #1a1a1a;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
}.time-details {
  display: flex;
  flex-direction: column;
  gap: calc(var(--section-gap) * 0.7);
}

.time-badge {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(33, 212, 253, 0.1));
  color: #2196f3;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-left: 8px;
  border: 1px solid rgba(33, 150, 243, 0.15);
  transition: all var(--transition-base);
}

.time-badge:hover {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.15), rgba(33, 212, 253, 0.15));
  transform: translateY(-1px);
}

.icon {
  color: #2196f3;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.icon-small {
  color: #2196f3;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.description {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #444;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  margin: 16px 0;
}

/* Loading states */
.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  backdrop-filter: blur(4px);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .event-container {
    max-width: 100%;
    padding: 12px;
  }

  .content-card {
    padding: 20px;
  }

  .details-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
    margin-top: 16px;
  }

  .detail-section {
    padding: 16px;
  }

  .detail-header {
    margin-bottom: 12px;
    padding-bottom: 8px;
  }

  .detail-item {
    margin: 8px 0;
    flex-direction: column;
    gap: 4px;
  }

  .detail-label {
    min-width: auto;
  }

  .detail-value {
    font-size: 0.95rem;
  }

  .time-badge {
    margin-left: 0;
    margin-top: 4px;
  }

  .interactive-elements {
    flex-direction: column;
    gap: 12px;
  }

  .zap-button {
    width: 100%;
  }

  .modal-content {
    width: 90%;
    padding: 24px;
  }

  .image-gallery {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    padding: 12px;
  }

  .description {
    font-size: 1rem;
    padding: 12px;
  }
}

.content-card pre {
  white-space: pre-wrap;
  word-break: break-word;
  background: rgba(0, 0, 0, 0.02);
  padding: 16px;
  border-radius: 12px;
  font-family: 'Fira Code', monospace;
}

.close {
  position: absolute;
  top: 16px;
  right: 16px;
  cursor: pointer;
  font-size: 24px;
  color: #666;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
  background: rgba(0, 0, 0, 0.05);
}

.close:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: rotate(90deg);
}
</style>