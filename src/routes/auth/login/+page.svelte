<script lang="ts">
  import { goto } from '$app/navigation';
  
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');
  let showPassword = $state(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      error = 'Please enter your email and password';
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (response.ok) {
        window.location.href = '/adventures';
      } else {
        const err = await response.json();
        error = err.message || 'Invalid email or password';
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
      <p class="text-navy-400 mt-2">Sign in to your Family Adventures account</p>
    </div>

    {#if error}
      <div class="mb-6 p-4 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 text-sm">
        {error}
      </div>
    {/if}

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
      <div>
        <label for="email" class="block text-sm font-medium text-navy-600 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          bind:value={email}
          placeholder="you@example.com"
          class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
          required
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-navy-600 mb-2">
          Password
        </label>
        <div class="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            bind:value={password}
            placeholder="Enter your password"
            class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 pr-12 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
            required
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
            onclick={() => showPassword = !showPassword}
          >
            {#if showPassword}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            {:else}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            {/if}
          </button>
        </div>
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
  </div>
</div>
