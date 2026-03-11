<script lang="ts">
  import { onMount } from 'svelte';
  import { getMe, updateMe, type UserProfile } from '$lib/api';

  let profile: UserProfile | null = null;
  let errorMsg = '';

  // Edit state
  let editing = false;
  let saving  = false;
  let saveError = '';
  let form = { username: '', displayName: '', description: '' };

  onMount(async () => {
    const token = localStorage.getItem('accessToken') ?? '';
    const result = await getMe(token);
    if ('code' in result) {
      console.error('[profile]', result.code, result.message);
      errorMsg = 'Не удалось загрузить профиль.';
    } else {
      profile = result;
    }
  });

  function startEdit() {
    form = { username: '', displayName: '', description: '' };
    saveError = '';
    editing = true;
  }

  function cancelEdit() {
    editing = false;
    saveError = '';
  }

  async function save() {
    if (!profile) return;
    saving = true;
    saveError = '';

    // Only send fields the user actually typed; fall back to current value
    const payload = {
      username:    form.username    || profile.username,
      displayName: form.displayName || profile.displayName,
      description: form.description || profile.description,
    };

    const token = localStorage.getItem('accessToken') ?? '';
    const result = await updateMe(token, payload);
    saving = false;

    if ('code' in result) {
      console.error('[updateMe]', result.code, result.message);
      saveError = 'Не удалось сохранить изменения.';
    } else {
      profile = result;
      editing = false;
    }
  }
</script>

<div class="section">
  <h2>Профиль</h2>

  {#if errorMsg}
    <p class="error">{errorMsg}</p>
  {:else if !profile}
    <p class="muted">Загрузка...</p>
  {:else}
    <div class="profile">
      <img
        class="avatar"
        src={profile.avatarUrl || '/default-avatar.png'}
        alt="Аватар"
      />
      <div class="fields">
        <div class="field">
          <span class="label">Имя пользователя</span>
          {#if editing}
            <input class="input" bind:value={form.username} placeholder={profile.username} />
          {:else}
            <span class="value">@{profile.username}</span>
          {/if}
        </div>
        <div class="field">
          <span class="label">Отображаемое имя</span>
          {#if editing}
            <input class="input" bind:value={form.displayName} placeholder={profile.displayName || 'Не указано'} />
          {:else}
            <span class="value">{profile.displayName || '—'}</span>
          {/if}
        </div>
        <div class="field">
          <span class="label">О себе</span>
          {#if editing}
            <textarea class="input textarea" bind:value={form.description} placeholder={profile.description || 'Не указано'} rows="3"></textarea>
          {:else}
            <span class="value">{profile.description || '—'}</span>
          {/if}
        </div>

      </div>
    </div>

    {#if !editing}
      <button class="btn-edit" on:click={startEdit}>Редактировать</button>
    {:else}
      {#if saveError}
        <p class="error">{saveError}</p>
      {/if}
      <div class="actions">
        <button class="btn-save" on:click={save} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button class="btn-cancel" on:click={cancelEdit} disabled={saving}>Отмена</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  h2 {
    margin: 0 0 24px;
    font-size: 20px;
    font-weight: 700;
  }

  .btn-edit {
    margin-top: 28px;
    padding: 8px 20px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: none;
    color: var(--text-muted);
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
  }

  .btn-edit:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-soft);
  }

  .input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 15px;
    font-family: inherit;
    color: var(--text-main);
    background: #fff;
    box-sizing: border-box;
  }

  .input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .textarea {
    resize: none;
    min-height: 72px;
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-top: 28px;
  }

  .btn-save {
    padding: 8px 20px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    font-size: 14px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-save:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .btn-cancel {
    padding: 8px 16px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: none;
    color: var(--text-muted);
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
  }

  .btn-cancel:hover:not(:disabled) {
    border-color: var(--text-muted);
    color: var(--text-main);
  }

  .profile {
    display: flex;
    gap: 80px;
    align-items: flex-start;
    width: 100%;
  }

  .avatar {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--line);
    flex-shrink: 0;
  }

  .fields {
    display: grid;
    gap: 28px;
    padding-top: 8px;
    flex: 1;
    min-width: 0;
  }

  .field {
    display: grid;
    gap: 6px;
  }

  .label {
    font-size: 14px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .value {
    font-size: 26px;
    font-weight: 500;
    color: var(--text-main);
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
