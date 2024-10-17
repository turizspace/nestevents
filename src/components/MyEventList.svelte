<script>
  import { onMount } from 'svelte';
  import { eventsStore, profilesStore } from '../utils/store.js'; // Make sure the paths are correct
  import NDK, { NDKNip07Signer } from "@nostr-dev-kit/ndk";
  import Icon from '@iconify/svelte';

  export let userPubKey = ''; // Accept userPubKey as a prop
  let eventsKind1 = [];
  let profiles = {};
  let isLoading = true;

  let ndk;
  let subscriptionKind1;
  let subscriptionKind0;

  // Helper function to extract specific tag data
  function getTagValue(tags, key) {
    const tag = tags.find(t => t[0] === key);
    return tag ? tag[1] : null;
  }

  onMount(async () => {
    try {
      // Initialize NDK and connect to relays
      const nip07signer = new NDKNip07Signer();
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

      // Connect to the relay
      await ndk.connect();

      // Subscribe to events of kind 31923
      subscriptionKind1 = ndk.subscribe({
        kinds: [31923],
        authors: [userPubKey] // Use userPubKey passed as a prop
      });

      // Handle events of kind 1
      subscriptionKind1.on('event', (event) => {
        eventsKind1 = [...eventsKind1, event];
        eventsStore.update(events => [...events, event]);
        isLoading = false;
        console.log(event);
      });

      // Subscribe to profile events (kind 0)
      subscriptionKind0 = ndk.subscribe({
        kinds: [0],
        authors: [userPubKey]
      });

      // Handle profile events (kind 0)
      subscriptionKind0.on('event', (event) => {
        try {
          console.log(event);
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
</script>

{#if isLoading}
  <p>Loading events...</p>
{:else}
  <div>
    {#each eventsKind1 as event}
      <div class="event">
        <!-- Extract and display event details -->
        <h3>{getTagValue(event.tags, 'title')}</h3>
        <p><strong>Location:</strong> {getTagValue(event.tags, 'location')}</p>
        <p><strong>Start:</strong> {new Date(parseInt(getTagValue(event.tags, 'start')) * 1000).toLocaleString()}</p>
        <p><strong>End:</strong> {new Date(parseInt(getTagValue(event.tags, 'end')) * 1000).toLocaleString()}</p>
        <p>{event.content}</p>
        {#if getTagValue(event.tags, 'imeta')}
          <img src={getTagValue(event.tags, 'imeta').split(' ')[1]} alt="Event Image" style="width: 100%; max-width: 400px;" />
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .event {
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background-color: #f9f9f9;
  }

  .event img {
    margin-top: 10px;
    border-radius: 8px;
  }
</style>
