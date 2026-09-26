<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { formatDate, timeAgo } from '$lib/shared/utils';
  import Icon from '$lib/components/Icon.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  let { data } = $props();
  let filterTag = $state<string | null>(null);
  let filterYear = $state<number | null>(null);

  function clearFilters() {
    filterTag = null;
    filterYear = null;
  }
  
  const years = $derived([...new Set(data.adventures
    .filter((a: any) => a.start_date)
    .map((a: any) => new Date(a.start_date!).getFullYear())
  )].sort((a: number, b: number) => b - a));

  const filteredAdventures = $derived(
    data.adventures.filter((a: any) => {
      if (filterTag && !a.tags?.some((t: { id: string }) => t.id === filterTag)) return false;
      if (filterYear && a.start_date && new Date(a.start_date).getFullYear() !== filterYear) return false;
      return true;
    })
  );
</script>

<svelte:head>
  <title>Adventures | Family Adventures</title>
</svelte:head>

<div class="space-y-6">
  <div class="page-header flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
      <p class="page-header-label">Our Journeys</p>
      <h1 class="page-header-title">Family Adventures</h1>
      <p class="page-header-desc">
        {data.adventures.length} adventure{data.adventures.length !== 1 ? 's' : ''} and counting
      </p>
    </div>
    
    {#if data.user}
      <a href="/adventures/create" class="btn-primary shrink-0">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Adventure
      </a>
    {/if}
  </div>

  <!-- Filters -->
  {#if data.tags.length > 0 || years.length > 0}
    <div class="flex flex-wrap gap-4">
      {#if years.length > 0}
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-cream-100/80 uppercase tracking-wide dark:text-cream-100/80">Year</span>
          <button
            class="badge {filterYear === null ? 'bg-forest-500 text-white' : 'bg-cream-100 dark:bg-ink-700 text-ink-500 dark:text-cream-400 hover:bg-cream-200 dark:hover:bg-ink-600'}"
            onclick={() => filterYear = null}
          >
            All
          </button>
          {#each years as year}
            <button
              class="badge {filterYear === year ? 'bg-forest-500 text-white' : 'bg-cream-100 text-ink-500 hover:bg-cream-200'}"
              onclick={() => filterYear = year}
            >
              {year}
            </button>
          {/each}
        </div>
      {/if}

      {#if data.tags.length > 0}
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-cream-100/80 uppercase tracking-wide dark:text-cream-100/80">Tag</span>
          <button
            class="badge {filterTag === null ? 'bg-forest-500 text-white' : 'bg-cream-100 dark:bg-ink-700 text-ink-500 dark:text-cream-400 hover:bg-cream-200 dark:hover:bg-ink-600'}"
            onclick={() => filterTag = null}
          >
            All
          </button>
          {#each data.tags as tag}
            <button
              class="badge transition-colors"
              style="background-color: {filterTag === tag.id ? tag.color : 'var(--color-cream-100)'}; color: {filterTag === tag.id ? 'white' : 'var(--color-ink-500)'}"
              onclick={() => filterTag = tag.id}
            >
              {tag.name}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Adventures Grid -->
  {#if filteredAdventures.length === 0}
    {#if filterTag || filterYear}
      <div class="card-flat px-6 py-14 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cream-100 dark:bg-forest-900/50">
          <Icon name="filter" size={28} class="text-ink-500 dark:text-cream-300" />
        </div>
        <h3 class="text-lg font-semibold text-ink-700 dark:text-cream-200">Nothing matches that filter</h3>
        <p class="mx-auto mt-2 max-w-sm text-sm text-ink-500 dark:text-cream-300">
          There are adventures here, just not the ones you picked.
        </p>
        <button class="btn-secondary mt-5" onclick={clearFilters}>Clear filters</button>
      </div>
    {:else}
      <EmptyState
        icon="compass"
        signedIn={!!data.user}
        title="No adventures yet"
        body="An adventure is one trip or day out — a beach morning, a camping weekend, the school trip. Log one and its photos, places and people gather around it."
        actionHref={data.user ? '/adventures/create' : undefined}
        actionLabel={data.user ? 'Log your first adventure' : undefined}
      />
    {/if}
  {:else}
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each filteredAdventures as adventure}
        <div 
          role="link"
          tabindex="0"
          onclick={() => goto(`/adventures/${adventure.slug}`)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') goto(`/adventures/${adventure.slug}`); }}
          class="card overflow-hidden cursor-pointer group"
        >
          <!-- Cover Image -->
          <div class="relative h-44 bg-cream-100 dark:bg-ink-700 overflow-hidden">
            {#if adventure.cover_file_path}
              <img
                src={`/api/media/image?path=${encodeURIComponent(adventure.cover_file_path)}&w=600`}
                alt={adventure.title}
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            {:else}
              <div class="w-full h-full flex items-center justify-center">
                <svg class="h-12 w-12 text-cream-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            {/if}
            
            {#if adventure.location_name}
              <div class="absolute bottom-2 left-2 badge bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {adventure.location_name}
              </div>
            {/if}
            {#if adventure.is_draft}
              <div class="absolute top-2 left-2 badge bg-gold-500 text-white">
                Draft
              </div>
            {/if}
          </div>

          <!-- Content -->
          <div class="p-4">
            <div class="flex items-center gap-2 text-xs text-ink-500 mb-1.5">
              {#if adventure.start_date}
                <time datetime={adventure.start_date}>{formatDate(adventure.start_date)}</time>
                {#if adventure.end_date && adventure.end_date !== adventure.start_date}
                  <span>–</span>
                  <time datetime={adventure.end_date}>{formatDate(adventure.end_date)}</time>
                {/if}
              {:else}
                <span>{timeAgo(adventure.created_at)}</span>
              {/if}
            </div>
            
            <h2 class="font-display font-semibold text-ink-800 dark:text-cream-100 group-hover:text-forest-600 transition-colors line-clamp-2">
              {adventure.title}
            </h2>
            
            {#if adventure.description}
              <p class="text-sm text-ink-500 mt-1.5 line-clamp-2">
                {adventure.description}
              </p>
            {/if}

            <!-- Tags -->
            {#if adventure.tags && adventure.tags.length > 0}
              <div class="flex flex-wrap gap-1.5 mt-3">
                {#each adventure.tags.slice(0, 3) as tag}
                  <span 
                    class="badge"
                    style="background-color: {tag.color}15; color: {tag.color}"
                  >
                    {tag.name}
                  </span>
                {/each}
              </div>
            {/if}

            <!-- Author -->
            <div class="flex items-center justify-between mt-4 pt-3 border-t border-cream-200 dark:border-ink-600">
              <div class="flex items-center gap-2">
                <div class="h-6 w-6 rounded-full bg-terra-500 flex items-center justify-center text-white text-xs font-medium">
                  {adventure.author_name.charAt(0).toUpperCase()}
                </div>
                <span class="text-xs text-ink-500">{adventure.author_name}</span>
              </div>
              {#if data.user && data.user.id === adventure.author_id}
                <a
                  href="/adventures/{adventure.slug}/edit"
                  class="text-xs text-forest-500 hover:text-forest-600 font-medium"
                  onclick={(e) => e.stopPropagation()}
                >
                  Edit
                </a>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
