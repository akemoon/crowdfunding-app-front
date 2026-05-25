<script lang="ts">
  import { onMount } from 'svelte';
  import { getMySubscriptions, unfollowUser, type UserProfile } from '$lib/api';

  const ERROR_MESSAGES: Record<string, string> = {
    internal_error: 'Внутренняя ошибка сервера',
  };

  let users: UserProfile[] = [];
  let loading = true;
  let loadError = '';

  let unfollowingID: string | null = null;

  onMount(async () => {
    const token = localStorage.getItem('accessToken') ?? '';
    const res = await getMySubscriptions(token);
    loading = false;
    if ('code' in res) {
      loadError = ERROR_MESSAGES[res.code] ?? 'Не удалось загрузить подписки.';
      console.error('[getMySubscriptions]', res.code, res.message);
    } else {
      users = res;
    }
  });

  async function unfollow(id: string) {
    unfollowingID = id;
    const token = localStorage.getItem('accessToken') ?? '';
    const res = await unfollowUser(token, id);
    unfollowingID = null;
    if (res !== null) {
      console.error('[unfollowUser]', res.code, res.message);
      return;
    }
    users = users.filter(u => u.id !== id);
  }
</script>

<svelte:head>
  <title>Подписки</title>
</svelte:head>

<div class="page">
  <h1>Подписки</h1>

  {#if loading}
    <p class="muted">Загрузка...</p>
  {:else if loadError}
    <p class="error">{loadError}</p>
  {:else if users.length === 0}
    <p class="muted">Вы ни на кого не подписаны.</p>
  {:else}
    <div class="list">
      {#each users as user (user.id)}
        <div class="user-row">
          <a class="user-info" href="/users/{user.id}">
            {#if user.avatarUrl}
              <img class="avatar" src={user.avatarUrl} alt="avatar" />
            {:else}
              <div class="avatar-placeholder">{(user.displayName || user.username)[0]}</div>
            {/if}
            <div class="user-text">
              <span class="display-name">{user.displayName || user.username}</span>
              <span class="username">@{user.username}</span>
            </div>
          </a>
          <button
            class="btn-unfollow"
            on:click={() => unfollow(user.id)}
            disabled={unfollowingID === user.id}
          >
            {unfollowingID === user.id ? '...' : 'Отписаться'}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 600px;
  }

  h1 {
    margin: 0 0 28px;
    font-size: 26px;
    font-weight: 700;
  }

  .list {
    display: grid;
    gap: 12px;
  }

  .user-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: inherit;
    flex: 1;
    min-width: 0;
  }

  .user-info:hover .display-name {
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

  .user-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .display-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .username {
    font-size: 13px;
    color: var(--text-muted);
  }

  .btn-unfollow {
    padding: 6px 14px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: none;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
  }

  .btn-unfollow:hover {
    border-color: #e05252;
    color: #e05252;
  }

  .btn-unfollow:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .muted {
    color: var(--text-muted);
    font-size: 14px;
  }

  .error {
    color: #e05252;
    font-size: 14px;
  }
</style>
