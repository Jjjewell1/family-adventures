<script lang="ts">
  import type { PageData } from './$types';
  import { formatDate } from '$lib/shared/utils';
  
  let { data } = $props();
</script>

<svelte:head>
  <title>{data.adventure.title} | Family Adventures</title>
  <meta name="description" content={data.adventure.description || data.adventure.title} />
  
  <meta property="og:title" content={data.adventure.title} />
  <meta property="og:description" content={data.adventure.description || ''} />
  {#if data.adventure.cover_file_path}
    <meta property="og:image" content="{data.siteUrl}{data.adventure.cover_file_path}" />
  {/if}
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Family Adventures" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.adventure.title} />
  <meta name="twitter:description" content={data.adventure.description || ''} />
  {#if data.adventure.cover_file_path}
    <meta name="twitter:image" content="{data.siteUrl}{data.adventure.cover_file_path}" />
  {/if}
</svelte:head>

<div class="max-w-4xl mx-auto">
  <div class="text-center mb-8">
    <a href="/" class="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-600 mb-4 transition-colors">
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Family Adventures
    </a>
    <p class="text-xs text-ink-300 uppercase tracking-wider">Shared Adventure</p>
  </div>

  <div class="relative rounded-2xl overflow-hidden mb-8">
    {#if data.adventure.cover_file_path}
      <img
        src={data.adventure.cover_file_path}
        alt={data.adventure.title}
        class="w-full h-64 md:h-96 object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
    {:else}
      <div class="w-full h-64 md:h-96 bg-gradient-to-br from-forest-400 to-terra-400"></div>
    {/if}
    
    <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8">
      <h1 class="text-3xl md:text-4xl font-display font-semibold text-white mb-2">
        {data.adventure.title}
      </h1>

      <div class="flex flex-wrap items-center gap-4 text-white/80 text-sm">
        {#if data.adventure.start_date}
          <span class="flex items-center gap-1.5">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(data.adventure.start_date)}
            {#if data.adventure.end_date && data.adventure.end_date !== data.adventure.start_date}
              - {formatDate(data.adventure.end_date)}
            {/if}
          </span>
        {/if}

        {#if data.adventure.location_name}
          <span class="flex items-center gap-1.5">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {data.adventure.location_name}
          </span>
        {/if}
      </div>
    </div>
  </div>

  {#if data.adventure.description}
    <div class="card p-6 mb-8">
      <p class="text-lg text-ink-500 leading-relaxed dark:text-cream-200">{data.adventure.description}</p>
    </div>
  {/if}

  {#if data.adventure.content}
    <div class="prose prose-lg max-w-none mb-8">
      {@html data.adventure.content}
    </div>
  {/if}

  {#if data.adventure.media && data.adventure.media.length > 0}
    <div class="mb-8">
      <h2 class="text-xl font-display font-semibold text-ink-800 dark:text-cream-100 mb-4">Photos & Videos</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#each data.adventure.media as media}
          <div class="relative aspect-square rounded-xl overflow-hidden group">
            <img
              src={`/api/media/image?path=${encodeURIComponent(media.file_path)}&w=480`}
              alt={media.caption || 'Adventure photo'}
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {#if media.caption}
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p class="absolute bottom-3 left-3 right-3 text-white text-sm">{media.caption}</p>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="text-center py-8 border-t border-cream-200 dark:border-ink-600">
    <p class="text-sm text-ink-400">
      Shared with love from 
      <a href="/" class="text-forest-500 hover:text-forest-600">Family Adventures</a>
    </p>
  </div>
</div>
