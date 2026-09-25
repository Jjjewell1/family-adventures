<script lang="ts">
  import { onMount } from 'svelte';

  let { data } = $props();

  const heroImages = $derived(data.heroImages || []);
  const stats = $derived(data.stats || { total_adventures: 0, total_contributors: 0, total_photos: 0, total_videos: 0 });
  let visible = $state(false);
  let statVisible = $state(false);
  let mosaicVisible = $state(false);
  let featuresVisible = $state(false);
  let heroIndex = $state(0);
  let fade = $state(true);

  // Full-bleed image for the rotating hero background
  function imageUrl(img: { file_path: string | null }) {
    return img.file_path
      ? `/api/media/image?path=${encodeURIComponent(img.file_path)}&w=1600`
      : '';
  }

  // Smaller tiles for the mosaic grid (thumbnails)
  function thumbUrl(img: { file_path: string | null }) {
    return img.file_path
      ? `/api/media/image?path=${encodeURIComponent(img.file_path)}&w=600`
      : '';
  }

  onMount(() => {
    requestAnimationFrame(() => { visible = true; });
    setTimeout(() => { statVisible = true; }, 300);
    setTimeout(() => { mosaicVisible = true; }, 600);
    setTimeout(() => { featuresVisible = true; }, 900);

    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      fade = false;
      setTimeout(() => {
        heroIndex = (heroIndex + 1) % heroImages.length;
        fade = true;
      }, 700);
    }, 5000);
    return () => clearInterval(interval);
  });
</script>

<div class="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
  <!-- Hero Section -->
  <div class="relative h-[62vh] min-h-[460px] flex items-end overflow-hidden bg-gradient-to-br from-forest-800 via-forest-700 to-forest-900">
    {#if heroImages.length > 0}
      <!-- Rotating featured pictures -->
      {#each heroImages.slice(0, 6) as img, i}
        {@const src = imageUrl(img)}
        {#if src}
          <div class="absolute inset-0 transition-all duration-[1400ms] ease-in-out {i === heroIndex && fade ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}">
            <img {src} alt="" class="h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} fetchpriority={i === 0 ? 'high' : 'auto'} />
          </div>
        {/if}
      {/each}
    {/if}
    <!-- Legibility scrim -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10"></div>
    <div class="absolute inset-0 bg-gradient-to-r from-forest-900/45 to-transparent"></div>
    <div class="absolute inset-0 bg-forest-900/20"></div>
    <!-- Subtle topographic lines -->
    <div class="absolute inset-0 opacity-10" style="background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260' viewBox='0 0 260 260'%3E%3Cg fill='none' stroke='%23FFFFFF' stroke-opacity='0.35' stroke-width='1'%3E%3Cpath d='M20 140c40-30 90-30 130 0s90 30 130 0'/%3E%3Cpath d='M30 160c40-24 80-24 110 0'/%3E%3Cpath d='M40 180c30-20 70-20 100 0'/%3E%3Cpath d='M90 110c30-18 70-18 110 0'/%3E%3Cpath d='M110 90c30-14 50-14 70 0'/%3E%3Cpath d='M60 200c40-16 80-16 120 0'/%3E%3C/g%3E%3C/svg%3E&quot;);background-repeat:repeat;"></div>

    <!-- Floating decorative dots -->
    <div class="absolute top-20 right-10 h-3 w-3 rounded-full bg-gold-400/40 {visible ? 'animate-bounce' : ''}" style="animation-delay: 1s; animation-duration: 3s;"></div>
    <div class="absolute top-32 right-32 h-2 w-2 rounded-full bg-cream-200/40 {visible ? 'animate-bounce' : ''}" style="animation-delay: 2s; animation-duration: 4s;"></div>
    <div class="absolute bottom-40 right-20 h-4 w-4 rounded-full bg-terra-400/30 {visible ? 'animate-bounce' : ''}" style="animation-delay: 0.5s; animation-duration: 3.5s;"></div>

    <!-- Hero Content -->
    <div class="relative z-10 mx-auto px-4 sm:px-6 lg:px-8 pb-14 w-full">
      <div class="max-w-xl space-y-5 {visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} transition-all duration-1000 ease-out">
        <div class="flex items-center gap-3">
          <div class="h-px w-12 bg-gold-400/70"></div>
          <span class="text-xs font-semibold text-gold-300 uppercase tracking-[0.22em]">Family Adventures</span>
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white leading-[1.08]" style="letter-spacing:-0.01em;">
          Every journey<br/>tells a <span class="relative inline-block">
            <span class="italic text-gold-300">story</span>
            <svg class="absolute -bottom-1 left-0 w-full h-3 text-gold-400/70" viewBox="0 0 120 12" preserveAspectRatio="none">
              <path d="M0 8 C30 2, 60 12, 120 4" stroke="currentColor" stroke-width="2" fill="none" />
            </svg>
          </span>
        </h1>
        <p class="text-base md:text-lg text-white/75 max-w-md leading-relaxed">
          Our family's collection of adventures, photos, and memories — all in one beautiful place.
        </p>
        <div class="flex flex-wrap gap-3 pt-1">
          <a href="/adventures" class="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gold-500 text-ink-900 font-semibold text-sm hover:bg-gold-400 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/30">
            View Adventures
            <svg class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a href="/map" class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 border border-white/25 text-white font-medium text-sm hover:bg-white/20 backdrop-blur-sm transition-all duration-300">
            Explore Map
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats Bar -->
  <div class="mx-auto px-4 sm:px-6 lg:px-8">
    <div class="card -mt-10 relative z-10 p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 {statVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} transition-all duration-700 ease-out">
      <div class="text-center group">
        <div class="relative inline-block">
          <p class="text-3xl md:text-4xl font-display font-bold text-forest-500 tabular-nums">{stats.total_adventures}</p>
          <div class="absolute -inset-2 rounded-full bg-forest-500/5 scale-0 group-hover:scale-100 transition-transform duration-300"></div>
        </div>
        <p class="text-xs font-medium text-ink-500 mt-1.5 uppercase tracking-wider">Adventures</p>
      </div>
      <div class="text-center group">
        <div class="relative inline-block">
          <p class="text-3xl md:text-4xl font-display font-bold text-terra-500 tabular-nums">{stats.total_contributors}</p>
          <div class="absolute -inset-2 rounded-full bg-terra-500/5 scale-0 group-hover:scale-100 transition-transform duration-300"></div>
        </div>
        <p class="text-xs font-medium text-ink-500 mt-1.5 uppercase tracking-wider">Contributors</p>
      </div>
      <div class="text-center group">
        <div class="relative inline-block">
          <p class="text-3xl md:text-4xl font-display font-bold text-gold-500 tabular-nums">{stats.total_photos || 0}</p>
          <div class="absolute -inset-2 rounded-full bg-gold-500/5 scale-0 group-hover:scale-100 transition-transform duration-300"></div>
        </div>
        <p class="text-xs font-medium text-ink-500 mt-1.5 uppercase tracking-wider">Photos</p>
      </div>
      <div class="text-center group">
        <div class="relative inline-block">
          <p class="text-3xl md:text-4xl font-display font-bold text-ink-500 tabular-nums">{stats.total_videos || 0}</p>
          <div class="absolute -inset-2 rounded-full bg-ink-400/5 scale-0 group-hover:scale-100 transition-transform duration-300"></div>
        </div>
        <p class="text-xs font-medium text-ink-500 mt-1.5 uppercase tracking-wider">Videos</p>
      </div>
    </div>
  </div>

  <!-- Recent Snapshots Mosaic -->
  {#if heroImages.length > 0}
    <div class="mx-auto px-4 sm:px-6 lg:px-8 pb-12 {mosaicVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} transition-all duration-700 ease-out">
      <div class="flex items-center justify-between mb-5 gap-4">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-forest-100 dark:bg-forest-900/70 flex items-center justify-center ring-1 ring-forest-200 dark:ring-forest-800">
            <svg class="h-5 w-5 text-forest-600 dark:text-forest-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl md:text-2xl font-display font-bold text-cream-50 dark:text-cream-100">Recent Snapshots</h2>
            <p class="text-sm text-cream-200/90 capitalize">Discover your latest adventures</p>
          </div>
        </div>
        <a href="/adventures" class="group hidden sm:inline-flex items-center gap-2 shrink-0 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-cream-100 backdrop-blur-sm hover:bg-white/20 hover:border-white/30 dark:text-cream-200 font-medium text-sm transition-all duration-300">
          View all adventures
          <svg class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl">
        {#each heroImages as img, i}
          {@const src = thumbUrl(img)}
          {#if src}
            <a
              href="/adventures/{img.slug}"
              class="group relative rounded-2xl overflow-hidden border border-cream-200 dark:border-ink-700 {i === 0 ? 'md:col-span-2 md:row-span-2' : 'aspect-square hover:shadow-xl hover:shadow-forest-900/15'}"
            >
              <img src={src} alt={img.adventure_title} class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" loading="lazy" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div class="absolute bottom-0 left-0 right-0 p-4 md:p-6 translate-y-1 group-hover:translate-y-0 transition-transform duration-500 ease-out">
                <p class="text-sm md:text-base font-semibold text-white drop-shadow-sm">{img.adventure_title}</p>
                <div class="h-1.5 w-10 rounded-full bg-gold-400/80 mt-2"></div>
              </div>
              <!-- Corner accent -->
              <div class="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </div>
            </a>
          {/if}
        {/each}
      </div>
    </div>
  {/if}

  <!-- Features Section -->
  <div class="mx-auto px-4 sm:px-6 lg:px-8 pb-16 {featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} transition-all duration-700 ease-out">
    <div class="flex items-center gap-6 mb-5">
      <div class="flex-1 h-px bg-gradient-to-r from-transparent to-white/25 dark:to-white/20"></div>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-cream-100/85">What's inside</p>
      <div class="flex-1 h-px bg-gradient-to-l from-transparent to-white/25 dark:to-white/20"></div>
    </div>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <a href="/adventures" class="group card p-6 border-t-2 border-forest-400 hover:border-forest-500 transition-all duration-300 hover:shadow-lg hover:shadow-forest-500/5 hover:-translate-y-0.5">
        <div class="relative">
          <div class="h-12 w-12 rounded-2xl bg-forest-50 dark:bg-forest-900/50 flex items-center justify-center text-forest-500 mb-4 group-hover:bg-forest-500 group-hover:text-white transition-all duration-300 group-hover:rounded-xl dark:group-hover:bg-forest-800">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-forest-100 dark:bg-forest-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100">
            <svg class="h-3 w-3 text-forest-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
        <h3 class="font-semibold text-ink-800 dark:text-cream-100">Photos & Videos</h3>
        <p class="text-sm text-ink-500 mt-1">Store your memories securely</p>
      </a>

      <a href="/people" class="group card p-6 border-t-2 border-terra-400 hover:border-terra-500 transition-all duration-300 hover:shadow-lg hover:shadow-terra-500/5 hover:-translate-y-0.5">
        <div class="relative">
          <div class="h-12 w-12 rounded-2xl bg-terra-50 dark:bg-terra-900/50 flex items-center justify-center text-terra-500 mb-4 group-hover:bg-terra-500 group-hover:text-white transition-all duration-300 group-hover:rounded-xl dark:group-hover:bg-terra-800">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div class="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-terra-100 dark:bg-terra-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100">
            <svg class="h-3 w-3 text-terra-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
        <h3 class="font-semibold text-ink-800 dark:text-cream-100">People</h3>
        <p class="text-sm text-ink-500 mt-1">Tag and find everyone</p>
      </a>

      <a href="/map" class="group card p-6 border-t-2 border-gold-400 hover:border-gold-500 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/5 hover:-translate-y-0.5">
        <div class="relative">
          <div class="h-12 w-12 rounded-2xl bg-gold-50 dark:bg-gold-900/50 flex items-center justify-center text-gold-500 mb-4 group-hover:bg-gold-500 group-hover:text-white transition-all duration-300 group-hover:rounded-xl dark:group-hover:bg-gold-800">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div class="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gold-100 dark:bg-gold-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100">
            <svg class="h-3 w-3 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
        <h3 class="font-semibold text-ink-800 dark:text-cream-100">Map</h3>
        <p class="text-sm text-ink-500 mt-1">See where you've been</p>
      </a>

      <a href="/bucket-list" class="group card p-6 border-t-2 border-ink-300 hover:border-ink-400 transition-all duration-300 hover:shadow-lg hover:shadow-ink-500/5 hover:-translate-y-0.5">
        <div class="relative">
          <div class="h-12 w-12 rounded-2xl bg-cream-100 dark:bg-ink-700/50 flex items-center justify-center text-ink-500 mb-4 group-hover:bg-ink-500 group-hover:text-white transition-all duration-300 group-hover:rounded-xl dark:group-hover:bg-ink-600">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div class="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-cream-200 dark:bg-ink-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100">
            <svg class="h-3 w-3 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
        <h3 class="font-semibold text-ink-800 dark:text-cream-100">Bucket List</h3>
        <p class="text-sm text-ink-500 mt-1">Dream up your next adventure</p>
      </a>
    </div>
  </div>

  <!-- Closing rule -->
  <div class="mx-auto px-4 sm:px-6 lg:px-8 pb-8">
    <div class="flex items-center gap-4">
      <div class="flex-1 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent dark:via-white/20"></div>
      <div class="flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-forest-400 dark:bg-forest-700"></div>
        <div class="h-1.5 w-1.5 rounded-full bg-terra-400 dark:bg-terra-700"></div>
        <div class="h-2 w-2 rounded-full bg-gold-400 dark:bg-gold-700"></div>
      </div>
      <div class="flex-1 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent dark:via-white/20"></div>
    </div>
  </div>
</div>