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
  <div class="card p-8 max-w-md w-full animate-in">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-display font-semibold text-ink-800 dark:text-cream-100">Admin Account Recovery</h1>
      <p class="text-ink-400 mt-2 text-sm">Reset the admin account credentials</p>
    </div>

    {#if !data.isConfigured}
      <div class="p-4 rounded-lg bg-terra-50 border border-terra-200 text-terra-600 text-sm">
        Recovery is not configured. Set the <code>ADMIN_RECOVERY_KEY</code> environment variable in Coolify to enable this feature.
      </div>
    {:else}
      {#if message}
        <div class="mb-6 p-3 rounded-lg text-sm {success ? 'bg-forest-50 border border-forest-200 text-forest-700' : 'bg-terra-50 border border-terra-200 text-terra-600'}">
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
          <label for="recoveryKey" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">Recovery Key</label>
          <input id="recoveryKey" type="password" bind:value={recoveryKey}
            class="input" placeholder="Enter your ADMIN_RECOVERY_KEY" required />
        </div>
        <div>
          <label for="email" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">New Admin Email</label>
          <input id="email" type="email" bind:value={email}
            class="input" placeholder="admin@example.com" required />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">New Password</label>
          <input id="password" type="password" bind:value={password} minlength="8"
            class="input" placeholder="At least 8 characters" required />
        </div>
        <button type="submit" disabled={loading} class="btn-primary w-full justify-center disabled:opacity-50">
          {loading ? 'Resetting...' : 'Reset Admin Account'}
        </button>
      </form>

      <div class="mt-6 text-center">
        <a href="/auth/login" class="text-sm text-forest-500 hover:text-forest-600">Back to Login</a>
      </div>
    {/if}
  </div>
</div>
