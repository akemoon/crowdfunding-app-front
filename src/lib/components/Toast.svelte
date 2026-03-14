<script lang="ts">
  export type ToastType = 'success' | 'error';

  export interface ToastItem {
    id:      number;
    message: string;
    type:    ToastType;
  }

  export let toasts: ToastItem[] = [];

  // Show a toast and auto-dismiss after `duration` ms
  export function show(message: string, type: ToastType = 'success', duration = 3000) {
    const id = Date.now();
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
    }, duration);
  }
</script>

<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast {toast.type}">
      {toast.message}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 1000;
  }

  .toast {
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    max-width: 320px;
  }

  .toast.success {
    background: #2d8a4e;
  }

  .toast.error {
    background: #e05252;
  }
</style>
