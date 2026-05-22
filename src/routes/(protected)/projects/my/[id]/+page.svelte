<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/state';
  import { getProject, getMyApplication, getProjectStats, getPayout, boostProject, submitProject, updateProject, uploadProjectCover, uploadProjectImage, type Project, type ProjectImage, type ApiError, type Application, type ProjectStats, type Payout } from '$lib/api';
  import ProjectImages from '$lib/components/ProjectImages.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import type { ToastItem } from '$lib/components/Toast.svelte';
  import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler } from 'chart.js';

  // TODO: add a chart constructor (like Grafana) so the author can pick which charts to show

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

  const CURRENCY_SYMBOL: Record<string, string> = {
    RUB: '₽',
    USD: '$',
  };

  const STATUS_LABELS: Record<string, string> = {
    draft:    'Черновик',
    review:   'На модерации',
    active:   'Активен',
    finished: 'Завершён',
  };

  const SUBMIT_ERRORS: Record<string, string> = {
    forbidden:              'Нет доступа.',
    not_found:              'Проект не найден.',
    conflict:               'Проект уже отправлен на модерацию.',
    project_cover_required: 'Загрузите обложку перед отправкой.',
    internal_error:         'Произошла ошибка. Попробуйте позже.',
  };

  let submitting_moderation = false;

  const CATEGORIES = [
    { value: 'science',                label: 'Наука' },
    { value: 'tech',                   label: 'Технологии' },
    { value: 'architecture_and_urban', label: 'Архитектура и урбанистика' },
    { value: 'sport',                  label: 'Спорт' },
    { value: 'music',                  label: 'Музыка' },
    { value: 'art',                    label: 'Искусство' },
    { value: 'film',                   label: 'Кино' },
    { value: 'games',                  label: 'Игры' },
    { value: 'education',              label: 'Образование' },
    { value: 'food',                   label: 'Еда' },
    { value: 'fashion',                label: 'Мода' },
    { value: 'health',                 label: 'Здоровье' },
  ];

  // Edit form (draft only)
  let isEditing = false;
  let editForm = { name: '', description: '', category: '', currency: '', goalAmount: '', durationDays: '' };
  let editErrors: Record<string, string> = {};
  let editGlobalError = '';
  let editSubmitting = false;

  const EDIT_ERRORS: Record<string, string> = {
    project_exists:    'Проект с таким названием уже существует.',
    project_not_draft: 'Проект больше не является черновиком.',
    forbidden:         'Нет доступа.',
    project_not_found: 'Проект не найден.',
    internal_error:    'Произошла ошибка. Попробуйте позже.',
  };

  function startEdit() {
    if (!project) return;
    editForm = {
      name:         project.name,
      description:  project.description,
      category:     project.category,
      currency:     project.currency,
      goalAmount:   String(project.goalAmount),
      durationDays: String(project.durationDays),
    };
    editErrors = {};
    editGlobalError = '';
    isEditing = true;
  }

  async function saveEdit() {
    if (!project) return;
    editErrors = {};
    editGlobalError = '';
    const goal = parseInt(editForm.goalAmount, 10);
    const days = parseInt(editForm.durationDays, 10);
    const local: Record<string, string> = {};
    if (!editForm.name.trim())              local.name         = 'Введите название.';
    if (isNaN(goal) || goal < 1)            local.goalAmount   = 'Некорректная сумма.';
    if (isNaN(days) || days < 1 || days > 60) local.durationDays = 'От 1 до 60 дней.';
    if (Object.keys(local).length > 0) { editErrors = local; return; }

    editSubmitting = true;
    const err = await updateProject(token, project.id, {
      name:         editForm.name.trim(),
      description:  editForm.description,
      category:     editForm.category,
      currency:     editForm.currency,
      goalAmount:   goal,
      durationDays: days,
    });
    editSubmitting = false;

    if (err) {
      console.error('[updateProject]', err.code, err.message);
      if (err.code === 'validation_error' && err.fields) {
        editErrors = err.fields;
      } else {
        editGlobalError = EDIT_ERRORS[err.code] ?? 'Не удалось сохранить изменения.';
      }
      return;
    }

    project = {
      ...project,
      name:         editForm.name.trim(),
      description:  editForm.description,
      category:     editForm.category,
      currency:     editForm.currency as 'RUB' | 'USD',
      goalAmount:   goal,
      durationDays: days,
    };
    isEditing = false;
    toastComponent.show('Изменения сохранены', 'success');
  }

  // Photo upload (draft only)
  let photoInput: HTMLInputElement;
  let uploadingPhoto = false;
  const ACCEPTED_PHOTO = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  async function onPhotoInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter(f => ACCEPTED_PHOTO.includes(f.type));
    input.value = '';
    if (!files.length || !project) return;
    uploadingPhoto = true;
    const results = await Promise.all(files.map(f => uploadProjectImage(token, project!.id, f)));
    uploadingPhoto = false;
    const added = results.filter((r): r is ProjectImage => !('code' in r));
    const failed = results.filter(r => 'code' in r) as ApiError[];
    if (added.length > 0) {
      project = { ...project, images: [...(project.images ?? []), ...added] };
    }
    if (failed.length > 0) {
      console.error('[uploadProjectImage]', failed[0].code, failed[0].message);
      toastComponent.show('Не удалось загрузить фото.', 'error');
    } else {
      toastComponent.show(`Фото добавлено`, 'success');
    }
  }

  // Cover upload state (draft only)
  let coverInput: HTMLInputElement;
  let uploadingCover = false;
  const ACCEPTED_COVER = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const COVER_ERRORS: Record<string, string> = {
    unsupported_file_type: 'Неподдерживаемый формат файла.',
    project_not_draft:     'Загрузка обложки доступна только для черновика.',
    forbidden:             'Нет доступа.',
    project_not_found:     'Проект не найден.',
  };

  async function onCoverInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !project) return;
    if (!ACCEPTED_COVER.includes(file.type)) {
      toastComponent.show('Неподдерживаемый формат файла.', 'error');
      return;
    }
    uploadingCover = true;
    const res = await uploadProjectCover(token, project.id, file);
    uploadingCover = false;
    if ('code' in res) {
      console.error('[uploadProjectCover]', res.code, res.message);
      toastComponent.show(COVER_ERRORS[res.code] ?? 'Не удалось загрузить обложку.', 'error');
    } else {
      project = { ...project, coverURL: res.coverURL };
      toastComponent.show('Обложка загружена', 'success');
    }
  }

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
    forbidden:          'Нет доступа.',
    project_not_active: 'Буст доступен только для активного проекта.',
    promo_code_not_found: 'Промокод не найден.',
    project_not_found:    'Проект не найден.',
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

  let toasts: ToastItem[] = [];
  let toastComponent: Toast;

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
    Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

    const id = page.params.id ?? '';
    token = localStorage.getItem('accessToken') ?? '';

    const projRes = await getProject(id, token);
    if ('code' in projRes) {
      console.error('[project]', projRes.code, projRes.message);
      errorMsg = projRes.code === 'project_not_found'
        ? 'Проект не найден.'
        : 'Не удалось загрузить проект.';
      return;
    }
    project = projRes;

    // Re-read token in case it was refreshed by getProject
    token = localStorage.getItem('accessToken') ?? '';
    const appRes = await getMyApplication(token, id);
    if (!('code' in appRes)) {
      application = appRes;
    }
  });

  async function submitForReview() {
    if (!project) return;
    submitting_moderation = true;
    const err = await submitProject(token, project.id);
    submitting_moderation = false;
    if (err) {
      console.error('[submitProject]', err.code, err.message);
      toastComponent.show(SUBMIT_ERRORS[err.code] ?? 'Не удалось отправить на модерацию.', 'error');
    } else {
      project = { ...project, status: 'review' };
      toastComponent.show('Проект отправлен на модерацию', 'success');
    }
  }

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
      {#if project.status === 'active'}
        <button class:active={activeTab === 'boost'} on:click={() => activeTab = 'boost'}>Буст</button>
      {/if}
    </nav>

    {#if activeTab === 'project'}
      <div class="tab-content">

        {#if isEditing}
          <div class="edit-form">
            <div class="edit-field">
              <label>Название</label>
              <input type="text" maxlength="100" bind:value={editForm.name} disabled={editSubmitting} />
              {#if editErrors.name}<p class="edit-error">{editErrors.name}</p>{/if}
            </div>
            <div class="edit-field">
              <label>Описание</label>
              <textarea rows="5" maxlength="1000" bind:value={editForm.description} disabled={editSubmitting}></textarea>
              {#if editErrors.description}<p class="edit-error">{editErrors.description}</p>{/if}
            </div>
            <div class="edit-row">
              <div class="edit-field">
                <label>Категория</label>
                <select bind:value={editForm.category} disabled={editSubmitting}>
                  {#each CATEGORIES as cat}
                    <option value={cat.value}>{cat.label}</option>
                  {/each}
                </select>
                {#if editErrors.category}<p class="edit-error">{editErrors.category}</p>{/if}
              </div>
              <div class="edit-field">
                <label>Валюта</label>
                <select bind:value={editForm.currency} disabled={editSubmitting}>
                  <option value="RUB">RUB — рубль</option>
                  <option value="USD">USD — доллар</option>
                </select>
                {#if editErrors.currency}<p class="edit-error">{editErrors.currency}</p>{/if}
              </div>
            </div>
            <div class="edit-row">
              <div class="edit-field">
                <label>Цель сбора</label>
                <input type="number" min="1" bind:value={editForm.goalAmount} disabled={editSubmitting} />
                {#if editErrors.goalAmount}<p class="edit-error">{editErrors.goalAmount}</p>{/if}
              </div>
              <div class="edit-field">
                <label>Длительность (дней)</label>
                <input type="number" min="1" max="60" bind:value={editForm.durationDays} disabled={editSubmitting} />
                {#if editErrors.durationDays}<p class="edit-error">{editErrors.durationDays}</p>{/if}
              </div>
            </div>
            {#if editGlobalError}
              <p class="edit-error">{editGlobalError}</p>
            {/if}
            <div class="edit-actions">
              <button class="btn-save" on:click={saveEdit} disabled={editSubmitting}>
                {editSubmitting ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button class="btn-cancel-edit" on:click={() => isEditing = false} disabled={editSubmitting}>
                Отмена
              </button>
            </div>
          </div>
        {:else}
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
          {#if project.status === 'draft'}
            <button class="btn-secondary" on:click={startEdit}>Редактировать</button>
          {/if}
        {/if}

        {#if project.coverURL}
          <img src={project.coverURL} alt="обложка" class="cover-img" />
        {/if}
        {#if project.status === 'draft'}
          <div class="draft-media-row">
            <button type="button" class="btn-cover" on:click={() => coverInput.click()} disabled={uploadingCover}>
              {uploadingCover ? 'Загрузка...' : project.coverURL ? 'Заменить обложку' : 'Загрузить обложку'}
            </button>
            <input bind:this={coverInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="file-input-hidden" on:change={onCoverInput} />
            <button type="button" class="btn-cover" on:click={() => photoInput.click()} disabled={uploadingPhoto}>
              {uploadingPhoto ? 'Загрузка...' : 'Добавить фото'}
            </button>
            <input bind:this={photoInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple class="file-input-hidden" on:change={onPhotoInput} />
          </div>
        {/if}

        {#if project.images && project.images.length > 0}
          <ProjectImages images={project.images} />
        {/if}

        {#if project.status === 'draft'}
          <button class="btn-submit-review" on:click={submitForReview} disabled={submitting_moderation}>
            {submitting_moderation ? 'Отправка...' : 'Отправить на модерацию'}
          </button>
        {/if}
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

<Toast bind:this={toastComponent} bind:toasts />

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

  .status-draft    { border-color: #bbb; color: #888; }
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

  /* Edit form */

  .edit-form {
    display: grid;
    gap: 16px;
  }

  .edit-field {
    display: grid;
    gap: 6px;
  }

  .edit-field label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .edit-field input,
  .edit-field textarea,
  .edit-field select {
    padding: 9px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 15px;
    font-family: inherit;
    color: var(--text-main);
    background: #fff;
    outline: none;
    box-sizing: border-box;
    width: 100%;
  }

  .edit-field input:focus,
  .edit-field textarea:focus,
  .edit-field select:focus {
    border-color: var(--accent);
  }

  .edit-field textarea {
    resize: none;
  }

  .edit-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .edit-error {
    margin: 0;
    font-size: 13px;
    color: #e05050;
  }

  .edit-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .btn-save {
    padding: 9px 22px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .btn-save:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .btn-cancel-edit {
    padding: 9px 18px;
    font-size: 14px;
    font-family: inherit;
    background: none;
    border: 1px solid var(--line);
    border-radius: 8px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .btn-secondary {
    align-self: flex-start;
    padding: 7px 16px;
    font-size: 13px;
    font-family: inherit;
    background: none;
    border: 1px solid var(--line);
    border-radius: 7px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .btn-secondary:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .draft-media-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .cover-img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--line);
  }

  .btn-cover {
    padding: 7px 16px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: none;
    color: var(--text-muted);
    cursor: pointer;
  }

  .btn-cover:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .btn-cover:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .file-input-hidden {
    display: none;
  }

  .btn-submit-review {
    align-self: flex-start;
    margin-top: 8px;
    padding: 10px 22px;
    font-size: 15px;
    font-weight: 600;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .btn-submit-review:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
