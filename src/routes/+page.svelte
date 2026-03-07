<svelte:head>
  <title>Краудфандинг</title>
</svelte:head>

<section class="hero">
  <h1 class="hero-title">Поддерживай проекты,<br />которые вдохновляют</h1>
  <p class="hero-sub">Платформа для авторов и их аудитории. Запускай идеи, собирай поддержку, воплощай задуманное.</p>
  <div class="hero-actions">
    <a class="btn-primary" href="/signup">Начать</a>
    <a class="btn-secondary" href="/projects">Смотреть проекты</a>
  </div>
</section>

<section class="features">
  <div class="feature-card">
    <span class="feature-icon">01</span>
    <h3>Создай проект</h3>
    <p>Опиши свою идею, поставь цель и запусти сбор средств за несколько минут.</p>
  </div>
  <div class="feature-card">
    <span class="feature-icon">02</span>
    <h3>Собери поддержку</h3>
    <p>Люди, которым близка твоя идея, помогут ей стать реальностью.</p>
  </div>
  <div class="feature-card">
    <span class="feature-icon">03</span>
    <h3>Воплоти задуманное</h3>
    <p>Получи средства и реализуй проект — мы сопровождаем на каждом этапе.</p>
  </div>
</section>

<style>
  .hero {
    max-width: 680px;
    margin: 40px auto 80px;
    text-align: center;
  }

  .hero-title {
    margin: 0 0 20px;
    font-size: clamp(32px, 5vw, 52px);
    font-weight: 750;
    line-height: 1.15;
    color: var(--text-main);
    letter-spacing: -0.02em;
  }

  .hero-sub {
    margin: 0 0 36px;
    font-size: 18px;
    color: var(--text-muted);
    line-height: 1.6;
  }

  .hero-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn-primary {
    padding: 12px 28px;
    background: var(--accent);
    color: #ffffff;
    border-radius: 10px;
    text-decoration: none;
    font-size: 15px;
    font-weight: 600;
    transition: opacity 0.15s;
  }

  .btn-primary:hover {
    opacity: 0.85;
  }

  .btn-secondary {
    padding: 12px 28px;
    border: 1px solid var(--line);
    border-radius: 10px;
    color: var(--text-main);
    text-decoration: none;
    font-size: 15px;
    font-weight: 500;
    transition: border-color 0.15s, color 0.15s;
  }

  .btn-secondary:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    max-width: 900px;
    margin: 0 auto;
  }

  .feature-card {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 24px;
    background: #ffffff;
  }

  .feature-icon {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.05em;
    margin-bottom: 12px;
  }

  .feature-card h3 {
    margin: 0 0 8px;
    font-size: 17px;
    font-weight: 650;
    color: var(--text-main);
  }

  .feature-card p {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.6;
  }

  @media (max-width: 680px) {
    .hero {
      margin: 24px auto 56px;
    }

    .features {
      grid-template-columns: 1fr;
    }
  }
</style>
