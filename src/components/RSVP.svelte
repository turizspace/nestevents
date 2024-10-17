<script>
  export let eventId; // Pass the event ID
  export let onRSVP;  // Function to handle RSVP

  let rsvpState = null; // null -> no response, 'yes' -> attending, 'no' -> not attending, 'maybe' -> unsure

  function handleRSVP(state) {
    rsvpState = state;
    if (onRSVP) {
      onRSVP(eventId, state); // Call the callback function passed from the parent component
    }
  }
</script>

<style>
  .rsvp-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
  }

  .rsvp-button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .rsvp-button:hover {
    background-color: #f0e68c;
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

  .rsvp-confirmation {
    text-align: center;
    margin-top: 1rem;
    font-weight: bold;
  }
</style>

<div class="rsvp-buttons">
  <button class="rsvp-button rsvp-yes" on:click={() => handleRSVP('yes')}>Yes</button>
  <button class="rsvp-button rsvp-no" on:click={() => handleRSVP('no')}>No</button>
  <button class="rsvp-button rsvp-maybe" on:click={() => handleRSVP('maybe')}>Maybe</button>
</div>

{#if rsvpState !== null}
  <div class="rsvp-confirmation">
    RSVP: {rsvpState === 'yes' ? 'Attending' : rsvpState === 'no' ? 'Not Attending' : 'Maybe'}
  </div>
{/if}
