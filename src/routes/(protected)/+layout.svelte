<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  // Until the check runs, render nothing (prevents flash of protected content)
  let ready = false;

  onMount(() => {
    if (!localStorage.getItem('accessToken')) {
      goto('/signin');
    } else {
      ready = true;
    }
  });
</script>

{#if ready}
  <slot />
{/if}
