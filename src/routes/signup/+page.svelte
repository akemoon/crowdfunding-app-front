<script lang="ts">
  import { goto } from '$app/navigation';
  import AuthFrame from '$lib/components/AuthFrame.svelte';
  import { signup } from '$lib/api';
  import { validateEmail, validateUsername, validatePassword } from '$lib/validate';

  let email = '';
  let username = '';
  let password = '';
  let loading = false;
  let fieldErrors: Record<string, string> = {};
  let generalError = '';

  async function handleSubmit() {
    loading = true;
    fieldErrors = {};
    generalError = '';

    const emailErr = validateEmail(email);
    const usernameErr = validateUsername(username);
    const passwordErr = validatePassword(password);

    if (emailErr || usernameErr || passwordErr) {
      if (emailErr) fieldErrors.email = emailErr;
      if (usernameErr) fieldErrors.username = usernameErr;
      if (passwordErr) fieldErrors.password = passwordErr;
      loading = false;
      return;
    }

    const err = await signup({ email, username, password });

    if (!err) {
      goto('/signin');
      return;
    }

    console.error('[signup]', err.code, err.message);
    if (err.code === 'validation_error' && err.fields) {
      fieldErrors = err.fields;
    } else if (err.code === 'email_exists') {
      fieldErrors = { email: 'Email уже зарегистрирован' };
    } else if (err.code === 'username_exists') {
      fieldErrors = { username: 'Имя пользователя уже занято' };
    } else {
      generalError = 'Произошла ошибка. Попробуйте позже.';
    }

    loading = false;
  }
</script>

<svelte:head>
  <title>Зарегистрироваться</title>
</svelte:head>

<AuthFrame title="Зарегистрироваться">
  <form class="form-fields" on:submit|preventDefault={handleSubmit}>
    <div class="field">
      <label for="email">Email</label>
      <input
        id="email"
        type="email"
        bind:value={email}
        class:invalid={!!fieldErrors.email}
        autocomplete="email"
        required
      />
      {#if fieldErrors.email}
        <span class="field-error">{fieldErrors.email}</span>
      {:else}
        <span class="field-hint">Например: ivan@example.com</span>
      {/if}
    </div>

    <div class="field">
      <label for="username">Имя пользователя</label>
      <input
        id="username"
        type="text"
        bind:value={username}
        class:invalid={!!fieldErrors.username}
        autocomplete="username"
        required
      />
      {#if fieldErrors.username}
        <span class="field-error">{fieldErrors.username}</span>
      {:else}
        <span class="field-hint">Буквы a–z, цифры и дефис. От 3 до 32 символов.</span>
      {/if}
    </div>

    <div class="field">
      <label for="password">Пароль</label>
      <input
        id="password"
        type="password"
        bind:value={password}
        class:invalid={!!fieldErrors.password}
        autocomplete="new-password"
        required
      />
      {#if fieldErrors.password}
        <span class="field-error">{fieldErrors.password}</span>
      {:else}
        <span class="field-hint">Минимум 12 символов, строчная и заглавная буква, цифра.</span>
      {/if}
    </div>

    {#if generalError}
      <p class="form-error">{generalError}</p>
    {/if}

    <button class="btn-submit" type="submit" disabled={loading}>
      {loading ? 'Загрузка...' : 'Зарегистрироваться'}
    </button>
  </form>

  <p class="switch-text" slot="footer">
    Уже есть аккаунт?
    <a href="/signin">Войти</a>
  </p>
</AuthFrame>

<style>
  .switch-text {
    margin: 0;
    text-align: center;
    color: var(--text-muted);
    font-size: 14px;
  }

  .switch-text a {
    margin-left: 4px;
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
  }

  .switch-text a:hover {
    text-decoration: underline;
  }
</style>
