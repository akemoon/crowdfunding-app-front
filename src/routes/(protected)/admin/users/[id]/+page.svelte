<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    getUser, getAdminUser, setUserRole,
    type UserProfile, type AdminUserCredentials, type UserRole,
  } from '$lib/api';
  import Toast from '$lib/components/Toast.svelte';
  import type { ToastItem } from '$lib/components/Toast.svelte';

  const ERROR_MESSAGES: Record<string, string> = {
    forbidden:     'Нет доступа — требуются права администратора',
    not_found:     'Пользователь не найден',
    invalid_role:  'Недопустимая роль',
    internal_error: 'Внутренняя ошибка сервера',
  };

  type Tab = 'profile' | 'credentials';
  let activeTab: Tab = 'profile';

  const userID = $page.params.id;

  let profile: UserProfile | null = null;
  let credentials: AdminUserCredentials | null = null;

  let loadingProfile     = true;
  let loadingCredentials = false;
  let credentialsError   = '';

  let selectedRole: UserRole = 'user';
  let savingRole = false;

  let toasts: ToastItem[] = [];
  let toastComponent: Toast;

  onMount(async () => {
    const res = await getUser(userID);
    loadingProfile = false;
    if ('code' in res) {
      console.error('[getUser]', res.code, res.message);
    } else {
      profile = res;
    }
  });

  async function switchTab(tab: Tab) {
    activeTab = tab;
    if (tab === 'credentials' && !credentials) {
      loadingCredentials = true;
      credentialsError = '';
      const token = localStorage.getItem('accessToken') ?? '';
      const res = await getAdminUser(token, userID);
      loadingCredentials = false;
      if ('code' in res) {
        console.error('[getAdminUser]', res.code, res.message);
        credentialsError = ERROR_MESSAGES[res.code] ?? 'Не удалось загрузить данные.';
      } else {
        credentials = res;
        selectedRole = res.role;
      }
    }
  }

  async function saveRole() {
    savingRole = true;
    const token = localStorage.getItem('accessToken') ?? '';
    const res = await setUserRole(token, userID, selectedRole);
    savingRole = false;
    if (res !== null) {
      console.error('[setUserRole]', res.code, res.message);
      toastComponent.show(ERROR_MESSAGES[res.code] ?? 'Не удалось сменить роль.', 'error');
      return;
    }
    if (credentials) credentials = { ...credentials, role: selectedRole };
    toastComponent.show('Роль изменена', 'success');
  }

</script>

<svelte:head>
  <title>{profile ? profile.displayName || profile.username : 'Пользователь'} — Администратор</title>
</svelte:head>

<div class="page">
  <a class="back" href="/admin/users">← Управление пользователями</a>

  {#if loadingProfile}
    <p class="muted">Загрузка...</p>
  {:else if !profile}
    <p class="error">Не удалось загрузить профиль.</p>
  {:else}
    <h1>{profile.displayName || profile.username}</h1>

    <div class="tabs">
      <button class="tab" class:active={activeTab === 'profile'} on:click={() => switchTab('profile')}>
        Профиль
      </button>
      <button class="tab" class:active={activeTab === 'credentials'} on:click={() => switchTab('credentials')}>
        Учётные данные
      </button>
    </div>

    {#if activeTab === 'profile'}
      <div class="section">
        <div class="profile-header">
          {#if profile.avatarUrl}
            <img class="avatar" src={profile.avatarUrl} alt="avatar" />
          {:else}
            <div class="avatar-placeholder">{(profile.displayName || profile.username)[0]}</div>
          {/if}
          <div>
            <div class="profile-name">{profile.displayName || profile.username}</div>
            <div class="profile-username">@{profile.username}</div>
          </div>
        </div>
        {#if profile.description}
          <div class="field">
            <span class="label">О себе</span>
            <p class="description">{profile.description}</p>
          </div>
        {/if}
      </div>
    {:else}
      <div class="section">
        {#if loadingCredentials}
          <p class="muted">Загрузка...</p>
        {:else if credentialsError}
          <p class="error">{credentialsError}</p>
        {:else if credentials}
          <div class="field">
            <span class="label">Роль</span>
            <div class="role-row">
              <select class="role-select" bind:value={selectedRole} disabled={savingRole}>
                <option value="user">Пользователь</option>
                <option value="moder">Модератор</option>
                <option value="admin">Администратор</option>
              </select>
              <button class="btn-save" on:click={saveRole} disabled={savingRole}>
                {savingRole ? '...' : 'Сохранить'}
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<Toast bind:this={toastComponent} bind:toasts />

<style>
  .page {
    max-width: 600px;
  }

  .back {
    display: inline-block;
    margin-bottom: 24px;
    font-size: 14px;
    color: var(--text-muted);
    text-decoration: none;
  }

  .back:hover {
    color: var(--accent);
  }

  h1 {
    margin: 0 0 28px;
    font-size: 26px;
    font-weight: 700;
  }

  /* --- Tabs --- */

  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 28px;
  }

  .tab {
    padding: 8px 16px;
    border: none;
    background: none;
    font-size: 14px;
    font-family: inherit;
    color: var(--text-muted);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }

  .tab.active {
    color: var(--text-main);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }

  /* --- Content --- */

  .section {
    display: grid;
    gap: 24px;
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--line);
    flex-shrink: 0;
  }

  .avatar-placeholder {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--soft);
    border: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 600;
    color: var(--accent);
    flex-shrink: 0;
  }

  .profile-name {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-main);
  }

  .profile-username {
    font-size: 14px;
    color: var(--text-muted);
  }

  .field {
    display: grid;
    gap: 8px;
  }

  .label {
    font-size: 13px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .description {
    margin: 0;
    font-size: 15px;
    color: var(--text-main);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .role-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .role-select {
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 7px;
    font-size: 14px;
    font-family: inherit;
    color: var(--text-main);
    background: #fff;
    outline: none;
    cursor: pointer;
  }

  .role-select:focus {
    border-color: var(--accent);
  }

  .btn-save {
    padding: 8px 18px;
    border: none;
    border-radius: 7px;
    background: var(--accent);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }

  .btn-save:disabled {
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
