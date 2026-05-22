<script lang="ts">
  import { onMount } from 'svelte';
  import { getPromocodes, type Promocode } from '$lib/api';

  let promocodes: Promocode[] = [];
  let loading = true;
  let errorMsg = '';
  let copiedCode = '';

  onMount(async () => {
    const token = localStorage.getItem('accessToken') ?? '';
    const res = await getPromocodes(token);
    loading = false;
    if ('code' in res) {
      console.error('[getPromocodes]', res.code, res.message);
      errorMsg = 'Не удалось загрузить промокоды.';
    } else {
      promocodes = res;
    }
  });

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  const TYPE_LABELS: Record<string, string> = {
    boost_project: 'Буст проекта',
  };

  function copyCode(code: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => fallbackCopy(code));
    } else {
      fallbackCopy(code);
    }
    copiedCode = code;
    setTimeout(() => { copiedCode = ''; }, 1500);
  }

  function fallbackCopy(code: string) {
    const el = document.createElement('textarea');
    el.value = code;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
</script>

<svelte:head>
  <title>Промокоды</title>
</svelte:head>

<div class="page">
  <h1>Промокоды</h1>

  {#if loading}
    <p class="muted">Загрузка...</p>
  {:else if errorMsg}
    <p class="error">{errorMsg}</p>
  {:else if promocodes.length === 0}
    <p class="muted">У вас пока нет промокодов.</p>
  {:else}
    <ul class="list">
      {#each promocodes as promo (promo.code)}
        <li class="item" class:used={promo.usedAt !== null}>
          <div class="item-left">
            <div class="code-row">
              <span class="code">{promo.code}</span>
              <button class="btn-copy" on:click={() => copyCode(promo.code)} title="Скопировать">
                {#if copiedCode === promo.code}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="2,7 5.5,10.5 12,3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                {:else}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="1" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
                    <path d="M1 5v7a1.5 1.5 0 001.5 1.5H9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  </svg>
                {/if}
              </button>
            </div>
            <span class="effect">{TYPE_LABELS[promo.type] ?? promo.type} · {promo.effectValue} дн.</span>
          </div>
          <div class="item-right">
            {#if promo.usedAt}
              <span class="badge used-badge">Использован {formatDate(promo.usedAt)}</span>
            {:else}
              <span class="badge active-badge">Активен</span>
            {/if}
            <span class="issued">Выдан {formatDate(promo.createdAt)}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .page {
    max-width: 640px;
  }

  h1 {
    margin: 0 0 28px;
    font-size: 28px;
    font-weight: 700;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: #fff;
  }

  .item.used {
    opacity: 0.6;
  }

  .item-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .code-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .code {
    font-family: monospace;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--text-main);
  }

  .btn-copy {
    padding: 2px 7px;
    font-size: 14px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
  }

  .btn-copy:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .effect {
    font-size: 13px;
    color: var(--text-muted);
  }

  .item-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  .badge {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 10px;
    border-radius: 20px;
  }

  .active-badge {
    background: #e8f5e9;
    color: #2d8a4e;
  }

  .used-badge {
    background: #f5f5f5;
    color: #9e9e9e;
  }

  .issued {
    font-size: 12px;
    color: var(--text-muted);
  }

  .muted {
    color: var(--text-muted);
    font-size: 15px;
  }

  .error {
    color: #e05252;
    font-size: 15px;
  }
</style>
