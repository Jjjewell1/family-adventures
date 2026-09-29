<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { afterNavigate, goto } from '$app/navigation';
  import InstallBanner from '$lib/components/InstallBanner.svelte';
  import Chatbot from '$lib/components/Chatbot.svelte';
  import BeachScene from '$lib/components/BeachScene.svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import SwipeBack from '$lib/components/SwipeBack.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import type { IconName } from '$lib/components/Icon.svelte';
  import GuidedTour from '$lib/components/GuidedTour.svelte';
  import { tourSteps, readTourSeen, markTourSeen } from '$lib/tour';
  import { theme } from '$lib/theme.svelte';
  import { env } from '$env/dynamic/public';

  let { children, data } = $props();

  let moreOpen = $state(false);
  let scrolled = $state(false);
  let oneSignalReady = $state(false);
  let isSubscribed = $state(false);
  let pageReady = $state(true);
  let hasInternalHistory = $state(false);
  let tourOpen = $state(false);
  // Null until the client reads storage, so the prompt never flashes for someone
  // who already finished the tour.
  let tourSeen = $state<boolean | null>(null);
  let tourPromptDismissed = $state(false);

  const showTourPrompt = $derived(
    !data.user && tourSeen === false && !tourPromptDismissed && !tourOpen
  );

  onMount(() => {
    tourSeen = readTourSeen();
  });

  function startTour() {
    tourPromptDismissed = true;
    tourOpen = true;
  }

  function endTour() {
    tourOpen = false;
    tourSeen = true;
    markTourSeen();
  }

  const currentPath = $derived($page.url.pathname);
  const isDark = $derived(theme.resolved === 'dark');

  type NavItem = { href: string; label: string; icon: IconName };
  type NavSection = { label: string; items: NavItem[] };

  // Root destinations get an equal slot in the tab bar. Everything else lives in
  // the More sheet, which keeps the bar at the five items iOS users can actually
  // hit one-handed.
  const tabs: NavItem[] = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/adventures', label: 'Adventures', icon: 'compass' },
    { href: '/map', label: 'Map', icon: 'pin' },
    { href: '/gallery', label: 'Gallery', icon: 'photo' }
  ];

  const moreSections: NavSection[] = [
    {
      label: 'Browse',
      items: [
        { href: '/feed', label: 'Feed', icon: 'list' },
        { href: '/memories', label: 'Memories', icon: 'heart' },
        { href: '/people', label: 'People', icon: 'people' },
        { href: '/bucket-list', label: 'Bucket List', icon: 'star' }
      ]
    },
    {
      label: 'You',
      items: [
        { href: '/stats', label: 'Stats', icon: 'chart' },
        { href: '/settings', label: 'Settings', icon: 'settings' }
      ]
    }
  ];

  const isActive = (href: string) =>
    href === '/' ? currentPath === '/' : currentPath.startsWith(href);

  // Root tabs render their own large title in the scroll content, so the compact
  // bar stays hidden until the user scrolls — that is the iOS behaviour.
  const onRootSurface = $derived(tabs.some((tab) => currentPath === tab.href));
  const showCompactBar = $derived(!onRootSurface || scrolled);

  /** Best-effort label for the compact bar; pages own their own <h1>. */
  const barTitle = $derived(
    [...tabs, ...moreSections.flatMap((section) => section.items)].find((item) =>
      isActive(item.href)
    )?.label ?? 'Family Adventures'
  );

  function closeMore() {
    moreOpen = false;
  }

  function openMore() {
    moreOpen = true;
  }

  function goBack() {
    const previous = document.referrer;
    if (hasInternalHistory || (previous && new URL(previous).origin === location.origin)) {
      history.back();
      return;
    }
    const destination = currentPath.startsWith('/adventures/') ? '/adventures'
      : currentPath.startsWith('/people/') ? '/people'
      : currentPath.startsWith('/share/') ? '/'
      : '/';
    goto(destination);
  }

  async function toggleNotifications() {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return;

    if (isSubscribed) {
      await OneSignal.User.PushSubscription.optOut();
      isSubscribed = false;
    } else {
      isSubscribed = await OneSignal.Slidedown.promptPush();
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  onMount(() => {
    theme.start();

    // Service worker registration, explicit because SvelteKit has no static
    // index.html for the PWA plugin to inject one into. An updated worker takes
    // over via skipWaiting, but the page it takes over from is still running the
    // previous build's JS, so reload once on controllerchange — without that the
    // new version is installed and never actually shown.
    if ('serviceWorker' in navigator) {
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          /* an unavailable worker only costs offline support, not the app */
        });
    }

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        scrolled = window.scrollY > 8;
        frame = 0;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const appId = env.PUBLIC_ONESIGNAL_APP_ID;
    if (appId) {
      (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
      (window as any).OneSignalDeferred.push(async function (OneSignal: any) {
        await OneSignal.init({
          appId,
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
          welcomeNotification: {
            title: 'Family Adventures',
            body: 'Notifications enabled.'
          }
        });
        oneSignalReady = true;
        const optedIn = await OneSignal.User.PushSubscription.optedInAsync?.();
        isSubscribed = Boolean(optedIn) || Boolean(OneSignal.User.PushSubscription.optedIn);
      });
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  });

  // Reset scroll and any open transient UI on SPA navigation, otherwise the More
  // sheet survives into a page that has no relationship to it.
  let firstNav = true;
  afterNavigate(() => {
    const isFirst = firstNav;
    firstNav = false;
    moreOpen = false;
    if (isFirst) return;
    hasInternalHistory = true;
    pageReady = false;
    requestAnimationFrame(() => requestAnimationFrame(() => (pageReady = true)));
  });
</script>

<svelte:head>
  <script>
    (function () {
      var saved = localStorage.getItem('theme');
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>
  <link rel="icon" type="image/png" href={data.site?.faviconUrl || '/favicon.png'} />
  <title>{data.site?.title || 'Family Adventures'}</title>
  <meta
    name="description"
    content={data.site?.description || "Our family's collection of adventures, memories, and shared moments"}
  />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={data.site?.title || 'Family Adventures'} />
  <meta
    property="og:description"
    content={data.site?.description || "Our family's collection of adventures, memories, and shared moments"}
  />
  <meta property="og:image" content="{data.siteUrl}{data.site?.ogImageUrl || '/logo.png'}" />
  <meta property="og:site_name" content={data.site?.title || 'Family Adventures'} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.site?.title || 'Family Adventures'} />
  <meta
    name="twitter:description"
    content={data.site?.description || "Our family's collection of adventures, memories, and shared moments"}
  />
  <meta name="twitter:image" content="{data.siteUrl}{data.site?.ogImageUrl || '/logo.png'}" />
</svelte:head>

<a href="#main" class="skip-link">Skip to main content</a>

<div class="flex min-h-[100dvh] flex-col">
  <div class="fixed inset-0 -z-10 overflow-hidden bg-[#7BA79E]" aria-hidden="true">
    <BeachScene className="h-full w-full" fullscreen interactive={false} />
    <!-- Heavier scrim in dark mode: the scene is a bright painted sunset, and at
         the light-mode opacities it kept glowing through an otherwise OLED-black
         page. Photos should be the only real light source at night. -->
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-forest-900/55 via-forest-900/40 to-black/80 dark:from-black/88 dark:via-black/84 dark:to-black/96"
    ></div>
  </div>

  <!-- Compact top bar. Below lg it fades in once content scrolls under it and is
       inert until then, which is how UINavigationBar behaves on a phone. From lg
       up there is no tab bar to anchor navigation, so the bar is permanently
       visible AND interactive — the hidden state is max-lg scoped so it can never
       leave the desktop nav on screen but unclickable. -->
  <header
    class="fixed inset-x-0 top-0 z-[var(--z-chrome)] transition-opacity duration-200 {showCompactBar
      ? 'opacity-100'
      : 'max-lg:pointer-events-none max-lg:opacity-0'}"
  >
    <div class="chrome" class:chrome-scrolled={scrolled}>
      <div
        class="mx-auto flex h-[calc(var(--tap-target)+env(safe-area-inset-top))] max-w-7xl items-center gap-2 px-[max(1rem,env(safe-area-inset-left))] pt-[env(safe-area-inset-top)] lg:px-8"
      >
        <!-- Back affordance only on non-root surfaces. -->
        {#if !onRootSurface}
          <button
            type="button"
            onclick={goBack}
            class="tap pressable -ml-2 flex items-center gap-0.5 rounded-full px-2 py-1.5 text-[var(--accent-action)]"
            aria-label="Go back"
          >
            <Icon name="chevron-left" size={22} strokeWidth={2.25} />
          </button>
        {/if}

        <a
          href="/"
          data-tour="brand"
          class="flex shrink-0 items-center lg:hidden"
          aria-label="Family Adventures home"
        >
          <img src={data.site?.logoUrl || '/logo.png'} alt="" class="size-7 object-contain" />
        </a>

        <span
          class="min-w-0 flex-1 truncate text-center text-[0.9375rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)] lg:hidden"
        >
          {barTitle}
        </span>

        <a href="/" data-tour="brand" class="hidden shrink-0 items-center gap-2.5 lg:flex">
          <img
            src={data.site?.logoUrl || '/logo.png'}
            alt="Family Adventures"
            class="size-10 object-contain drop-shadow-sm"
          />
          <span class="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
            Family Adventures
          </span>
        </a>

        <nav class="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {#each tabs as tab}
            <a
              href={tab.href}
              class="nav-link tap {isActive(tab.href) ? 'active' : ''}"
              aria-current={isActive(tab.href) ? 'page' : undefined}
            >
              {tab.label}
            </a>
          {/each}
          {#each moreSections[0].items.filter((item) => item.href === '/bucket-list' || item.href === '/memories') as item}
            <a
              href={item.href}
              class="nav-link tap hidden xl:block {isActive(item.href) ? 'active' : ''}"
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              {item.label}
            </a>
          {/each}
        </nav>

        <div class="flex shrink-0 items-center gap-0.5 lg:ml-3">
          {#if oneSignalReady && data.user}
            <button
              type="button"
              onclick={toggleNotifications}
              class="tap pressable rounded-full p-2.5 {isSubscribed
                ? 'text-[var(--accent-action)]'
                : 'text-[var(--text-secondary)]'}"
              aria-label={isSubscribed ? 'Turn off notifications' : 'Turn on notifications'}
            >
              <Icon name="bell" size={20} filled={isSubscribed} />
            </button>
          {/if}

          <button
            type="button"
            onclick={() => theme.toggle()}
            class="tap pressable rounded-full p-2.5 text-[var(--text-secondary)]"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <Icon name={isDark ? 'sun' : 'moon'} size={20} />
          </button>

          {#if data.user}
            <a
              href="/settings"
              class="tap ml-0.5 flex size-8 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-action)] text-xs font-semibold text-white"
              aria-label="Settings — {data.user.name}"
            >
              {#if data.user.avatar_url}
                <img src={data.user.avatar_url} alt="" class="size-full object-cover" />
              {:else}
                {(data.user.name?.charAt(0).toUpperCase() ?? '?')}
              {/if}
            </a>
          {:else}
            <!-- Desktop only. On mobile the compact bar is back + title + two
                 actions, and a third control squeezes the title to an ellipsis.
                 The tab bar's More sheet still offers Sign in. -->
            <a
              href="/auth/login"
              class="btn-primary tap-target ml-1 hidden text-xs lg:inline-flex"
            >
              Sign in
            </a>
          {/if}

          <button
            type="button"
            onclick={openMore}
            class="tap pressable rounded-full p-2.5 text-[var(--text-secondary)]"
            aria-label="More menu"
            aria-expanded={moreOpen}
          >
            <Icon name="more" size={20} />
          </button>
        </div>
      </div>
    </div>
  </header>

  <Sheet open={moreOpen} onclose={closeMore} title="Explore your album" detent="large">
      <div class="p-4">
        <div class="scroll-y max-h-[70dvh]">
          {#each moreSections as section}
            <p class="list-group-label mt-2">{section.label}</p>
            <div class="list-group">
              {#each section.items as item}
                <a href={item.href} class="list-row tap" onclick={closeMore}>
                  <Icon name={item.icon} size={20} class="shrink-0 text-[var(--accent-action)]" />
                  <span class="list-row-title">{item.label}</span>
                  {#if isActive(item.href)}
                    <Icon name="check" size={18} class="list-row-value text-[var(--accent-action)]" />
                  {:else}
                    <Icon name="chevron-right" size={16} class="ml-auto text-[var(--text-tertiary)]" />
                  {/if}
                </a>
              {/each}
            </div>
          {/each}

          <div class="list-group mt-4">
            <button type="button" class="list-row tap" onclick={() => theme.toggle()}>
              <Icon name={isDark ? 'sun' : 'moon'} size={20} class="shrink-0 text-[var(--accent-action)]" />
              <span class="list-row-title">{isDark ? 'Light mode' : 'Dark mode'}</span>
            </button>

            {#if oneSignalReady && data.user}
              <button type="button" class="list-row tap" onclick={toggleNotifications}>
                <Icon name="bell" size={20} class="shrink-0 text-[var(--accent-action)]" />
                <span class="list-row-title">
                  {isSubscribed ? 'Notifications on' : 'Notifications off'}
                </span>
              </button>
            {/if}

            {#if !data.user}
              <a href="/auth/login" class="list-row tap" onclick={closeMore}><Icon name="person" size={20} /><span class="list-row-title">Sign in</span></a>
              <a href="/auth/signup" class="list-row tap" onclick={closeMore}><Icon name="plus" size={20} /><span class="list-row-title">Create an account</span></a>
            {/if}
            {#if data.user}
              <button type="button" class="list-row tap" onclick={signOut}>
                <Icon name="logout" size={20} class="shrink-0 text-[var(--status-error)]" />
                <span class="list-row-title text-[var(--status-error)]">Sign out</span>
              </button>
            {/if}
          </div>

          <!-- Readable build stamp. A stale service worker or proxy cache can keep
               a browser on an old build for days with no other symptom, so the
               running commit has to be inspectable from the page itself. -->
          <p class="numeric mt-3 text-center text-[0.6875rem] text-[var(--text-tertiary)]">
            build {import.meta.env.BUILD_COMMIT} &middot; {import.meta.env.BUILD_AT.slice(0, 16).replace('T', ' ')} UTC
          </p>
        </div>
      </div>
  </Sheet>

  <SwipeBack enabled={!moreOpen}>
    <main
      id="main"
      class="mx-auto w-full max-w-7xl flex-1 px-[max(1rem,env(safe-area-inset-left))] pb-[calc(var(--tab-bar-height)+2rem+env(safe-area-inset-bottom))] pt-[calc(var(--tap-target)+env(safe-area-inset-top)+0.5rem)] transition-opacity duration-300 ease-out lg:px-8 lg:pb-12 lg:pt-24 {pageReady
        ? 'opacity-100'
        : 'opacity-0'}"
    >
      {@render children()}
    </main>
  </SwipeBack>

  <!-- Floating primary action, clear of the tab bar and the home indicator. -->
  {#if data.user && !currentPath.includes('/create') && !currentPath.endsWith('/edit') && !moreOpen}
    <a
      href="/adventures/create"
      class="fixed right-[max(1rem,env(safe-area-inset-right))] z-[var(--z-raised)] flex size-14 items-center justify-center rounded-full text-white shadow-[var(--shadow-fab)] lg:hidden"
      style:bottom="calc(var(--tab-bar-height) + 1rem + env(safe-area-inset-bottom))"
      style:background="linear-gradient(140deg, var(--color-forest-400), var(--color-forest-700))"
      aria-label="New adventure"
    >
      <Icon name="plus" size={26} strokeWidth={2.25} />
    </a>
  {/if}

  <nav
    class="chrome fixed inset-x-0 bottom-0 z-[var(--z-chrome)] border-t lg:hidden"
    aria-label="Main navigation"
  >
    <div
      class="mx-auto flex max-w-lg items-stretch px-1"
      style:padding-bottom="env(safe-area-inset-bottom)"
    >
      {#each tabs as tab}
        <a
          href={tab.href}
          class="tap flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5"
          style:min-height="var(--tab-bar-height)"
          class:text-[var(--accent-action)]={isActive(tab.href)}
          class:font-semibold={isActive(tab.href)}
          class:text-[var(--text-secondary)]={!isActive(tab.href)}
          aria-current={isActive(tab.href) ? 'page' : undefined}
        >
          <Icon
            name={tab.icon}
            size={23}
            strokeWidth={isActive(tab.href) ? 2.25 : 1.75}
          />
          <span class="text-[0.625rem] leading-none tracking-[0.01em]">{tab.label}</span>
        </a>
      {/each}

      <button type="button" onclick={openMore} aria-expanded={moreOpen} aria-haspopup="dialog"
        class="tap flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[var(--text-secondary)]"
        style:min-height="var(--tab-bar-height)">
        <Icon name="more" size={23} />
        <span class="text-xs leading-none">More</span>
      </button>
    </div>
  </nav>

  <InstallBanner />
  <Chatbot />

  {#if showTourPrompt}
    <div class="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+0.75rem)] z-[var(--z-raised)] mx-auto w-[min(30rem,calc(100vw-1.5rem))] px-3 lg:pb-4">
      <div class="card-flat pointer-events-auto flex flex-wrap items-center gap-3 p-4 shadow-lg">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-100 dark:bg-forest-900/50">
          <Icon name="compass" size={20} class="text-[var(--accent-action)]" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-ink-700 dark:text-cream-100">New here?</p>
          <p class="text-xs text-ink-500 dark:text-cream-300">Take a 30-second tour of the family album.</p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            class="btn-secondary px-3 py-1.5 text-xs"
            onclick={() => (tourPromptDismissed = true)}
          >
            Not now
          </button>
          <button type="button" class="btn-primary px-3 py-1.5 text-xs" onclick={startTour}>Take a tour</button>
        </div>
      </div>
    </div>
  {/if}

  {#if !data.user && tourSeen === true}
    <button
      type="button"
      class="tap pressable fixed bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+0.75rem)] right-3 z-[var(--z-raised)] flex items-center gap-1.5 rounded-full bg-[var(--accent-action)] px-3 py-2 text-xs font-semibold text-white shadow-lg lg:bottom-4"
      onclick={startTour}
    >
      <Icon name="compass" size={15} />
      Take a tour
    </button>
  {/if}

  <GuidedTour open={tourOpen} steps={tourSteps} ondone={endTour} />
</div>
