<script lang="ts">
  /**
   * Coach-mark tour — spotlights one element at a time and explains it in a card.
   * Steps may navigate between surfaces, so a step carries an optional href that is
   * visited before its target is measured.
   */
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import Icon from './Icon.svelte';

  export type TourStep = {
    id: string;
    title: string;
    body: string;
    /** CSS selector to spotlight. Omit to centre the card with no spotlight. */
    target?: string;
    /** Visited before measuring target, so a step can span surfaces. */
    href?: string;
  };

  type Props = {
    open: boolean;
    steps: TourStep[];
    /** Fired on finish or skip, so the caller can record that it was seen. */
    ondone: () => void;
  };

  let { open, steps, ondone }: Props = $props();

  let index = $state(0);
  let panel = $state<HTMLDivElement | null>(null);
  let rect = $state<DOMRect | null>(null);
  const bodyId = `tour-body-${Math.random().toString(36).slice(2, 9)}`;

  let step = $derived(steps[index]);
  let isLast = $derived(index === steps.length - 1);

  function reducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // A responsive layout often renders the same anchor twice — a mobile and a
  // desktop variant, one of which is display:none. querySelector would happily
  // return the hidden one and spotlight a zero-size rect, so pick the first
  // candidate that actually occupies space.
  function findTarget(selector: string): DOMRect | null {
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return r;
    }
    return null;
  }

  function measure() {
    if (typeof document === 'undefined') return;
    const selector = step?.target;
    rect = selector ? findTarget(selector) : null;
  }

  // A step's target may not exist on arrival: the page has to hydrate, and a
  // previous step may still be swapping the route. Poll briefly, then give up and
  // fall back to a centred card rather than stranding the tour on a blank screen.
  async function settle() {
    const selector = step?.target;
    if (!selector) {
      rect = null;
      return;
    }
    for (let i = 0; i < 25; i++) {
      const found = findTarget(selector);
      if (found) {
        rect = found;
        return;
      }
      await new Promise((r) => setTimeout(r, 40));
    }
    rect = null;
  }

  async function goToStep(next: number) {
    const target = steps[next];
    if (!target) return;
    index = next;
    if (target.href && target.href !== page.url.pathname) {
      await goto(target.href);
    }
    await settle();
  }

  function next() {
    if (isLast) {
      ondone();
      return;
    }
    void goToStep(index + 1);
  }

  function back() {
    if (index === 0) return;
    void goToStep(index - 1);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      ondone();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      back();
    }
    if (event.key === 'Tab' && panel) {
      const focusable = panel.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    }
  }

  $effect(() => {
    if (!open) return;
    index = 0;
    // settle() reads `step`, which is derived from `index`. Without untrack the
    // effect would depend on its own write and re-run, resetting the tour to step
    // one the moment Next was pressed.
    untrack(() => void settle());
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => panel?.querySelector<HTMLElement>('button')?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  });

  // The spotlight is measured against the viewport, so it has to be recomputed
  // whenever the page underneath moves.
  $effect(() => {
    if (!open) return;
    const onChange = () => untrack(() => measure());
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  });
</script>

<svelte:window on:keydown={open ? onKeydown : undefined} />

{#if open && step}
  <div class="fixed inset-0 z-[var(--z-overlay)]" role="presentation">
    <button
      type="button"
      class="absolute inset-0 cursor-default"
      style="background: rgba(0, 0, 0, 0.62)"
      aria-label="Skip tour"
      tabindex="-1"
      onclick={ondone}
    ></button>

    {#if rect}
      <div
        class="pointer-events-none absolute transition-all duration-300"
        style="
          left: {rect.left - 6}px;
          top: {rect.top - 6}px;
          width: {rect.width + 12}px;
          height: {rect.height + 12}px;
          border-radius: 18px;
          box-shadow: 0 0 0 4px var(--accent-action);
        "
        aria-hidden="true"
      ></div>
    {/if}

    <div
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby={bodyId}
      class="absolute left-1/2 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2"
      style={rect
        ? `top: ${Math.min(Math.max(16, rect.bottom + 16), (typeof window !== 'undefined' ? window.innerHeight : 800) - 232)}px`
        : 'top: 50%; transform: translate(-50%, -50%)'}
    >
      <div class="card-flat p-5 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <h2 id="tour-title" class="text-base font-semibold text-ink-700 dark:text-cream-100">
            {step.title}
          </h2>
          <button
            type="button"
            class="-m-1 rounded-full p-1 text-ink-500 hover:bg-cream-100 dark:hover:bg-forest-900"
            aria-label="Skip tour"
            onclick={ondone}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <p id={bodyId} class="mt-2 text-sm text-ink-600 dark:text-cream-300">{step.body}</p>

        <div class="mt-4 flex items-center justify-between gap-3">
          <span class="text-xs text-ink-500 dark:text-cream-400">
            {index + 1} of {steps.length}
          </span>
          <div class="flex items-center gap-2">
            {#if index > 0}
              <button type="button" class="btn-secondary text-xs" onclick={back}>Back</button>
            {/if}
            <button type="button" class="btn-primary text-xs" onclick={next}>
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
