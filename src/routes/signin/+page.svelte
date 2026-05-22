<script lang="ts">
  import { goto } from '$app/navigation';
  import AuthFrame from '$lib/components/AuthFrame.svelte';
  import { signin } from '$lib/api';
  import { validateEmail } from '$lib/validate';

  let email = '';
  let password = '';
  let loading = false;
  let fieldErrors: Record<string, string> = {};
  let generalError = '';

  async function handleSubmit() {
    loading = true;
    fieldErrors = {};
    generalError = '';

    const emailErr = validateEmail(email);
    if (emailErr) {
      fieldErrors.email = emailErr;
      loading = false;
      return;
    }

    const result = await signin({ email, password });

    // ApiError has a 'code' field; SigninTokens does not
    if ('code' in result) {
      console.error('[signin]', result.code, result.message);
      if (result.code === 'invalid_credentials') {
        generalError = 'Неверный email или пароль';
      } else if (result.code === 'user_blocked') {
        generalError = 'Ваш аккаунт заблокирован.';
      } else {
        generalError = 'Произошла ошибка. Попробуйте позже.';
      }
      loading = false;
      return;
    }

    // TODO: store tokens properly (e.g. httpOnly cookie via server route)
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);

    goto('/projects');
  }
</script>

<svelte:head>
  <title>Войти</title>
</svelte:head>

<AuthFrame title="Войти">
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
      {/if}
    </div>

    <div class="field">
      <label for="password">Пароль</label>
      <input
        id="password"
        type="password"
        bind:value={password}
        class:invalid={!!fieldErrors.password}
        autocomplete="current-password"
        required
      />
    </div>

    {#if generalError}
      <p class="form-error">{generalError}</p>
    {/if}

    <button class="btn-submit" type="submit" disabled={loading}>
      {loading ? 'Загрузка...' : 'Войти'}
    </button>
  </form>

  <p class="switch-text" slot="footer">
    Нет аккаунта?
    <a href="/signup">Зарегистрироваться</a>
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
