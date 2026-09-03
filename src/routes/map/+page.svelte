<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { formatDate } from '$lib/shared/utils';
  
  let { data } = $props();
  let mapContainer: HTMLDivElement;
  let map: any;
  let L: any;

  function escapeHtml(str: string): string {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  onMount(async () => {
    if (typeof window === 'undefined') return;

    // Dynamic import for Leaflet
    L = await import('leaflet');
    
    // Initialize map centered on USA
    map = L.map(mapContainer, {
      maxBounds: [[-5, -170], [75, -50]],
      maxBoundsViscosity: 1.0,
      minZoom: 3,
      maxZoom: 18
    }).setView([39.8, -98.5], 4);

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Custom icon — been there (forest green)
    const beachIcon = L.divIcon({
      html: `<div class="h-8 w-8 rounded-full bg-forest-500 flex items-center justify-center text-white shadow-lg">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        </svg>
      </div>`,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    // Custom icon — bucket list (terracotta star)
    const bucketIcon = L.divIcon({
      html: `<div class="h-8 w-8 rounded-full bg-terra-500/90 border-2 border-white flex items-center justify-center text-white shadow-lg">
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </div>`,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    // Add markers for adventures with coordinates
    data.adventures.forEach((adventure: any) => {
      if (adventure.lat && adventure.lng) {
        const marker = L.marker([adventure.lat, adventure.lng], { icon: beachIcon })
          .addTo(map);

        // Create popup content
        const popupContent = `
          <div class="p-2 min-w-[200px]">
            ${adventure.cover_file_path ? `
              <img src="/api/media/image?path=${escapeHtml(encodeURIComponent(adventure.cover_file_path))}&amp;w=480" 
                   alt="${escapeHtml(adventure.title)}" 
                   class="w-full h-24 object-cover rounded-lg mb-2" />
            ` : ''}
            <h3 class="font-semibold text-ink-700">${escapeHtml(adventure.title)}</h3>
            <p class="text-xs text-ink-400 mt-1">
              ${adventure.start_date ? formatDate(adventure.start_date) : ''}
              ${adventure.location_name ? ` • ${escapeHtml(adventure.location_name)}` : ''}
            </p>
            <a href="/adventures/${escapeHtml(adventure.slug)}" 
               class="inline-block mt-2 text-xs text-forest-500 hover:text-forest-600">
              View Adventure →
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);
      }
    });

    // Add bucket list markers
    data.bucketList.forEach((item: any) => {
      if (item.lat && item.lng) {
        const marker = L.marker([item.lat, item.lng], { icon: bucketIcon })
          .addTo(map);

        const popupContent = `
          <div class="p-2 min-w-[200px]">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="badge text-terra-600 bg-terra-50">
                ${escapeHtml(item.status === 'completed' ? '✓ Done' : item.status === 'in_progress' ? 'In Progress' : 'Wishlist')}
              </span>
              ${item.category ? `<span class="text-xs text-ink-400">${escapeHtml(item.category)}</span>` : ''}
            </div>
            <h3 class="font-semibold text-ink-700">${escapeHtml(item.title)}</h3>
            ${item.description ? `<p class="text-xs text-ink-400 mt-1 line-clamp-2">${escapeHtml(item.description)}</p>` : ''}
            ${item.location_name ? `<p class="text-xs text-ink-400 mt-1">📍 ${escapeHtml(item.location_name)}</p>` : ''}
            <a href="/bucket-list" class="inline-block mt-2 text-xs text-terra-500 hover:text-terra-600">
              View Bucket List →
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);
      }
    });

    // Fit bounds if we have markers
    const allMarkers = [
      ...data.adventures.filter((a: any) => a.lat && a.lng).map((a: any) => [a.lat, a.lng]),
      ...data.bucketList.filter((b: any) => b.lat && b.lng).map((b: any) => [b.lat, b.lng])
    ];
    
    if (allMarkers.length > 0) {
      map.fitBounds(allMarkers, { padding: [50, 50] });
    }
  });
</script>

<svelte:head>
  <title>Family Map | Family Adventures</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="page-header animate-in">
    <p class="page-header-label">Where We've Been</p>
    <h1 class="page-header-title">Family Map</h1>
    <p class="page-header-desc">
      All the places our family has explored together
    </p>
  </div>

  <!-- Map Container -->
  <div class="card-flat overflow-hidden animate-in">
    <div class="flex items-center gap-4 px-4 py-2 border-b border-cream-200 text-xs">
      <span class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-full bg-forest-500"></span>
        <span class="text-ink-500">Been There</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-full bg-terra-500"></span>
        <span class="text-ink-500">Bucket List</span>
      </span>
    </div>
    <div bind:this={mapContainer} class="h-[500px] md:h-[600px]"></div>
  </div>

  <!-- Adventures without coordinates -->
  {#if data.adventuresWithoutCoords.length > 0}
    <div class="card-flat p-6 animate-in">
      <h2 class="text-lg font-semibold text-ink-700 mb-4">Adventures without location</h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each data.adventuresWithoutCoords as adventure}
          <a 
            href="/adventures/{adventure.slug}"
            class="flex items-center gap-3 p-3 rounded-xl hover:bg-cream-50 transition-colors"
          >
            <div class="h-12 w-12 rounded-xl bg-forest-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {#if adventure.cover_file_path}
                <img
                  src={`/api/media/image?path=${encodeURIComponent(adventure.cover_file_path)}&w=160`}
                  alt={adventure.title}
                  class="w-full h-full object-cover rounded-xl"
                />
              {:else}
                <svg class="h-6 w-6 text-forest-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              {/if}
            </div>
            <div class="min-w-0">
              <p class="font-medium text-ink-700 truncate">{adventure.title}</p>
              <p class="text-xs text-ink-400">
                {adventure.start_date ? formatDate(adventure.start_date) : 'No date'}
              </p>
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.custom-marker) {
    background: transparent;
    border: none;
  }
</style>
