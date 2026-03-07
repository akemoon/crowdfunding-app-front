<script lang="ts">
  import { page } from "$app/stores";
  import AppHeader from "$lib/components/AppHeader.svelte";
  import "../app.css";
</script>

<div class="app-shell">
  {#if $page.url.pathname !== "/signin" && $page.url.pathname !== "/signup"}
    <AppHeader />
  {/if}
  <main class="app-main">
    <slot />
  </main>
</div>
