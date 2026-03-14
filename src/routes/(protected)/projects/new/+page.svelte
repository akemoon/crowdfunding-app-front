<script lang="ts">
  import { goto } from '$app/navigation';
  import { createProject } from '$lib/api';

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

  // Per-field validation errors from backend
  let fieldErrors: Record<string, string> = {};
  let globalError = '';
  let submitting = false;

  async function submit() {
    fieldErrors  = {};
    globalError  = '';
    submitting   = true;

    const token = localStorage.getItem('accessToken') ?? '';
    const result = await createProject(token, {
      name:         form.name,
      description:  form.description,
      category:     form.category,
      currency:     form.currency,
      goalAmount:   parseInt(form.goalAmount, 10),
      durationDays: parseInt(form.durationDays, 10),
    });

    submitting = false;

    if (result === null) {
      goto('/projects/my');
      return;
    }

    console.error('[createProject]', result.code, result.message);

    if (result.code === 'validation_error' && result.fields) {
      fieldErrors = result.fields;
    } else {
      globalError = CREATE_ERRORS[result.code] ?? 'Произошла ошибка. Попробуйте позже.';
    }
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
