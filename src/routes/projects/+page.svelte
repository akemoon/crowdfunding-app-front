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
    art:                    'Искусство',
    film:                   'Кино',
    games:                  'Игры',
    education:              'Образование',
    food:                   'Еда',
    fashion:                'Мода',
    health:                 'Здоровье',
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
    <ul class="project-grid">
      {#each items as project (project.id)}
        <li>
          <a class="project-card" href="/projects/{project.id}">
            <div class="card-cover">
              {#if project.coverURL}
                <img src={project.coverURL} alt={project.name} class="cover-img" />
              {:else}
                <div class="cover-placeholder">
                  <span>{CATEGORY_LABELS[project.category] ?? project.category}</span>
                </div>
              {/if}
              {#if project.isBoosted}
                <span class="boosted-badge">★ Топ</span>
              {/if}
              {#if status === 'finished'}
                <span class="finished-badge">Завершён</span>
              {/if}
            </div>
            <div class="card-body">
              <span class="card-name">{project.name}</span>
              <span class="card-category">{CATEGORY_LABELS[project.category] ?? project.category}</span>
            </div>
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
    max-width: 960px;
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

  /* --- Card grid --- */

  .project-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }

  .project-card {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: #fff;
    text-decoration: none;
    color: inherit;
    overflow: hidden;
  }

  .project-card:hover {
    border-color: var(--accent);
  }

  .card-cover {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: var(--soft);
    overflow: hidden;
    flex-shrink: 0;
  }

  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--soft);
  }

  .cover-placeholder span {
    font-size: 13px;
    color: var(--text-muted);
  }

  .boosted-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    background: var(--accent);
    padding: 2px 8px;
    border-radius: 20px;
  }

  .finished-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    background: #9e9e9e;
    padding: 2px 8px;
    border-radius: 20px;
  }

  .card-body {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-main);
    line-height: 1.3;
  }

  .card-category {
    font-size: 12px;
    color: var(--text-muted);
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
