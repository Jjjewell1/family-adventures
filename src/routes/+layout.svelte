<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import InstallBanner from '$lib/components/InstallBanner.svelte';
  import Chatbot from '$lib/components/Chatbot.svelte';
  import { env } from '$env/dynamic/public';
  let { children, data } = $props();
  let moreOpen = $state(false);
  let isDark = $state(false);
  let scrolled = $state(false);
  let oneSignalReady = $state(false);
  let isSubscribed = $state(false);

  const currentPath = $derived($page.url.pathname);

  const primaryNav = [
    { href: '/adventures', label: 'Adventures' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/map', label: 'Map' },
    { href: '/people', label: 'People' },
  ];
  const moreNav = [
    { href: '/feed', label: 'Feed' },
    { href: '/memories', label: 'Memories' },
    { href: '/bucket-list', label: 'Bucket List' },
    { href: '/stats', label: 'Stats' },
  ];
  const bottomNav = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/adventures', label: 'Adventures', icon: 'compass' },
    { href: '/map', label: 'Map', icon: 'pin' },
    { href: '/gallery', label: 'Gallery', icon: 'photo' },
  ];

  function isActive(href: string) {
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  }

  function iconFor(name: string) {
    const paths: Record<string, { d: string; fill?: boolean }> = {
      home: { d: 'M3 10.5L12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5' },
      compass: { d: 'M9 9l10.5-5.5L14 14 3.5 19.5 9 9z' },
      pin: { d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z' },
      photo: { d: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
      bell: { d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
      bellFilled: { d: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z', fill: true },
      theme: { d: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
      moon: { d: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
      plus: { d: 'M12 4v16m8-8H4' },
      more: { d: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z' },
    };
    return paths[name] || paths.home;
  }

  // Keep the browser theme-color bar in sync with the active theme
  $effect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#1E1A15' : '#3B6F54');
  });

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

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  onMount(() => {
    const onScroll = () => { scrolled = window.scrollY > 8; };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    setupAuroraParallax();
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

    // Service worker is registered automatically by @vite-pwa/sveltekit.

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

    return () => window.removeEventListener('scroll', onScroll);
  });

  // Gentle parallax drift on the background blobs, reacting to the mouse
  // position and current scroll depth. Respects reduced-motion preference.
  function setupAuroraParallax() {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const blobs = Array.from(document.querySelectorAll<HTMLElement>('.aurora-blob'));
    if (blobs.length === 0) return;

    let targetX = 0, targetY = 0, scrollY = 0;
    let currentX = 0, currentY = 0, currentScroll = 0;
    let raf = 0;

    const onMouse = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => { scrollY = window.scrollY; };

    const tick = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      currentScroll += (scrollY - currentScroll) * 0.08;

      blobs.forEach((b, i) => {
        if (!b) return;
        const depth = (i + 1) * 0.5;
        const tx = currentX * 16 * depth;
        const ty = currentY * 10 * depth + currentScroll * 0.08 * depth;
        b.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
      });
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    tick();

    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }
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
  <!-- Warm topographic backdrop (decorative, behind all content) -->
  <div class="aurora" aria-hidden="true">
    <div class="aurora-blob aurora-blob-1">
      <div class="aurora-blob-inner"></div>
    </div>
    <div class="aurora-blob aurora-blob-2">
      <div class="aurora-blob-inner"></div>
    </div>
    <div class="aurora-blob aurora-blob-3">
      <div class="aurora-blob-inner"></div>
    </div>
  </div>

  <!-- Floating navigation (desktop only — mobile uses the bottom tab bar) -->
  <header class="safe-top sticky top-0 hidden lg:block {moreOpen ? 'z-[80]' : 'z-40'}">
    <div class="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-3 pb-2">
      <nav class="glass-strong rounded-2xl px-3 sm:px-4 transition-shadow duration-300 {scrolled ? 'shadow-[0_12px_40px_rgba(62,48,32,0.16)]' : 'shadow-[0_4px_16px_rgba(62,48,32,0.06)]'}">
        <div class="flex h-14 items-center justify-between gap-3">
          <a href="/" class="flex items-center gap-2.5 shrink-0">
            <img src={data.site?.logoUrl || '/logo.png'} alt="Family Adventures" class="h-8 w-8 rounded-xl object-cover ring-2 ring-white/60" />
            <span class="text-base font-display font-bold text-ink-800 hidden sm:block dark:text-cream-100">Family Adventures</span>
          </a>

          <!-- Desktop nav -->
          <div class="hidden lg:flex items-center gap-0.5">
            {#each primaryNav as link}
              <a href={link.href} class="nav-link {isActive(link.href) ? 'active' : ''}">
                {link.label}
              </a>
            {/each}
            <div class="relative">
              <button
                class="nav-link flex items-center gap-1 {moreNav.some(l => isActive(l.href)) ? 'active' : ''}"
                onclick={() => moreOpen = !moreOpen}
                aria-haspopup="true"
                aria-expanded={moreOpen}
              >
                More
                <svg class="h-3 w-3 transition-transform {moreOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {#if moreOpen}
                <div class="absolute right-0 top-full mt-2 w-52 rounded-2xl glass-strong p-1.5 shadow-2xl animate-in">
                  {#each moreNav as link}
                    <a href={link.href} class="nav-link block {isActive(link.href) ? 'active' : ''}" onclick={() => moreOpen = false}>
                      {link.label}
                    </a>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <!-- Right side -->
          <div class="flex items-center gap-1 sm:gap-2">
            {#if data.user}
              <a href="/adventures/create" class="btn-primary hidden min-[500px]:inline-flex text-xs px-3.5 sm:px-4">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                New
              </a>
            {/if}

            {#if oneSignalReady && data.user}
              <button
                onclick={toggleNotifications}
                class="p-2 rounded-xl transition-colors {isSubscribed ? 'text-forest-500 bg-forest-500/10 hover:bg-forest-500/15' : 'text-ink-400 hover:text-ink-600 hover:bg-cream-100 dark:text-ink-300 dark:hover:bg-ink-800'}"
                title={isSubscribed ? 'Notifications on' : 'Enable push notifications'}
              >
                <svg class="h-4 w-4" fill="{isSubscribed ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isSubscribed ? iconFor('bellFilled').d : iconFor('bell').d} />
                </svg>
              </button>
            {/if}

            {#if data.user}
              <a href="/settings" class="group h-8 w-8 rounded-full overflow-hidden bg-forest-500 flex items-center justify-center text-white text-xs font-semibold transition-all hover:ring-2 hover:ring-forest-400 hover:ring-offset-1 dark:hover:ring-offset-ink-900" title="Settings - {data.user.name}">
                {#if data.user.avatar_url}
                  <img src={data.user.avatar_url} alt={data.user.name} class="h-full w-full object-cover" />
                {:else}
                  {data.user.name?.charAt(0).toUpperCase() || '?'}
                {/if}
              </a>
            {/if}

            <button
              onclick={toggleTheme}
              class="p-2 rounded-xl text-ink-400 hover:text-ink-600 hover:bg-cream-100 transition-colors dark:text-ink-300 dark:hover:text-cream-200 dark:hover:bg-ink-800"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isDark ? iconFor('theme').d : iconFor('moon').d} />
              </svg>
            </button>

            {#if data.user}
              <button
                onclick={signOut}
                class="hidden sm:inline text-xs font-medium text-ink-400 hover:text-ink-600 transition-colors dark:text-ink-300 dark:hover:text-cream-200"
              >
                Sign Out
              </button>
            {:else}
              <a href="/auth/login" class="btn-primary text-xs px-3.5 hidden min-[420px]:inline-flex">Sign In</a>
            {/if}

            <!-- Mobile "More" trigger -->
            <button
              class="lg:hidden p-2 rounded-xl text-ink-500 hover:bg-cream-100 dark:hover:bg-ink-800"
              onclick={() => moreOpen = !moreOpen}
              aria-label="More menu"
              aria-expanded={moreOpen}
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconFor('more').d} />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </div>
  </header>

  {#if moreOpen}
    <!-- Click-outside / backdrop for the More menu -->
    <button type="button" tabindex="-1" aria-hidden="true" class="fixed inset-0 z-[60] lg:hidden" onclick={() => moreOpen = false}></button>
  {/if}

  <!-- Main content -->
  <main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pt-8 pt-[max(2rem,env(safe-area-inset-top))] pb-32 lg:pb-12">
    {@render children()}
  </main>

  <!-- Footer -->
  <footer class="border-t border-cream-200 mt-auto dark:border-ink-700 hidden lg:block">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-400 dark:text-ink-300">
        <div class="flex items-center gap-2">
          <img src={data.site?.logoUrl || '/logo.png'} alt="Family Adventures" class="h-4 w-4 rounded object-cover" />
          <span class="font-medium text-ink-500 dark:text-cream-300">Family Adventures</span>
          <span class="hidden sm:inline">— the stories, places, and people we love.</span>
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

  <!-- Mobile bottom tab bar (flush, premium glass) -->
  <nav class="lg:hidden fixed inset-x-0 bottom-0 z-50" aria-label="Main navigation">
    <div class="glass-strong border-t border-cream-200/50 dark:border-ink-700/50 shadow-[0_-8px_30px_rgba(30,26,21,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.25)] overflow-visible">
      <div class="mx-auto max-w-lg flex items-end justify-around px-1 pt-2 pb-[max(6px,env(safe-area-inset-bottom))]">
        {#each bottomNav as item}
          <a href={item.href}
            class="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all duration-200 {isActive(item.href) ? 'bg-forest-500/10 text-forest-600 dark:text-forest-300 font-semibold' : 'text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-cream-200'}"
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            <svg class="h-[22px] w-[22px]" fill="none" stroke="currentColor" stroke-width={isActive(item.href) ? '2.2' : '1.6'} viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d={iconFor(item.icon).d} />
            </svg>
            <span class="text-[10px] leading-none">{item.label}</span>
          </a>
        {/each}

        {#if data.user}
          <a href="/adventures/create" class="relative flex flex-1 flex-col items-center -mt-4" aria-label="New adventure">
            <span class="h-12 w-12 rounded-full bg-gradient-to-br from-forest-500 via-forest-600 to-forest-700 text-white flex items-center justify-center shadow-[0_6px_25px_rgba(59,111,84,0.5)] ring-[3px] ring-cream-50 dark:ring-ink-900 transition-transform active:scale-95">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </span>
            <span class="mt-2 text-[10px] font-medium leading-none text-forest-600 dark:text-forest-300">New</span>
          </a>
        {:else}
          <a href="/auth/login" class="relative flex flex-1 flex-col items-center -mt-4" aria-label="Sign in">
            <span class="h-12 w-12 rounded-full bg-gradient-to-br from-terra-500 via-terra-600 to-terra-700 text-white flex items-center justify-center shadow-[0_6px_25px_rgba(206,80,52,0.45)] ring-[3px] ring-cream-50 dark:ring-ink-900 transition-transform active:scale-95">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 8a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2" />
              </svg>
            </span>
            <span class="mt-2 text-[10px] font-medium leading-none text-terra-600 dark:text-terra-300">Sign In</span>
          </a>
        {/if}

        <button
          onclick={() => moreOpen = !moreOpen}
          class="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all duration-200 {moreOpen ? 'bg-forest-500/10 text-forest-600 dark:text-forest-300 font-semibold' : 'text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-cream-200'}"
          aria-label="More menu"
          aria-expanded={moreOpen}
        >
          <svg class="h-[22px] w-[22px]" fill="currentColor" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconFor('more').d} />
          </svg>
          <span class="text-[10px] leading-none">More</span>
        </button>
      </div>
    </div>
  </nav>

  <!-- More sheet (mobile) -->
  {#if moreOpen}
    <div class="fixed inset-0 z-[70]">
      <button type="button" tabindex="-1" aria-hidden="true" class="absolute inset-0 bg-black/30 backdrop-blur-sm" onclick={() => moreOpen = false}></button>
      <div class="absolute inset-x-0 bottom-0 safe-bottom">
        <div class="mx-auto max-w-lg rounded-t-3xl glass-strong p-5 pb-3 shadow-2xl animate-in">
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-300 dark:bg-ink-600"></div>
          <div class="grid grid-cols-2 gap-1">
            {#each [...primaryNav.slice(3), ...moreNav, { href: '/settings', label: 'Settings' }] as link}
              <a href={link.href} class="nav-link block flex items-center gap-2 {isActive(link.href) ? 'active' : ''}" onclick={() => moreOpen = false}>
                {link.label}
              </a>
            {/each}
          </div>
          <hr class="divider my-3" />
          <div class="flex items-center justify-between gap-2">
            <button onclick={toggleTheme} class="nav-link flex items-center gap-2">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isDark ? iconFor('theme').d : iconFor('moon').d} />
              </svg>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
            {#if oneSignalReady && data.user}
              <button onclick={toggleNotifications} class="nav-link flex items-center gap-2">
                <svg class="h-4 w-4" fill="{isSubscribed ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isSubscribed ? iconFor('bellFilled').d : iconFor('bell').d} />
                </svg>
                {isSubscribed ? 'Notifications On' : 'Enable Notifications'}
              </button>
            {/if}
            {#if data.user}
              <button
                onclick={signOut}
                class="nav-link flex items-center gap-2 text-terra-600 dark:text-terra-300"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- PWA Install Banner -->
  <InstallBanner />

  <!-- AI Chat Assistant -->
  <Chatbot />
</div>