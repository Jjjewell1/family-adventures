<script lang="ts">
  /**
   * iOS bottom sheet with detents, rubber-band drag-to-dismiss and a focus trap.
   *
   * The panel animates on `transform` only, and the exit transition is allowed to
   * finish before the element leaves the DOM — removing it immediately would skip
   * the animation and make the sheet feel like it teleported away.
   */
  import type { Snippet } from 'svelte';
  import { browser } from '$app/environment';

  type Detent = 'medium' | 'large';

  type Props = {
    open: boolean;
    onclose: () => void;
    title?: string;
    detent?: Detent;
    children: Snippet;
  };

  let { open, onclose, title, detent = 'medium', children }: Props = $props();

  const DETENT_HEIGHT: Record<Detent, string> = {
    medium: '52dvh',
    large: '88dvh'
  };

  let panel = $state<HTMLElement | null>(null);
  let closing = $state(false);
  let dragY = $state(0);
  let dragging = $state(false);

  let titleId = $derived(`sheet-title-${Math.random().toString(36).slice(2, 9)}`);

  const reducedMotion = () =>
    browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function focusables(): HTMLElement[] {
    if (!panel) return [];
    return Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = focusables();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function requestClose() {
    if (reducedMotion()) {
      onclose();
      return;
    }
    closing = true;
    // Duration matches --dur-emphasis in app.css so JS teardown and the CSS
    // animation finish together rather than the panel vanishing mid-slide.
    setTimeout(() => {
      closing = false;
      onclose();
    }, 460);
  }

  function onGrabberPointerDown(event: PointerEvent) {
    if (reducedMotion()) return;
    dragging = true;
    dragY = 0;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onGrabberPointerMove(event: PointerEvent) {
    if (!dragging) return;
    dragY = Math.max(0, event.clientY);
  }

  function onGrabberPointerUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    if (dragY > 120) {
      onclose();
    }
    dragY = 0;
  }

  $effect(() => {
    if (!browser) return;

    if (open) {
      closing = false;
      const previous = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      // Wait for the panel to exist before moving focus into it.
      requestAnimationFrame(() => {
        const items = focusables();
        (items[0] ?? panel)?.focus();
      });
      return () => {
        document.body.style.overflow = '';
        previous?.focus?.();
      };
    }

    document.body.style.overflow = '';
  });
</script>

<svelte:window on:keydown={open ? onKeydown : undefined} />

{#if open}
  <button
    type="button"
    class="sheet-scrim"
    aria-label="Close"
    tabindex="-1"
    onclick={requestClose}
  ></button>

  <div
    class="sheet-panel"
    class:closing
    bind:this={panel}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? titleId : undefined}
    tabindex="-1"
    style:max-height={DETENT_HEIGHT[detent]}
    style:transform={dragging || closing ? `translateY(${dragY}px)` : undefined}
    style:transition={dragging ? 'none' : undefined}
  >
    <!-- Redundant pointer affordance: Escape and the scrim's Close button already
         provide accessible dismissal, so the drag handle stays out of the tree. -->
    <div
      class="sheet-grabber"
      aria-hidden="true"
      onpointerdown={onGrabberPointerDown}
      onpointermove={onGrabberPointerMove}
      onpointerup={onGrabberPointerUp}
      onpointercancel={onGrabberPointerUp}
    ></div>

    {#if title}
      <h2 id={titleId} class="px-6 pt-2 pb-3 text-center font-display text-lg font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
    {/if}

    {@render children()}
  </div>
{/if}

<style>
  .sheet-panel.closing {
    animation: sheetOut 460ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
  }
  @keyframes sheetOut {
    from { transform: translateY(0); }
    to { transform: translateY(100%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sheet-panel.closing { animation: none; }
  }
</style>
