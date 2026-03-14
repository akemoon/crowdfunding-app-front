<script lang="ts">
  import { onMount } from 'svelte';
  import { getProjects, type Project, type ProjectStatus, type ProjectSort } from '$lib/api';

  const LIMIT = 20;

  const CATEGORY_LABELS: Record<string, string> = {
    science:                'Наука',
    tech:                   'Технологии',
    architecture_and_urban: 'Архитектура и урбанистика',
    sport:                  'Спорт',
    music:                  'Музыка',
  };

  let status:   ProjectStatus = 'active';
  let sort:     ProjectSort   = 'default';
  let category  = '';
  let search    = '';

  let items:   Project[] = [];
  let offset   = 0;
  let hasMore  = true;
  let loading  = false;
  let error    = '';

  let searchTimer:     ReturnType<typeof setTimeout>;
  // Tracks the in-flight filter request so we can cancel it on filter change
  let filterController: AbortController | null = null;

  async function loadProjects(append: boolean) {
    const currentOffset = append ? offset : 0;

    // Cancel the previous filter request (not needed for "load more")
    let signal: AbortSignal | undefined;
    if (!append) {
      filterController?.abort();
      filterController = new AbortController();
      signal = filterController.signal;
    }

    loading = true;
    error   = '';

    try {
      const result = await getProjects(
        {
          status,
          sort,
          category: category || undefined,
          search:   search.trim() || undefined,
          limit:    LIMIT,
          offset:   currentOffset,
        },
        signal,
      );

      if ('code' in result) {
        console.error('[projects]', result.code, result.message);
        error = 'Произошла ошибка. Попробуйте позже.';
        loading = false;
        return;
      }

      const fetched = result.items ?? [];
      items   = append ? [...items, ...fetched] : fetched;
      offset  = currentOffset + fetched.length;
      hasMore = fetched.length === LIMIT;
    } catch (e) {
      // Ignore aborted requests -- a newer one is already in flight
      if (e instanceof DOMException && e.name === 'AbortError') return;
      console.error('[projects] fetch failed', e);
      error = 'Произошла ошибка. Попробуйте позже.';
    }

    loading = false;
  }

  function applyFilters() {
    offset = 0;
    loadProjects(false);
  }

  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 400);
  }

  onMount(() => applyFilters());
</script>

<svelte:head>
  <title>Проекты</title>
</svelte:head>

<div class="page">
  <h1>Проекты</h1>

  <!-- Filters -->
  <div class="filters">
    <div class="status-tabs">
      <button
        class="status-tab"
        class:active={status === 'active'}
        on:click={() => { status = 'active'; applyFilters(); }}
      >Активные</button>
      <button
        class="status-tab"
        class:active={status === 'finished'}
        on:click={() => { status = 'finished'; applyFilters(); }}
      >Завершённые</button>
    </div>

    <select class="filter-select" bind:value={sort} on:change={applyFilters}>
      <option value="default">По умолчанию</option>
      <option value="date">По дате</option>
    </select>

    <select class="filter-select" bind:value={category} on:change={applyFilters}>
      <option value="">Все категории</option>
      {#each Object.entries(CATEGORY_LABELS) as [val, label]}
        <option value={val}>{label}</option>
      {/each}
    </select>

    <input
      class="search-input"
      type="search"
      placeholder="Поиск..."
      bind:value={search}
      on:input={onSearchInput}
    />
  </div>

  <!-- Error -->
  {#if error}
    <p class="error-msg">{error}</p>
  {/if}

  <!-- List -->
  {#if items.length > 0}
    <ul class="project-list">
      {#each items as project (project.id)}
        <li>
          <a class="project-item" href="/projects/{project.id}">
            <span class="project-name">{project.name}</span>
            <span class="project-category">
              {CATEGORY_LABELS[project.category] ?? project.category}
            </span>
            {#if status === 'finished'}
              <span class="project-status">Завершён</span>
            {/if}
            {#if project.isBoosted}
              <span class="boosted">★ Топ</span>
            {/if}
          </a>
        </li>
      {/each}
    </ul>
  {:else if !loading}
    <p class="placeholder">Проектов не найдено.</p>
  {/if}

  {#if loading}
    <p class="loading-msg">Загрузка...</p>
  {/if}

  {#if hasMore && !loading}
    <div class="load-more-wrap">
      <button class="btn-load-more" on:click={() => loadProjects(true)}>
        Загрузить ещё
      </button>
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 720px;
  }

  h1 {
    margin: 0 0 20px;
    font-size: 28px;
    font-weight: 700;
  }

  .btn-create:hover {
    background: var(--accent);
    color: #fff;
  }

  /* --- Filters --- */

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 24px;
    align-items: center;
  }

  .status-tabs {
    display: flex;
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
  }

  .status-tab {
    padding: 7px 14px;
    border: none;
    background: transparent;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    color: var(--text-main);
  }

  .status-tab.active {
    background: var(--accent);
    color: #fff;
    font-weight: 600;
  }

  .filter-select {
    padding: 7px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    color: var(--text-main);
    background: #fff;
    cursor: pointer;
    outline: none;
  }

  .search-input {
    flex: 1;
    min-width: 140px;
    padding: 7px 12px;
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

  /* --- List --- */

  .project-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .project-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    text-decoration: none;
    color: inherit;
  }

  .project-item:hover {
    border-color: var(--accent);
  }

  .project-name {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
  }

  .project-status {
    font-size: 12px;
    color: var(--text-muted);
  }

  .project-category {
    font-size: 12px;
    color: var(--text-muted);
  }

  .boosted {
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    white-space: nowrap;
  }

  /* --- State messages --- */

  .placeholder,
  .loading-msg {
    color: var(--text-muted);
    margin-top: 16px;
  }

  .error-msg {
    color: #e05252;
    margin-bottom: 16px;
  }

  /* --- Load more --- */

  .load-more-wrap {
    text-align: center;
    margin-top: 20px;
  }

  .btn-load-more {
    padding: 8px 28px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: transparent;
    font-size: 14px;
    font-family: inherit;
    color: var(--text-main);
    cursor: pointer;
  }

  .btn-load-more:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
