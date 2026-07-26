<script lang="ts">
  import { onMount } from 'svelte';

  let showBanner = $state(false);
  let isIOS = $state(false);
  let isInstalled = $state(false);
  let deferredPrompt = $state<any>(null);

  onMount(() => {
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
    showBanner = false;
  }
</script>

{#if showBanner && !isInstalled}
<div style="position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:16px;pointer-events:none;">
  <div style="max-width:480px;margin:0 auto;pointer-events:auto;">
    <div style="background:rgba(16,25,36,0.95);backdrop-filter:blur(12px);border:1px solid rgba(14,124,123,0.3);border-radius:16px;padding:20px;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
      <div style="display:flex;align-items:flex-start;gap:16px;">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#14b8a6,#0d9488);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg style="width:24px;height:24px;color:white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div style="flex:1;min-width:0;">
          <h3 style="font-size:14px;font-weight:600;color:#e2e8f0;margin:0;">Add to Home Screen</h3>
          {#if isIOS}
            <p style="font-size:12px;color:#94a3b8;margin:4px 0 0 0;">
              Install Family Adventures for the best experience.
            </p>
          {:else}
            <p style="font-size:12px;color:#94a3b8;margin:4px 0 0 0;">
              Install for quick access and push notifications.
            </p>
          {/if}
        </div>
        <button
          style="color:#64748b;cursor:pointer;background:none;border:none;padding:4px;"
          onclick={dismiss}
        >
          <svg style="width:20px;height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {#if isIOS}
        <div style="margin-top:12px;padding:12px;border-radius:8px;background:rgba(14,124,123,0.15);border:1px solid rgba(14,124,123,0.2);">
          <ol style="font-size:12px;color:#94a3b8;margin:0;padding-left:16px;list-style:decimal;">
            <li style="margin-bottom:6px;">Tap the <strong style="color:#e2e8f0;">Share</strong> button (square with arrow) below</li>
            <li style="margin-bottom:6px;">Scroll down and tap <strong style="color:#e2e8f0;">Add to Home Screen</strong></li>
            <li>Tap <strong style="color:#e2e8f0;">Add</strong> to confirm</li>
          </ol>
        </div>
      {:else if deferredPrompt}
        <button
          style="width:100%;margin-top:12px;padding:10px;border-radius:8px;background:#0d9488;color:white;font-size:14px;font-weight:500;border:none;cursor:pointer;"
          onclick={handleInstall}
        >
          Install App
        </button>
      {/if}
    </div>
  </div>
</div>
{/if}
