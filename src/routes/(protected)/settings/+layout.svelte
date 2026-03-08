<svelte:head>
  <title>Настройки</title>
</svelte:head>

<div class="settings-layout">
  <nav class="settings-nav">
    <a class="nav-item" href="/settings/profile">Профиль</a>
    <a class="nav-item" href="/settings/credentials">Учётные данные</a>
  </nav>

  <div class="settings-content">
    <slot />
  </div>
</div>

<style>
  .settings-layout {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 48px;
    align-items: start;
  }

  .settings-nav {
    display: grid;
    gap: 2px;
  }

  .nav-item {
    padding: 8px 12px;
    border-radius: 7px;
    font-size: 14px;
    color: var(--text-muted);
    text-decoration: none;
  }

  .nav-item:hover {
    color: var(--text-main);
    background: var(--accent-soft);
  }

  /* Active link - SvelteKit adds aria-current="page" automatically */
  .nav-item[aria-current='page'] {
    color: var(--accent);
    font-weight: 600;
    background: var(--accent-soft);
  }

  @media (max-width: 680px) {
    .settings-layout {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .settings-nav {
      grid-template-columns: repeat(2, auto);
      justify-content: start;
    }
  }
</style>
