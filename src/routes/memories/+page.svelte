<script lang="ts">
  import type { PageData } from './$types';
  import { formatDate } from '$lib/shared/utils';
  import { getImmichAssetUrl } from '$lib/shared/immich';
  
  let { data } = $props();
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();
</script>

<svelte:head>
  <title>On This Day | Family Adventures</title>
</svelte:head>

<div class="space-y-8">
  <div>
    <p class="text-sm uppercase tracking-wider text-ocean-500 font-medium">Memories</p>
    <h1 class="text-3xl md:text-4xl font-display font-semibold text-navy-600 mt-2">
      On This Day
    </h1>
    <p class="text-navy-400 mt-2">
      Reliving adventures from years past
    </p>
  </div>

  {#if data.memories.length === 0}
    <div class="text-center py-16 glass rounded-3xl">
      <div class="h-16 w-16 mx-auto rounded-full bg-sand-100 flex items-center justify-center mb-4">
        <svg class="h-8 w-8 text-navy-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-navy-600">No memories for today</h3>
      <p class="text-navy-400 mt-2">Check back another day to see past adventures!</p>
    </div>
  {:else}
    <div class="space-y-8">
      {#each data.memories as yearGroup}
        <div class="glass rounded-3xl overflow-hidden">
          <div class="bg-gradient-to-r from-ocean-500 to-ocean-600 px-6 py-4">
            <h2 class="text-xl font-semibold text-white">
              {yearGroup.year} • {yearGroup.monthName} {yearGroup.day}
            </h2>
            <p class="text-white/80 text-sm">
              {yearGroup.adventures.length} adventure{yearGroup.adventures.length !== 1 ? 's' : ''} on this day
            </p>
          </div>
          
          <div class="p-6">
            <div class="grid gap-4 md:grid-cols-2">
              {#each yearGroup.adventures as adventure}
                <a 
                  href="/adventures/{adventure.slug}"
                  class="flex gap-4 p-4 rounded-2xl hover:bg-sand-50 transition-colors group"
                >
                  <div class="h-20 w-20 rounded-xl bg-gradient-to-br from-ocean-100 to-ocean-200 flex-shrink-0 overflow-hidden">
                    {#if adventure.cover_asset_id}
                      <img
                        src={getImmichAssetUrl(adventure.cover_asset_id, true)}
                        alt={adventure.title}
                        class="w-full h-full object-cover"
                      />
                    {:else}
                      <div class="w-full h-full flex items-center justify-center">
                        <svg class="h-8 w-8 text-ocean-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    {/if}
                  </div>
                  <div class="min-w-0 flex-1">
                    <h3 class="font-semibold text-navy-600 group-hover:text-ocean-600 transition-colors truncate">
                      {adventure.title}
                    </h3>
                    <p class="text-sm text-navy-400 mt-1">
                      {adventure.location_name || 'No location'}
                    </p>
                    {#if adventure.description}
                      <p class="text-xs text-navy-400 mt-2 line-clamp-2">
                        {adventure.description}
                      </p>
                    {/if}
                  </div>
                </a>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Upcoming Anniversaries -->
  {#if data.upcomingAnniversaries.length > 0}
    <div class="glass rounded-3xl p-6">
      <h2 class="text-lg font-semibold text-navy-600 mb-4">Upcoming Anniversaries</h2>
      <div class="space-y-3">
        {#each data.upcomingAnniversaries as anniversary}
          <div class="flex items-center gap-4 p-3 rounded-xl bg-sand-50">
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-sunset-100 to-sunset-200 flex items-center justify-center flex-shrink-0">
              <span class="text-2xl">🎂</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-navy-600 truncate">{anniversary.title}</p>
              <p class="text-sm text-navy-400">
                {anniversary.yearsAgo} year{anniversary.yearsAgo !== 1 ? 's' : ''} ago • {formatDate(anniversary.start_date)}
              </p>
            </div>
            <a 
              href="/adventures/{anniversary.slug}"
              class="text-sm text-ocean-500 hover:text-ocean-600"
            >
              View →
            </a>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
