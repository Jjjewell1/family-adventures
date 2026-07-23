<script lang="ts">
  import type { PageData } from './$types';
  import { getImmichAssetUrl } from '$lib/shared/immich';
  
  let { data } = $props();
  let selectedMedia = $state<any>(null);
  let lightboxOpen = $state(false);

  function openLightbox(media: any) {
    selectedMedia = media;
    lightboxOpen = true;
  }

  function closeLightbox() {
    lightboxOpen = false;
    selectedMedia = null;
  }
</script>

<svelte:head>
  <title>Gallery | Family Adventures</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <p class="text-sm uppercase tracking-wider text-ocean-500 font-medium">Photo & Video Archive</p>
    <h1 class="text-3xl md:text-4xl font-display font-semibold text-navy-600 mt-2">
      Gallery
    </h1>
    <p class="text-navy-400 mt-2">
      All the moments we've captured together
    </p>
  </div>

  {#if data.media.length === 0}
    <div class="text-center py-16 glass rounded-3xl">
      <div class="h-16 w-16 mx-auto rounded-full bg-sand-100 flex items-center justify-center mb-4">
        <svg class="h-8 w-8 text-navy-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-navy-600">No media yet</h3>
      <p class="text-navy-400 mt-2">Add photos and videos to your adventures to see them here!</p>
    </div>
  {:else}
    <!-- Masonry Grid -->
    <div class="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
      {#each data.media as media, index}
        <button
          class="break-inside-avoid rounded-2xl overflow-hidden group cursor-pointer"
          onclick={() => openLightbox(media)}
        >
          <div class="relative">
            <img
              src={getImmichAssetUrl(media.immich_asset_id, true)}
              alt={media.caption || 'Gallery photo'}
              class="w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div class="absolute bottom-3 left-3 right-3">
                {#if media.caption}
                  <p class="text-white text-sm font-medium truncate">{media.caption}</p>
                {/if}
                {#if media.adventure_title}
                  <p class="text-white/70 text-xs truncate">{media.adventure_title}</p>
                {/if}
              </div>
            </div>
            {#if media.media_type === 'video'}
              <div class="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center">
                <svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<!-- Lightbox -->
{#if lightboxOpen && selectedMedia}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
    onclick={closeLightbox}
    role="dialog"
    tabindex="-1"
    onkeydown={(e) => e.key === 'Escape' && closeLightbox()}
  >
    <button 
      class="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      onclick={closeLightbox}
    >
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <div class="max-w-4xl max-h-[90vh] mx-4" onclick={(e) => e.stopPropagation()}>
      {#if selectedMedia.media_type === 'video'}
        <video 
          controls 
          class="max-w-full max-h-[80vh] rounded-2xl"
          src={getImmichAssetUrl(selectedMedia.immich_asset_id, false)}
        >
          Your browser does not support the video tag.
        </video>
      {:else}
        <img
          src={getImmichAssetUrl(selectedMedia.immich_asset_id, false)}
          alt={selectedMedia.caption || 'Gallery photo'}
          class="max-w-full max-h-[80vh] rounded-2xl object-contain"
        />
      {/if}

      {#if selectedMedia.caption || selectedMedia.adventure_title}
        <div class="mt-4 text-center">
          {#if selectedMedia.caption}
            <p class="text-white text-lg">{selectedMedia.caption}</p>
          {/if}
          {#if selectedMedia.adventure_title}
            <p class="text-white/60 text-sm mt-1">
              from <a href="/adventures/{selectedMedia.adventure_slug}" class="text-ocean-300 hover:text-ocean-200">{selectedMedia.adventure_title}</a>
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
