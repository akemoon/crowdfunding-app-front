<header class="topbar">
  <!-- TODO: update brand name when finalized -->
  <a class="brand" href="/">Краудфандинг</a>
  <a class="btn-signin" href="/signin">Войти</a>
</header>

<style>
  .topbar {
    width: min(1120px, 100%);
    margin: 0 auto;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    color: var(--text-main);
    text-decoration: none;
    font-size: 20px;
    font-weight: 650;
    letter-spacing: 0.01em;
  }

  .btn-signin {
    padding: 8px 18px;
    border: 1px solid var(--line);
    border-radius: 8px;
    color: var(--text-main);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.15s;
  }

  .btn-signin:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }

  @media (max-width: 680px) {
    .topbar {
      padding: 16px;
    }
  }
</style>
