<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { formatDate } from '$lib/shared/utils';
  import { getImmichAssetUrl } from '$lib/shared/immich';
  
  let { data } = $props();
  let mapContainer: HTMLDivElement;
  let map: any;
  let L: any;

  onMount(async () => {
    if (typeof window === 'undefined') return;

    // Dynamic import for Leaflet
    L = await import('leaflet');
    
    // Initialize map
    map = L.map(mapContainer).setView([20, 0], 2);

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Custom icon
    const beachIcon = L.divIcon({
      html: `<div class="h-8 w-8 rounded-full bg-ocean-500 flex items-center justify-center text-white shadow-lg">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
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
            ${adventure.cover_asset_id ? `
              <img src="${getImmichAssetUrl(adventure.cover_asset_id, true)}" 
                   alt="${adventure.title}" 
                   class="w-full h-24 object-cover rounded-lg mb-2" />
            ` : ''}
            <h3 class="font-semibold text-navy-600">${adventure.title}</h3>
            <p class="text-xs text-navy-400 mt-1">
              ${adventure.start_date ? formatDate(adventure.start_date) : ''}
              ${adventure.location_name ? ` • ${adventure.location_name}` : ''}
            </p>
            <a href="/adventures/${adventure.slug}" 
               class="inline-block mt-2 text-xs text-ocean-500 hover:text-ocean-600">
              View Adventure →
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);
      }
    });

    // Fit bounds if we have markers
    const markers = data.adventures
      .filter((a: any) => a.lat && a.lng)
      .map((a: any) => [a.lat, a.lng]);
    
    if (markers.length > 0) {
      map.fitBounds(markers, { padding: [50, 50] });
    }
  });
</script>

<svelte:head>
  <title>Family Map | Family Adventures</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="space-y-6">
  <div>
    <p class="text-sm uppercase tracking-wider text-ocean-500 font-medium">Where We've Been</p>
    <h1 class="text-3xl md:text-4xl font-display font-semibold text-navy-600 mt-2">
      Family Map
    </h1>
    <p class="text-navy-400 mt-2">
      All the places our family has explored together
    </p>
  </div>

  <!-- Map Container -->
  <div class="glass rounded-3xl overflow-hidden">
    <div bind:this={mapContainer} class="h-[500px] md:h-[600px]"></div>
  </div>

  <!-- Adventures without coordinates -->
  {#if data.adventuresWithoutCoords.length > 0}
    <div class="glass rounded-3xl p-6">
      <h2 class="text-lg font-semibold text-navy-600 mb-4">Adventures without location</h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each data.adventuresWithoutCoords as adventure}
          <a 
            href="/adventures/{adventure.slug}"
            class="flex items-center gap-3 p-3 rounded-xl hover:bg-sand-50 transition-colors"
          >
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-ocean-100 to-ocean-200 flex items-center justify-center flex-shrink-0">
              {#if adventure.cover_asset_id}
                <img
                  src={getImmichAssetUrl(adventure.cover_asset_id, true)}
                  alt={adventure.title}
                  class="w-full h-full object-cover rounded-xl"
                />
              {:else}
                <svg class="h-6 w-6 text-ocean-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              {/if}
            </div>
            <div class="min-w-0">
              <p class="font-medium text-navy-600 truncate">{adventure.title}</p>
              <p class="text-xs text-navy-400">
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
