<script lang="ts">
  import type { PageData } from './$types';
  import { formatDate } from '$lib/shared/utils';
  import { getImmichAssetUrl } from '$lib/shared/immich';
  
  let { data } = $props();
</script>

<svelte:head>
  <title>{data.adventure.title} | Family Adventures</title>
  <meta name="description" content={data.adventure.description || data.adventure.title} />
  
  <!-- Open Graph for social sharing -->
  <meta property="og:title" content={data.adventure.title} />
  <meta property="og:description" content={data.adventure.description || ''} />
  {#if data.adventure.cover_asset_id}
    <meta property="og:image" content="{data.siteUrl}/api/immich/asset/{data.adventure.cover_asset_id}" />
  {/if}
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Family Adventures" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.adventure.title} />
  <meta name="twitter:description" content={data.adventure.description || ''} />
  {#if data.adventure.cover_asset_id}
    <meta name="twitter:image" content="{data.siteUrl}/api/immich/asset/{data.adventure.cover_asset_id}" />
  {/if}
</svelte:head>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="text-center mb-8">
    <a href="/" class="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-navy-600 mb-4 transition-colors">
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Family Adventures
    </a>
    <p class="text-xs text-navy-400 uppercase tracking-wider">Shared Adventure</p>
  </div>

  <!-- Hero -->
  <div class="relative rounded-3xl overflow-hidden mb-8">
    {#if data.adventure.cover_asset_id}
      <img
        src={getImmichAssetUrl(data.adventure.cover_asset_id)}
        alt={data.adventure.title}
        class="w-full h-64 md:h-96 object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
    {:else}
      <div class="w-full h-64 md:h-96 bg-gradient-to-br from-ocean-400 to-ocean-600"></div>
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

  <!-- Description -->
  {#if data.adventure.description}
    <div class="glass rounded-2xl p-6 mb-8">
      <p class="text-lg text-navy-500 leading-relaxed">{data.adventure.description}</p>
    </div>
  {/if}

  <!-- Content -->
  {#if data.adventure.content}
    <div class="prose prose-lg max-w-none mb-8">
      {@html data.adventure.content}
    </div>
  {/if}

  <!-- Media Gallery -->
  {#if data.adventure.media && data.adventure.media.length > 0}
    <div class="mb-8">
      <h2 class="text-xl font-semibold text-navy-600 mb-4">Photos & Videos</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#each data.adventure.media as media}
          <div class="relative aspect-square rounded-2xl overflow-hidden group">
            <img
              src={getImmichAssetUrl(media.immich_asset_id, true)}
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

  <!-- Footer -->
  <div class="text-center py-8 border-t border-sand-200">
    <p class="text-sm text-navy-400">
      Shared with love from 
      <a href="/" class="text-ocean-500 hover:text-ocean-600">Family Adventures</a>
    </p>
  </div>
</div>
