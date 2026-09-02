<script lang="ts">
  import type { PageData } from './$types';
  import { goto, pushState } from '$app/navigation';
  import { page } from '$app/state';
  import VideoThumbnail from '$lib/components/VideoThumbnail.svelte';

  let { data } = $props();
  let selectedMedia = $state<any>(null);
  let lightboxOpen = $state(false);
  let mediaList = $derived(data.media || []);

  const categories = ['all', 'beach', 'hiking', 'landmark', 'celebration', 'food', 'wildlife', 'group', 'selfie', 'other'];
  const types = ['all', 'photo', 'video'];

  function setFilter(key: string, value: string) {
    const url = new URL(window.location.href);
    if (value === 'all') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
    goto(url.pathname + url.search, { replaceState: true, keepFocus: true });
  }

  function openLightbox(media: any) {
    selectedMedia = media;
    lightboxOpen = true;
    // Shallow history entry so the browser back button closes the lightbox
    pushState('', { lightbox: true });
  }

  function closeLightbox() {
    if (!lightboxOpen) return;
    lightboxOpen = false;
    selectedMedia = null;
    if (page.state.lightbox) history.back();
  }

  // Back button pressed while the lightbox is open -> close it instead of leaving
  $effect(() => {
    if (lightboxOpen && !page.state.lightbox) {
      lightboxOpen = false;
      selectedMedia = null;
    }
  });

  function navigate(direction: number) {
    if (!selectedMedia) return;
    const idx = mediaList.indexOf(selectedMedia);
    if (idx === -1) return;
    const newIdx = (idx + direction + mediaList.length) % mediaList.length;
    selectedMedia = mediaList[newIdx];
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!lightboxOpen) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  }
</script>

<svelte:head>
  <title>Gallery | Family Adventures</title>
</svelte:head>

<div class="space-y-6">
  <div class="page-header">
    <p class="page-header-label">Photo & Video Archive</p>
    <h1 class="page-header-title">Gallery</h1>
    <p class="page-header-desc">All the moments we've captured together</p>
  </div>

  <!-- Filters -->
  {#if data.media.length > 0}
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-1.5">
        <span class="text-xs font-medium text-ink-400 uppercase tracking-wide">Type</span>
        {#each types as t}
          <button
            class="badge transition-colors {(data.currentType || 'all') === t ? 'bg-forest-500 text-white' : 'bg-cream-100 text-ink-500 hover:bg-cream-200 dark:bg-ink-700 dark:text-cream-300'}"
            onclick={() => setFilter('type', t)}
          >
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        {/each}
      </div>
      <div class="h-4 w-px bg-cream-200 dark:bg-ink-600"></div>
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-xs font-medium text-ink-400 uppercase tracking-wide">Category</span>
        {#each categories as cat}
          <button
            class="badge transition-colors {(data.currentCategory || 'all') === cat ? 'bg-forest-500 text-white' : 'bg-cream-100 text-ink-500 hover:bg-cream-200 dark:bg-ink-700 dark:text-cream-300'}"
            onclick={() => setFilter('category', cat)}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if data.media.length === 0}
    <div class="card-flat text-center py-16">
      <div class="h-14 w-14 mx-auto rounded-full bg-cream-100 flex items-center justify-center mb-4">
        <svg class="h-7 w-7 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-ink-700 dark:text-cream-200">No media yet</h3>
      <p class="text-ink-400 mt-2 text-sm">Add photos and videos to your adventures to see them here!</p>
    </div>
  {:else}
    <!-- Masonry Grid -->
    <div class="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
      {#each data.media as media}
        <button
          class="break-inside-avoid rounded-xl overflow-hidden group cursor-pointer w-full"
          onclick={() => openLightbox(media)}
        >
          <div class="relative">
            {#if media.media_type === 'video'}
              <VideoThumbnail src={media.file_path} alt={media.caption || 'Video'} class="w-full object-cover transition-transform duration-300 group-hover:scale-105 aspect-square" />
            {:else}
              <img
                src={media.file_path}
                alt={media.caption || 'Gallery photo'}
                class="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            {/if}
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div class="absolute bottom-3 left-3 right-3">
                {#if media.caption || media.ai_caption}
                  <p class="text-white text-sm font-medium truncate">{media.caption || media.ai_caption}</p>
                {/if}
                {#if media.adventure_title}
                  <p class="text-white/70 text-xs truncate">{media.adventure_title}</p>
                {/if}
                {#if media.ai_tags}
                  {@const tags = JSON.parse(media.ai_tags)}
                  {#if tags.length > 0}
                    <div class="flex flex-wrap gap-1 mt-1">
                      {#each tags.slice(0, 3) as tag}
                        <span class="px-1.5 py-0.5 text-[9px] rounded-full bg-white/20 text-white/70">{tag}</span>
                      {/each}
                    </div>
                  {/if}
                {/if}
                {#if media.tagged_people}
                  <p class="text-white/60 text-[10px] truncate mt-0.5">{media.tagged_people}</p>
                {/if}
              </div>
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<!-- Lightbox -->
<svelte:window onkeydown={handleKeydown} />
{#if lightboxOpen && selectedMedia}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
    onclick={closeLightbox}
    role="dialog"
    tabindex="-1"
  >
    <button 
      class="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      onclick={closeLightbox}
      aria-label="Close lightbox"
    >
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    {#if mediaList.length > 1}
      <button
        class="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        onclick={(e) => { e.stopPropagation(); navigate(-1); }}
        title="Previous"
        aria-label="Previous image"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    {/if}

    <div class="max-w-4xl max-h-[90vh] mx-4" role="presentation" onclick={(e) => e.stopPropagation()}>
      {#if selectedMedia.media_type === 'video'}
        <video 
          controls 
          class="max-w-full max-h-[80vh] rounded-xl"
          src={selectedMedia.file_path}
        >
          Your browser does not support the video tag.
        </video>
      {:else}
        <img
          src={selectedMedia.file_path}
          alt={selectedMedia.caption || 'Gallery photo'}
          class="max-w-full max-h-[80vh] rounded-xl object-contain"
        />
      {/if}

      {#if selectedMedia.caption || selectedMedia.ai_caption}
        <div class="mt-4 text-center">
          <p class="text-white text-lg">{selectedMedia.caption || selectedMedia.ai_caption}</p>
          {#if selectedMedia.adventure_title}
            <p class="text-white/60 text-sm mt-1">
              from <a href="/adventures/{selectedMedia.adventure_slug}" class="text-forest-300 hover:text-forest-200">{selectedMedia.adventure_title}</a>
            </p>
          {/if}
          {#if selectedMedia.ai_tags}
            {@const tags = JSON.parse(selectedMedia.ai_tags)}
            {#if tags.length > 0}
              <div class="flex flex-wrap justify-center gap-1.5 mt-3">
                {#each tags as tag}
                  <span class="px-2 py-0.5 text-xs rounded-full bg-white/10 text-white/80">{tag}</span>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      {/if}
    </div>

    {#if mediaList.length > 1}
      <button
        class="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        onclick={(e) => { e.stopPropagation(); navigate(1); }}
        title="Next"
        aria-label="Next image"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    {/if}
  </div>
{/if}
