<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let {
    value = $bindable(''),
    lat = $bindable(null),
    lng = $bindable(null),
    placeholder = 'Search for a location in the USA...'
  }: {
    value: string;
    lat: number | null;
    lng: number | null;
    placeholder?: string;
  } = $props();

  let searchInput: HTMLInputElement;
  let dropdownEl: HTMLDivElement;
  let mapEl: HTMLDivElement;
  let results: any[] = $state([]);
  let searching = $state(false);
  let showDropdown = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;
  let map: any;
  let marker: any;
  let L: any;
  let mapReady = $state(false);

  onMount(async () => {
    if (typeof window === 'undefined') return;
    L = await import('leaflet');
    initMap();
  });

  onDestroy(() => {
    if (map) map.remove();
  });

  function initMap() {
    if (!mapEl || !L) return;

    const initialLat = lat ?? 39.8;
    const initialLng = lng ?? -98.5;

    map = L.map(mapEl, {
      zoomControl: false,
      attributionControl: false,
      dragging: lat !== null,
      scrollWheelZoom: false
    }).setView([initialLat, initialLng], lat !== null ? 10 : 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    if (lat !== null && lng !== null) {
      marker = L.marker([lat, lng]).addTo(map);
    }

    mapReady = true;
  }

  function updateMapPosition(newLat: number, newLng: number) {
    if (!map || !L) return;
    map.setView([newLat, newLng], 10);
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    if (marker) {
      marker.setLatLng([newLat, newLng]);
    } else {
      marker = L.marker([newLat, newLng]).addTo(map);
    }
  }

  function handleInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (value.length >= 2) {
        searchLocations(value);
      } else {
        results = [];
        showDropdown = false;
      }
    }, 300);
  }

  async function searchLocations(query: string) {
    searching = true;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=us&limit=6&addressdetails=1`,
        { headers: { 'Accept': 'application/json' } }
      );
      const data = await res.json();
      results = data;
      showDropdown = data.length > 0;
    } catch {
      results = [];
      showDropdown = false;
    }
    searching = false;
  }

  function selectResult(result: any) {
    value = result.display_name;
    lat = parseFloat(result.lat);
    lng = parseFloat(result.lon);
    showDropdown = false;
    results = [];
    updateMapPosition(lat, lng);
  }

  function handleBlur() {
    setTimeout(() => {
      showDropdown = false;
    }, 200);
  }

  function formatShortName(result: any) {
    const parts = result.display_name.split(', ');
    if (parts.length <= 3) return result.display_name;
    return parts.slice(0, 3).join(', ') + '...';
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="relative">
  <div class="flex gap-3">
    <div class="flex-1 relative">
      <input
        type="text"
        bind:this={searchInput}
        bind:value
        oninput={handleInput}
        onfocus={() => { if (results.length > 0) showDropdown = true; }}
        onblur={handleBlur}
        {placeholder}
        class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
      />
      {#if searching}
        <div class="absolute right-3 top-1/2 -translate-y-1/2">
          <div class="h-4 w-4 border-2 border-ocean-300 border-t-transparent rounded-full animate-spin"></div>
        </div>
      {/if}

      {#if showDropdown && results.length > 0}
        <div
          bind:this={dropdownEl}
          class="absolute z-50 mt-1 w-full rounded-xl border border-sand-200 bg-white shadow-lg max-h-60 overflow-auto"
        >
          {#each results as result}
            <button
              type="button"
              class="w-full text-left px-4 py-3 hover:bg-ocean-50 transition-colors border-b border-sand-100 last:border-0"
              onmousedown={() => selectResult(result)}
            >
              <p class="text-sm text-navy-600">{formatShortName(result)}</p>
              <p class="text-xs text-navy-400 mt-0.5">
                {result.type}{#if result.address?.state}, {result.address.state}{/if}
              </p>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="flex flex-col gap-1">
      <div
        bind:this={mapEl}
        class="w-24 h-[50px] rounded-xl border border-sand-200 overflow-hidden"
      ></div>
      {#if lat !== null && lng !== null}
        <p class="text-[10px] text-navy-400 text-center">{lat.toFixed(3)}, {lng.toFixed(3)}</p>
      {/if}
    </div>
  </div>
</div>
