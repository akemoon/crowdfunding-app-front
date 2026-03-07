<script lang="ts">
  export let title: string;
</script>

<section class="auth-page">
  <!-- TODO: update brand name when finalized -->
  <a class="auth-logo" href="/">Краудфандинг</a>
  <div class="auth-card">
    <h1>{title}</h1>
    <slot />
  </div>
  <slot name="footer" />
</section>

<style>
  .auth-page {
    width: 100%;
    max-width: 440px;
    margin: 0 auto;
    display: grid;
    gap: 14px;
    justify-items: center;
  }

  .auth-logo {
    color: var(--text-main);
    text-decoration: none;
    font-size: 20px;
    font-weight: 650;
    letter-spacing: 0.01em;
    margin-bottom: 4px;
  }

  .auth-logo:hover {
    color: var(--accent);
  }

  .auth-card {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 24px;
    background: #ffffff;
  }

  .auth-card h1 {
    margin: 0 0 20px;
    font-size: 28px;
    font-weight: 700;
    color: var(--text-main);
  }

  @media (max-width: 680px) {
    .auth-card {
      border-radius: 12px;
      padding: 18px;
    }
  }
</style>
