<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');
  let showPassword = $state(false);

  const errorMessages: Record<string, string> = {
    no_code: 'Authentication was cancelled',
    not_configured: 'Google sign-in is not configured',
    token_exchange_failed: 'Google sign-in failed. Please try again.',
    userinfo_failed: 'Could not get user info from Google',
    pending_approval: 'Your account is awaiting admin approval. Please check back later.',
    auth_failed: 'Authentication failed. Please try again.',
    invalid: 'Invalid email or password'
  };

  $effect(() => {
    const errParam = $page.url.searchParams.get('error');
    if (errParam) {
      error = errorMessages[errParam] || 'An error occurred';
    }
  });

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

    <!-- Google Sign In -->
    <a
      href="/api/auth/google"
      class="flex items-center justify-center gap-3 w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm font-medium text-navy-600 hover:bg-sand-50 transition-colors mb-4"
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Sign in with Google
    </a>

    <div class="relative mb-4">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-sand-200"></div>
      </div>
      <div class="relative flex justify-center text-xs">
        <span class="bg-white px-2 text-navy-400">or sign in with email</span>
      </div>
    </div>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-5">
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

    <div class="mt-6 text-center">
      <p class="text-sm text-navy-400">
        Don't have an account?
        <a href="/auth/signup" class="text-ocean-500 hover:text-ocean-600 font-medium">Sign up</a>
      </p>
    </div>
  </div>
</div>
