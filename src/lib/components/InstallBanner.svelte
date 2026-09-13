<script lang="ts">
  import { onMount } from 'svelte';

  const DISMISS_KEY = 'pwa-install-dismissed';

  let showBanner = $state(false);
  let isIOS = $state(false);
  let isInstalled = $state(false);
  let deferredPrompt = $state<any>(null);

  onMount(() => {
    // Remember dismissals so the banner doesn't nag on every load.
    if (localStorage.getItem(DISMISS_KEY)) {
      console.log('[PWA] Banner dismissed previously, skipping');
      return;
    }

    const ua = navigator.userAgent;
    isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);

    console.log('[PWA] UA:', ua);
    console.log('[PWA] isIOS:', isIOS, 'isAndroid:', isAndroid);

    isInstalled = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    console.log('[PWA] isInstalled:', isInstalled);

    if (isInstalled) {
      console.log('[PWA] Already installed, skipping banner');
      return;
    }

    // Hide the banner once the user actually installs.
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] appinstalled fired');
      showBanner = false;
      isInstalled = true;
    });

    // Listen for Android/Chrome install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      console.log('[PWA] beforeinstallprompt fired');
      e.preventDefault();
      deferredPrompt = e;
      showBanner = true;
    });

    // iOS: show banner after 3 seconds
    if (isIOS) {
      console.log('[PWA] iOS detected, showing banner in 3s');
      setTimeout(() => {
        console.log('[PWA] iOS timer fired, showBanner = true');
        showBanner = true;
      }, 3000);
    }
  });

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Install outcome:', outcome);
      deferredPrompt = null;
      if (outcome === 'accepted') showBanner = false;
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    showBanner = false;
  }
</script>

{#if showBanner && !isInstalled}
<div class="install-banner-wrap">
  <div style="max-width:480px;margin:0 auto;pointer-events:auto;">
    <div style="background:rgba(30,26,21,0.95);backdrop-filter:blur(12px);border:1px solid rgba(76,133,103,0.35);border-radius:16px;padding:20px;box-shadow:0 25px 50px rgba(0,0,0,0.45);">
      <div style="display:flex;align-items:flex-start;gap:16px;">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#4C8567,#3B6F54);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg style="width:24px;height:24px;color:white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div style="flex:1;min-width:0;">
          <h3 style="font-size:14px;font-weight:600;color:#F6EFE3;margin:0;">Add to Home Screen</h3>
          {#if isIOS}
            <p style="font-size:12px;color:#AB9F8C;margin:4px 0 0 0;">
              Install Family Adventures for the best experience.
            </p>
          {:else}
            <p style="font-size:12px;color:#AB9F8C;margin:4px 0 0 0;">
              Install for quick access and push notifications.
            </p>
          {/if}
        </div>
        <button
          style="color:#8C8070;cursor:pointer;background:none;border:none;padding:4px;"
          onclick={dismiss}
          aria-label="Dismiss"
        >
          <svg style="width:20px;height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {#if isIOS}
        <div style="margin-top:12px;padding:12px;border-radius:8px;background:rgba(59,111,84,0.16);border:1px solid rgba(59,111,84,0.28);">
          <ol style="font-size:12px;color:#AB9F8C;margin:0;padding-left:16px;list-style:decimal;">
            <li style="margin-bottom:6px;">Tap the <strong style="color:#F6EFE3;">Share</strong> button (square with arrow) below</li>
            <li style="margin-bottom:6px;">Scroll down and tap <strong style="color:#F6EFE3;">Add to Home Screen</strong></li>
            <li>Tap <strong style="color:#F6EFE3;">Add</strong> to confirm</li>
          </ol>
        </div>
      {:else if deferredPrompt}
        <button
          style="width:100%;margin-top:12px;padding:10px;border-radius:8px;background:#3B6F54;color:white;font-size:14px;font-weight:600;border:none;cursor:pointer;"
          onclick={handleInstall}
        >
          Install App
        </button>
      {/if}
    </div>
  </div>
</div>
{/if}
