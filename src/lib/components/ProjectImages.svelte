<script lang="ts">
  import type { ProjectImage } from '$lib/api';

  export let images: ProjectImage[] = [];

  let lightboxIndex: number | null = null;

  function open(i: number) { lightboxIndex = i; }
  function close() { lightboxIndex = null; }
  function prev() { if (lightboxIndex !== null) lightboxIndex = (lightboxIndex - 1 + images.length) % images.length; }
  function next() { if (lightboxIndex !== null) lightboxIndex = (lightboxIndex + 1) % images.length; }

  function onKeydown(e: KeyboardEvent) {
    if (lightboxIndex === null) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if images.length > 0}
  <div class="thumbs">
    {#each images as img, i (img.id)}
      <button class="thumb" on:click={() => open(i)}>
        <img src={img.url} alt="Фото {i + 1}" />
      </button>
    {/each}
  </div>
{/if}

{#if lightboxIndex !== null}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="overlay" on:click={close}>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="lightbox" on:click|stopPropagation>
      <img src={images[lightboxIndex].url} alt="Фото {lightboxIndex + 1}" class="lightbox-img" />
      <button class="close" on:click={close}>×</button>
      {#if images.length > 1}
        <button class="nav nav-prev" on:click={prev}>&#8249;</button>
        <button class="nav nav-next" on:click={next}>&#8250;</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .thumb {
    width: 80px;
    height: 80px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--line);
    padding: 0;
    cursor: pointer;
    background: none;
    flex-shrink: 0;
  }

  .thumb:hover {
    border-color: var(--accent);
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* Lightbox */

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lightbox {
    position: relative;
    max-width: min(900px, 90vw);
    max-height: 90vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lightbox-img {
    max-width: 100%;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 6px;
    display: block;
  }

  .close {
    position: absolute;
    top: -14px;
    right: -14px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: #fff;
    color: var(--text-main);
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.9);
    color: var(--text-main);
    font-size: 26px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-prev { left: -52px; }
  .nav-next { right: -52px; }
</style>
