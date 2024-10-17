<script>
  import { writable } from 'svelte/store';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let latitude = writable(null);
  let longitude = writable(null);
  let locationName = writable('');
  let locationError = writable('');

  const getLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          latitude.set(position.coords.latitude);
          longitude.set(position.coords.longitude);
          locationError.set('');

          // Fetch location name using Google Maps Geocoding API
          try {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=AIzaSyDE1S7-TP4vQjPsgWlpuosJbSpna0MPvLo`);
            const result = await response.json();

            const formattedAddress = result.results[0]?.formatted_address || "Unknown";
            locationName.set(formattedAddress); // Set location name

            // Dispatch data to parent
            dispatch('updateLocation', {
              geolocation: `${position.coords.latitude}, ${position.coords.longitude}`,
              location: formattedAddress
            });
          } catch (error) {
            locationError.set('Error fetching location name.');
          }
        },
        (error) => {
          locationError.set('Error fetching location.');
        }
      );
    } else {
      locationError.set('Geolocation is not supported by this browser.');
    }
  };
</script>

<div>
  <button type="button" on:click={getLocation}>Get Location</button>

</div>

<style>
button {
  padding: 0.35rem;
  margin: 0.5rem 0;
  border-radius: 6px;
  border: 4px solid #ddd;
  font-size: 1rem;
  color: #333;
}
</style>
