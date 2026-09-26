<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import VideoThumbnail from '$lib/components/VideoThumbnail.svelte';
  import Lightbox from '$lib/components/Lightbox.svelte';
  import type { LightboxItem } from '$lib/components/Lightbox.svelte';
  import ActionSheet from '$lib/components/ActionSheet.svelte';
  import type { ActionSheetAction } from '$lib/components/ActionSheet.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { longPress } from '$lib/actions/longPress';

  let { data } = $props();
  let mediaList = $derived((data.media || []) as LightboxItem[]);
  let lightboxIndex = $state(-1);
  let actionTarget = $state<LightboxItem | null>(null);
  let openCategory = $state<string | null>(null);
  let groupedInitialized = $state(false);

  const lightboxOpen = $derived(lightboxIndex >= 0);

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

  function openLightbox(media: LightboxItem) {
    const idx = mediaList.indexOf(media);
    lightboxIndex = idx === -1 ? 0 : idx;
  }

  function closeLightbox() {
    lightboxIndex = -1;
    if (page.state.lightbox) history.back();
  }

  // Back button pressed while the lightbox is open -> close it instead of leaving
  $effect(() => {
    if (lightboxOpen && !page.state.lightbox) lightboxIndex = -1;
  });

  function downloadMedia(media: LightboxItem) {
    const url = `/api/media/image?path=${encodeURIComponent(media.file_path)}&download=1`;
    const ext = media.file_path.split('.').pop() || 'jpg';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${media.caption || media.ai_caption || 'image'}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const sheetActions = $derived<ActionSheetAction[]>(
    actionTarget
      ? [
          ...(actionTarget.media_type === 'video'
            ? []
            : [
                {
                  id: 'download',
                  label: 'Download image',
                  icon: 'download' as const,
                  onSelect: () => downloadMedia(actionTarget as LightboxItem)
                }
              ]),
          ...(actionTarget.adventure_slug
            ? [
                {
                  id: 'adventure',
                  label: `View ${actionTarget.adventure_title || 'adventure'}`,
                  icon: 'compass' as const,
                  onSelect: () => {
                    window.location.href = `/adventures/${actionTarget?.adventure_slug}`;
                  }
                }
              ]
            : [])
        ]
      : []
  );
</script>

<svelte:head>
  <title>Gallery | Family Adventures</title>
</svelte:head>

{#snippet tile(media: LightboxItem)}
  <div
    class="group relative break-inside-avoid w-full cursor-pointer overflow-hidden rounded-[var(--radius-md)]"
    role="button"
    tabindex="0"
    aria-label="Open {media.caption || media.ai_caption || 'photo'}"
    onclick={() => openLightbox(media)}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(media);
      }
    }}
    use:longPress={{
      onLongPress: () => {
        actionTarget = media;
      }
    }}
  >
    <div class="relative">
      {#if media.media_type === 'video'}
        <VideoThumbnail src={media.file_path} alt={media.caption || 'Video'} class="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      {:else}
        <img
          src={`/api/media/image?path=${encodeURIComponent(media.file_path)}&w=480`}
          alt={media.caption || 'Gallery photo'}
          class="w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      {/if}
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <div class="absolute bottom-3 left-3 right-3">
          {#if media.caption || media.ai_caption}
            <p class="truncate text-sm font-medium text-white">{media.caption || media.ai_caption}</p>
          {/if}
          {#if media.adventure_title}
            <p class="truncate text-xs text-white/70">{media.adventure_title}</p>
          {/if}
          {#if media.tagged_people}
            <p class="mt-0.5 truncate text-[10px] text-white/60">{media.tagged_people}</p>
          {/if}
        </div>
      </div>
      <!-- Sibling, not a child: a nested interactive control inside the tile
           button was invalid HTML and its click was cancelled outright, so the
           old download affordance never actually downloaded anything. -->
      {#if media.media_type !== 'video'}
        <button
          type="button"
          onclick={(e) => {
            e.stopPropagation();
            downloadMedia(media);
          }}
          class="tap pressable absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm hover:bg-black/65 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          aria-label="Download {media.caption || 'image'}"
        >
          <Icon name="download" size={18} />
        </button>
      {/if}
    </div>
  </div>
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
    <EmptyState
      icon="photo"
      signedIn={!!data.user}
      title="No photos yet"
      body="Photos added to an adventure collect here, newest first. Once the family starts adding them, this becomes the whole album."
      actionHref={data.user ? '/adventures/create' : undefined}
      actionLabel={data.user ? 'Log your first adventure' : undefined}
    />
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
            <span class="ml-auto text-ink-500 dark:text-cream-300 transition-transform duration-200 {openCategory === g.key ? 'rotate-180' : ''}">
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

<Lightbox
  items={mediaList}
  bind:index={lightboxIndex}
  open={lightboxOpen}
  onclose={closeLightbox}
/>

<ActionSheet
  open={actionTarget !== null}
  title={actionTarget?.caption || actionTarget?.ai_caption || undefined}
  message="Photo options"
  actions={sheetActions}
  onclose={() => (actionTarget = null)}
/>