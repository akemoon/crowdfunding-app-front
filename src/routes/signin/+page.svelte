<script lang="ts">
  import AuthFrame from "$lib/components/AuthFrame.svelte";
</script>

<svelte:head>
  <title>Войти</title>
</svelte:head>

<AuthFrame title="Войти">
  <p class="switch-text">
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
