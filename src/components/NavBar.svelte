<script lang="ts">
  import { onMount } from 'svelte';
  import NDK, { NDKNip07Signer } from "@nostr-dev-kit/ndk";
  import Icon from '@iconify/svelte';
  import { userStore, userActions } from '../utils/store.js';

  interface UserProfile {
    name?: string;
    picture?: string;
    pubkey?: string;
    [key: string]: any;
  }

  interface UserState {
    isAuthenticated: boolean;
    pubkey: string | null;
    profile: UserProfile | null;
    loading: boolean;
  }
  import Search from '../components/Search.svelte';

  let menuOpen = false;
  let profileDropdownOpen = false;
  let userProfile: UserProfile | null = null;
  let ndk: NDK | null = null;
  
  let isAuthenticated = false;

  // Subscribe to the user store
  userStore.subscribe((value: UserState) => {
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
  function toggleProfileDropdown(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
    profileDropdownOpen = !profileDropdownOpen;
  }

  // Handle keyboard navigation for profile dropdown
  function handleProfileKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleProfileDropdown(e);
    } else if (e.key === 'Escape' && profileDropdownOpen) {
      profileDropdownOpen = false;
    }
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
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
      let currentUser: UserState | undefined;
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

          // Using NDK's close event instead of error
          sub.on('close', () => {
            console.error("Profile subscription closed unexpectedly");
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
  <div class="nav-left">
    <!-- Hamburger Menu for Mobile -->
    <button 
      class="hamburger" 
      class:active={menuOpen} 
      on:click={toggleMenu}
      aria-label="Toggle menu"
      aria-expanded={menuOpen}
    >
      <div></div>
      <div></div>
      <div></div>
    </button>

    <!-- Navigation links -->
    <ul class:active={menuOpen}>
      <li>
        <a href="/" on:click={closeMenu}>
          <Icon icon="mdi:home" width="20" height="20" />
          <span>Home</span>
        </a>
      </li>
      <li>
        <a href="/create" on:click={closeMenu}>
          <Icon icon="mdi:calendar-plus" width="20" height="20" />
          <span>Create Event</span>
        </a>
      </li>
    </ul>
  </div>

  <div class="nav-center">
    <Search />
  </div>

  <!-- Profile Section -->
  <div class="nav-right">
    {#if $userStore.loading}
      <div class="loading-indicator"></div>
    {:else if isAuthenticated}
      <button 
        class="profile-trigger" 
        on:click={toggleProfileDropdown}
        on:keydown={handleProfileKeydown}
        aria-expanded={profileDropdownOpen}
        aria-label="Toggle profile menu"
      >
        <div class="profile-info">
          {#if userProfile?.picture}
            <img src={userProfile.picture} alt="" class="profile-pic" />
          {:else}
            <div class="profile-placeholder" aria-hidden="true">
              <Icon icon="mdi:account" />
            </div>
          {/if}
          <span class="profile-name">{userProfile?.name || 'Anonymous'}</span>
          <Icon icon="mdi:chevron-down" class="dropdown-icon" aria-hidden="true" />
        </div>
      </button>
      
      {#if profileDropdownOpen}
        <div 
          class="profile-dropdown"
          on:click|stopPropagation
          on:keydown={(e) => e.key === 'Escape' && (profileDropdownOpen = false)}
          role="menu"
          tabindex="0"
          aria-label="Profile menu"
        >
          <a 
            href="/account" 
            class="dropdown-item" 
            on:click={closeMenu}
            role="menuitem"
            tabindex="-1"
          >
            <Icon icon="mdi:account" aria-hidden="true" />
            <span>Profile</span>
          </a>
          <a 
            href="/myEvents" 
            class="dropdown-item" 
            on:click={closeMenu}
            role="menuitem"
            tabindex="-1"
          >
            <Icon icon="mdi:calendar-star" aria-hidden="true" />
            <span>My Events</span>
          </a>
          <a 
            href="/notifs" 
            class="dropdown-item" 
            on:click={closeMenu}
            role="menuitem"
            tabindex="-1"
          >
            <Icon icon="mdi:bell" aria-hidden="true" />
            <span>Notifications</span>
          </a>
        </div>
      {/if}
    {:else}
      <button 
        class="login-button" 
        on:click={() => initializeNostr()}
        aria-label="Login with Nostr"
      >
        <Icon icon="mdi:login" aria-hidden="true" />
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
    padding: 0 max(1.5rem, 4vw);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 2rem;
    height: 64px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  nav:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 1.0rem;
    padding-left: 0.5rem;
    min-width: 220px;
    position: relative;
    z-index: 2;
  }

  .nav-center {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .nav-right {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding-right: 0.5rem;
    min-width: 120px;
    position: relative;
    z-index: 2;
  }


  .hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    cursor: pointer;
    padding: 12px;
    border-radius: 8px;
    transition: background-color 0.2s ease;
  }

  @media (max-width: 900px) {
    .hamburger {
      display: flex;
    }
    
    ul {
      display: none;
    }
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
    gap: 1.5rem;
  }

  ul a {
    text-decoration: none;
    color: #333;
    font-weight: 500;
    transition: all 0.2s ease;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  ul a:hover {
    color: #2196f3;
    background: rgba(33, 150, 243, 0.08);
  }



  .profile-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 28px;
    transition: all 0.2s ease;
    background: transparent;
    border: none;
  }

  .profile-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .profile-pic {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
  }

  .profile-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
  }

  .profile-name {
    font-weight: 500;
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

  @media (max-width: 1024px) {
    nav {
      grid-template-columns: minmax(180px, 250px) minmax(300px, 1fr) minmax(120px, 180px);
      gap: 1rem;
      padding: 0 1rem;
    }
  }

  @media (max-width: 900px) {
    nav {
      grid-template-columns: 48px 1fr 48px;
      gap: 0.75rem;
      height: 56px;
      padding: 0 0.5rem;
    }

    .nav-center {
      padding: 0;
      margin: 0 auto;
      width: calc(100% - 96px); /* Subtract the width of nav-left and nav-right */
      max-width: none;
      position: relative;
      z-index: 1;
    }

    .nav-left {
      width: 48px;
      padding-left: 0;
    }

    .nav-right {
      width: 48px;
      padding-right: 0;
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
      justify-content: flex-start;
      padding: 0.75rem 2rem;
      font-size: 1rem;
      transition: all 0.2s ease;
      border-radius: 0;
    }

    li a:hover {
      background-color: rgba(33, 150, 243, 0.08);
      color: #2196f3;
    }

    li a span {
      margin-left: 0.5rem;
    }

    /* Profile Section */
    .nav-right {
      width: 40px;
      justify-content: center;
    }

    .profile-trigger {
      padding: 4px;
      margin: 0;
    }

 
    .profile-pic,
    .profile-placeholder {
      width: 32px;
      height: 32px;
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
