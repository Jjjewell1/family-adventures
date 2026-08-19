<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import InstallBanner from '$lib/components/InstallBanner.svelte';
  import { env } from '$env/dynamic/public';
  let { children, data } = $props();
  let mobileMenuOpen = $state(false);
  let isDark = $state(true);
  let oneSignalReady = $state(false);
  let isSubscribed = $state(false);

  const currentPath = $derived($page.url.pathname);

  function toggleTheme() {
    isDark = !isDark;
    document.documentElement.classList.toggle('light', !isDark);
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
    if (saved === 'light') {
      isDark = false;
      document.documentElement.classList.add('light');
    } else if (!saved) {
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      if (prefersLight) {
        isDark = false;
        document.documentElement.classList.add('light');
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
      if (saved === 'light' || (!saved && window.matchMedia('(prefers-color-scheme: light)').matches)) {
        document.documentElement.classList.add('light');
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
  <nav class="sticky top-0 z-40 glass border-b border-sand-200/50">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <a href="/" class="flex items-center gap-2">
          <img src={data.site?.logoUrl || '/logo.png'} alt="Family Adventures" class="h-8 w-8 rounded-full object-cover" />
          <span class="text-lg font-display font-semibold text-navy-600 hidden sm:block">Family Adventures</span>
        </a>

        <!-- Desktop nav -->
        <div class="hidden md:flex items-center gap-1">
          {#each [
            { href: '/adventures', label: 'Adventures' },
            { href: '/gallery', label: 'Gallery' },
            { href: '/map', label: 'Map' },
            { href: '/feed', label: 'Feed' },
            { href: '/memories', label: 'Memories' },
            { href: '/bucket-list', label: 'Bucket List' },
            { href: '/stats', label: 'Stats' },
          ] as link}
            <a href={link.href}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-colors {currentPath.startsWith(link.href) ? 'text-ocean-600 bg-ocean-50' : 'text-navy-500 hover:text-navy-600 hover:bg-sand-100'}"
            >
              {link.label}
            </a>
          {/each}
        </div>

        <!-- Right side -->
        <div class="flex items-center gap-3">
          {#if data.user}
            <a href="/adventures/create" class="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ocean-500 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              New
            </a>
            <button
              onclick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; }}
              class="text-sm text-navy-400 hover:text-navy-600 transition-colors"
            >
              Sign Out
            </button>
            <a href="/settings" class="group relative h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-coral-400 to-sunset-400 flex items-center justify-center text-white text-sm font-medium transition-all hover:ring-2 hover:ring-ocean-300 hover:ring-offset-2" title="Settings - {data.user.name}">
              {#if data.user.avatar_url}
                <img src={data.user.avatar_url} alt={data.user.name} class="h-full w-full object-cover" />
              {:else}
                {data.user.name?.charAt(0).toUpperCase() || '?'}
              {/if}
              <span class="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-sand-50 border border-sand-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg class="h-2 w-2 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
            </a>
          {:else}
            <a href="/auth/login" class="inline-flex items-center gap-1.5 rounded-full bg-ocean-500 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors">
              Sign In
            </a>
          {/if}

          <!-- Theme toggle -->
          <button
            onclick={toggleTheme}
            class="p-2 rounded-lg text-sand-300 hover:text-sand-100 hover:bg-navy-700/50 transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {#if isDark}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            {:else}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            {/if}
          </button>

          <!-- Notification bell -->
          {#if oneSignalReady && data.user}
            <button
              onclick={toggleNotifications}
              class="p-2 rounded-lg transition-colors {isSubscribed ? 'text-ocean-400 hover:text-ocean-300 hover:bg-navy-700/50' : 'text-sand-400 hover:text-sand-200 hover:bg-navy-700/50'}"
              title={isSubscribed ? 'Notifications on — tap to turn off' : 'Enable push notifications'}
            >
              {#if isSubscribed}
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
              {:else}
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              {/if}
            </button>
          {/if}

          <!-- Mobile menu button -->
          <button
            class="md:hidden p-2 rounded-lg text-navy-500 hover:bg-sand-100"
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
        <div class="md:hidden pb-4 border-t border-sand-200/50 pt-3 space-y-1">
          {#each [
            { href: '/adventures', label: 'Adventures' },
            { href: '/gallery', label: 'Gallery' },
            { href: '/map', label: 'Map' },
            { href: '/feed', label: 'Feed' },
            { href: '/memories', label: 'Memories' },
            { href: '/bucket-list', label: 'Bucket List' },
            { href: '/stats', label: 'Stats' },
          ] as link}
            <a href={link.href}
              class="block px-3 py-2 rounded-lg text-sm font-medium transition-colors {currentPath.startsWith(link.href) ? 'text-ocean-600 bg-ocean-50' : 'text-navy-500 hover:bg-sand-100'}"
              onclick={() => mobileMenuOpen = false}
            >
              {link.label}
            </a>
          {/each}
          <button onclick={toggleTheme} class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:bg-sand-100">
            {#if isDark}
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Light Mode
            {:else}
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              Dark Mode
            {/if}
          </button>
          {#if oneSignalReady && data.user}
            <button onclick={toggleNotifications} class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:bg-sand-100">
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
            <a href="/adventures/create" class="block px-3 py-2 rounded-lg text-sm font-medium text-ocean-500 hover:bg-sand-100">New Adventure</a>
            <a href="/settings" class="block px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:bg-sand-100">Settings</a>
            <button
              onclick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; }}
              class="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-navy-400 hover:bg-sand-100"
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
  <footer class="border-t border-sand-200/50 bg-sand-50/50 mt-auto">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-navy-400">
        <div class="flex items-center gap-2">
          <img src={data.site?.logoUrl || '/logo.png'} alt="Family Adventures" class="h-5 w-5 rounded-full object-cover" />
          <span>Family Adventures</span>
        </div>
        <div class="flex items-center gap-4">
          <a href="/adventures" class="hover:text-navy-600 transition-colors">Adventures</a>
          <a href="/gallery" class="hover:text-navy-600 transition-colors">Gallery</a>
          <a href="/feed" class="hover:text-navy-600 transition-colors">Feed</a>
          <a href="/map" class="hover:text-navy-600 transition-colors">Map</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Decorative sun -->
  <div class="fixed top-20 right-8 pointer-events-none z-0 opacity-50 hidden lg:block" aria-hidden="true">
    <div class="relative">
      <div class="h-28 w-28 rounded-full bg-gradient-to-br from-sunset-300 via-sunset-400 to-coral-400 blur-sm"></div>
      <div class="absolute inset-2 rounded-full bg-gradient-to-br from-sunset-200 via-sunset-300 to-coral-300 opacity-90"></div>
      <div class="absolute inset-0 rounded-full animate-pulse" style="animation-duration: 4s;">
        <div class="absolute -inset-8 rounded-full bg-sunset-300/30 blur-2xl"></div>
      </div>
    </div>
  </div>

  <!-- Decorative fixed waves -->
  <div class="fixed bottom-0 left-0 right-0 pointer-events-none z-0" aria-hidden="true">
    <svg class="w-full" viewBox="0 0 1440 180" preserveAspectRatio="none" style="height: 120px;">
      <path class="fixed-wave-1" d="M0,120 C240,160 480,60 720,100 C960,140 1200,80 1440,120 L1440,180 L0,180Z" fill="rgba(14,124,123,0.12)" />
      <path class="fixed-wave-2" d="M0,140 C360,180 600,80 840,120 C1080,160 1320,100 1440,140 L1440,180 L0,180Z" fill="rgba(26,166,166,0.08)" />
      <path class="fixed-wave-3" d="M0,155 C180,170 420,130 660,150 C900,170 1140,135 1440,155 L1440,180 L0,180Z" fill="rgba(77,184,184,0.06)" />
    </svg>
  </div>

  <!-- PWA Install Banner -->
  <InstallBanner />
</div>
