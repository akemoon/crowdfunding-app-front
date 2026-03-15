<script lang="ts">
  import { onMount } from 'svelte';
  import { getMyProjects, type Project } from '$lib/api';

  const CATEGORY_LABELS: Record<string, string> = {
    science:                'Наука',
    tech:                   'Технологии',
    architecture_and_urban: 'Архитектура и урбанистика',
    sport:                  'Спорт',
    music:                  'Музыка',
  };

  const STATUS_LABELS: Record<string, string> = {
    review:   'На модерации',
    active:   'Активен',
    finished: 'Завершён',
  };

  let projects: Project[] = [];
  let loading = true;
  let errorMsg = '';

  onMount(async () => {
    const token = localStorage.getItem('accessToken') ?? '';
    const res = await getMyProjects(token);
    loading = false;
    if ('code' in res) {
      console.error('[getMyProjects]', res.code, res.message);
      errorMsg = 'Не удалось загрузить проекты.';
    } else {
      projects = res;
    }
  });
</script>

<svelte:head>
  <title>Мои проекты</title>
</svelte:head>

<div class="page">
  <div class="header">
    <h1>Мои проекты</h1>
    <a class="btn-create" href="/projects/new">+ Создать проект</a>
  </div>

  {#if loading}
    <p class="muted">Загрузка...</p>
  {:else if errorMsg}
    <p class="error">{errorMsg}</p>
  {:else if projects.length === 0}
    <p class="muted">У вас пока нет проектов.</p>
  {:else}
    <ul class="list">
      {#each projects as project}
        <li>
          <a class="project-item" href="/projects/my/{project.id}">
            <div class="project-main">
              <span class="project-name">{project.name}</span>
              <span class="project-cat">{CATEGORY_LABELS[project.category] ?? project.category}</span>
            </div>
            <span class="project-status status-{project.status}">
              {STATUS_LABELS[project.status] ?? project.status}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .page {
    max-width: 720px;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
  }

  .btn-create {
    padding: 8px 18px;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
  }

  .btn-create:hover {
    opacity: 0.88;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .project-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
  }

  .project-item:hover {
    border-color: var(--accent);
  }

  .project-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .project-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-main);
  }

  .project-cat {
    font-size: 13px;
    color: var(--text-muted);
  }

  .project-status {
    font-size: 13px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid var(--line);
    color: var(--text-muted);
    white-space: nowrap;
  }

  .status-active   { border-color: #4caf50; color: #4caf50; }
  .status-finished { border-color: #9e9e9e; color: #9e9e9e; }
  .status-review   { border-color: var(--accent); color: var(--accent); }

  .muted { color: var(--text-muted); font-size: 15px; }
  .error { color: #e05050; font-size: 15px; }
</style>
