<script lang="ts">
  import type { PageData } from './$types';
  let { data } = $props();

  let recoveryKey = $state('');
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let message = $state('');
  let success = $state(false);
</script>

<svelte:head>
  <title>Admin Recovery | Family Adventures</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center">
  <div class="glass rounded-3xl p-8 max-w-md w-full">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-display font-semibold text-navy-600">Admin Account Recovery</h1>
      <p class="text-navy-400 mt-2">Reset the admin account credentials</p>
    </div>

    {#if !data.isConfigured}
      <div class="p-4 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 text-sm">
        Recovery is not configured. Set the <code>ADMIN_RECOVERY_KEY</code> environment variable in Coolify to enable this feature.
      </div>
    {:else}
      {#if message}
        <div class="mb-6 p-4 rounded-xl text-sm {success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-coral-50 border border-coral-200 text-coral-600'}">
          {message}
        </div>
      {/if}

      <form class="space-y-4" onsubmit={async (e) => {
        e.preventDefault();
        loading = true;
        message = '';
        try {
          const res = await fetch('/api/admin/recover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recoveryKey, email, password })
          });
          const data = await res.json();
          if (res.ok) {
            success = true;
            message = data.message + ' You can now log in with the new credentials.';
          } else {
            success = false;
            message = data.error || 'Recovery failed';
          }
        } catch {
          success = false;
          message = 'Network error';
        }
        loading = false;
      }}>
        <div>
          <label for="recoveryKey" class="block text-sm font-medium text-navy-600 mb-1">Recovery Key</label>
          <input id="recoveryKey" type="password" bind:value={recoveryKey}
            class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
            placeholder="Enter your ADMIN_RECOVERY_KEY" required />
        </div>
        <div>
          <label for="email" class="block text-sm font-medium text-navy-600 mb-1">New Admin Email</label>
          <input id="email" type="email" bind:value={email}
            class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
            placeholder="admin@example.com" required />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-navy-600 mb-1">New Password</label>
          <input id="password" type="password" bind:value={password} minlength="8"
            class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
            placeholder="At least 8 characters" required />
        </div>
        <button type="submit" disabled={loading}
          class="w-full rounded-full bg-ocean-500 px-5 py-3 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50 transition-colors">
          {loading ? 'Resetting...' : 'Reset Admin Account'}
        </button>
      </form>

      <div class="mt-6 text-center">
        <a href="/auth/login" class="text-sm text-ocean-500 hover:text-ocean-600">Back to Login</a>
      </div>
    {/if}
  </div>
</div>
