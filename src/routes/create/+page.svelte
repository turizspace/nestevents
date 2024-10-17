<script>
  import { onMount } from 'svelte';
  import EventForm from '../../components/EventForm.svelte';
  import EventList from '../../components/MyEventList.svelte'; // Import the component
  import NDK, { NDKNip07Signer } from "@nostr-dev-kit/ndk";

  let nip07signer;
  let user; // Define user in the component scope
  let userPubKey; // Store user public key
  let extensionError = ''; // To store error messages if any
  let canCreateEvent = true; // Flag to track if event can be created
  let showForm = true; // Flag to control whether to show the form

  // Check if the Nostr extension is installed
  onMount(async () => {
    if (window.nostr) {
      try {
        nip07signer = new NDKNip07Signer();

        // Try to get the user from the extension
        try {
          user = await nip07signer.user();
          if (user) {
            userPubKey = user.pubkey; // Store the user's public key
            console.log('Extension found. Public Key:', userPubKey);
          } else {
            throw new Error('User denied access to public key.');
          }
        } catch (error) {
          // Handle any errors that occur while fetching the user
          extensionError = error.message;
          console.error('Error retrieving public key:', error);
          canCreateEvent = false; // Cannot create event without extension
          showForm = false; // Do not show the form if there is an issue
        }

      } catch (error) {
        extensionError = error.message; // Catch any other errors
        console.error('Error setting up NDKNip07Signer:', error);
        canCreateEvent = false; // Cannot create event without extension
        showForm = false; // Do not show the form if setup fails
      }
    } else {
      // Show alert if the extension is not found
      alert('Nostr extension is required to create events. Please install the extension.');
      extensionError = 'Nostr extension not found';
      console.log('Nostr extension not found');
      canCreateEvent = false; // Set the flag to false, as event cannot be created
      showForm = false; // Hide the form if the extension is not found
    }
  });
</script>

<!-- Display Error if any -->
{#if !showForm}
  <div class="error-message">
    {#if extensionError}
      <p>{extensionError}</p>
      <p>To create events, install a Nostr extension.</p>
    {/if}
  </div>
{/if}


<!-- Show the form only if the extension is found and user can create events -->
{#if showForm}
  <EventForm />
{/if}

<!-- Show the event list once the userPubKey is available -->
{#if userPubKey}
  <!-- Pass userPubKey to EventList component to show events from this author -->
  <EventList {userPubKey} />
{:else}
  <p>Loading user data...</p>
{/if}


<style>
  .error-message {
    color: red;
    padding: 10px;
    background-color: #ffeeee;
    border: 1px solid red;
    border-radius: 5px;
    margin-bottom: 10px;
  }
</style>
