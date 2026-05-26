<script lang="ts">
  import { goto } from '$app/navigation';
  import { createProject, uploadProjectImage, uploadProjectCover, type ApiError } from '$lib/api';

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

  const CREATE_ERRORS: Record<string, string> = {
    project_exists: 'У вас уже есть проект с таким названием.',
    internal_error: 'Произошла ошибка на сервере. Попробуйте позже.',
  };

  let form = {
    name:         '',
    description:  '',
    category:     '',
    currency:     '',
    goalAmount:   '',
    durationDays: '',
  };

  let fieldErrors: Record<string, string> = {};
  let globalError = '';
  let submitting = false;

  interface Preview {
    file: File;
    url:  string;
  }

  const ACCEPTED   = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_SIZE   = 5 * 1024 * 1024;

  // Cover (single file)
  let cover: Preview | null = null;
  let coverInput: HTMLInputElement;
  let coverDragOver = false;

  function setCover(file: File) {
    if (!ACCEPTED.includes(file.type) || file.size > MAX_SIZE) return;
    if (cover) URL.revokeObjectURL(cover.url);
    cover = { file, url: URL.createObjectURL(file) };
  }

  function removeCover() {
    if (cover) URL.revokeObjectURL(cover.url);
    cover = null;
  }

  function onCoverInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) setCover(input.files[0]);
    input.value = '';
  }

  function onCoverDragOver(e: DragEvent) { e.preventDefault(); coverDragOver = true; }
  function onCoverDragLeave() { coverDragOver = false; }
  function onCoverDrop(e: DragEvent) {
    e.preventDefault();
    coverDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) setCover(file);
  }

  // Photos (multiple)
  let previews: Preview[] = [];
  let dragOver = false;
  let fileInput: HTMLInputElement;

  function addFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (!ACCEPTED.includes(file.type) || file.size > MAX_SIZE) continue;
      previews = [...previews, { file, url: URL.createObjectURL(file) }];
    }
  }

  function removePreview(index: number) {
    URL.revokeObjectURL(previews[index].url);
    previews = previews.filter((_, i) => i !== index);
  }

  function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) addFiles(input.files);
    input.value = '';
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function onDragLeave() {
    dragOver = false;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  }

  const VALID_CURRENCIES = ['RUB', 'USD'];
  const VALID_CATEGORIES = ['science', 'tech', 'architecture_and_urban', 'sport', 'music', 'art', 'film', 'games', 'education', 'food', 'fashion', 'health'];

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const nameVal = form.name.trim();
    if (nameVal !== form.name || /[\r\n]/.test(form.name) || [...form.name].length < 1 || [...form.name].length > 80)
      errors.name = 'Неверное значение';
    if ([...form.description].length > 10000)
      errors.description = 'Неверное значение';
    const goal = parseInt(form.goalAmount, 10);
    if (isNaN(goal) || goal < 1 || goal > 100_000_000)
      errors.goalAmount = 'Неверное значение';
    const days = parseInt(form.durationDays, 10);
    if (isNaN(days) || days < 1 || days > 60)
      errors.durationDays = 'Неверное значение';
    if (!VALID_CURRENCIES.includes(form.currency))
      errors.currency = 'Неизвестная валюта';
    if (!VALID_CATEGORIES.includes(form.category))
      errors.category = 'Неизвестная категория';
    fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async function submit() {
    fieldErrors = {};
    globalError = '';
    if (!validate()) return;
    submitting = true;

    const token = localStorage.getItem('accessToken') ?? '';
    const result = await createProject(token, {
      name:         form.name,
      description:  form.description,
      category:     form.category,
      currency:     form.currency,
      goalAmount:   parseInt(form.goalAmount, 10),
      durationDays: parseInt(form.durationDays, 10),
    });

    if ('code' in result) {
      submitting = false;
      const err = result as ApiError;
      console.error('[createProject]', err.code, err.message);
      if (err.code === 'validation_error' && err.fields) {
        fieldErrors = err.fields;
      } else {
        globalError = CREATE_ERRORS[err.code] ?? 'Произошла ошибка. Попробуйте позже.';
      }
      return;
    }

    const projectID = result.id;

    if (cover) {
      const coverRes = await uploadProjectCover(token, projectID, cover.file);
      if ('code' in coverRes) {
        console.error('[uploadProjectCover]', coverRes.code, coverRes.message);
      }
    }

    if (previews.length > 0) {
      const uploads = await Promise.all(
        previews.map(p => uploadProjectImage(token, projectID, p.file))
      );
      const failed = uploads.filter(r => 'code' in r).length;
      if (failed > 0) {
        console.error(`[uploadProjectImage] ${failed} of ${previews.length} failed`);
      }
    }

    goto(`/projects/my/${projectID}`);
  }
</script>

<svelte:head>
  <title>Новый проект</title>
</svelte:head>

<div class="page">
  <a class="back" href="/projects/my">← Мои проекты</a>
  <h1>Новый проект</h1>

  <form on:submit|preventDefault={submit} novalidate>
    <div class="field">
      <label for="name">Название</label>
      <input id="name" type="text" bind:value={form.name} disabled={submitting} />
      <p class="field-hint">до 80 символов</p>
      {#if fieldErrors.name}<p class="field-error">{fieldErrors.name}</p>{/if}
    </div>

    <div class="field">
      <label for="description">Описание</label>
      <textarea id="description" rows="8" bind:value={form.description} disabled={submitting}></textarea>
      <p class="field-hint">до 10 000 символов</p>
      {#if fieldErrors.description}<p class="field-error">{fieldErrors.description}</p>{/if}
    </div>

    <div class="row">
      <div class="field">
        <label for="category">Категория</label>
        <select id="category" bind:value={form.category} disabled={submitting}>
          <option value="" disabled>Выберите категорию</option>
          {#each CATEGORIES as cat}
            <option value={cat.value}>{cat.label}</option>
          {/each}
        </select>
        {#if fieldErrors.category}<p class="field-error">{fieldErrors.category}</p>{/if}
      </div>

      <div class="field">
        <label for="currency">Валюта</label>
        <select id="currency" bind:value={form.currency} disabled={submitting}>
          <option value="" disabled>Выберите валюту</option>
          <option value="RUB">RUB - рубль</option>
          <option value="USD">USD - доллар</option>
        </select>
        {#if fieldErrors.currency}<p class="field-error">{fieldErrors.currency}</p>{/if}
      </div>
    </div>

    <div class="row">
      <div class="field">
        <label for="goalAmount">Сумма сбора</label>
        <input id="goalAmount" type="number" bind:value={form.goalAmount} disabled={submitting} />
        <p class="field-hint">от 1 до 100 000 000</p>
        {#if fieldErrors.goalAmount}<p class="field-error">{fieldErrors.goalAmount}</p>{/if}
      </div>

      <div class="field">
        <label for="durationDays">Длительность (дней)</label>
        <input id="durationDays" type="number" bind:value={form.durationDays} disabled={submitting} />
        <p class="field-hint">от 1 до 60</p>
        {#if fieldErrors.durationDays}<p class="field-error">{fieldErrors.durationDays}</p>{/if}
      </div>
    </div>

    <!-- Cover upload -->
    <div class="field">
      <label>Обложка</label>
      <p class="label-optional">опционально</p>
      {#if cover}
        <div class="cover-preview-wrap">
          <img src={cover.url} alt="обложка" class="cover-preview" />
          <button type="button" class="cover-remove" on:click={removeCover} disabled={submitting}>
            Удалить обложку
          </button>
        </div>
      {:else}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="dropzone"
          class:drag-over={coverDragOver}
          on:dragover={onCoverDragOver}
          on:dragleave={onCoverDragLeave}
          on:drop={onCoverDrop}
          on:click={() => coverInput.click()}
        >
          <span class="dropzone-text">Перетащите обложку сюда или нажмите для выбора</span>
          <span class="dropzone-hint">JPEG, PNG, GIF, WebP - до 5 МБ</span>
        </div>
        <input
          bind:this={coverInput}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          class="file-input-hidden"
          on:change={onCoverInput}
          disabled={submitting}
        />
      {/if}
    </div>

    <!-- Image upload -->
    <div class="field">
      <label>Фотографии</label>
      <p class="label-optional">опционально</p>

      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="dropzone"
        class:drag-over={dragOver}
        on:dragover={onDragOver}
        on:dragleave={onDragLeave}
        on:drop={onDrop}
        on:click={() => fileInput.click()}
      >
        <span class="dropzone-text">Перетащите фото сюда или нажмите для выбора</span>
        <span class="dropzone-hint">JPEG, PNG, GIF, WebP - до 5 МБ каждая</span>
      </div>

      <input
        bind:this={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        class="file-input-hidden"
        on:change={onFileInput}
        disabled={submitting}
      />

      {#if previews.length > 0}
        <div class="previews">
          {#each previews as preview, i (preview.url)}
            <div class="preview-item">
              <img src={preview.url} alt="preview" class="preview-img" />
              <button
                type="button"
                class="preview-remove"
                on:click={() => removePreview(i)}
                disabled={submitting}
              >×</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    {#if globalError}
      <p class="global-error">{globalError}</p>
    {/if}

    <button class="btn-submit" type="submit" disabled={submitting}>
      {submitting ? 'Создание...' : 'Создать проект'}
    </button>
  </form>
</div>

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
    margin: 0 0 32px;
    font-size: 28px;
    font-weight: 700;
  }

  form {
    display: grid;
    gap: 20px;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .field {
    display: grid;
    gap: 6px;
  }

  .label-optional {
    margin: 0;
    font-size: 11px;
    font-weight: 400;
    color: var(--text-muted);
    text-transform: none;
    letter-spacing: 0;
  }

  label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  input,
  textarea,
  select {
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 15px;
    font-family: inherit;
    color: var(--text-main);
    background: #fff;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }

  input:focus,
  textarea:focus,
  select:focus {
    border-color: var(--accent);
  }

  textarea {
    resize: vertical;
  }

  /* --- Cover preview --- */

  .cover-preview-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cover-preview {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--line);
  }

  .cover-remove {
    align-self: flex-start;
    padding: 6px 14px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: none;
    font-size: 13px;
    font-family: inherit;
    color: var(--text-muted);
    cursor: pointer;
  }

  .cover-remove:hover {
    border-color: #e05252;
    color: #e05252;
  }

  /* --- Dropzone --- */

  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 28px 16px;
    border: 2px dashed var(--line);
    border-radius: 8px;
    cursor: pointer;
    background: #fff;
  }

  .dropzone.drag-over {
    border-color: var(--accent);
    background: var(--soft);
  }

  .dropzone-text {
    font-size: 14px;
    color: var(--text-muted);
  }

  .dropzone-hint {
    font-size: 12px;
    color: var(--text-muted);
    opacity: 0.7;
  }

  .file-input-hidden {
    display: none;
  }

  /* --- Previews --- */

  .previews {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 4px;
  }

  .preview-item {
    position: relative;
    width: 80px;
    height: 80px;
    flex-shrink: 0;
  }

  .preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid var(--line);
  }

  .preview-remove {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: #e05252;
    color: #fff;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .preview-remove:disabled {
    opacity: 0.55;
    cursor: default;
  }

  /* --- Errors --- */

  .field-hint {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .field-error {
    margin: 0;
    font-size: 13px;
    color: #e05252;
  }

  .global-error {
    margin: 0;
    font-size: 14px;
    color: #e05252;
  }

  /* --- Submit --- */

  .btn-submit {
    justify-self: start;
    padding: 10px 28px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }

  .btn-submit:disabled {
    opacity: 0.55;
    cursor: default;
  }
</style>
