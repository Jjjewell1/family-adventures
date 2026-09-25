<script module lang="ts">
  export type PtrStatus = 'idle' | 'armed' | 'refreshing' | 'done';
</script>

<script lang="ts">
  /**
   * iOS UIRefreshControl-style pull-to-refresh for a scroll container.
   *
   * The gesture rides on native overscroll — `.scroll-y` sets
   * `overscroll-behavior-y: contain` so the document never bounces — so nothing
   * here competes with the browser's own momentum scrolling.
   *
   * Refresh is also reachable by keyboard and screen reader through a real
   * button, so it is never gesture-only.
   */
  import type { Snippet } from 'svelte';
  import { browser } from '$app/environment';
  import Icon from './Icon.svelte';

  type Props = {
    onrefresh: () => Promise<void> | void;
    disabled?: boolean;
    label?: string;
    children: Snippet;
  };

  let { onrefresh, disabled = false, label = 'Pull to refresh', children }: Props = $props();

  const TRIGGER = 64;
  const HOLD = 52;

  const INITIAL: PtrStatus = 'idle';

  let status = $state<PtrStatus>(INITIAL);
  let pull = $state(0);
  let startY = 0;
  let tracking = false;
  let scroller = $state<HTMLElement | null>(null);

  let effective = $derived<PtrStatus>(disabled ? 'idle' : status);
  let height = $derived<number>(status === 'refreshing' || status === 'done' ? HOLD : pull);

  function reducedMotion() {
    return browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  async function run() {
    if (disabled || status === 'refreshing') return;
    status = 'refreshing';
    pull = HOLD;
    try {
      await onrefresh();
    } finally {
      status = 'done';
      setTimeout(() => {
        status = 'idle';
        pull = 0;
      }, 600);
    }
  }

  function onTouchStart(event: TouchEvent) {
    if (disabled || status === 'refreshing') return;
    // Only claim the gesture at the very top of the list, like the real control.
    if ((scroller?.scrollTop ?? 0) > 0) return;
    startY = event.touches[0].clientY;
    tracking = true;
  }

  function onTouchMove(event: TouchEvent) {
    if (!tracking) return;
    const distance = event.touches[0].clientY - startY;
    if (distance <= 0) {
      pull = 0;
      status = 'idle';
      return;
    }
    // Resistance past the trigger so the control never runs away with the gesture.
    pull = distance * (distance > TRIGGER ? 0.35 : 0.6);
    status = pull >= TRIGGER * 0.6 ? 'armed' : 'idle';
  }

  function onTouchEnd() {
    if (!tracking) return;
    tracking = false;
    if (status === 'armed') void run();
    else {
      status = 'idle';
      pull = 0;
    }
  }
</script>

<div class="relative">
  <div class="ptr" data-state={effective} style:--ptr-pull="{height}px">
    {#if effective === 'refreshing'}
      <span
        class="inline-block size-4 rounded-full border-2 border-[var(--accent-action)] border-t-transparent"
        class:animate-spin={!reducedMotion()}
        aria-hidden="true"
      ></span>
      <span>Refreshing</span>
    {:else if effective === 'done'}
      <Icon name="check" size={16} />
      <span>Up to date</span>
    {:else}
      <Icon name="chevron-down" size={16} />
      <span>{effective === 'armed' ? 'Release to refresh' : label}</span>
    {/if}
  </div>

  <button
    type="button"
    class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-[var(--surface-elevated)] focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
    onclick={run}
    disabled={disabled}
  >
    Refresh
  </button>

  <!-- role=region + label so the scrollable area is a landmark screen readers can
       jump to; the touch handlers only observe native overscroll, they add no
       semantics of their own. -->
  <div
    class="scroll-y"
    role="region"
    aria-label="Scrollable content"
    tabindex="-1"
    bind:this={scroller}
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
    ontouchcancel={onTouchEnd}
  >
    {@render children()}
  </div>
</div>
