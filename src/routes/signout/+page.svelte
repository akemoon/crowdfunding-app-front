<svelte:head>
  <title>Sign out</title>
</svelte:head>

<section class="signout-page">
  <div class="signout-card">
    <h1>Sign out</h1>
    <p>Страница выхода подготовлена. Логику выхода добавим на следующем этапе.</p>
    <a href="/signin">Вернуться к входу</a>
  </div>
</section>

<style>
  .signout-page {
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
  }

  .signout-card {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 24px;
    background: #ffffff;
  }

  .signout-card h1 {
    margin: 0 0 10px;
    font-size: 28px;
    font-weight: 700;
    color: var(--text-main);
  }

  .signout-card p {
    margin: 0 0 16px;
    font-size: 15px;
    color: var(--text-muted);
  }

  .signout-card a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
  }

  .signout-card a:hover {
    text-decoration: underline;
  }

  @media (max-width: 680px) {
    .signout-card {
      border-radius: 12px;
      padding: 18px;
    }
  }
</style>
