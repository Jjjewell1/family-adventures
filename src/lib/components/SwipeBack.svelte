<script lang="ts">
  /**
   * Interactive edge-swipe-back, the gesture iOS users reach for instead of the
   * browser's own back affordance.
   *
   * The handlers live on a dedicated 20px edge strip rather than on the content
   * wrapper. That keeps carousels, text selection, and the Leaflet map on /map
   * completely untouched, and means the gesture can only ever start where a user
   * expects it to. `touch-action: pan-y` stops the browser from firing its own
   * back-swipe and overscroll underneath us.
   */
  import type { Snippet } from 'svelte';
  import { browser } from '$app/environment';

  type Props = {
    enabled?: boolean;
    children: Snippet;
  };

  let { enabled = true, children }: Props = $props();

  const EDGE = 20;
  const COMMIT_RATIO = 0.5;
  const COMMIT_DISTANCE = 500;

  let progress = $state(0);
  let dragging = $state(false);
  let startX = 0;
  let startY = 0;
  let pointerId = -1;
  let decided = false;

  let offset = $derived(browser && dragging ? window.innerWidth * progress * 0.4 : 0);

  function onPointerDown(event: PointerEvent) {
    if (!enabled || !browser) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    dragging = true;
    decided = false;
    startX = event.clientX;
    startY = event.clientY;
    pointerId = event.pointerId;
    // See the note in Lightbox: capture can throw on an already-released
    // pointer, and that must not abort the gesture.
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      /* the drag still works without capture */
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || event.pointerId !== pointerId) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!decided) {
      // Axis lock: a mostly-vertical drag belongs to the page, not to us.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        reset();
        return;
      }
      decided = true;
    }

    progress = Math.max(0, Math.min(1, dx / (window.innerWidth * COMMIT_RATIO)));
  }

  function onPointerUp() {
    if (!dragging) return;
    const shouldGoBack = decided && (progress >= COMMIT_RATIO || offset >= COMMIT_DISTANCE);
    reset();
    if (shouldGoBack) window.history.back();
  }

  function reset() {
    dragging = false;
    decided = false;
    progress = 0;
  }
</script>

<div
  class="relative transition-transform duration-200 ease-out"
  style:transform={dragging && progress > 0 ? `translateX(${offset}px)` : undefined}
  style:transition={dragging ? 'none' : undefined}
>
  <div
    class="pointer-events-none fixed inset-0 z-30 bg-black"
    style:opacity={progress * 0.28}
    aria-hidden="true"
  ></div>

  <div
    class="fixed inset-y-0 left-0 z-40"
    style:width="{EDGE}px"
    style:touch-action="pan-y"
    role="presentation"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  ></div>

  {@render children()}
</div>
