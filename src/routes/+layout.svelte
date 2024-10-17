<script>
  import NavBar from '../components/NavBar.svelte';
  import Search from '../components/Search.svelte'

    import '../assets/styles.css';
</script>

<!-- Include the NavBar at the top -->
<NavBar />

<!-- Use the slot to render the content of each specific page -->
<slot />
