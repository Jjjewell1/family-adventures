<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import InstallBanner from '$lib/components/InstallBanner.svelte';
  import Chatbot from '$lib/components/Chatbot.svelte';
  import { env } from '$env/dynamic/public';
  let { children, data } = $props();
  let mobileMenuOpen = $state(false);
  let isDark = $state(false);
  let oneSignalReady = $state(false);
  let isSubscribed = $state(false);

  const currentPath = $derived($page.url.pathname);

  function toggleTheme() {
    isDark = !isDark;
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  async function toggleNotifications() {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return;

    if (isSubscribed) {
      await OneSignal.User.PushSubscription.optOut();
      isSubscribed = false;
    } else {
      const accepted = await OneSignal.Slidedown.promptPush();
      isSubscribed = accepted;
    }
  }

  onMount(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      isDark = true;
      document.documentElement.classList.add('dark');
    } else if (!saved) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        isDark = true;
        document.documentElement.classList.add('dark');
      }
    }

    // Register service worker for PWA installability
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }

    // Initialize OneSignal (deferred so it doesn't block the SW)
    const appId = env.PUBLIC_ONESIGNAL_APP_ID;
    if (appId) {
      (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
      (window as any).OneSignalDeferred.push(async function(OneSignal: any) {
        await OneSignal.init({
          appId,
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
          welcomeNotification: {
            title: 'Family Adventures',
            body: 'Notifications enabled!'
          }
        });
        oneSignalReady = true;
        isSubscribed = await OneSignal.User.PushSubscription.optedInAsync?.() ?? false;
        isSubscribed = isSubscribed || OneSignal.User.PushSubscription.optedIn;
      });
    }
  });
</script>

<svelte:head>
  <script>
    (function() {
      var saved = localStorage.getItem('theme');
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>
  <link rel="icon" type="image/png" href={data.site?.faviconUrl || '/favicon.png'} />
  <title>{data.site?.title || 'Family Adventures'}</title>
  <meta name="description" content={data.site?.description || "Our family's collection of adventures, memories, and shared moments"} />
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content={data.site?.title || 'Family Adventures'} />
  <meta property="og:description" content={data.site?.description || "Our family's collection of adventures, memories, and shared moments"} />
  <meta property="og:image" content="{data.siteUrl}{data.site?.ogImageUrl || '/og-image.png'}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content={data.site?.title || 'Family Adventures'} />
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.site?.title || 'Family Adventures'} />
  <meta name="twitter:description" content={data.site?.description || "Our family's collection of adventures, memories, and shared moments"} />
  <meta name="twitter:image" content="{data.siteUrl}{data.site?.ogImageUrl || '/og-image.png'}" />
</svelte:head>

<div class="min-h-screen flex flex-col">
  <!-- Navigation -->
  <nav class="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-cream-200 dark:bg-ink-800/95 dark:border-ink-600">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-14 items-center justify-between">
        <a href="/" class="flex items-center gap-2.5">
          <img src={data.site?.logoUrl || '/logo.png'} alt="Family Adventures" class="h-7 w-7 rounded-lg object-cover" />
          <span class="text-base font-display font-semibold text-ink-800 hidden sm:block dark:text-cream-100">Family Adventures</span>
        </a>

        <!-- Desktop nav -->
        <div class="hidden md:flex items-center gap-0.5">
          {#each [
            { href: '/adventures', label: 'Adventures' },
            { href: '/gallery', label: 'Gallery' },
            { href: '/people', label: 'People' },
            { href: '/map', label: 'Map' },
            { href: '/feed', label: 'Feed' },
            { href: '/memories', label: 'Memories' },
            { href: '/bucket-list', label: 'Bucket List' },
            { href: '/stats', label: 'Stats' },
          ] as link}
            <a href={link.href}
              class="nav-link {currentPath.startsWith(link.href) ? 'active' : ''}"
            >
              {link.label}
            </a>
          {/each}
        </div>

        <!-- Right side -->
        <div class="flex items-center gap-2">
          {#if data.user}
            <a href="/adventures/create" class="btn-primary hidden sm:inline-flex text-xs">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              New
            </a>
            <a href="/settings" class="group relative h-8 w-8 rounded-full overflow-hidden bg-forest-500 flex items-center justify-center text-white text-xs font-medium transition-all hover:ring-2 hover:ring-forest-300 hover:ring-offset-1 dark:hover:ring-offset-ink-800" title="Settings - {data.user.name}">
              {#if data.user.avatar_url}
                <img src={data.user.avatar_url} alt={data.user.name} class="h-full w-full object-cover" />
              {:else}
                {data.user.name?.charAt(0).toUpperCase() || '?'}
              {/if}
            </a>
            <button
              onclick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; }}
              class="text-xs text-ink-400 hover:text-ink-600 transition-colors dark:text-ink-300 dark:hover:text-cream-200"
            >
              Sign Out
            </button>
          {:else}
            <a href="/auth/login" class="btn-primary text-xs">Sign In</a>
          {/if}

          <!-- Theme toggle -->
          <button
            onclick={toggleTheme}
            class="p-1.5 rounded-lg text-ink-400 hover:text-ink-600 hover:bg-cream-100 transition-colors dark:text-ink-300 dark:hover:text-cream-200 dark:hover:bg-ink-700"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {#if isDark}
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            {:else}
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            {/if}
          </button>

          <!-- Notification bell -->
          {#if oneSignalReady && data.user}
            <button
              onclick={toggleNotifications}
              class="p-1.5 rounded-lg transition-colors {isSubscribed ? 'text-forest-500 hover:bg-forest-50 dark:hover:bg-forest-900' : 'text-ink-400 hover:text-ink-600 hover:bg-cream-100 dark:text-ink-300 dark:hover:bg-ink-700'}"
              title={isSubscribed ? 'Notifications on' : 'Enable push notifications'}
            >
              {#if isSubscribed}
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
              {:else}
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              {/if}
            </button>
          {/if}

          <!-- Mobile menu button -->
          <button
            class="md:hidden p-1.5 rounded-lg text-ink-500 hover:bg-cream-100 dark:hover:bg-ink-700"
            onclick={() => mobileMenuOpen = !mobileMenuOpen}
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {#if mobileMenuOpen}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              {/if}
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      {#if mobileMenuOpen}
        <div class="md:hidden pb-4 border-t border-cream-200 dark:border-ink-600 pt-3 space-y-0.5">
          {#each [
            { href: '/adventures', label: 'Adventures' },
            { href: '/gallery', label: 'Gallery' },
            { href: '/people', label: 'People' },
            { href: '/map', label: 'Map' },
            { href: '/feed', label: 'Feed' },
            { href: '/memories', label: 'Memories' },
            { href: '/bucket-list', label: 'Bucket List' },
            { href: '/stats', label: 'Stats' },
          ] as link}
            <a href={link.href}
              class="nav-link block {currentPath.startsWith(link.href) ? 'active' : ''}"
              onclick={() => mobileMenuOpen = false}
            >
              {link.label}
            </a>
          {/each}
          <hr class="divider my-2" />
          <button onclick={toggleTheme} class="nav-link flex items-center gap-2 w-full">
            {#if isDark}
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Light Mode
            {:else}
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              Dark Mode
            {/if}
          </button>
          {#if oneSignalReady && data.user}
            <button onclick={toggleNotifications} class="nav-link flex items-center gap-2 w-full">
              {#if isSubscribed}
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                Notifications On
              {:else}
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Enable Notifications
              {/if}
            </button>
          {/if}
          {#if data.user}
            <a href="/adventures/create" class="nav-link block text-forest-500" onclick={() => mobileMenuOpen = false}>New Adventure</a>
            <a href="/settings" class="nav-link block" onclick={() => mobileMenuOpen = false}>Settings</a>
            <button
              onclick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; }}
              class="nav-link block w-full text-left text-ink-400"
            >
              Sign Out
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </nav>

  <!-- Main content -->
  <main class="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-8">
    {@render children()}
  </main>

  <!-- Footer -->
  <footer class="border-t border-cream-200 mt-auto dark:border-ink-600">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-5">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-400 dark:text-ink-300">
        <div class="flex items-center gap-2">
          <img src={data.site?.logoUrl || '/logo.png'} alt="Family Adventures" class="h-4 w-4 rounded object-cover" />
          <span>Family Adventures</span>
        </div>
        <div class="flex items-center gap-4">
          <a href="/adventures" class="hover:text-ink-600 transition-colors dark:hover:text-cream-200">Adventures</a>
          <a href="/gallery" class="hover:text-ink-600 transition-colors dark:hover:text-cream-200">Gallery</a>
          <a href="/feed" class="hover:text-ink-600 transition-colors dark:hover:text-cream-200">Feed</a>
          <a href="/map" class="hover:text-ink-600 transition-colors dark:hover:text-cream-200">Map</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- PWA Install Banner -->
  <InstallBanner />

  <!-- AI Chat Assistant -->
  <Chatbot />
</div>
