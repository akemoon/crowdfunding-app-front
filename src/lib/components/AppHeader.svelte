<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { signout as apiSignout, getMe } from '$lib/api';

  // Checked on mount (client-only: localStorage is not available during SSR)
  let isAuth = false;
  let dropdownOpen = false;
  let displayName = '';

  onMount(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    isAuth = true;

    const result = await getMe(token);
    if ('code' in result) {
      console.error('[me]', result.code, result.message);
    } else {
      displayName = result.displayName;
    }
  });

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
  }

  async function signout() {
    const refreshToken = localStorage.getItem('refreshToken') ?? '';
    // Fire-and-forget: clear session locally regardless of API response
    apiSignout(refreshToken);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    isAuth = false;
    dropdownOpen = false;
    goto('/');
  }

  // Close dropdown on any click outside the menu
  function handleWindowClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.user-menu')) {
      dropdownOpen = false;
    }
  }
</script>

<svelte:window on:click={handleWindowClick} />

<header class="topbar">
  <!-- TODO: update brand name when finalized -->
  <a class="brand" href="/">Краудфандинг</a>

  <div class="topbar-right">
    {#if $page.url.pathname !== '/'}
      <a class="nav-link" href="/projects">Проекты</a>
    {/if}

    {#if isAuth}
      <div class="user-menu">
        <button class="btn-account" on:click={toggleDropdown}>
          {displayName || 'Аккаунт'} <span class="chevron">▾</span>
        </button>
        {#if dropdownOpen}
          <div class="dropdown">
            <a class="dropdown-item" href="/projects/my" on:click={() => (dropdownOpen = false)}>
              Мои проекты
            </a>
            <a class="dropdown-item" href="/settings" on:click={() => (dropdownOpen = false)}>
              Настройки
            </a>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item signout" on:click={signout}>Выйти</button>
          </div>
        {/if}
      </div>
    {:else}
      <a class="btn-signin" href="/signin">Войти</a>
    {/if}
  </div>
</header>

<style>
  .topbar {
    width: min(1120px, 100%);
    margin: 0 auto;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .brand {
    color: var(--text-main);
    text-decoration: none;
    font-size: 20px;
    font-weight: 650;
    letter-spacing: 0.01em;
  }

  .brand:hover {
    color: var(--accent);
  }

  /* --- Войти button --- */

  .btn-signin {
    padding: 8px 18px;
    border: 1px solid var(--line);
    border-radius: 8px;
    color: var(--text-main);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
  }

  .btn-signin:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }

  /* --- Top nav link (e.g. Проекты) --- */

  .nav-link {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
  }

  .nav-link:hover {
    color: var(--text-main);
  }

  /* --- User menu & dropdown --- */

  .user-menu {
    position: relative;
  }

  .btn-account {
    padding: 8px 18px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: none;
    color: var(--text-main);
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .btn-account:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }

  .chevron {
    font-size: 12px;
    color: var(--text-muted);
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 160px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 6px;
    z-index: 100;
    display: grid;
  }

  .dropdown-item {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    color: var(--text-main);
    text-decoration: none;
    background: none;
    border: none;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }

  .dropdown-item:hover {
    background: var(--accent-soft);
    color: var(--accent);
  }

  .dropdown-divider {
    height: 1px;
    background: var(--line);
    margin: 4px 0;
  }

  .dropdown-item.signout {
    color: #e05252;
  }

  .dropdown-item.signout:hover {
    background: #fef2f2;
    color: #c53030;
  }

  @media (max-width: 680px) {
    .topbar {
      padding: 16px;
    }
  }
</style>
