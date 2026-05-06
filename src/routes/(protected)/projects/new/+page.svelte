<script lang="ts">
  import { goto } from '$app/navigation';
  import { createProject, uploadProjectImage, type ApiError } from '$lib/api';

  const CATEGORIES = [
    { value: 'science',                label: 'Наука' },
    { value: 'tech',                   label: 'Технологии' },
    { value: 'architecture_and_urban', label: 'Архитектура и урбанистика' },
    { value: 'sport',                  label: 'Спорт' },
    { value: 'music',                  label: 'Музыка' },
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

  // Selected image files + local preview URLs
  interface Preview {
    file: File;
    url:  string;
  }
  let previews: Preview[] = [];
  let dragOver = false;
  let fileInput: HTMLInputElement;

  const ACCEPTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  function addFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (!ACCEPTED.includes(file.type)) continue;
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
  const VALID_CATEGORIES = ['science', 'tech', 'architecture_and_urban', 'sport', 'music'];

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (form.name.length < 1 || form.name.length > 100)
      errors.name = 'Некорректная длина названия';
    if (form.description.length > 1000)
      errors.description = 'Некорректная длина описания';
    const goal = parseInt(form.goalAmount, 10);
    if (isNaN(goal) || goal < 1)
      errors.goalAmount = 'Некорректная сумма цели';
    const days = parseInt(form.durationDays, 10);
    if (isNaN(days) || days < 1 || days > 60)
      errors.durationDays = 'Некорректная длительность';
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

    // Upload images in parallel, collect errors
    if (previews.length > 0) {
      const uploads = await Promise.all(
        previews.map(p => uploadProjectImage(token, projectID, p.file))
      );
      const failed = uploads.filter(r => 'code' in r).length;
      if (failed > 0) {
        console.error(`[uploadProjectImage] ${failed} of ${previews.length} failed`);
        // Still redirect — project is created, images can be managed later
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

  <form on:submit|preventDefault={submit}>
    <div class="field">
      <label for="name">Название</label>
      <input id="name" type="text" maxlength="100" bind:value={form.name} disabled={submitting} />
      {#if fieldErrors.name}<p class="field-error">{fieldErrors.name}</p>{/if}
    </div>

    <div class="field">
      <label for="description">Описание</label>
      <textarea id="description" maxlength="1000" rows="4" bind:value={form.description} disabled={submitting}></textarea>
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
          <option value="RUB">RUB — рубль</option>
          <option value="USD">USD — доллар</option>
        </select>
        {#if fieldErrors.currency}<p class="field-error">{fieldErrors.currency}</p>{/if}
      </div>
    </div>

    <div class="row">
      <div class="field">
        <label for="goalAmount">Цель сбора</label>
        <input id="goalAmount" type="number" min="1" bind:value={form.goalAmount} disabled={submitting} />
        {#if fieldErrors.goalAmount}<p class="field-error">{fieldErrors.goalAmount}</p>{/if}
      </div>

      <div class="field">
        <label for="durationDays">Длительность (дней)</label>
        <input id="durationDays" type="number" min="1" max="60" bind:value={form.durationDays} disabled={submitting} />
        {#if fieldErrors.durationDays}<p class="field-error">{fieldErrors.durationDays}</p>{/if}
      </div>
    </div>

    <!-- Image upload -->
    <div class="field">
      <label>Фотографии</label>

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
        <span class="dropzone-hint">JPEG, PNG, GIF, WebP</span>
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
    resize: none;
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
