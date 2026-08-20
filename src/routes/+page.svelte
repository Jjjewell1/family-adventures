<script lang="ts">
  import { onMount } from 'svelte';

  let { data } = $props();

  const heroImages = $derived(data.heroImages || []);
  const stats = $derived(data.stats || { total_adventures: 0, total_contributors: 0 });
  let heroIndex = $state(0);
  let fade = $state(true);

  function imageUrl(img: { file_path: string | null }) {
    return img.file_path || '';
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

<div class="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
  <!-- Hero Section -->
  <div class="relative h-[65vh] min-h-[480px] flex items-end overflow-hidden bg-ink-800">
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
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10"></div>
    {:else}
      <div class="absolute inset-0 bg-gradient-to-br from-forest-800 to-ink-800"></div>
    {/if}

    <!-- Hero Content -->
    <div class="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16 w-full">
      <div class="max-w-xl space-y-4">
        <h1 class="text-4xl md:text-5xl font-display font-semibold text-white leading-tight">
          Every journey tells a <span class="italic text-gold-300">story</span>
        </h1>
        <p class="text-base text-white/80 max-w-md">
          Our family's collection of adventures, photos, and memories — all in one place.
        </p>
        <div class="flex flex-wrap gap-3 pt-2">
          <a href="/adventures" class="btn-primary">
            View Adventures
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a href="/map" class="btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20">
            Explore Map
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats Bar -->
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <div class="card -mt-10 relative z-10 p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
      <div class="text-center">
        <p class="text-3xl font-display font-semibold text-forest-500">{stats.total_adventures}</p>
        <p class="text-xs font-medium text-ink-400 mt-1 uppercase tracking-wide">Adventures</p>
      </div>
      <div class="text-center">
        <p class="text-3xl font-display font-semibold text-terra-500">{stats.total_contributors}</p>
        <p class="text-xs font-medium text-ink-400 mt-1 uppercase tracking-wide">Contributors</p>
      </div>
      <div class="text-center">
        <p class="text-3xl font-display font-semibold text-gold-500">{heroImages.length}</p>
        <p class="text-xs font-medium text-ink-400 mt-1 uppercase tracking-wide">Photos</p>
      </div>
      <div class="text-center">
        <p class="text-3xl font-display font-semibold text-ink-400">&infin;</p>
        <p class="text-xs font-medium text-ink-400 mt-1 uppercase tracking-wide">Memories</p>
      </div>
    </div>
  </div>

  <!-- Recent Adventures Photo Mosaic -->
  {#if heroImages.length > 0}
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14">
      <div class="flex items-baseline justify-between mb-6">
        <h2 class="text-2xl font-display font-semibold text-ink-800 dark:text-cream-100">Recent Snapshots</h2>
        <a href="/adventures" class="text-sm text-forest-500 hover:text-forest-600 font-medium transition-colors">
          View all &rarr;
        </a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {#each heroImages as img, i}
          {@const src = imageUrl(img)}
          {#if src}
            <a
              href="/adventures/{img.slug}"
              class="group relative aspect-square rounded-xl overflow-hidden {i === 0 ? 'md:col-span-2 md:row-span-2' : ''}"
            >
              <img {src} alt={img.adventure_title} class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <p class="absolute bottom-0 left-0 right-0 p-3 text-xs font-medium text-white translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                {img.adventure_title}
              </p>
            </a>
          {/if}
        {/each}
      </div>
    </div>
  {/if}

  <!-- Features Section -->
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <a href="/adventures" class="card p-6 group border-t-2 border-forest-400">
        <div class="h-11 w-11 rounded-lg bg-forest-50 flex items-center justify-center text-forest-500 mb-4 group-hover:bg-forest-500 group-hover:text-white transition-colors dark:bg-forest-900 dark:text-forest-300">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="font-semibold text-ink-800 dark:text-cream-100">Photos & Videos</h3>
        <p class="text-sm text-ink-400 mt-1">Store your memories securely</p>
      </a>

      <a href="/bucket-list" class="card p-6 group border-t-2 border-terra-400">
        <div class="h-11 w-11 rounded-lg bg-terra-50 flex items-center justify-center text-terra-500 mb-4 group-hover:bg-terra-500 group-hover:text-white transition-colors dark:bg-terra-900 dark:text-terra-300">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h3 class="font-semibold text-ink-800 dark:text-cream-100">Bucket List</h3>
        <p class="text-sm text-ink-400 mt-1">Dream up your next adventure</p>
      </a>

      <a href="/map" class="card p-6 group border-t-2 border-gold-400">
        <div class="h-11 w-11 rounded-lg bg-gold-50 flex items-center justify-center text-gold-500 mb-4 group-hover:bg-gold-500 group-hover:text-white transition-colors dark:bg-gold-900 dark:text-gold-300">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 class="font-semibold text-ink-800 dark:text-cream-100">Map</h3>
        <p class="text-sm text-ink-400 mt-1">See where you've been</p>
      </a>

      <a href="/memories" class="card p-6 group border-t-2 border-ink-400">
        <div class="h-11 w-11 rounded-lg bg-cream-100 flex items-center justify-center text-ink-400 mb-4 group-hover:bg-ink-500 group-hover:text-white transition-colors dark:bg-ink-700 dark:text-ink-300">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="font-semibold text-ink-800 dark:text-cream-100">Memories</h3>
        <p class="text-sm text-ink-400 mt-1">Relive past adventures</p>
      </a>
    </div>
  </div>
</div>
