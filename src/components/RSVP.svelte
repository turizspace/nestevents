<script>
  import NDK, { NDKEvent, NDKNip07Signer } from "@nostr-dev-kit/ndk";
  import { v4 as uuidv4 } from 'uuid';
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';

  export let event; // The calendar event to RSVP to
  export let ndkInstance; // Required NDK instance from parent

  let rsvpState = null;
  let isFree = false;
  let note = '';
  let isReady = false;
  let error = null;
  let nip07signer;

  // Track NDK connection status
  let connectionCheckInterval;

  onMount(async () => {
    try {
      if (!ndkInstance) {
        throw new Error('NDK instance is required');
      }

      if (!window.nostr) {
        throw new Error('Nostr extension not found. Please install a Nostr extension like Alby or Nos2x.');
      }

      // Initialize NIP-07 signer
      nip07signer = new NDKNip07Signer();
      ndkInstance.signer = nip07signer;

      // Initial check
      checkConnection();

      // Set up periodic connection check
      connectionCheckInterval = setInterval(checkConnection, 2000);

      // Subscribe to relay connection events
      ndkInstance.pool.on('relay:connect', () => {
        checkConnection();
      });

      ndkInstance.pool.on('relay:disconnect', () => {
        checkConnection();
      });

    } catch (err) {
      console.error('Failed to initialize NDK:', err);
      error = err.message;
      isReady = false;
    }

    // Cleanup on component destroy
    return () => {
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
      }
    };
  });

  function checkConnection() {
    try {
      // Check active subscriptions and connections
      const hasActiveRelays = ndkInstance.pool.relays.size > 0;
      const connectedRelays = Array.from(ndkInstance.pool.relays.values())
        .filter(r => r.status === 1).length;
      
      // Consider ready if we have any relays connected AND we have a signer
      if ((hasActiveRelays || connectedRelays > 0) && ndkInstance.signer) {
        isReady = true;
        error = null;
      } else {
        isReady = false;
        error = !ndkInstance.signer ? 'Waiting for signer...' : 'Waiting for relay connection...';
      }
    } catch (err) {
      console.error('Connection check failed:', err);
      isReady = false;
      error = 'Connection check failed';
    }
  }

  async function handleRSVP(status) {
    try {
      if (!ndkInstance) {
        throw new Error('NDK not initialized');
      }
      if (!event) {
        throw new Error('No event provided');
      }
      if (!ndkInstance.signer) {
        throw new Error('Signer not available. Please connect your Nostr extension.');
      }

      const ndkEvent = new NDKEvent(ndkInstance);
      ndkEvent.kind = 31925;
      ndkEvent.content = note;
      
      // Required tags
      ndkEvent.tags = [
        ["e", event.id], // Event ID
        ["a", `${event.kind}:${event.pubkey}:${event.tags.find(t => t[0] === 'd')?.[1] || ''}`], // Event coordinates
        ["d", uuidv4()], // Unique identifier
        ["status", status],
      ];

      // Optional tags
      if (status !== 'declined') {
        ndkEvent.tags.push(["fb", isFree ? "free" : "busy"]);
      }
      ndkEvent.tags.push(["p", event.pubkey]); // Author of the calendar event

      // Sign the event
      await ndkEvent.sign();

      // Set a publishing timeout
      const publishTimeout = 10000; // 10 seconds
      const publishPromise = ndkInstance.publish(ndkEvent);
      
      try {
        await Promise.race([
          publishPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Publishing timeout')), publishTimeout)
          )
        ]);
        
        rsvpState = status;
        error = null;
      } catch (pubError) {
        if (pubError.message === 'Publishing timeout') {
          throw new Error('Failed to publish RSVP: Network timeout. Please try again.');
        } else {
          throw new Error(`Failed to publish RSVP: ${pubError.message}`);
        }
      }
    } catch (err) {
      console.error('Failed to submit RSVP:', err);
      error = err.message;
    }
  }
</script>

{#if error}
  <div class="error-message">
    <Icon icon="mdi:alert-circle" />
    {error}
  </div>
{:else if !isReady}
  <div class="rsvp-status">
    <Icon icon="mdi:loading" class="animate-spin" />
    Connecting to Nostr...
  </div>
{:else if rsvpState}
  <div class="rsvp-status">
    {#if rsvpState === 'accepted'}
      <Icon icon="mdi:check-circle" class="text-green-500" />
      You're going!
    {:else if rsvpState === 'tentative'}
      <Icon icon="mdi:help-circle" class="text-yellow-500" />
      You might attend
    {:else}
      <Icon icon="mdi:close-circle" class="text-red-500" />
      You declined
    {/if}
  </div>
{:else}
  <div class="rsvp-container">
    <div class="rsvp-buttons">
      <button 
        class="rsvp-button accept" 
        on:click={() => handleRSVP('accepted')}
      >
        <Icon icon="mdi:check" />
        Going
      </button>
      <button 
        class="rsvp-button maybe" 
        on:click={() => handleRSVP('tentative')}
      >
        <Icon icon="mdi:help" />
        Maybe
      </button>
      <button 
        class="rsvp-button decline" 
        on:click={() => handleRSVP('declined')}
      >
        <Icon icon="mdi:close" />
        Can't Go
      </button>
    </div>

    <textarea
      class="note-input"
      bind:value={note}
      placeholder="Add a note (optional)"
    />

    {#if rsvpState !== 'declined'}
      <label class="busy-status">
        <input type="checkbox" bind:checked={isFree} />
        <Icon icon="mdi:calendar-clock" />
        I'm {isFree ? 'free' : 'busy'} during this time
      </label>
    {/if}
  </div>
{/if}

<style>
  .rsvp-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: #f8f9fa;
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    margin-top: 1rem;
  }

  .rsvp-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .rsvp-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
    color: #333;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .rsvp-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  }

  .rsvp-button.accept {
    background: #10B981;
    color: white;
  }

  .rsvp-button.maybe {
    background: #F59E0B;
    color: white;
  }

  .rsvp-button.decline {
    background: #EF4444;
    color: white;
  }

  .rsvp-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
    padding: 0.5rem;
    border-radius: 8px;
    background: #E5E7EB;
    color: #374151;
  }

  .error-message {
    color: #EF4444;
    font-size: 0.875rem;
    text-align: center;
    padding: 0.5rem;
    background: #FEE2E2;
    border-radius: 6px;
  }

  .note-input {
    padding: 0.75rem;
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    resize: vertical;
    min-height: 80px;
    margin-top: 0.5rem;
  }

  .busy-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 1rem;
    background-color: #f5f5f5;
    border-radius: 8px;
  }

  .rsvp-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .rsvp-button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .rsvp-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .rsvp-yes {
    background-color: #4caf50;
    color: white;
  }

  .rsvp-no {
    background-color: #f44336;
    color: white;
  }

  .rsvp-maybe {
    background-color: #ff9800;
    color: white;
  }

  .availability-toggle {
    display: flex;
    justify-content: center;
    margin: 0.5rem 0;
  }

  .availability-toggle label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .note-section {
    width: 100%;
  }

  .note-section textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
  }

  .rsvp-confirmation {
    text-align: center;
    margin-top: 1rem;
    padding: 1rem;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .rsvp-confirmation p {
    margin: 0.5rem 0;
  }

  .status {
    font-weight: bold;
    color: #2196f3;
  }

  .availability {
    color: #666;
  }

  .note {
    font-style: italic;
    color: #666;
    word-break: break-word;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #666;
  }

 

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background-color: #ffebee;
    color: #d32f2f;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .rsvp-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 10px 20px;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .rsvp-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .rsvp-button:disabled:hover {
    transform: none;
    box-shadow: none;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

 

  .rsvp-yes {
    background-color: #4caf50;
    border: 1px solid #43a047;
  }

  .rsvp-no {
    background-color: #f44336;
    border: 1px solid #e53935;
  }

  .rsvp-maybe {
    background-color: #ff9800;
    border: 1px solid #fb8c00;
  }

  /* Style adjustments for better visual hierarchy */
  .availability-toggle {
    background-color: white;
    padding: 0.75rem;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }

  .note-section textarea {
    background-color: white;
    border: 1px solid #e0e0e0;
    font-size: 0.9rem;
    padding: 0.75rem;
  }

  .note-section textarea:focus {
    border-color: #2196f3;
    outline: none;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
  }
</style>

