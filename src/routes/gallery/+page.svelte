<script lang="ts">
  import type { PageData } from './$types';
  import { goto, pushState } from '$app/navigation';
  import { page } from '$app/state';
  import VideoThumbnail from '$lib/components/VideoThumbnail.svelte';

  let { data } = $props();
  let selectedMedia = $state<any>(null);
  let lightboxOpen = $state(false);
  let mediaList = $derived(data.media || []);
  let openCategory = $state<string | null>(null);
  let groupedInitialized = $state(false);

  const categories = ['all', 'beach', 'hiking', 'landmark', 'celebration', 'food', 'wildlife', 'group', 'selfie', 'other'];
  const types = ['all', 'photo', 'video'];

  // Category order + dot/chip colours (static strings so Tailwind can see them)
  const CATS: Record<string, { label: string; dot: string; chip: string }> = {
    beach: { label: 'Beach', dot: 'bg-sky-500', chip: 'bg-sky-500 border-sky-500 text-white' },
    hiking: { label: 'Hiking', dot: 'bg-forest-500', chip: 'bg-forest-500 border-forest-500 text-white' },
    landmark: { label: 'Landmark', dot: 'bg-gold-400', chip: 'bg-gold-400 border-gold-400 text-ink-700' },
    celebration: { label: 'Celebration', dot: 'bg-terra-500', chip: 'bg-terra-500 border-terra-500 text-white' },
    food: { label: 'Food', dot: 'bg-rose-400', chip: 'bg-rose-400 border-rose-400 text-white' },
    wildlife: { label: 'Wildlife', dot: 'bg-emerald-500', chip: 'bg-emerald-500 border-emerald-500 text-white' },
    group: { label: 'Groups', dot: 'bg-indigo-400', chip: 'bg-indigo-400 border-indigo-400 text-white' },
    selfie: { label: 'Selfies', dot: 'bg-pink-400', chip: 'bg-pink-400 border-pink-400 text-white' },
    other: { label: 'Misc', dot: 'bg-ink-300', chip: 'bg-ink-300 border-ink-300 text-ink-700' }
  };

  function categoryOf(media: any): string {
    return media.category && CATS[media.category] ? media.category : 'other';
  }

  // ALL sections in fixed order, only ones with media
  const grouped = $derived(
    categories.filter((c) => c !== 'all').flatMap((c) => {
      const items = mediaList.filter((m) => categoryOf(m) === c);
      return items.length ? [{ key: c, conf: CATS[c], items }] : [];
    })
  );

  // Jump-bar counts per category + shared-category filter toggle
  const counts = $derived(
    Object.fromEntries(grouped.map((g) => [g.key, g.items.length]))
  );
  const totalCount = $derived(mediaList.length);

  // Default view is the grouped grid. A category or type filter switches back to
  // the classic flat (server-filtered) grid so deep links still work.
  const groupedView = $derived(data.currentCategory === 'all' && data.currentType === 'all');

  // Open the first group once so the page isn't a wall of headers
  $effect(() => {
    if (!groupedInitialized && grouped.length > 0) {
      openCategory = grouped[0].key;
      groupedInitialized = true;
    }
  });

  function setFilter(key: string, value: string) {
    const url = new URL(window.location.href);
    if (value === 'all') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
    goto(url.pathname + url.search, { replaceState: true, keepFocus: true });
  }

  // Jump bar click in the grouped view: open that section (single-open accordion)
  // and scroll to it. Falls back to filtering when a category filter is active.
  function jumpTo(cat: string) {
    if (!groupedView) {
      setFilter('category', cat);
      return;
    }
    if (openCategory === cat) {
      openCategory = null;
      return;
    }
    openCategory = cat;
    requestAnimationFrame(() => {
      document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function toggleGroup(cat: string) {
    openCategory = openCategory === cat ? null : cat;
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

{#snippet tile(media: any)}
  <button
    class="break-inside-avoid rounded-xl overflow-hidden group cursor-pointer w-full"
    onclick={() => openLightbox(media)}
  >
    <div class="relative">
      {#if media.media_type === 'video'}
        <VideoThumbnail src={media.file_path} alt={media.caption || 'Video'} class="w-full object-cover transition-transform duration-300 group-hover:scale-105 aspect-square" />
      {:else}
        <img
          src={`/api/media/image?path=${encodeURIComponent(media.file_path)}&w=480`}
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
{/snippet}

<div class="space-y-6">
  <div class="page-header">
    <p class="page-header-label">Photo & Video Archive</p>
    <h1 class="page-header-title">Gallery</h1>
    <p class="page-header-desc">All the moments we've captured together</p>
  </div>

  {#if mediaList.length > 0}
    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-1.5">
        <span class="text-xs font-medium text-cream-100/80 uppercase tracking-wide dark:text-cream-100/80">Type</span>
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
        <span class="text-xs font-medium text-cream-100/80 uppercase tracking-wide dark:text-cream-100/80">Category</span>
        <button
          class="badge transition-colors {(data.currentCategory || 'all') === 'all' && groupedView ? 'bg-forest-500 text-white' : 'bg-cream-100 text-ink-500 hover:bg-cream-200 dark:bg-ink-700 dark:text-cream-300'}"
          onclick={() => setFilter('category', 'all')}
          title="Show all categories grouped"
        >
          All <span class="ml-1 font-mono text-[10px]">{totalCount}</span>
        </button>
        {#each grouped as g (g.key)}
          {@const active = groupedView ? openCategory === g.key : (data.currentCategory || 'all') === g.key}
          <button
            class="badge transition-colors {active ? g.conf.chip : 'bg-cream-100 text-ink-500 hover:bg-cream-200 dark:bg-ink-700 dark:text-cream-300'}"
            onclick={() => jumpTo(g.key)}
            title="Go to {g.conf.label}"
          >
            <span class="inline-block h-1.5 w-1.5 rounded-full {g.conf.dot} mr-1 align-middle"></span>
            {g.conf.label} <span class="ml-1 font-mono text-[10px] opacity-80">{counts[g.key]}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if mediaList.length === 0}
    <div class="card-flat text-center py-16">
      <div class="h-14 w-14 mx-auto rounded-full bg-cream-100 flex items-center justify-center mb-4">
        <svg class="h-7 w-7 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-ink-700 dark:text-cream-200">No media yet</h3>
      <p class="text-ink-400 mt-2 text-sm">Add photos and videos to your adventures to see them here!</p>
    </div>
  {:else if groupedView}
    <!-- Grouped-by-category view (default) -->
    <div class="space-y-5">
      {#each grouped as g (g.key)}
        <section
          id="cat-{g.key}"
          class="scroll-mt-32 rounded-2xl border border-cream-200/60 bg-cream-100/40 dark:border-ink-600 dark:bg-ink-800/60"
        >
          <button
            class="w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left"
            onclick={() => toggleGroup(g.key)}
            aria-expanded={openCategory === g.key}
          >
            <span class="h-2.5 w-2.5 rounded-full {g.conf.dot} shrink-0"></span>
            <h2 class="text-lg font-display font-semibold text-ink-700 dark:text-cream-100">{g.conf.label}</h2>
            <span class="badge bg-white text-ink-500 dark:bg-ink-700 dark:text-cream-300">{counts[g.key]}</span>
            <span class="ml-auto text-ink-400 dark:text-cream-300 transition-transform duration-200 {openCategory === g.key ? 'rotate-180' : ''}">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          {#if openCategory === g.key}
            <div class="px-3 sm:px-4 pb-4">
              <div class="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                {#each g.items as media}
                  {@render tile(media)}
                {/each}
              </div>
            </div>
          {/if}
        </section>
      {/each}
    </div>
  {:else}
    <!-- Flat masonry (category or type filter active) -->
    <div class="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
      {#each mediaList as media}
        {@render tile(media)}
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
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') closeLightbox(); }}
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
          <track kind="captions" />
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