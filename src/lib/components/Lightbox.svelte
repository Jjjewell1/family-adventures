<script lang="ts">
  /**
   * Full-screen media lightbox with previous/next, touch swipe and keyboard.
   *
   * The swipe is hand-rolled on pointer events rather than delegated to a
   * carousel library for two reasons: the app already has a hand-rolled gesture
   * vocabulary (see SwipeBack) and adding a dependency for one component is not
   * worth the bundle. It also lets the drag share the sheet's timing tokens so
   * the flick feels native next to the action sheet.
   */
  import type { Snippet } from 'svelte';
  import { browser } from '$app/environment';
  import { pushState } from '$app/navigation';
  import { page } from '$app/state';
  import Icon from './Icon.svelte';
  import VideoThumbnail from './VideoThumbnail.svelte';

  export type LightboxItem = {
    id?: number;
    file_path: string;
    media_type?: string;
    caption?: string | null;
    ai_caption?: string | null;
    ai_tags?: string | null;
    adventure_title?: string | null;
    adventure_slug?: string | null;
    tagged_people?: string | null;
  };

  type Props = {
    items: LightboxItem[];
    index?: number;
    open?: boolean;
    onclose: () => void;
    /** Rendered under the caption — used to inject page-specific actions. */
    children?: Snippet;
  };

  let { items, index = $bindable(0), open = $bindable(false), onclose, children }: Props = $props();

  const COMMIT_RATIO = 0.18;
  const FLICK_VELOCITY = 0.45;

  let stage = $state<HTMLElement | null>(null);
  let dragX = $state(0);
  let dragging = $state(false);
  let startX = 0;
  let startY = 0;
  let startT = 0;
  let decided = false;
  let locked = false;

  let current = $derived(items[index] ?? null);
  let count = $derived(items.length);
  let hasPrev = $derived(count > 1);
  let tags = $derived.by(() => {
    if (!current?.ai_tags) return [] as string[];
    try {
      const parsed: unknown = JSON.parse(current.ai_tags);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  });

  function reducedMotion() {
    return browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function go(delta: number) {
    if (count < 2) return;
    index = (index + delta + count) % count;
  }

  function close() {
    open = false;
    onclose();
  }

  function onDown(event: PointerEvent) {
    if (count < 2 || event.pointerType === 'mouse') return;
    dragging = true;
    decided = false;
    startX = event.clientX;
    startY = event.clientY;
    startT = Date.now();
    // Capture can throw if the pointer was already released, and an exception
    // here would abort the gesture before it ever moves.
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      /* the drag still works without capture, it just stops at the element edge */
    }
  }

  function onMove(event: PointerEvent) {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        reset();
        return;
      }
      decided = true;
      locked = true;
    }

    // Resistance past the midpoint so a drag never feels like it can run away.
    const width = browser ? window.innerWidth : 1;
    const past = Math.abs(dx) > width * COMMIT_RATIO;
    dragX = dx * (past ? 0.35 : 1);
  }

  function onUp(event: PointerEvent) {
    if (!dragging) return;
    const elapsed = Math.max(1, Date.now() - startT);
    const velocity = Math.abs(dragX) / elapsed;
    const width = browser ? window.innerWidth : 1;
    const shouldAdvance = decided && (Math.abs(dragX) > width * COMMIT_RATIO || velocity > FLICK_VELOCITY);

    if (shouldAdvance) go(dragX < 0 ? 1 : -1);
    dragX = 0;
    reset();
  }

  function reset() {
    dragging = false;
    decided = false;
  }

  function onKeydown(event: KeyboardEvent) {
    if (!open) return;
    const focusable = stage
      ? Array.from(
          document
            .querySelectorAll<HTMLElement>(
              '[role="dialog"] button:not([disabled]), [role="dialog"] a[href]'
            )
        )
      : [];
    const active = document.activeElement;

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      index = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      index = count - 1;
    } else if (event.key === 'Tab' && focusable.length > 0) {
      // Focus trap: the dialog is modal, so Tab must not escape to the page
      // behind it. The stage is aria-hidden, so it is not part of the cycle.
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (active === first || !focusable.includes(active as HTMLElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function download() {
    if (!current) return;
    const url = `/api/media/image?path=${encodeURIComponent(current.file_path)}&download=1`;
    const ext = current.file_path.split('.').pop() || 'jpg';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${current.caption || current.ai_caption || 'image'}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function thumb(item: LightboxItem) {
    return `/api/media/image?path=${encodeURIComponent(item.file_path)}&w=160`;
  }

  // Route the full-size asset through the media endpoint rather than the raw
  // /uploads path: the gallery grid already does, and that route is the one
  // carrying the immutable cache header and the path validation.
  function full(item: LightboxItem) {
    return `/api/media/image?path=${encodeURIComponent(item.file_path)}`;
  }

  // A shallow history entry means the hardware/browser back button closes the
  // lightbox instead of leaving the page — the expected behaviour on a phone.
  $effect(() => {
    if (!open || !browser) return;
    pushState('', { lightbox: true });
  });

  $effect(() => {
    if (open && !page.state.lightbox) close();
  });

  $effect(() => {
    if (!browser || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => stage?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  });
</script>

<svelte:window on:keydown={onKeydown} />

{#if open && current}
  <div
    class="fixed inset-0 z-[var(--z-sheet)] flex flex-col bg-black/95 backdrop-blur-sm"
    style:padding-top="env(safe-area-inset-top)"
    style:padding-bottom="env(safe-area-inset-bottom)"
    role="dialog"
    aria-modal="true"
    aria-label={current.caption || current.ai_caption || 'Media viewer'}
  >
    <!-- Top bar -->
    <div class="flex shrink-0 items-center gap-2 px-3 py-2">
      <span class="numeric text-[0.8125rem] font-medium text-white/70">
        {index + 1} of {count}
      </span>
      <div class="ml-auto flex items-center gap-1">
        {#if current.media_type !== 'video'}
          <button
            type="button"
            onclick={download}
            class="tap pressable flex size-11 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
            aria-label="Download image"
          >
            <Icon name="download" size={22} />
          </button>
        {/if}
        <button
          type="button"
          onclick={close}
          class="tap pressable flex size-11 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
          aria-label="Close viewer"
        >
          <Icon name="close" size={24} />
        </button>
      </div>
    </div>

    <!-- Stage -->
    <div class="relative flex min-h-0 flex-1 items-center justify-center">
      <div
        class="flex min-h-0 max-h-full w-full items-center justify-center px-1"
        style:transform={dragging && dragX !== 0 ? `translateX(${dragX}px)` : undefined}
        style:transition={dragging ? 'none' : undefined}
      >
        {#if current.media_type === 'video'}
          <video
            controls
            playsinline
            class="max-h-full max-w-full rounded-[var(--radius-md)] object-contain"
            src={current.file_path}
          >
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>
        {:else}
          <img
            src={full(current)}
            alt={current.caption || current.ai_caption || 'Gallery photo'}
            class="max-h-full max-w-full rounded-[var(--radius-md)] object-contain"
            draggable="false"
          />
        {/if}
      </div>

      <!-- Swipe surface. A dedicated aria-hidden layer rather than handlers on
           the stage, so the controls above stay ordinary focusable buttons and
           the gesture is not exposed as an interactive region to screen readers;
           keyboard users get arrows and Escape from the window handler. -->
      <div
        bind:this={stage}
        class="absolute inset-0"
        style:touch-action="pan-y"
        aria-hidden="true"
        onpointerdown={onDown}
        onpointermove={onMove}
        onpointerup={onUp}
        onpointercancel={onUp}
      ></div>

      {#if hasPrev}
        <button
          type="button"
          onclick={() => go(-1)}
          class="tap pressable absolute left-1 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
          aria-label="Previous"
        >
          <Icon name="chevron-left" size={26} strokeWidth={2.25} />
        </button>
      {/if}

      {#if hasPrev}
        <button
          type="button"
          onclick={() => go(1)}
          class="tap pressable absolute right-1 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
          aria-label="Next"
        >
          <Icon name="chevron-right" size={26} strokeWidth={2.25} />
        </button>
      {/if}
    </div>

    <!-- Caption + filmstrip -->
    <div class="shrink-0 px-4 pb-2">
      {#if current.caption || current.ai_caption || current.adventure_title}
        <div class="mx-auto max-w-2xl text-center">
          {#if current.caption || current.ai_caption}
            <p class="measure mx-auto text-[0.9375rem] leading-snug text-white">
              {current.caption || current.ai_caption}
            </p>
          {/if}
          {#if current.adventure_title && current.adventure_slug}
            <p class="mt-1 text-[0.8125rem] text-white/60">
              from
              <a href="/adventures/{current.adventure_slug}" class="text-[var(--accent-action)] hover:underline">
                {current.adventure_title}
              </a>
            </p>
          {/if}
          {#if tags.length > 0}
            <div class="mt-2 flex flex-wrap justify-center gap-1.5">
              {#each tags as tag (tag)}
                <span class="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/75">{tag}</span>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      {#if count > 1}
        <div class="scroll-y mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Media">
          {#each items as item, i (item.id ?? item.file_path)}
            <button
              type="button"
              onclick={() => (index = i)}
              class="tap relative h-14 w-14 shrink-0 snap-center overflow-hidden rounded-[var(--radius-sm)] border-2 transition-colors {i === index
                ? 'border-white'
                : 'border-transparent opacity-50 hover:opacity-80'}"
              role="tab"
              aria-selected={i === index}
              aria-label="Image {i + 1}"
            >
              {#if item.media_type === 'video'}
                <VideoThumbnail src={item.file_path} alt="" class="size-full object-cover" />
              {:else}
                <img src={thumb(item)} alt="" class="size-full object-cover" loading="lazy" />
              {/if}
            </button>
          {/each}
        </div>
      {/if}

      {#if children}
        <div class="mt-2 flex justify-center gap-2">
          {@render children()}
        </div>
      {/if}
    </div>
  </div>
{/if}
