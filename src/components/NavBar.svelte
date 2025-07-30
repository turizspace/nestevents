<script>
  import { onMount } from 'svelte';
  import NDK, { NDKNip07Signer } from "@nostr-dev-kit/ndk";
  import Icon from '@iconify/svelte';
  import { userStore, userActions } from '../utils/store';

  let menuOpen = false;
  let profileDropdownOpen = false;
  let userProfile;
  let ndk;
  
  let isAuthenticated;

  // Subscribe to the user store
  userStore.subscribe(value => {
    userProfile = value.profile;
    isAuthenticated = value.isAuthenticated;
  });

  // Toggle menu on hamburger click
  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  // Close menu when a link is clicked
  function closeMenu() {
    menuOpen = false;
  }

  // Toggle profile dropdown
  function toggleProfileDropdown(event) {
    event.stopPropagation();
    profileDropdownOpen = !profileDropdownOpen;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event) {
    if (profileDropdownOpen) {
      profileDropdownOpen = false;
    }
  }

  async function initializeNostr() {
    try {
      const nip07signer = new NDKNip07Signer();
      
      ndk = new NDK({
        explicitRelayUrls: [
          'wss://relay.damus.io',
          'wss://relay.primal.net'
        ],
        signer: nip07signer
      });

      await ndk.connect();

      // Check if we already have a user in the store
      let currentUser;
      userStore.subscribe(value => {
        currentUser = value;
      })();

      // Only try to get the user if we're not already authenticated
      if (!currentUser?.isAuthenticated) {
        const user = await nip07signer.user();
        if (user?.pubkey) {
          // Set initial user state
          userActions.setUser({ pubkey: user.pubkey });

          // Subscribe to user's profile
          const sub = ndk.subscribe({
            kinds: [0],
            authors: [user.pubkey]
          });

          sub.on('event', (event) => {
            try {
              const profile = JSON.parse(event.content);
              userActions.updateProfile({
                ...profile,
                pubkey: user.pubkey
              });
            } catch (error) {
              console.error("Error parsing profile:", error);
            }
          });

          sub.on('error', (error) => {
            console.error("Profile subscription error:", error);
          });
        } else {
          userActions.clearUser();
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      userActions.clearUser();
    }
  }

  onMount(() => {
    initializeNostr();
  });
</script>

<nav>
  <div class="nav-container">
    <!-- Hamburger Menu for Mobile -->
    <div class="hamburger" class:active={menuOpen} on:click={toggleMenu}>
      <div></div>
      <div></div>
      <div></div>
    </div>

    <!-- Navigation links -->
    <ul class:active={menuOpen}>
      <li><a href="/" on:click={closeMenu}>Home</a></li>
      <li><a href="/create" on:click={closeMenu}>Create Event</a></li>
    </ul>
  </div>

  <!-- Profile Section -->
  <div class="profile-section">
    {#if $userStore.loading}
      <div class="loading-indicator"></div>
    {:else if isAuthenticated}
      <div 
        class="profile-trigger" 
        on:click={toggleProfileDropdown}
      >
        <a 
          href="/account" 
          on:click|stopPropagation={closeMenu}
          class="profile-picture-link"
        >
          <img
            src={userProfile?.picture || 'https://via.placeholder.com/40'}
            alt="Profile"
            class="profile-picture"
          />
        </a>
        <span class="profile-name">{userProfile?.name || 'Anonymous'}</span>
        <Icon 
          icon={profileDropdownOpen ? "mdi:chevron-up" : "mdi:chevron-down"} 
          class="dropdown-icon"
        />
      </div>
      
      {#if profileDropdownOpen}
        <div class="profile-dropdown" on:click|stopPropagation>
          <a href="/account" class="dropdown-item" on:click={closeMenu}>
            <Icon icon="mdi:account" />
            <span>Profile</span>
          </a>
          <a href="/myEvents" class="dropdown-item" on:click={closeMenu}>
            <Icon icon="mdi:calendar-star" />
            <span>My Events</span>
          </a>
          <a href="/notifs" class="dropdown-item" on:click={closeMenu}>
            <Icon icon="mdi:bell" />
            <span>Notifications</span>
          </a>
        </div>
      {/if}
    {:else}
      <button class="login-button" on:click={() => initializeNostr()}>
        <Icon icon="mdi:login" />
        <span>Login</span>
      </button>
    {/if}
  </div>
</nav>

<svelte:window on:click={handleClickOutside}/>

<style>
  nav {
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(12px);
    padding: 0 max(2rem, 5vw);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 64px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  nav:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .nav-container {
    display: flex;
    align-items: center;
    gap: clamp(1.5rem, 3vw, 2.5rem);
    height: 100%;
  }

  .hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    cursor: pointer;
    padding: 12px;
    border-radius: 8px;
    transition: background-color 0.2s ease;
    margin: -12px 0;
  }

  .hamburger:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .hamburger div {
    width: 20px;
    height: 2px;
    background-color: #333;
    transition: transform 0.3s ease, opacity 0.3s ease;
    border-radius: 4px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  a {
    text-decoration: none;
    color: #333;
    font-weight: 500;
    transition: color 0.3s ease;
  }

  a:hover {
    color: #2196f3;
  }

  /* Profile Section Styles */
  .profile-section {
    position: relative;
    margin-left: auto;
    height: 100%;
    display: flex;
    align-items: center;
  }

  .profile-trigger {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    padding: 6px;
    border-radius: 28px;
    transition: all 0.2s ease;
    background: transparent;
    height: 40px;
  }

  .profile-picture-link {
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    position: relative;
    padding: 2px;
  }

  .profile-picture-link::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid transparent;
    transition: all 0.2s ease;
    background: linear-gradient(to right, #2196f3, #21d4fd);
    opacity: 0;
    transform: scale(1.1);
  }

  .profile-picture-link:hover::after {
    opacity: 1;
    transform: scale(1.05);
  }

  .profile-picture {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #fff;
    position: relative;
    z-index: 1;
    background: #fff;
    transition: transform 0.2s ease;
  }

  .profile-picture-link:hover .profile-picture {
    transform: scale(0.95);
  }

  .profile-name {
    font-weight: 500;
  }

  .dropdown-icon {
    color: #666;
    width: 20px;
    height: 20px;
  }

  .profile-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    padding: 8px;
    min-width: 200px;
    animation: slideDown 0.2s ease-out;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    transition: background-color 0.3s ease;
  }

  .dropdown-item:hover {
    background-color: rgba(33, 150, 243, 0.1);
  }

  .login-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #2196f3, #21d4fd);
    color: white;
    padding: 8px 16px;
    border-radius: 24px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .login-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    color: white;
  }

  .loading-indicator {
    width: 24px;
    height: 24px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #2196f3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    nav {
      padding: 0 1rem;
      height: 56px;
    }

    .nav-container {
      position: static;
      width: auto;
    }

    /* Hamburger Menu */
    .hamburger {
      display: flex;
      height: 40px;
      width: 40px;
      align-items: center;
      justify-content: center;
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
    }

    .hamburger div {
      transform-origin: center;
    }

    .hamburger.active div:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }

    .hamburger.active div:nth-child(2) {
      opacity: 0;
    }

    .hamburger.active div:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }

    /* Mobile Navigation Menu */
    ul {
      display: none;
      flex-direction: column;
      position: fixed;
      top: 56px;
      left: 0;
      right: 0;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(12px);
      padding: 0.5rem 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 1001;
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    ul.active {
      display: flex;
      opacity: 1;
      transform: translateY(0);
    }

    li {
      width: 100%;
    }

    li a {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 2rem;
      font-size: 1rem;
      transition: all 0.2s ease;
    }

    li a:hover {
      background-color: rgba(33, 150, 243, 0.08);
      color: #2196f3;
      transform: translateX(4px);
    }

    /* Profile Section */
    .profile-section {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      margin: 0;
    }

    .profile-trigger {
      padding: 0;
      height: 40px;
    }

    .profile-name, 
    .dropdown-icon {
      display: none;
    }

    .profile-picture {
      width: 40px;
      height: 40px;
      margin: 0;
      border-width: 1.5px;
    }

    .profile-picture-link {
      padding: 1.5px;
    }

    .profile-dropdown {
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      width: 260px;
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      z-index: 1002;
    }

    .login-button {
      padding: 8px 16px;
      height: 40px;
      font-size: 0.9375rem;
    }
  }
</style>
