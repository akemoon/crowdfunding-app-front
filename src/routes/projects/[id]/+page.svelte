<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getProject, getUser, contribute, type Project, type UserProfile } from '$lib/api';

  const CATEGORY_LABELS: Record<string, string> = {
    science:                'Наука',
    tech:                   'Технологии',
    architecture_and_urban: 'Архитектура и урбанистика',
    sport:                  'Спорт',
    music:                  'Музыка',
  };

  const CURRENCY_SYMBOL: Record<string, string> = {
    RUB: '₽',
    USD: '$',
  };

  const CONTRIBUTE_ERRORS: Record<string, string> = {
    project_not_active:           'Проект не принимает взносы.',
    invalid_contribution_amount:  'Сумма должна быть больше 0.',
    project_not_found:            'Проект не найден.',
  };

  let project: Project | null = null;
  let author:  UserProfile | null = null;
  let errorMsg = '';

  // Contribution form state
  let amount      = '';
  let contributing = false;
  let contributeError   = '';
  let contributeSuccess = false;

  onMount(async () => {
    const id = $page.params.id;
    const result = await getProject(id);
    if ('code' in result) {
      console.error('[project]', result.code, result.message);
      errorMsg = result.code === 'project_not_found'
        ? 'Проект не найден.'
        : 'Не удалось загрузить проект.';
    } else {
      project = result;
      // Fetch author in parallel -- not blocking, page renders without it
      getUser(result.userID).then((u) => {
        if (!('code' in u)) author = u;
      });
    }
  });

  function formatAmount(amount: number, currency: string): string {
    const sym = CURRENCY_SYMBOL[currency] ?? currency;
    return `${amount.toLocaleString('ru-RU')} ${sym}`;
  }

  function progressPercent(current: number, goal: number): number {
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((current / goal) * 100));
  }

  async function submitContribute() {
    const n = parseInt(amount, 10);
    if (!n || n < 1) { contributeError = 'Введите сумму.'; return; }

    contributing     = true;
    contributeError  = '';
    contributeSuccess = false;

    const token = localStorage.getItem('accessToken') ?? '';
    const result = await contribute(token, { projectID: project!.id, amount: n });
    contributing = false;

    if (result !== null) {
      console.error('[contribute]', result.code, result.message);
      contributeError = CONTRIBUTE_ERRORS[result.code] ?? 'Произошла ошибка. Попробуйте позже.';
    } else {
      contributeSuccess = true;
      amount = '';
      // Reload project to update currentAmount
      const updated = await getProject(project!.id);
      if (!('code' in updated)) project = updated;
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day:   'numeric',
      month: 'long',
      year:  'numeric',
    });
  }
</script>

<svelte:head>
  <title>{project ? project.name : 'Проект'}</title>
</svelte:head>

<div class="page">
  {#if errorMsg}
    <p class="error">{errorMsg}</p>
  {:else if !project}
    <p class="muted">Загрузка...</p>
  {:else}
    <a class="back" href="/projects">← Все проекты</a>

    <div class="header">
      <h1>{project.name}</h1>
      <div class="meta">
        <span class="category">{CATEGORY_LABELS[project.category] ?? project.category}</span>
        {#if project.isBoosted}
          <span class="boosted">★ Топ</span>
        {/if}
      </div>
    </div>

    {#if project.description}
      <p class="description">{project.description}</p>
    {/if}

    {#if author}
      <a class="author" href="/users/{project.userID}">
        <div class="author-avatar">
          {#if author.avatarUrl}
            <img src={author.avatarUrl} alt={author.displayName} />
          {:else}
            <span>{author.displayName.charAt(0).toUpperCase()}</span>
          {/if}
        </div>
        <div class="author-info">
          <span class="author-name">{author.displayName}</span>
          <span class="author-username">@{author.username}</span>
        </div>
      </a>
    {/if}

    <div class="funding">
      <div class="amounts">
        <span class="current">{formatAmount(project.currentAmount, project.currency)}</span>
        <span class="goal">из {formatAmount(project.goalAmount, project.currency)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progressPercent(project.currentAmount, project.goalAmount)}%"></div>
      </div>
      <span class="percent">{progressPercent(project.currentAmount, project.goalAmount)}%</span>
    </div>

    <div class="details">
      {#if project.startedAt}
        <div class="detail-row">
          <span class="detail-label">Начало</span>
          <span class="detail-value">{formatDate(project.startedAt)}</span>
        </div>
      {/if}
      <div class="detail-row">
        <span class="detail-label">Длительность</span>
        <span class="detail-value">{project.durationDays} дн.</span>
      </div>
    </div>

    <div class="contribute-block">
      <h2>Поддержать проект</h2>
      {#if contributeSuccess}
        <p class="contribute-ok">Спасибо! Ваш взнос принят.</p>
      {/if}
      <div class="contribute-row">
        <input
          class="amount-input"
          type="number"
          min="1"
          placeholder="Сумма ({project.currency === 'RUB' ? '₽' : '$'})"
          bind:value={amount}
          disabled={contributing}
        />
        <button class="btn-contribute" on:click={submitContribute} disabled={contributing}>
          {contributing ? 'Отправка...' : 'Внести'}
        </button>
      </div>
      {#if contributeError}
        <p class="contribute-error">{contributeError}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 680px;
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

  .header {
    margin-bottom: 16px;
  }

  h1 {
    margin: 0 0 8px;
    font-size: 32px;
    font-weight: 700;
    line-height: 1.2;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .category {
    font-size: 14px;
    color: var(--text-muted);
  }

  .boosted {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
  }

  .description {
    margin: 0 0 28px;
    font-size: 16px;
    color: var(--text-main);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  /* --- Author --- */

  .author {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
  }

  .author:hover {
    border-color: var(--accent);
  }

  .author-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--bg-soft);
    border: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-muted);
    flex-shrink: 0;
    overflow: hidden;
  }

  .author-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .author-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .author-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-main);
  }

  .author-username {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* --- Funding block --- */

  .funding {
    margin-bottom: 28px;
  }

  .amounts {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
  }

  .current {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-main);
  }

  .goal {
    font-size: 16px;
    color: var(--text-muted);
  }

  .progress-bar {
    height: 8px;
    background: var(--line);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.3s;
  }

  .percent {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* --- Details --- */

  .details {
    display: grid;
    gap: 10px;
  }

  .detail-row {
    display: flex;
    gap: 12px;
  }

  .detail-label {
    font-size: 14px;
    color: var(--text-muted);
    min-width: 100px;
  }

  .detail-value {
    font-size: 14px;
    color: var(--text-main);
  }

  /* --- Contribute --- */

  .contribute-block {
    margin-top: 36px;
    padding-top: 28px;
    border-top: 1px solid var(--line);
  }

  .contribute-block h2 {
    margin: 0 0 16px;
    font-size: 18px;
    font-weight: 600;
  }

  .contribute-row {
    display: flex;
    gap: 8px;
  }

  .amount-input {
    width: 180px;
    padding: 9px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 15px;
    font-family: inherit;
    color: var(--text-main);
    background: #fff;
    outline: none;
  }

  .amount-input:focus {
    border-color: var(--accent);
  }

  .btn-contribute {
    padding: 9px 20px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }

  .btn-contribute:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .contribute-ok {
    margin: 0 0 12px;
    font-size: 14px;
    color: #2d8a4e;
  }

  .contribute-error {
    margin-top: 8px;
    font-size: 13px;
    color: #e05252;
  }

  /* --- State --- */

  .muted {
    color: var(--text-muted);
    font-size: 14px;
  }

  .error {
    color: #e05252;
    font-size: 14px;
  }
</style>
