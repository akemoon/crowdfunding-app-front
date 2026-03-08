<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  // Signout is handled via the header dropdown.
  // This route redirects home in case someone lands here directly.
  onMount(() => {
    goto('/');
  });
</script>
