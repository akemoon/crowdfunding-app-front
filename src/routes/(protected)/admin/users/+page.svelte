<script lang="ts">
  import { searchUsers, type UserSearchResult } from '$lib/api';

  let query = '';
  let results: UserSearchResult[] = [];
  let searched = false;
  let loading = false;
  let errorMsg = '';

  async function search() {
    const q = query.trim();
    if (!q) return;

    loading = true;
    errorMsg = '';
    searched = false;

    const res = await searchUsers(q, 20, 0);
    loading = false;
    searched = true;

    if ('code' in res) {
      console.error('[searchUsers]', res.code, res.message);
      errorMsg = 'Не удалось выполнить поиск.';
      results = [];
    } else {
      results = res;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') search();
  }
</script>

<svelte:head>
  <title>Пользователи — Администратор</title>
</svelte:head>

<div class="page">
  <h1>Управление пользователями</h1>

  <div class="search-row">
    <input
      class="search-input"
      type="text"
      placeholder="Имя пользователя"
      bind:value={query}
      on:keydown={handleKeydown}
      disabled={loading}
    />
    <button class="btn-search" on:click={search} disabled={loading || !query.trim()}>
      {loading ? '...' : 'Найти'}
    </button>
  </div>

  {#if errorMsg}
    <p class="error">{errorMsg}</p>
  {:else if searched}
    {#if results.length === 0}
      <p class="empty">Пользователи не найдены.</p>
    {:else}
      <ul class="list">
        {#each results as user (user.id)}
          <li class="item">
            <a class="item-link" href="/admin/users/{user.id}">
              {#if user.avatarUrl}
                <img class="avatar" src={user.avatarUrl} alt="avatar" />
              {:else}
                <div class="avatar-placeholder">{(user.displayName || user.username)[0]}</div>
              {/if}
              <div class="item-info">
                <span class="item-name">{user.displayName || user.username}</span>
                <span class="item-username">@{user.username}</span>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .page {
    max-width: 600px;
  }

  h1 {
    margin: 0 0 28px;
    font-size: 28px;
    font-weight: 700;
  }

  .search-row {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
  }

  .search-input {
    flex: 1;
    padding: 9px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    color: var(--text-main);
    background: #fff;
    outline: none;
  }

  .search-input:focus {
    border-color: var(--accent);
  }

  .btn-search {
    padding: 9px 20px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
  }

  .btn-search:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .item-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    text-decoration: none;
  }

  .item-link:hover .item-name {
    color: var(--accent);
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--line);
    flex-shrink: 0;
  }

  .avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--soft);
    border: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 600;
    color: var(--accent);
    flex-shrink: 0;
  }

  .item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .item-name {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-main);
  }

  .item-username {
    font-size: 13px;
    color: var(--text-muted);
  }

  .empty {
    color: var(--text-muted);
    font-size: 14px;
  }

  .error {
    color: #e05252;
    font-size: 14px;
  }
</style>
