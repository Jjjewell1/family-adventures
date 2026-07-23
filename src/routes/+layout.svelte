<script lang="ts">
  import '../app.css';
  let { children, data } = $props();
  let mobileMenuOpen = $state(false);
</script>

<svelte:head>
  <title>Family Adventures</title>
  <meta name="description" content="Our family's collection of adventures, memories, and shared moments" />
  <meta property="og:title" content="Family Adventures" />
  <meta property="og:description" content="Our family's collection of adventures, memories, and shared moments" />
</svelte:head>

<div class="min-h-screen flex flex-col">
  <!-- Navigation -->
  <nav class="sticky top-0 z-40 glass border-b border-sand-200/50">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <a href="/" class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center text-white">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-lg font-display font-semibold text-navy-600 hidden sm:block">Family Adventures</span>
        </a>

        <!-- Desktop nav -->
        <div class="hidden md:flex items-center gap-1">
          <a href="/adventures" class="px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:text-navy-600 hover:bg-sand-100 transition-colors">
            Adventures
          </a>
          <a href="/gallery" class="px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:text-navy-600 hover:bg-sand-100 transition-colors">
            Gallery
          </a>
          <a href="/map" class="px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:text-navy-600 hover:bg-sand-100 transition-colors">
            Map
          </a>
          <a href="/memories" class="px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:text-navy-600 hover:bg-sand-100 transition-colors">
            Memories
          </a>
        </div>

        <!-- Right side -->
        <div class="flex items-center gap-3">
          {#if data.user}
            <a href="/adventures/create" class="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ocean-500 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              New
            </a>
            <button
              onclick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; }}
              class="text-sm text-navy-400 hover:text-navy-600 transition-colors"
            >
              Sign Out
            </button>
            <div class="h-8 w-8 rounded-full bg-gradient-to-br from-coral-400 to-sunset-400 flex items-center justify-center text-white text-sm font-medium cursor-default" title={data.user.name}>
              {data.user.name?.charAt(0).toUpperCase() || '?'}
            </div>
          {:else}
            <a href="/auth/login" class="inline-flex items-center gap-1.5 rounded-full bg-ocean-500 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors">
              Sign In
            </a>
          {/if}

          <!-- Mobile menu button -->
          <button
            class="md:hidden p-2 rounded-lg text-navy-500 hover:bg-sand-100"
            onclick={() => mobileMenuOpen = !mobileMenuOpen}
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {#if mobileMenuOpen}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              {/if}
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      {#if mobileMenuOpen}
        <div class="md:hidden pb-4 border-t border-sand-200/50 pt-3 space-y-1">
          <a href="/adventures" class="block px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:bg-sand-100">Adventures</a>
          <a href="/gallery" class="block px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:bg-sand-100">Gallery</a>
          <a href="/map" class="block px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:bg-sand-100">Map</a>
          <a href="/memories" class="block px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:bg-sand-100">Memories</a>
          {#if data.user}
            <a href="/adventures/create" class="block px-3 py-2 rounded-lg text-sm font-medium text-ocean-500 hover:bg-sand-100">New Adventure</a>
            <button
              onclick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; }}
              class="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-navy-400 hover:bg-sand-100"
            >
              Sign Out
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </nav>

  <!-- Main content -->
  <main class="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-8">
    {@render children()}
  </main>

  <!-- Footer -->
  <footer class="border-t border-sand-200/50 bg-sand-50/50 mt-auto">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-navy-400">
        <div class="flex items-center gap-2">
          <div class="h-5 w-5 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center text-white">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span>Family Adventures</span>
        </div>
        <div class="flex items-center gap-4">
          <a href="/adventures" class="hover:text-navy-600 transition-colors">Adventures</a>
          <a href="/gallery" class="hover:text-navy-600 transition-colors">Gallery</a>
          <a href="/map" class="hover:text-navy-600 transition-colors">Map</a>
        </div>
      </div>
    </div>
  </footer>
</div>
