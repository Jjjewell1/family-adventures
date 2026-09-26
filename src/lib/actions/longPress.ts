/**
 * Svelte action that turns a long press into a gesture, for touch and pen.
 *
 * Three details matter and each one exists because of a specific misfire:
 *
 * 1. Pointer events, not touch events. Touch events fire alongside the browser's
 *    own long-press behaviours (callout, magnifier, drag) and you end up fighting
 *    all three.
 * 2. The press is abandoned after 10px of movement, so scrolling the page never
 *    opens the menu.
 * 3. The click that follows a fired long press is swallowed. Without this the
 *    lightbox opens underneath the action sheet, and dismissing the sheet reveals
 *    a lightbox the user never asked for.
 */
export interface LongPressOptions {
  /** Delay in ms before the gesture fires. */
  delay?: number;
  /** Movement in px that cancels the press. */
  moveTolerance?: number;
  onLongPress: (event: PointerEvent) => void;
}

export function longPress(node: HTMLElement, options: LongPressOptions) {
  let opts = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let origin = { x: 0, y: 0 };
  let fired = false;
  // contextmenu carries a MouseEvent, which has no pointerType, so the last
  // pointerdown is the only way to know whether a right-click was preceded by
  // touch. Without this, right-click on desktop opens the sheet instead of the
  // browser menu.
  let lastPointerType = 'mouse';

  function clear() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function onDown(event: PointerEvent) {
    lastPointerType = event.pointerType;
    // Mouse users get the context menu instead; a held left-click on desktop
    // would otherwise fire on every text selection drag.
    if (event.pointerType === 'mouse') return;

    fired = false;
    origin = { x: event.clientX, y: event.clientY };
    clear();
    timer = setTimeout(() => {
      timer = null;
      fired = true;
      try {
        navigator.vibrate?.(12);
      } catch {
        /* vibration is a nicety, never a failure path */
      }
      opts.onLongPress(event);
    }, opts.delay ?? 500);
  }

  function onMove(event: PointerEvent) {
    if (!timer) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > (opts.moveTolerance ?? 10)) {
      clear();
    }
  }

  function onUp() {
    clear();
  }

  function onClick(event: MouseEvent) {
    if (!fired) return;
    fired = false;
    event.preventDefault();
    event.stopPropagation();
  }

  // Suppress the native callout so a long press does not also raise the iOS
  // text-selection UI on top of the action sheet.
  const onContextMenu = (event: Event) => {
    if (lastPointerType !== 'mouse') event.preventDefault();
  };

  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onUp);
  node.addEventListener('pointerleave', onUp);
  node.addEventListener('click', onClick, true);
  node.addEventListener('contextmenu', onContextMenu);

  return {
    update(next: LongPressOptions) {
      opts = next;
    },
    destroy() {
      clear();
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
      node.removeEventListener('pointerleave', onUp);
      node.removeEventListener('click', onClick, true);
      node.removeEventListener('contextmenu', onContextMenu);
    }
  };
}
