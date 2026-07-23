<script lang="ts">
  import { goto } from '$app/navigation';
  
  let apiKey = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit() {
    if (!apiKey.trim()) {
      error = 'Please enter your API key';
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });

      if (response.ok) {
        goto('/');
        window.location.reload();
      } else {
        const err = await response.json();
        error = err.message || 'Invalid API key';
      }
    } catch (e) {
      error = 'An error occurred. Please try again.';
    }
    loading = false;
  }
</script>

<svelte:head>
  <title>Sign In | Family Adventures</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center">
  <div class="glass rounded-3xl p-8 max-w-md w-full">
    <div class="text-center mb-8">
      <div class="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center text-white mb-4">
        <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 class="text-2xl font-display font-semibold text-navy-600">Welcome Back</h1>
      <p class="text-navy-400 mt-2">Sign in with your Immich API key</p>
    </div>

    {#if error}
      <div class="mb-6 p-4 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 text-sm">
        {error}
      </div>
    {/if}

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
      <div>
        <label for="apiKey" class="block text-sm font-medium text-navy-600 mb-2">
          Immich API Key
        </label>
        <input
          type="password"
          id="apiKey"
          bind:value={apiKey}
          placeholder="Enter your API key"
          class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
          required
        />
        <p class="mt-2 text-xs text-navy-400">
          Find your API key in Immich under Account Settings → API Keys
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full inline-flex items-center justify-center gap-2 rounded-full bg-ocean-500 px-5 py-3 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Signing in...' : 'Sign In'}
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </button>
    </form>

    <div class="mt-6 text-center">
      <p class="text-xs text-navy-400">
        Don't have an API key? Ask your family admin to create one for you.
      </p>
    </div>
  </div>
</div>
