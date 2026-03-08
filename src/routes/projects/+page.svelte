<svelte:head>
  <title>Проекты</title>
</svelte:head>

<div class="page">
  <h1>Проекты</h1>
  <!-- TODO: fetch and render project feed from API -->
  <p class="placeholder">Лента проектов появится здесь.</p>
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
