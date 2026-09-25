import { browser } from '$app/environment';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStored(): ThemePreference {
  if (!browser) return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

let preference = $state<ThemePreference>(readStored());
let systemDark = $state(false);

/** What the UI is actually rendering right now. */
let resolved = $derived<'light' | 'dark'>(
  preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
);

function syncDocument() {
  if (!browser) return;

  const dark = resolved === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';

  // The manifest ships one theme_color, so the live media-query pair in app.html is
  // what the browser chrome actually reads. Both have to move together.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', dark ? '#000000' : '#FBF7F0');
  }

  // iOS draws status-bar glyphs to contrast with what is behind them, and
  // black-translucent always assumes a dark scene. On the light parchment surface
  // it renders white-on-cream, so it is only correct while dark mode is active.
  const statusBar = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  statusBar?.setAttribute('content', dark ? 'black-translucent' : 'default');
}

function start() {
  if (!browser) return;

  const media = window.matchMedia(DARK_QUERY);
  systemDark = media.matches;
  media.addEventListener('change', (event) => {
    systemDark = event.matches;
  });

  const stored = localStorage.getItem(STORAGE_KEY);
  preference = stored === 'light' || stored === 'dark' ? stored : 'system';
}

export const theme = {
  get preference() {
    return preference;
  },
  get resolved() {
    return resolved;
  },
  set(next: ThemePreference) {
    preference = next;
    if (!browser) return;
    if (next === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  },
  toggle() {
    this.set(resolved === 'dark' ? 'light' : 'dark');
  },
  start
};

// Keep the DOM in step with the rune. Reading `resolved` here is the dependency,
// so this only re-runs when the effective scheme actually flips.
$effect.root(() => {
  $effect(() => {
    void resolved;
    syncDocument();
  });
});
