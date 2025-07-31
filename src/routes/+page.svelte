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
        max-width: 1400px;
        margin: 0 auto;
    }

    @media (max-width: 768px) {
        .page-container {
            padding-top: 72px;
        }
    }
</style>
