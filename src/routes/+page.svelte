<script lang="ts">
  import { onMount } from 'svelte';

  let { data } = $props();

  const heroImages = $derived(data.heroImages || []);
  let heroIndex = $state(0);
  let fade = $state(true);

  function imageUrl(img: { file_path: string | null; immich_asset_id: string | null }) {
    if (img.file_path) return `/uploads/${img.file_path}`;
    return '';
  }

  onMount(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      fade = false;
      setTimeout(() => {
        heroIndex = (heroIndex + 1) % heroImages.length;
        fade = true;
      }, 600);
    }, 6000);
    return () => clearInterval(interval);
  });
</script>

<div class="relative">
  <!-- Hero Section -->
  <div class="relative h-[70vh] min-h-[520px] flex items-center overflow-hidden">
    <!-- Background Images -->
    {#if heroImages.length > 0}
      {#each heroImages.slice(0, 6) as img, i}
        {@const src = imageUrl(img)}
        {#if src}
          <div
            class="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out {i === heroIndex && fade ? 'opacity-100' : 'opacity-0'}"
          >
            <img {src} alt="" class="h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        {/if}
      {/each}
      <!-- Gradient overlays -->
      <div class="absolute inset-0 bg-gradient-to-b from-navy-900/70 via-navy-900/40 to-navy-900/80"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-ocean-900/30 to-transparent"></div>
    {:else}
      <!-- Fallback animated gradient -->
      <div class="absolute inset-0 bg-gradient-to-br from-ocean-500 via-ocean-400 to-coral-400 wave-animation"></div>
      <div class="absolute inset-0 bg-navy-900/30"></div>
    {/if}

    <!-- Hero Content -->
    <div class="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 w-full">
      <div class="max-w-2xl space-y-6">
        <div class="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-4 py-2 text-sm text-white/90 border border-white/10">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Our family's digital keepsake
        </div>

        <h1 class="text-4xl md:text-6xl font-display font-semibold text-white leading-tight drop-shadow-lg">
          Every journey tells a
          <span class="text-sunset-300">story</span>
        </h1>

        <p class="text-lg text-white/80 max-w-lg drop-shadow">
          A place to collect our family's adventures, from weekend getaways to far-flung explorations. Photos, stories, and memories—all in one beautiful space.
        </p>

        <div class="flex flex-wrap gap-4 pt-2">
          <a href="/adventures" class="inline-flex items-center gap-2 rounded-full bg-ocean-500 px-6 py-3 text-sm font-medium text-white hover:bg-ocean-600 transition-colors shadow-lg shadow-ocean-500/30">
            View Adventures
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a href="/map" class="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/25 transition-colors">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Explore Map
          </a>
        </div>
      </div>
    </div>

    <!-- Wave bottom -->
    <div class="absolute bottom-0 left-0 right-0 z-10">
      <svg class="w-full h-12 md:h-16 text-sand-50" viewBox="0 0 1200 60" preserveAspectRatio="none">
        <path d="M0,30 Q200,60 400,30 T800,30 T1200,30 L1200,60 L0,60 Z" fill="currentColor" />
      </svg>
    </div>
  </div>

  <!-- Stats Bar -->
  <div class="bg-sand-50">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
      <div class="glass rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 shadow-lg">
        <div class="text-center">
          <p class="text-2xl font-display font-bold text-ocean-500">{stats.total_adventures}</p>
          <p class="text-xs text-navy-400 mt-1">Adventures</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-display font-bold text-coral-500">{stats.total_contributors}</p>
          <p class="text-xs text-navy-400 mt-1">Contributors</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-display font-bold text-sunset-500">{heroImages.length}</p>
          <p class="text-xs text-navy-400 mt-1">Photos</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-display font-bold text-navy-500">&infin;</p>
          <p class="text-xs text-navy-400 mt-1">Memories</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Recent Adventures Photo Mosaic -->
  {#if heroImages.length > 0}
    <div class="bg-sand-50 py-12">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-display font-semibold text-navy-600">Recent Snapshots</h2>
          <a href="/adventures" class="text-sm text-ocean-500 hover:text-ocean-600 font-medium transition-colors">
            View all &rarr;
          </a>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {#each heroImages as img, i}
            {@const src = imageUrl(img)}
            {#if src}
              <a
                href="/adventures/{img.slug}"
                class="group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] {i === 0 ? 'md:col-span-2 md:row-span-2' : ''}"
              >
                <img {src} alt={img.adventure_title} class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div class="absolute inset-0 bg-gradient-to-t from-navy-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <p class="absolute bottom-0 left-0 right-0 p-3 text-xs font-medium text-white translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  {img.adventure_title}
                </p>
              </a>
            {/if}
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Features Section -->
  <div class="bg-sand-50 pb-16">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Card 1 -->
        <a href="/adventures" class="glass rounded-3xl p-6 card-hover group">
          <div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-ocean-400 to-ocean-500 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="font-semibold text-navy-600">Photos & Videos</h3>
          <p class="text-sm text-navy-400 mt-2">Store your memories securely</p>
        </a>

        <!-- Card 2 -->
        <a href="/bucket-list" class="glass rounded-3xl p-6 card-hover group">
          <div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-coral-400 to-coral-500 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 class="font-semibold text-navy-600">Bucket List</h3>
          <p class="text-sm text-navy-400 mt-2">Dream up your next adventure</p>
        </a>

        <!-- Card 3 -->
        <a href="/map" class="glass rounded-3xl p-6 card-hover group">
          <div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-sunset-400 to-sunset-500 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 class="font-semibold text-navy-600">Map</h3>
          <p class="text-sm text-navy-400 mt-2">See where you've been</p>
        </a>

        <!-- Card 4 -->
        <a href="/on-this-day" class="glass rounded-3xl p-6 card-hover group">
          <div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-ocean-300 to-ocean-400 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="font-semibold text-navy-600">Memories</h3>
          <p class="text-sm text-navy-400 mt-2">Relive past adventures</p>
        </a>
      </div>
    </div>
  </div>
</div>
