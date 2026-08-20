<script lang="ts">
  import { onMount } from 'svelte';

  let { src, alt = 'Video thumbnail', class: className = '' }: { src: string; alt?: string; class?: string } = $props();

  let thumbnailUrl = $state('');
  let loaded = $state(false);
  let serverFallback = $state(false);

  onMount(() => {
    if (!src) { serverFallback = true; return; }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = src;

    const timeout = setTimeout(() => {
      serverFallback = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
    }, 4000);

    video.addEventListener('loadeddata', () => {
      video.currentTime = Math.min(0.5, video.duration * 0.1);
    });

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
          loaded = true;
          clearTimeout(timeout);
        }
      } catch {
        serverFallback = true;
        clearTimeout(timeout);
      }
    });

    video.addEventListener('error', () => {
      serverFallback = true;
      clearTimeout(timeout);
    });

    return () => {
      clearTimeout(timeout);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  });

  let serverThumbSrc = $derived(
    serverFallback && src ? `/api/media/thumbnail?path=${encodeURIComponent(src)}` : ''
  );
</script>

{#if loaded && thumbnailUrl}
  <img src={thumbnailUrl} {alt} class={className} loading="lazy" />
{:else if serverFallback && serverThumbSrc}
  <img src={serverThumbSrc} {alt} class={className} loading="lazy" onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
{:else}
  <div class="{className} bg-gradient-to-br from-ink-700 to-ink-800 dark:from-ink-600 dark:to-ink-700 flex items-center justify-center">
    <div class="flex flex-col items-center gap-2">
      <div class="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
        <svg class="h-6 w-6 text-white/60 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  </div>
{/if}
