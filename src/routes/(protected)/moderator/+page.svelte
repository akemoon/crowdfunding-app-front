<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getApplications, getMyApplications, takeApplication, type ModeratorApplication } from '$lib/api';
  import { currentApplication } from '$lib/stores/moderator';
  import Toast from '$lib/components/Toast.svelte';
  import type { ToastItem } from '$lib/components/Toast.svelte';

  const CATEGORY_LABELS: Record<string, string> = {
    science:                'Наука',
    tech:                   'Технологии',
    architecture_and_urban: 'Архитектура и урбанистика',
    sport:                  'Спорт',
    music:                  'Музыка',
  };

  type Tab = 'pool' | 'mine';
  let activeTab: Tab = 'pool';

  let pool: ModeratorApplication[] = [];
  let mine: ModeratorApplication[] = [];

  let loading = true;
  let errorMsg = '';

  // Toast state
  let toasts: ToastItem[] = [];
  let toastComponent: Toast;

  // Track IDs that were "taken" by someone else for conflict simulation
  let conflictIds = new Set<string>();

  onMount(async () => {
    const token = localStorage.getItem('accessToken') ?? '';
    const [poolRes, mineRes] = await Promise.all([
      getApplications(token),
      getMyApplications(token),
    ]);
    loading = false;
    if ('code' in poolRes) {
      console.error('[getApplications]', poolRes.code, poolRes.message);
      errorMsg = 'Не удалось загрузить заявки.';
    } else {
      pool = poolRes;
    }
    if (!('code' in mineRes)) {
      mine = mineRes;
    }
  });

  function simulateConflict(id: string) {
    conflictIds.add(id);
  }

  async function assign(app: ModeratorApplication) {
    const id = app.project.id;

    if (conflictIds.has(id)) {
      toastComponent.show('Заявка недоступна', 'error');
      pool = pool.filter(a => a.project.id !== id);
      return;
    }

    const token = localStorage.getItem('accessToken') ?? '';
    const result = await takeApplication(token, id);

    if (result !== null) {
      console.error('[takeApplication]', result.code, result.message);
      if (result.code === 'application_not_found') {
        toastComponent.show('Заявка недоступна', 'error');
        pool = pool.filter(a => a.project.id !== id);
      } else {
        toastComponent.show('Не удалось взять заявку.', 'error');
      }
      return;
    }

    conflictIds.add(id);
    pool = pool.filter(a => a.project.id !== id);
    mine = [...mine, app];
    toastComponent.show('Заявка взята в работу', 'success');
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }


</script>

<svelte:head>
  <title>Кабинет модератора</title>
</svelte:head>

<div class="page">
  <h1>Кабинет модератора</h1>

  <div class="tabs">
    <button class="tab" class:active={activeTab === 'pool'} on:click={() => activeTab = 'pool'}>
      Общий пул
      {#if pool.length > 0}<span class="badge">{pool.length}</span>{/if}
    </button>
    <button class="tab" class:active={activeTab === 'mine'} on:click={() => activeTab = 'mine'}>
      Мои заявки
      {#if mine.length > 0}<span class="badge">{mine.length}</span>{/if}
    </button>
  </div>

  {#if activeTab === 'pool'}
    {#if loading}
      <p class="empty">Загрузка...</p>
    {:else if errorMsg}
      <p class="error">{errorMsg}</p>
    {:else if pool.length === 0}
      <p class="empty">Новых заявок нет.</p>
    {:else}
      <ul class="list">
        {#each pool as app (app.project.id)}
          <li class="item">
            <div class="item-info">
              <span class="item-name">{app.project.name}</span>
              <span class="item-author">
                {CATEGORY_LABELS[app.project.category] ?? app.project.category}
                &nbsp;·&nbsp;
                {formatDate(app.createdAt)}
              </span>
            </div>
            <div class="item-actions">
              <button class="btn-sim" on:click={() => simulateConflict(app.project.id)}>
                [тест: занять]
              </button>
              <button class="btn-assign" on:click={() => assign(app)}>
                Взять в работу
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    {#if mine.length === 0}
      <p class="empty">У вас нет активных заявок.</p>
    {:else}
      <ul class="list">
        {#each mine as app (app.project.id)}
          <li class="item">
            <a class="item-link" href="/moderator/{app.project.id}"
               on:click={() => currentApplication.set(app)}>
              <span class="item-name">{app.project.name}</span>
              <span class="item-author">
                {CATEGORY_LABELS[app.project.category] ?? app.project.category}
                &nbsp;·&nbsp;
                {formatDate(app.createdAt)}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<Toast bind:this={toastComponent} bind:toasts />

<style>
  .page {
    max-width: 680px;
  }

  h1 {
    margin: 0 0 28px;
    font-size: 28px;
    font-weight: 700;
  }

  /* --- Tabs --- */

  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 24px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
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

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--accent);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
  }

  /* --- List --- */

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
  }

  .item-link {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    text-decoration: none;
    flex: 1;
  }

  .item-link:hover .item-name {
    color: var(--accent);
  }

  .item-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .item-name {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-author {
    font-size: 13px;
    color: var(--text-muted);
  }

  .item-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .btn-assign,
  .btn-approve,
  .btn-reject {
    padding: 7px 16px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
    border: none;
  }

  .btn-assign {
    background: var(--accent);
    color: #fff;
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

  /* Dev-only simulation button */
  .btn-sim {
    padding: 7px 12px;
    border-radius: 7px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    border: 1px dashed #ccc;
    background: none;
    color: #aaa;
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
