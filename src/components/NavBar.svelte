<script>
  let menuOpen = false;

  // Toggle menu on hamburger click
  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  // Close menu when a link is clicked
  function closeMenu() {
    menuOpen = false;
  }
</script>

<nav>
  <!-- Hamburger Menu for Mobile -->
  <div class="hamburger" on:click={toggleMenu}>
    <div></div>
    <div></div>
    <div></div>
  </div>

  <!-- Navigation links -->
  <ul class:active={menuOpen}>
    <li><a href="/" on:click={closeMenu}>Home</a></li>
    <li><a href="/create" on:click={closeMenu}>Create Event</a></li>
    <li><a href="/account" on:click={closeMenu}>Account</a></li>
  </ul>

</nav>
