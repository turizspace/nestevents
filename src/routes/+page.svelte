<script>
import EventList from '../components/EventList.svelte';
</script>

<div class="page-container">
    <EventList />
</div>

<style>
    .page-container {
        padding-top: 80px;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding-left: 1rem;
        padding-right: 1rem;
    }

    .search-container {
        margin-bottom: 2rem;
    }

    @media (max-width: 768px) {
        .page-container {
            padding-top: 72px;
        }
    }
</style>
