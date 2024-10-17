import { writable, get } from 'svelte/store';
import NDK, { NDKEvent, NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { v4 as uuidv4 } from 'uuid';

// Writable stores for input fields
export let input = writable('');
export let title = writable('');
export let summary = writable('');
export let geolocation = writable('');
export let location = writable('');
export let image = writable('');
export let startDate = writable('');
export let startTime = writable('');
export let endDate = writable('');
export let endTime = writable('');
export let label = writable('');
export let descriptiveLabel = writable('');
export let hashtags = writable('');
export let referenceLinks = writable('');
export let eventLog = writable([]); // Store for the events

// Function to get timezone ID (you can replace this with your actual function to get time zone)
function getTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Function to handle form submission and event creation
export const onSubmit = async (event) => {
  event.preventDefault(); // Prevent default form submission behavior

  // Initialize signer and NDK instance
  const nip07signer = new NDKNip07Signer();

  const ndk = new NDK({
    explicitRelayUrls: ['wss://relay.primal.net', 'wss://relay.snort.social'],
    signer: nip07signer,
  });

  try {
    // Connect to relays
    await ndk.connect();
    console.log('NDK connected');

    // Create a new NDKEvent
    const ndkEvent = new NDKEvent(ndk);
    ndkEvent.kind = 31923; // Set the event kind
    ndkEvent.content = get(input); // Get the content from the input store

    // Generate UUID for the event
    const uuid = uuidv4();

    // Get the user's time zone
    const tzid = getTimeZone();

    // Define the event tags
    ndkEvent.tags = [
      ['d', uuid], // Using generated UUID
      ['title', get(title)],
      ['summary', get(summary)],
      ['image', get(image), '756x1008'], // Assuming the image dimensions you want to include
      ['start', `${get(startDate)}T${get(startTime)}`], // Combine date and time
      ['end', `${get(endDate)}T${get(endTime)}`], // Combine date and time
      ['start_tzid', tzid],
      ['end_tzid', tzid],
      ['g', get(geolocation)],
      ['location', get(location)],
      ['L', get(label)],
      ['l', get(descriptiveLabel)],
      ['t', ...get(hashtags).split(',').map((tag) => tag.trim())], // Handle multiple hashtags
      ['r', ...get(referenceLinks).split(',').map((link) => link.trim())], // Handle multiple reference links
    ];

    // Publish the event
    await ndk.publish(ndkEvent);

    // After publishing, store the created event in eventLog
    eventLog.update((events) => [...events, ndkEvent]); // Add the new event to the log

    console.log('Event published successfully!', ndkEvent);
  } catch (error) {
    console.error('Error creating event:', error);
  }
};
