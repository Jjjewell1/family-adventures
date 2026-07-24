<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { formatDate, timeAgo } from '$lib/shared/utils';
  import { getImmichAssetUrl } from '$lib/shared/immich';

  let { data } = $props();
  let filterTag = $state<string | null>(null);
  let filterYear = $state<number | null>(null);
  
  const years = $derived([...new Set(data.adventures
    .filter((a: any) => a.start_date)
    .map((a: any) => new Date(a.start_date!).getFullYear())
  )].sort((a: number, b: number) => b - a));

  const filteredAdventures = $derived(
    data.adventures.filter((a: any) => {
      if (filterTag && !a.tags?.some(t => t.id === filterTag)) return false;
      if (filterYear && a.start_date && new Date(a.start_date).getFullYear() !== filterYear) return false;
      return true;
    })
  );
</script>

<svelte:head>
  <title>Adventures | Family Adventures</title>
</svelte:head>

<div class="space-y-8">
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
      <p class="text-sm uppercase tracking-wider text-ocean-500 font-medium">Our Journeys</p>
      <h1 class="text-3xl md:text-4xl font-display font-semibold text-navy-600 mt-2">
        Family Adventures
      </h1>
      <p class="text-navy-400 mt-2">
        {data.adventures.length} adventure{data.adventures.length !== 1 ? 's' : ''} and counting
      </p>
    </div>
    
    {#if data.user}
      <a href="/adventures/create" class="inline-flex items-center gap-2 rounded-full bg-ocean-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Adventure
      </a>
    {/if}
  </div>

  <!-- Filters -->
  {#if data.tags.length > 0 || years.length > 0}
    <div class="flex flex-wrap gap-3">
      {#if years.length > 0}
        <div class="flex items-center gap-2">
          <span class="text-sm text-navy-400">Year:</span>
          <button
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              {filterYear === null ? 'bg-ocean-500 text-white' : 'bg-sand-100 text-navy-500 hover:bg-sand-200'}"
            onclick={() => filterYear = null}
          >
            All
          </button>
          {#each years as year}
            <button
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                {filterYear === year ? 'bg-ocean-500 text-white' : 'bg-sand-100 text-navy-500 hover:bg-sand-200'}"
              onclick={() => filterYear = year}
            >
              {year}
            </button>
          {/each}
        </div>
      {/if}

      {#if data.tags.length > 0}
        <div class="flex items-center gap-2">
          <span class="text-sm text-navy-400">Tag:</span>
          <button
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              {filterTag === null ? 'bg-ocean-500 text-white' : 'bg-sand-100 text-navy-500 hover:bg-sand-200'}"
            onclick={() => filterTag = null}
          >
            All
          </button>
          {#each data.tags as tag}
            <button
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style="background-color: {filterTag === tag.id ? tag.color : '#F5E6D3'}; color: {filterTag === tag.id ? 'white' : '#1A2B3C'}"
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
    <div class="text-center py-16 glass rounded-3xl">
      <div class="h-16 w-16 mx-auto rounded-full bg-sand-100 flex items-center justify-center mb-4">
        <svg class="h-8 w-8 text-navy-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-navy-600">No adventures yet</h3>
      {#if data.user}
        <p class="text-navy-400 mt-2">Start documenting your family's journeys!</p>
        <a href="/adventures/create" class="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-ocean-500 text-white text-sm font-medium hover:bg-ocean-600 transition-colors">
          Create First Adventure
        </a>
      {:else}
        <p class="text-navy-400 mt-2">Sign in to start documenting your family's journeys!</p>
        <a href="/auth/login" class="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-ocean-500 text-white text-sm font-medium hover:bg-ocean-600 transition-colors">
          Sign In
        </a>
      {/if}
    </div>
  {:else}
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each filteredAdventures as adventure}
        <div 
          role="link"
          tabindex="0"
          onclick={() => goto(`/adventures/${adventure.slug}`)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') goto(`/adventures/${adventure.slug}`); }}
          class="group glass rounded-3xl overflow-hidden card-hover cursor-pointer"
        >
          <!-- Cover Image -->
          <div class="relative h-48 bg-gradient-to-br from-ocean-100 to-ocean-200 overflow-hidden">
            {#if adventure.cover_asset_id}
              <img
                src={getImmichAssetUrl(adventure.cover_asset_id, true)}
                alt={adventure.title}
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            {:else}
              <div class="w-full h-full flex items-center justify-center">
                <svg class="h-16 w-16 text-ocean-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            {/if}
            
            <!-- Location badge -->
            {#if adventure.location_name}
              <div class="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-navy-600 backdrop-blur-sm">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {adventure.location_name}
              </div>
            {/if}
            {#if adventure.is_draft}
              <div class="absolute top-3 left-3 inline-flex items-center rounded-full bg-sunset-500/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                Draft
              </div>
            {/if}
          </div>

          <!-- Content -->
          <div class="p-5">
            <div class="flex items-center gap-2 text-xs text-navy-400 mb-2">
              {#if adventure.start_date}
                <time datetime={adventure.start_date}>{formatDate(adventure.start_date)}</time>
                {#if adventure.end_date && adventure.end_date !== adventure.start_date}
                  <span>-</span>
                  <time datetime={adventure.end_date}>{formatDate(adventure.end_date)}</time>
                {/if}
              {:else}
                <span>{timeAgo(adventure.created_at)}</span>
              {/if}
            </div>
            
            <h2 class="text-lg font-semibold text-navy-600 group-hover:text-ocean-600 transition-colors line-clamp-2">
              {adventure.title}
            </h2>
            
            {#if adventure.description}
              <p class="text-sm text-navy-400 mt-2 line-clamp-2">
                {adventure.description}
              </p>
            {/if}

            <!-- Tags -->
            {#if adventure.tags && adventure.tags.length > 0}
              <div class="flex flex-wrap gap-2 mt-3">
                {#each adventure.tags.slice(0, 3) as tag}
                  <span 
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                    style="background-color: {tag.color}20; color: {tag.color}"
                  >
                    {tag.name}
                  </span>
                {/each}
              </div>
            {/if}

            <!-- Author -->
            <div class="flex items-center justify-between mt-4 pt-4 border-t border-sand-100">
              <div class="flex items-center gap-2">
                <div class="h-6 w-6 rounded-full bg-gradient-to-br from-coral-400 to-sunset-400 flex items-center justify-center text-white text-xs font-medium">
                  {adventure.author_name.charAt(0).toUpperCase()}
                </div>
                <span class="text-xs text-navy-400">{adventure.author_name}</span>
              </div>
              {#if data.user && data.user.id === adventure.author_id}
                <a
                  href="/adventures/{adventure.slug}/edit"
                  class="text-xs text-ocean-500 hover:text-ocean-600 font-medium"
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
