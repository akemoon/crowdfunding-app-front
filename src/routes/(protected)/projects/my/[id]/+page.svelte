<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/state';
  import { getProject, getMyApplication, getProjectStats, getPayout, boostProject, type Project, type Application, type ProjectStats, type Payout } from '$lib/api';
  import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler } from 'chart.js';

  // TODO: add a chart constructor (like Grafana) so the author can pick which charts to show

  Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

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

  const STATUS_LABELS: Record<string, string> = {
    review:   'На модерации',
    active:   'Активен',
    finished: 'Завершён',
  };

  const APPLICATION_STATUS_LABELS: Record<string, string> = {
    pending:  'Ожидает рассмотрения',
    review:   'На рассмотрении',
    approved: 'Одобрена',
    rejected: 'Отклонена',
  };

  type Tab = 'project' | 'application' | 'stats' | 'payout' | 'boost';
  let activeTab: Tab = 'project';

  // Boost tab state
  let promoCode = '';
  let boostError = '';
  let boostSuccess = false;
  let boostLoading = false;

  const BOOST_ERRORS: Record<string, string> = {
    promo_code_access_denied: 'Промокод недействителен.',
    promo_code_not_found:     'Промокод не найден.',
    promo_code_already_used:  'Промокод уже был использован.',
    project_not_found:        'Проект не найден.',
  };

  async function submitBoost() {
    boostError = '';
    if (!/^[a-z0-9]{10}$/.test(promoCode)) {
      boostError = 'Промокод: 10 символов, только строчные буквы и цифры.';
      return;
    }
    boostLoading = true;
    const err = await boostProject(token, project!.id, promoCode);
    boostLoading = false;
    if (err) {
      boostError = BOOST_ERRORS[err.code] ?? 'Не удалось применить промокод.';
      console.error('[boostProject]', err.code, err.message);
    } else {
      boostSuccess = true;
      promoCode = '';
    }
  }

  let project:     Project | null      = null;
  let application: Application | null  = null;
  let stats:       ProjectStats | null = null;
  let payout:      Payout | null       = null;
  let payoutLoaded = false;
  let errorMsg = '';

  // Chart state
  type Range = '7d' | '30d' | '90d';
  let range: Range = '7d';
  let canvasEl: HTMLCanvasElement | undefined;
  let chart: Chart | null = null;

  // Mock data generator -- replace with real API call when payment service is ready
  function mockPayments(days: number): { labels: string[]; values: number[] } {
    const labels: string[] = [];
    const values: number[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
      // Pseudo-random but deterministic-ish mock values
      values.push(Math.floor(Math.sin(i * 0.7 + 1) * 4000 + 5000 + Math.random() * 2000));
    }
    return { labels, values };
  }

  function buildChart() {
    if (!canvasEl) return;
    if (chart) chart.destroy();

    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const { labels, values } = mockPayments(days);

    chart = new Chart(canvasEl, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Платежи, ₽',
          data: values,
          borderColor: '#e07d50',
          backgroundColor: 'rgba(224, 125, 80, 0.08)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#e07d50',
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { grid: { color: '#f0e8e2' }, ticks: { color: '#888', maxTicksLimit: 8 } },
          y: { grid: { color: '#f0e8e2' }, ticks: { color: '#888' }, beginAtZero: true },
        },
      },
    });
  }

  function setRange(r: Range) {
    range = r;
    buildChart();
  }

  function daysLeft(startedAt: string, durationDays: number): number {
    const end = new Date(startedAt);
    end.setDate(end.getDate() + durationDays);
    return Math.ceil((end.getTime() - Date.now()) / 86400000);
  }

  function formatAmount(amount: number, currency: string): string {
    const sym = CURRENCY_SYMBOL[currency] ?? currency;
    return `${amount.toLocaleString('ru-RU')} ${sym}`;
  }

  function progressPercent(current: number, goal: number): number {
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((current / goal) * 100));
  }

  let token = '';

  onMount(async () => {
    const id = page.params.id ?? '';
    token = localStorage.getItem('accessToken') ?? '';
    const [projRes, appRes] = await Promise.all([
      getProject(id, token),
      getMyApplication(token, id),
    ]);

    if ('code' in projRes) {
      console.error('[project]', projRes.code, projRes.message);
      errorMsg = projRes.code === 'project_not_found'
        ? 'Проект не найден.'
        : 'Не удалось загрузить проект.';
    } else {
      project = projRes;
    }

    if (!('code' in appRes)) {
      application = appRes;
    }
  });

  async function switchToStats() {
    activeTab = 'stats';
    if (stats || !project) return;
    const res = await getProjectStats(token, project.id);
    if (!('code' in res)) {
      stats = res;
    } else {
      console.error('[getProjectStats]', res.code, res.message);
    }
  }

  async function switchToPayout() {
    activeTab = 'payout';
    if (payoutLoaded || !project) return;
    payoutLoaded = true;
    const res = await getPayout(token, project.id);
    if (!('code' in res)) {
      payout = res;
    } else if (res.code !== 'payout_not_found') {
      console.error('[getPayout]', res.code, res.message);
    }
  }

  onDestroy(() => { if (chart) chart.destroy(); });
</script>

<svelte:head>
  <title>{project?.name ?? 'Мой проект'}</title>
</svelte:head>

<div class="page">
  <a class="back" href="/projects/my">← Мои проекты</a>

  {#if errorMsg}
    <p class="error">{errorMsg}</p>
  {:else if !project}
    <p class="muted">Загрузка...</p>
  {:else}
    <div class="header">
      <h1>{project.name}</h1>
      <span class="status status-{project.status}">{STATUS_LABELS[project.status] ?? project.status}</span>
    </div>

    <nav class="tabs">
      <button class:active={activeTab === 'project'}     on:click={() => activeTab = 'project'}>Проект</button>
      <button class:active={activeTab === 'application'} on:click={() => activeTab = 'application'}>Заявка</button>
      <button class:active={activeTab === 'stats'}       on:click={switchToStats}>Статистика</button>
      <button class:active={activeTab === 'payout'}      on:click={switchToPayout}>Выплата</button>
      {#if project.status !== 'finished'}
        <button class:active={activeTab === 'boost'} on:click={() => activeTab = 'boost'}>Буст</button>
      {/if}
    </nav>

    {#if activeTab === 'project'}
      <div class="tab-content">
        <div class="meta-row">
          <span class="label">Категория</span>
          <span>{CATEGORY_LABELS[project.category] ?? project.category}</span>
        </div>
        <div class="meta-row">
          <span class="label">Цель</span>
          <span>{formatAmount(project.goalAmount, project.currency)}</span>
        </div>
        {#if project.startedAt}
          <div class="meta-row">
            <span class="label">Начало</span>
            <span>{new Date(project.startedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        {/if}
        <div class="meta-row">
          <span class="label">Длительность</span>
          <span>{project.durationDays} дн.</span>
        </div>
        {#if project.startedAt && daysLeft(project.startedAt, project.durationDays) > 0}
          <div class="meta-row">
            <span class="label">Осталось</span>
            <span>{daysLeft(project.startedAt, project.durationDays)} дн.</span>
          </div>
        {/if}
        <p class="description">{project.description}</p>
      </div>

    {:else if activeTab === 'application'}
      <div class="tab-content">
        {#if application}
          <div class="meta-row">
            <span class="label">Статус заявки</span>
            <span class="app-status app-status-{application.status}">
              {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
            </span>
          </div>
          <div class="meta-row">
            <span class="label">Подана</span>
            <span>{new Date(application.createdAt).toLocaleDateString('ru-RU')}</span>
          </div>
          {#if application.rejectReason}
            <div class="reject-reason">
              <span class="label">Причина отклонения</span>
              <p>{application.rejectReason}</p>
            </div>
          {/if}
        {:else}
          <p class="muted">Заявка на модерацию ещё не подана.</p>
        {/if}
      </div>

    {:else if activeTab === 'stats'}
      <div class="tab-content">
        {#if stats}
          <div class="funding">
            <div class="amounts">
              <span class="current">{formatAmount(stats.currentAmount, project.currency)}</span>
              <span class="goal">из {formatAmount(project.goalAmount, project.currency)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: {progressPercent(stats.currentAmount, project.goalAmount)}%"></div>
            </div>
            <span class="percent">{progressPercent(stats.currentAmount, project.goalAmount)}%</span>
          </div>
        {/if}

        <div class="stat-cards">
          <div class="stat-card">
            <span class="stat-value">{stats ? stats.contributersNum : '—'}</span>
            <span class="stat-label">Уникальных спонсоров</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{stats ? stats.contributionsNum : '—'}</span>
            <span class="stat-label">Платежей</span>
          </div>
        </div>

        <!-- chart: hidden until real time-series API is available -->
        <!--
        <div class="chart-header">
          <span class="chart-title">Платежи по дням</span>
          <div class="range-btns">
            <button class:active={range === '7d'}  on:click={() => setRange('7d')}>7 дн.</button>
            <button class:active={range === '30d'} on:click={() => setRange('30d')}>30 дн.</button>
            <button class:active={range === '90d'} on:click={() => setRange('90d')}>90 дн.</button>
          </div>
        </div>
        <div class="chart-wrap">
          <canvas bind:this={canvasEl}></canvas>
        </div>
        -->
      </div>

    {:else if activeTab === 'payout'}
      <div class="tab-content">
        {#if !payoutLoaded}
          <p class="muted">Загрузка...</p>
        {:else if payout}
          <div class="payout-card">
            <div class="payout-icon">✔</div>
            <div class="payout-info">
              <span class="payout-title">Выплата произведена</span>
              <span class="payout-date">{new Date(payout.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        {:else}
          <p class="muted">Выплата ещё не произведена.</p>
        {/if}
      </div>
    {:else if activeTab === 'boost'}
      <div class="tab-content">
        {#if project.isBoosted && project.boostedUntil}
          <p class="boost-until">Буст до {new Date(project.boostedUntil).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        {/if}

        {#if boostSuccess}
          <div class="boost-success">
            <div class="boost-icon">✔</div>
            <div class="boost-info">
              <span class="boost-title">Буст применён</span>
              <span class="boost-sub">Проект отмечен как продвигаемый.</span>
            </div>
          </div>
        {:else}
          <p class="boost-hint">Введите промокод, чтобы продвинуть проект. Промокод действует однократно.</p>
          <form class="boost-form" on:submit|preventDefault={submitBoost}>
            <input
              class="boost-input"
              type="text"
              placeholder="промокод"
              maxlength="10"
              bind:value={promoCode}
              disabled={boostLoading}
            />
            <button class="boost-btn" type="submit" disabled={boostLoading}>
              {boostLoading ? 'Применяю...' : 'Применить'}
            </button>
          </form>
          {#if boostError}
            <p class="boost-error">{boostError}</p>
          {/if}
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .page {
    max-width: 720px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
  }

  .status {
    font-size: 13px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid var(--line);
    color: var(--text-muted);
  }

  .status-active   { border-color: #4caf50; color: #4caf50; }
  .status-finished { border-color: #9e9e9e; color: #9e9e9e; }
  .status-review   { border-color: var(--accent); color: var(--accent); }

  /* Tabs */

  .tabs {
    display: flex;
    gap: 0;
    border-bottom: 2px solid var(--line);
    margin-bottom: 28px;
  }

  .tabs button {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    padding: 10px 20px;
    font-size: 15px;
    cursor: pointer;
    color: var(--text-muted);
  }

  .tabs button.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* Meta rows */

  .meta-row {
    display: flex;
    gap: 16px;
    font-size: 15px;
    align-items: baseline;
  }

  .label {
    color: var(--text-muted);
    min-width: 140px;
    flex-shrink: 0;
    font-size: 14px;
  }

  .description {
    margin: 8px 0 0;
    font-size: 15px;
    line-height: 1.6;
    white-space: pre-wrap;
    color: var(--text-main);
  }

  /* Funding block (stats tab) */

  .funding {
    margin-bottom: 8px;
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

  .percent {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* Progress (project tab) */

  .progress-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .progress-bar {
    flex: 1;
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
  }

  .progress-label {
    font-size: 13px;
    color: var(--text-muted);
    min-width: 36px;
  }

  /* Application tab */

  .app-status { font-weight: 600; }
  .app-status-approved { color: #4caf50; }
  .app-status-rejected { color: #e05050; }
  .app-status-review   { color: var(--accent); }
  .app-status-pending  { color: var(--text-muted); }

  .reject-reason {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border: 1px solid #e05050;
    border-radius: 8px;
    color: var(--text-main);
  }

  .reject-reason p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
  }

  /* Stats tab */

  .stat-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 18px;
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .stat-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-main);
  }

  .stat-label {
    font-size: 13px;
    color: var(--text-muted);
  }

  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .chart-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-main);
  }

  .range-btns {
    display: flex;
    gap: 4px;
  }


  .chart-wrap {
    height: 260px;
    position: relative;
  }

  /* Payout tab */

  .payout-card {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px 24px;
    border: 1px solid #4caf50;
    border-radius: 12px;
  }

  .payout-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: #4caf50;
    color: #fff;
    font-size: 22px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .payout-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .payout-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-main);
  }

  .payout-date {
    font-size: 14px;
    color: var(--text-muted);
  }

  /* Boost tab */

  .boost-hint {
    margin: 0 0 20px;
    font-size: 14px;
    color: var(--text-muted);
  }

  .boost-form {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .boost-input {
    font-size: 15px;
    padding: 9px 14px;
    border: 1px solid var(--line);
    border-radius: 8px;
    outline: none;
    letter-spacing: 0.05em;
    width: 200px;
    font-family: monospace;
  }

  .boost-input:focus {
    border-color: var(--accent);
  }

  .boost-btn {
    padding: 9px 20px;
    font-size: 14px;
    font-weight: 600;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .boost-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .boost-error {
    margin: 12px 0 0;
    font-size: 14px;
    color: #e05050;
  }

  .boost-until {
    margin: 0 0 20px;
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
  }

  .boost-success {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px 24px;
    border: 1px solid #4caf50;
    border-radius: 12px;
  }

  .boost-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    font-size: 22px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .boost-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .boost-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-main);
  }

  .boost-sub {
    font-size: 14px;
    color: var(--text-muted);
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

  .error {
    color: #e05050;
    font-size: 15px;
  }

  .muted {
    color: var(--text-muted);
    font-size: 15px;
  }
</style>
