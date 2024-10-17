<script>
  import { onMount, onDestroy } from 'svelte';
  import NDK from "@nostr-dev-kit/ndk";
  import { eventsStore, profilesStore } from '../../utils/store.js';

  let eventsKind1 = [];
  let profiles = {};
  let notifications = [];
  let isLoading = true;

  let ndk;
  let subscriptionKind1;
  let subscriptionKind0;

  // Set up NDK, fetch events and profiles
  onMount(async () => {
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

      // Subscribe to event kinds 7 and 17 (notifications)
      subscriptionKind1 = ndk.subscribe({ kinds: [7, 17], limit: 100 });
      subscriptionKind1.on('event', (event) => {
        eventsKind1 = [...eventsKind1, event];
        eventsStore.update(events => [...events, event]);
        notifications = [...notifications, {
          id: event.id,
          pubkey: event.pubkey,
          eventReactedTo: event.tags.find(tag => tag[0] === 'e')[1] // Extract the 'e' tag for event reacted to
        }];
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
</script>

<!-- Notification Container -->
<div class="notification-container">
  {#each notifications as notification (notification.id)}
    {#if profiles[notification.pubkey]}
      <div class="notification-card">
        <!-- Profile Info -->
        <div class="profile-card">
          <img src={profiles[notification.pubkey].picture || 'https://via.placeholder.com/50'} alt="Profile Picture" class="profile-img">
          <div>
            <p><strong>{profiles[notification.pubkey].name || 'Unknown'}</strong> reacted to your event</p>
            <p>Event ID: {notification.eventReactedTo}</p>
          </div>
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  /* Container for notifications */
  .notification-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 40em;
    margin: 0 auto;
    padding: 20px;
  }

  /* Card for individual notifications */
  .notification-card {
    background-color: #F9F9FB;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 15px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 15px;
    transition: transform 0.2s ease-in-out;
  }

  .notification-card:hover {
    transform: translateY(-5px);
  }

  /* Profile info */
  .profile-card {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .profile-img {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  .profile-card p {
    font-size: 0.9rem;
    color: #555;
  }

  .profile-card strong {
    color: #000;
  }
</style>
