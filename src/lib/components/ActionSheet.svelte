<script lang="ts">
  /**
   * iOS action sheet — the translucent panel that rises from the bottom when a
   * row, photo, or file is long-pressed. Distinct from Sheet.svelte: an action
   * sheet is a short list of destructive-or-not commands, it is not a container
   * for arbitrary content, and on iOS it never grows taller than about half the
   * screen no matter how many rows it has.
   */
  import Icon from './Icon.svelte';
  import type { IconName } from './Icon.svelte';

  export type ActionSheetAction = {
    id: string;
    label: string;
    icon?: IconName;
    /** Renders in terracotta and is announced as destructive. */
    destructive?: boolean;
    disabled?: boolean;
    onSelect: () => void | Promise<void>;
  };

  type Props = {
    open: boolean;
    title?: string;
    message?: string;
    actions: ActionSheetAction[];
    onclose: () => void;
  };

  let { open, title, message, actions, onclose }: Props = $props();

  let panel = $state<HTMLElement | null>(null);
  let closing = $state(false);
  let busyId = $state<string | null>(null);
  let titleId = $derived(title ? `as-title-${Math.random().toString(36).slice(2, 9)}` : undefined);

  function reducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function dismiss() {
    if (closing) return;
    if (reducedMotion()) {
      onclose();
      return;
    }
    closing = true;
    setTimeout(() => {
      closing = false;
      onclose();
    }, 260);
  }

  async function choose(action: ActionSheetAction) {
    if (action.disabled || busyId) return;
    busyId = action.id;
    try {
      await action.onSelect();
    } finally {
      busyId = null;
      dismiss();
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
    }
  }

  $effect(() => {
    if (!open) {
      closing = false;
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => panel?.querySelector<HTMLElement>('button:not([disabled])')?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  });
</script>

<svelte:window on:keydown={open ? onKeydown : undefined} />

{#if open}
  <button
    type="button"
    class="sheet-scrim"
    aria-label="Close"
    tabindex="-1"
    onclick={dismiss}
  ></button>

  <div
    class="fixed inset-x-0 bottom-0 z-[var(--z-sheet)] mx-auto max-w-lg"
    style:padding-bottom="max(env(safe-area-inset-bottom), 8px)"
    style:padding-left="max(env(safe-area-inset-left), 8px)"
    style:padding-right="max(env(safe-area-inset-right), 8px)"
    class:closing
  >
    <div
      bind:this={panel}
      class="overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-elevated)]/92 backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {#if title || message}
        <div class="px-5 pt-4 pb-3 text-center">
          {#if title}
            <p id={titleId} class="text-[0.9375rem] font-semibold text-[var(--text-primary)]">{title}</p>
          {/if}
          {#if message}
            <p class="mt-0.5 text-[0.8125rem] leading-snug text-[var(--text-secondary)]">{message}</p>
          {/if}
        </div>
      {/if}

      <div class="list-group mx-2 mb-2 !rounded-[var(--radius-lg)]">
        {#each actions as action, i (action.id)}
          {#if i > 0}
            <div class="h-px bg-[var(--border-subtle)]" aria-hidden="true"></div>
          {/if}
          <button
            type="button"
            class="list-row tap justify-center text-center"
            class:opacity-50={action.disabled}
            disabled={action.disabled || busyId !== null}
            aria-disabled={action.disabled || busyId !== null}
            onclick={() => choose(action)}
          >
            <span
              class="flex min-h-[var(--tap-target)] w-full items-center justify-center gap-2 text-[1.0625rem] {action.destructive
                ? 'text-[var(--status-error)]'
                : 'text-[var(--accent-action)]'}"
            >
              {#if action.icon}
                <Icon name={action.icon} size={20} strokeWidth={2} />
              {/if}
              {#if busyId === action.id}
                <span
                  class="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                ></span>
                Working
              {:else}
                {action.label}
              {/if}
            </span>
          </button>
        {/each}
      </div>

      <button
        type="button"
        class="tap mx-2 mb-2 flex min-h-[var(--tap-target)] w-[calc(100%-1rem)] items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]/92 text-[1.0625rem] font-semibold text-[var(--accent-action)] backdrop-blur-2xl"
        onclick={dismiss}
      >
        Cancel
      </button>
    </div>
  </div>
{/if}

<style>
  .closing {
    animation: sheetDrop 260ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
  }
  @keyframes sheetDrop {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(100%); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .closing { animation: none; }
  }
</style>
