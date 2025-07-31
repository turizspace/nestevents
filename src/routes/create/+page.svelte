<script>
  import { onMount } from 'svelte';
  import EventForm from '../../components/EventForm.svelte';
  import EventList from '../../components/MyEventList.svelte'; // Import the component
  import NDK, { NDKNip07Signer } from "@nostr-dev-kit/ndk";
  import Icon from '@iconify/svelte';

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

<div class="create-event-container">
  <div class="content-wrapper">
    <!-- Header Section -->
    <header class="page-header">
      <h1>Create Event</h1>
      <p class="subtitle">Share your next exciting event with the community</p>
    </header>

    <!-- Extension Check Section -->
    {#if !showForm}
      <div class="extension-notice" class:error={extensionError}>
        <div class="notice-content">
          <Icon icon="mdi:alert-circle" width="24" height="24" />
          <div class="notice-text">
            <h3>{extensionError || 'Nostr Extension Required'}</h3>
            <p>To create events, please install a Nostr extension first.</p>
          </div>
        </div>
        <button class="install-button">
          <Icon icon="mdi:download" />
          Install Extension
        </button>
      </div>
    {/if}

    <!-- Event Creation Section -->
    <div class="form-section" class:hidden={!showForm}>
      {#if showForm}
        <EventForm />
      {/if}
    </div>

    <!-- My Events Section -->
    <div class="events-section">
      <h2>My Events</h2>
      {#if userPubKey}
        <EventList {userPubKey} />
      {:else}
        <div class="loading-state">
          <Icon icon="mdi:loading" class="spin" width="24" height="24" />
          <p>Loading your events...</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .create-event-container {
    padding-top: calc(80px + 1rem); /* Additional padding for navbar */
    min-height: calc(100vh - 80px);
    background: #f8f9fa;
    position: relative;
    z-index: 1; /* Ensure content stays below navbar */
  }

  .content-wrapper {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem 1rem;
    overflow: hidden; /* Prevent content overflow */
  }

  .page-header {
    text-align: center;
    margin-bottom: 2.5rem;
    padding: 0 1rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subtitle {
    font-size: 1.1rem;
    color: #666;
    margin-top: 0.5rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 1rem;
  }

  .extension-notice {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid #e1e4e8;
    overflow: hidden; /* Prevent content overflow */
  }

  .extension-notice.error {
    border-left: 4px solid #ff4d4f;
  }

  .notice-content {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
    max-width: 100%;
  }

  .notice-text {
    min-width: 0; /* Enable text truncation in flex container */
    flex: 1;
  }

  .notice-text h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .notice-text p {
    margin: 0.5rem 0 0;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .install-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #2196f3;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .install-button:hover {
    background: #1976d2;
    transform: translateY(-1px);
  }

  .form-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 2rem;
  }

  .form-section.hidden {
    display: none;
  }

  .events-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    overflow: hidden; /* Prevent content overflow */
  }

  .events-section h2 {
    font-size: 1.5rem;
    margin: 0 0 1.5rem;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 1rem;
  }

  .loading-state {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #666;
    padding: 2rem;
    justify-content: center;
    min-height: 100px; /* Ensure consistent height when loading */
  }


  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 768px) {
    .create-event-container {
      padding-top: calc(64px + 1rem); /* Adjusted for smaller navbar on mobile */
    }

    .content-wrapper {
      padding: 1rem;
    }

    .page-header {
      padding: 0 0.5rem;
    }

    .page-header h1 {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
      padding: 0 0.5rem;
    }

    .form-section,
    .events-section {
      padding: 1.25rem;
      margin: 0.5rem;
    }

    .notice-content {
      gap: 0.75rem;
    }

    .notice-text h3 {
      font-size: 1rem;
    }

    .notice-text p {
      font-size: 0.875rem;
    }
  }

  @media (max-width: 480px) {
    .create-event-container {
      padding-top: calc(56px + 0.75rem); /* Even smaller padding for very small screens */
    }

    .page-header h1 {
      font-size: 1.75rem;
    }

    .form-section,
    .events-section {
      padding: 1rem;
      margin: 0.5rem 0;
    }

    .extension-notice {
      padding: 1rem;
    }
  }

  /* Prevent text selection during touch interactions */
  @media (hover: none) {
    .page-header h1,
    .subtitle {
      user-select: none;
    }
  }
</style>
