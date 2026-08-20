<script lang="ts">
  import type { PageData } from './$types';
  import { formatDate } from '$lib/shared/utils';
  
  let { data } = $props();
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();
</script>

<svelte:head>
  <title>On This Day | Family Adventures</title>
</svelte:head>

<div class="space-y-8">
  <div class="page-header animate-in">
    <p class="page-header-label">Memories</p>
    <h1 class="page-header-title">On This Day</h1>
    <p class="page-header-desc">
      Reliving adventures from years past
    </p>
  </div>

  {#if data.memories.length === 0}
    <div class="text-center py-16 card">
      <div class="h-16 w-16 mx-auto rounded-full bg-cream-100 flex items-center justify-center mb-4">
        <svg class="h-8 w-8 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-ink-700">No memories for today</h3>
      <p class="text-ink-400 mt-2">Check back another day to see past adventures!</p>
    </div>
  {:else}
    <div class="space-y-8">
      {#each data.memories as yearGroup}
        <div class="card overflow-hidden">
          <div class="bg-forest-500 px-6 py-4 border-l-4 border-forest-600">
            <h2 class="text-xl font-semibold text-white">
              {yearGroup.year} • {yearGroup.monthName} {yearGroup.day}
            </h2>
            <p class="text-cream-100 text-sm">
              {yearGroup.adventures.length} adventure{yearGroup.adventures.length !== 1 ? 's' : ''} on this day
            </p>
          </div>
          
          <div class="p-6">
            <div class="grid gap-4 md:grid-cols-2">
              {#each yearGroup.adventures as adventure}
                <a 
                  href="/adventures/{adventure.slug}"
                  class="flex gap-4 p-4 rounded-2xl hover:bg-cream-50 transition-colors group"
                >
                  <div class="h-20 w-20 rounded-xl bg-cream-100 flex-shrink-0 overflow-hidden">
                    {#if adventure.cover_file_path}
                      <img
                        src={adventure.cover_file_path}
                        alt={adventure.title}
                        class="w-full h-full object-cover"
                      />
                    {:else}
                      <div class="w-full h-full flex items-center justify-center">
                        <svg class="h-8 w-8 text-forest-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    {/if}
                  </div>
                  <div class="min-w-0 flex-1">
                    <h3 class="font-semibold text-ink-700 group-hover:text-forest-600 transition-colors truncate">
                      {adventure.title}
                    </h3>
                    <p class="text-sm text-ink-400 mt-1">
                      {adventure.location_name || 'No location'}
                    </p>
                    {#if adventure.description}
                      <p class="text-xs text-ink-400 mt-2 line-clamp-2">
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
    <div class="card-flat p-6">
      <h2 class="text-lg font-semibold text-ink-700 mb-4">Upcoming Anniversaries</h2>
      <div class="space-y-3">
        {#each data.upcomingAnniversaries as anniversary}
          <div class="flex items-center gap-4 p-3 rounded-xl bg-cream-50">
            <div class="h-12 w-12 rounded-xl bg-gold-500 flex items-center justify-center flex-shrink-0">
              <span class="text-2xl">🎂</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-ink-700 truncate">{anniversary.title}</p>
              <p class="text-sm text-ink-400">
                {anniversary.yearsAgo} year{anniversary.yearsAgo !== 1 ? 's' : ''} ago • {formatDate(anniversary.start_date)}
              </p>
            </div>
            <a 
              href="/adventures/{anniversary.slug}"
              class="text-sm text-forest-500 hover:text-forest-600 font-medium"
            >
              View →
            </a>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
