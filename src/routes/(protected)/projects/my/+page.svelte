<svelte:head>
  <title>Мои проекты</title>
</svelte:head>

<div class="page">
  <h1>Мои проекты</h1>
  <!-- TODO: fetch and render user's own projects from API -->
  <p class="placeholder">Здесь будут ваши проекты.</p>
</div>

<style>
  .page {
    max-width: 720px;
  }

  h1 {
    margin: 0 0 24px;
    font-size: 28px;
    font-weight: 700;
  }

  .placeholder {
    color: var(--text-muted);
  }
</style>
