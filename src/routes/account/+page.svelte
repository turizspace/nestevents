<script>
  import { onMount } from 'svelte';
  import { userStore, userActions } from '../../utils/store';
  import Icon from '@iconify/svelte';
  import Notifs from '../../components/Notifs.svelte';
  import { goto } from '$app/navigation';

  // Subscribe to the user store
  let userProfile;
  userStore.subscribe(value => {
    userProfile = value.profile;
    // Redirect to home if not authenticated
    if (!value.loading && !value.isAuthenticated) {
      goto('/');
    }
  });

  let editMode = false;
  let editForm = {
    name: '',
    about: '',
    picture: ''
  };

  function toggleEditMode() {
    if (!editMode) {
      // Initialize edit form with current values
      editForm = {
        name: userProfile?.name || '',
        about: userProfile?.about || '',
        picture: userProfile?.picture || ''
      };
    }
    editMode = !editMode;
  }

  async function saveProfile() {
    try {
      userActions.updateProfile({
        ...userProfile,
        ...editForm
      });
      editMode = false;
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  }


</script>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  .account-container {
    padding-top: 80px;
    max-width: 800px;
    margin: 0 auto;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .loading {
    font-size: 18px;
    color: #007bff;
    margin-bottom: 10px;
    text-align: center;
  }

  .profile-card {
    background: white;
    border-radius: 16px;
    padding: 24px;
    margin: 24px auto;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    text-align: center;
    max-width: 400px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .profile-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .profile-card img {
    border-radius: 50%;
    width: 120px;
    height: 120px;
    object-fit: cover;
    margin: 0 auto 20px;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .profile-card h3 {
    margin: 0;
    font-size: 24px;
    color: #333;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .profile-card p {
    margin: 12px 0;
    font-size: 16px;
    color: #666;
    line-height: 1.6;
  }


  .edit-button, .save-button, .cancel-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    margin: 8px auto;
  }

  .edit-button {
    background-color: #f0f0f0;
    color: #333;
  }

  .edit-button:hover {
    background-color: #e0e0e0;
  }

  .save-button {
    background-color: #4CAF50;
    color: white;
  }

  .save-button:hover {
    background-color: #45a049;
  }

  .cancel-button {
    background-color: #f44336;
    color: white;
  }

  .cancel-button:hover {
    background-color: #da190b;
  }

  .button-group {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 20px;
  }

  .edit-form {
    width: 100%;
  }

  .form-group {
    margin-bottom: 16px;
    text-align: left;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: #555;
    font-size: 14px;
    font-weight: 500;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.2s ease;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2196f3;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 100px;
  }
</style>

<div class="account-container">
  {#if $userStore.loading}
    <div class="loading">Loading profile...</div>
  {:else}
    <div class="profile-card">
      {#if !editMode}
        <!-- View Mode -->
        <img src={userProfile?.picture || 'https://via.placeholder.com/100'} alt="" aria-hidden="true">
        <h3>{userProfile?.name || 'Anonymous'}</h3>
        {#if userProfile?.about}
          <p>{userProfile.about}</p>
        {/if}
        <button class="edit-button" on:click={toggleEditMode}>
          <Icon icon="mdi:pencil" />
          <span>Edit Profile</span>
        </button>
      {:else}
        <!-- Edit Mode -->
        <div class="edit-form">
          <div class="form-group">
            <label for="picture">Profile Picture URL</label>
            <input 
              type="text" 
              id="picture" 
              bind:value={editForm.picture} 
              placeholder="Enter image URL"
            >
          </div>
          
          <div class="form-group">
            <label for="name">Display Name</label>
            <input 
              type="text" 
              id="name" 
              bind:value={editForm.name} 
              placeholder="Enter your name"
            >
          </div>
          
          <div class="form-group">
            <label for="about">About</label>
            <textarea 
              id="about" 
              bind:value={editForm.about} 
              placeholder="Tell us about yourself"
              rows="4"
            ></textarea>
          </div>
          
          <div class="button-group">
            <button class="cancel-button" on:click={toggleEditMode}>
              <Icon icon="mdi:close" />
              <span>Cancel</span>
            </button>
            <button class="save-button" on:click={saveProfile}>
              <Icon icon="mdi:check" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      {/if}
    </div>

    <div class="notifications-section">
      <Notifs />
    </div>
  {/if}
</div>
