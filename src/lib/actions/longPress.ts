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
  /**
   * Open the menu on right-click as well as long press. Off means the browser's
   * own context menu is left alone, which keeps "Save image as…" available.
   */
  rightClick?: boolean;
  onLongPress: (event: PointerEvent | MouseEvent) => void;
}

export function longPress(node: HTMLElement, options: LongPressOptions) {
  let opts = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let origin = { x: 0, y: 0 };
  let fired = false;

  function clear() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function fire(event: PointerEvent | MouseEvent) {
    fired = true;
    try {
      navigator.vibrate?.(12);
    } catch {
      /* vibration is a nicety, never a failure path */
    }
    opts.onLongPress(event);
  }

  function onDown(event: PointerEvent) {
    // Mouse is handled by contextmenu instead. Holding the left button down to
    // select text or drag would otherwise fire the menu.
    if (event.pointerType === 'mouse') return;

    fired = false;
    origin = { x: event.clientX, y: event.clientY };
    clear();
    timer = setTimeout(() => {
      timer = null;
      fire(event);
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

  function onContextMenu(event: MouseEvent) {
    if (opts.rightClick === false) return;
    // Only the unmodified primary gesture; ctrl/cmd-click on macOS and
    // middle-click keep whatever the platform would normally do.
    if (event.ctrlKey || event.shiftKey || event.altKey || event.button !== 2) return;
    clear();
    event.preventDefault();
    fire(event);
  }

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
