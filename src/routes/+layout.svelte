<script>
  import { onMount } from 'svelte';
  import NavBar from '../components/NavBar.svelte';
  import { initializeNDK } from '$lib/stores/ndkStore';
  import '../assets/styles.css';

  onMount(async () => {
    await initializeNDK();
  });
</script>

<!-- Include the NavBar at the top -->
<NavBar />

<!-- Use the slot to render the content of each specific page -->
<slot />
