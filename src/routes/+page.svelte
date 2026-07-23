<script lang="ts">
  import type { LayoutData } from './$types';
  
  let { data } = $props();
</script>

<div class="relative overflow-hidden">
  <!-- Background decorations -->
  <div class="absolute inset-0 pointer-events-none">
    <div class="absolute top-20 left-10 h-64 w-64 rounded-full bg-ocean-200/30 blur-3xl wave-animation"></div>
    <div class="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-coral-200/20 blur-3xl wave-animation" style="animation-delay: -4s;"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-sunset-200/20 blur-3xl wave-animation" style="animation-delay: -2s;"></div>
  </div>

  <div class="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
    <div class="grid gap-12 lg:grid-cols-2 items-center">
      <!-- Left Column - Text -->
      <div class="space-y-8">
        <div class="inline-flex items-center gap-2 rounded-full bg-ocean-100 px-4 py-2 text-sm text-ocean-600">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Our family's digital keepsake
        </div>
        
        <h1 class="text-4xl md:text-6xl font-display font-semibold text-navy-600 leading-tight">
          Every journey tells a 
          <span class="gradient-text">story</span>
        </h1>
        
        <p class="text-lg text-navy-400 max-w-lg">
          A place to collect our family's adventures, from weekend getaways to far-flung explorations. Photos, stories, and memories—all in one beautiful space.
        </p>

        <div class="flex flex-wrap gap-4">
          <a href="/adventures" class="inline-flex items-center gap-2 rounded-full bg-ocean-500 px-6 py-3 text-sm font-medium text-white hover:bg-ocean-600 transition-colors">
            View Adventures
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a href="/map" class="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-6 py-3 text-sm font-medium text-navy-600 hover:bg-sand-50 transition-colors">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Explore Map
          </a>
        </div>
      </div>

      <!-- Right Column - Feature Cards -->
      <div class="relative">
        <div class="grid grid-cols-2 gap-4">
          <!-- Card 1 -->
          <div class="glass rounded-3xl p-6 card-hover">
            <div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-ocean-400 to-ocean-500 flex items-center justify-center text-white mb-4">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="font-semibold text-navy-600">Photos & Videos</h3>
            <p class="text-sm text-navy-400 mt-2">Store your memories securely</p>
          </div>

          <!-- Card 2 -->
          <div class="glass rounded-3xl p-6 card-hover mt-8">
            <div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-coral-400 to-coral-500 flex items-center justify-center text-white mb-4">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 class="font-semibold text-navy-600">Stories</h3>
            <p class="text-sm text-navy-400 mt-2">Write about your adventures</p>
          </div>

          <!-- Card 3 -->
          <div class="glass rounded-3xl p-6 card-hover">
            <div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-sunset-400 to-sunset-500 flex items-center justify-center text-white mb-4">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 class="font-semibold text-navy-600">Map</h3>
            <p class="text-sm text-navy-400 mt-2">See where you've been</p>
          </div>

          <!-- Card 4 -->
          <div class="glass rounded-3xl p-6 card-hover mt-8">
            <div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-ocean-300 to-ocean-400 flex items-center justify-center text-white mb-4">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="font-semibold text-navy-600">Memories</h3>
            <p class="text-sm text-navy-400 mt-2">Relive past adventures</p>
          </div>
        </div>

        <!-- Decorative wave -->
        <div class="absolute -bottom-4 left-0 right-0 h-8 overflow-hidden">
          <svg class="w-full h-full text-sand-100" viewBox="0 0 1200 40" preserveAspectRatio="none">
            <path d="M0,20 Q300,40 600,20 T1200,20 L1200,40 L0,40 Z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</div>
