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

  <!-- Navigation links -->
  <ul class:active={menuOpen}>
    <li><a href="/notifs" on:click={closeMenu}>Notifications</a></li>
  </ul>

</nav>
