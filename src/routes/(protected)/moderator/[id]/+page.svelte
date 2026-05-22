<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import {
    getUser, getMyApplications,
    approveApplication, rejectApplication,
    type Project, type UserProfile,
  } from '$lib/api';
  import ProjectImages from '$lib/components/ProjectImages.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import type { ToastItem } from '$lib/components/Toast.svelte';

  const CATEGORY_LABELS: Record<string, string> = {
    science:                'Наука',
    tech:                   'Технологии',
    architecture_and_urban: 'Архитектура и урбанистика',
    sport:                  'Спорт',
    music:                  'Музыка',
    art:                    'Искусство',
    film:                   'Кино',
    games:                  'Игры',
    education:              'Образование',
    food:                   'Еда',
    fashion:                'Мода',
    health:                 'Здоровье',
  };

  type Tab = 'project' | 'author';
  let activeTab: Tab = 'project';

  const projectId = $page.params.id;

  let project: Project | null = null;
  let author: UserProfile | null = null;
  let loadingProject = true;
  let loadingAuthor  = false;
  let errorMsg = '';

  // Toast state
  let toasts: ToastItem[] = [];
  let toastComponent: Toast;

  let processing  = false;
  let rejectMode  = false;
  let rejectReason = '';

  onMount(async () => {
    const token = localStorage.getItem('accessToken') ?? '';
    const appsRes = await getMyApplications(token);
    loadingProject = false;
    if ('code' in appsRes) {
      console.error('[getMyApplications]', appsRes.code, appsRes.message);
      errorMsg = 'Не удалось загрузить проект.';
      return;
    }
    const app = appsRes.find(a => a.project.id === projectId);
    if (!app) {
      errorMsg = 'Проект не найден.';
      return;
    }
    project = app.project;
  });

  // Fetch author lazily when switching to author tab
  async function switchTab(tab: Tab) {
    activeTab = tab;
    if (tab === 'author' && !author && project) {
      loadingAuthor = true;
      const result = await getUser(project.userID);
      loadingAuthor = false;
      if ('code' in result) {
        console.error('[getUser]', result.code, result.message);
      } else {
        author = result;
      }
    }
  }

  async function approve() {
    processing = true;
    const token = localStorage.getItem('accessToken') ?? '';
    const result = await approveApplication(token, projectId);
    processing = false;
    if (result !== null) {
      console.error('[approve]', result.code, result.message);
      toastComponent.show('Не удалось одобрить заявку.', 'error');
      return;
    }
    toastComponent.show('Проект одобрен', 'success');
    setTimeout(() => goto('/moderator'), 1200);
  }

  async function reject() {
    if (!rejectReason.trim()) return;
    processing = true;
    const token = localStorage.getItem('accessToken') ?? '';
    const result = await rejectApplication(token, projectId, rejectReason.trim());
    processing = false;
    if (result !== null) {
      console.error('[reject]', result.code, result.message);
      toastComponent.show('Не удалось отклонить заявку.', 'error');
      return;
    }
    toastComponent.show('Проект отклонён', 'success');
    setTimeout(() => goto('/moderator'), 1200);
  }
</script>

<svelte:head>
  <title>{project ? project.name : 'Заявка'}</title>
</svelte:head>

<div class="page">
  <a class="back" href="/moderator">← Кабинет модератора</a>

  {#if errorMsg}
    <p class="error">{errorMsg}</p>
  {:else if loadingProject}
    <p class="muted">Загрузка...</p>
  {:else if project}
    <h1>{project.name}</h1>

    <div class="tabs">
      <button class="tab" class:active={activeTab === 'project'} on:click={() => switchTab('project')}>
        Проект
      </button>
      <button class="tab" class:active={activeTab === 'author'} on:click={() => switchTab('author')}>
        Автор
      </button>
    </div>

    {#if activeTab === 'project'}
      <div class="section">
        {#if project.coverURL}
          <img src={project.coverURL} alt="обложка" class="cover-img" />
        {/if}
        <div class="field">
          <span class="label">Категория</span>
          <span class="value">{CATEGORY_LABELS[project.category] ?? project.category}</span>
        </div>
        <div class="field">
          <span class="label">Цель сбора</span>
          <span class="value">{project.goalAmount.toLocaleString('ru-RU')} {project.currency === 'RUB' ? '₽' : '$'}</span>
        </div>
        <div class="field">
          <span class="label">Длительность</span>
          <span class="value">{project.durationDays} дней</span>
        </div>
        {#if project.description}
          <div class="field">
            <span class="label">Описание</span>
            <p class="description">{project.description}</p>
          </div>
        {/if}
        {#if project.images && project.images.length > 0}
          <div class="field">
            <span class="label">Фотографии</span>
            <ProjectImages images={project.images} />
          </div>
        {/if}
      </div>
    {:else}
      <div class="section">
        {#if loadingAuthor}
          <p class="muted">Загрузка...</p>
        {:else if author}
          <div class="author-header">
            {#if author.avatarUrl}
              <img class="avatar" src={author.avatarUrl} alt="avatar" />
            {:else}
              <div class="avatar-placeholder">{(author.displayName || author.username)[0]}</div>
            {/if}
            <div>
              <div class="author-name">{author.displayName || author.username}</div>
              <div class="author-username">@{author.username}</div>
            </div>
          </div>
          {#if author.description}
            <div class="field">
              <span class="label">О себе</span>
              <p class="description">{author.description}</p>
            </div>
          {/if}
        {:else}
          <p class="muted">Не удалось загрузить данные автора.</p>
        {/if}
      </div>
    {/if}

    <div class="actions">
      {#if rejectMode}
        <div class="reject-form">
          <textarea
            class="reject-reason"
            placeholder="Причина отклонения..."
            rows="3"
            bind:value={rejectReason}
            disabled={processing}
          ></textarea>
          <div class="reject-btns">
            <button class="btn-reject-confirm" on:click={reject} disabled={processing || !rejectReason.trim()}>
              {processing ? '...' : 'Подтвердить отклонение'}
            </button>
            <button class="btn-cancel" on:click={() => rejectMode = false} disabled={processing}>
              Отмена
            </button>
          </div>
        </div>
      {:else}
        <button class="btn-approve" on:click={approve} disabled={processing}>
          {processing ? '...' : 'Одобрить'}
        </button>
        <button class="btn-reject" on:click={() => rejectMode = true} disabled={processing}>
          Отклонить
        </button>
      {/if}
    </div>
  {/if}
</div>

<Toast bind:this={toastComponent} bind:toasts />

<style>
  .page {
    max-width: 640px;
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
    line-height: 1.3;
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

  .field {
    display: grid;
    gap: 6px;
  }

  .label {
    font-size: 13px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .value {
    font-size: 16px;
    color: var(--text-main);
    font-weight: 500;
  }

  .description {
    margin: 0;
    font-size: 15px;
    color: var(--text-main);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  /* --- Author --- */

  .author-header {
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

  .author-name {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-main);
  }

  .author-username {
    font-size: 14px;
    color: var(--text-muted);
  }

  /* --- Actions --- */

  .actions {
    display: flex;
    gap: 10px;
    margin-top: 40px;
    padding-top: 24px;
    border-top: 1px solid var(--line);
  }

  .btn-approve,
  .btn-reject {
    padding: 10px 28px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: none;
  }

  .btn-approve {
    background: #2d8a4e;
    color: #fff;
  }

  .btn-reject {
    background: none;
    border: 1px solid var(--line);
    color: var(--text-muted);
  }

  .btn-reject:hover {
    border-color: #e05252;
    color: #e05252;
  }

  .btn-approve:disabled,
  .btn-reject:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .reject-form {
    display: grid;
    gap: 10px;
    width: 100%;
  }

  .reject-reason {
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    color: var(--text-main);
    background: #fff;
    outline: none;
    resize: none;
    width: 100%;
    box-sizing: border-box;
  }

  .reject-reason:focus {
    border-color: #e05252;
  }

  .reject-btns {
    display: flex;
    gap: 10px;
  }

  .btn-reject-confirm {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    background: #e05252;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }

  .btn-reject-confirm:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .btn-cancel {
    padding: 10px 20px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: none;
    color: var(--text-muted);
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
  }

  .cover-img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--line);
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
