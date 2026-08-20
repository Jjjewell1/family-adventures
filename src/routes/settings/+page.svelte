<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import { onMount } from 'svelte';

  let { data }: { data: PageData } = $props();

  let activeTab = $state('profile');

  // Profile form state
  let profileName = $state(data.user.name || '');
  let profileEmail = $state(data.user.email || '');
  let profileSaving = $state(false);
  let profileMessage = $state('');
  let profileError = $state('');

  // Password form state
  let oldPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordSaving = $state(false);
  let passwordMessage = $state('');
  let passwordError = $state('');
  let showOldPassword = $state(false);
  let showNewPassword = $state(false);

  // Add member form state
  let memberName = $state('');
  let memberEmail = $state('');
  let memberPassword = $state('');
  let memberRole = $state('member');
  let memberSaving = $state(false);
  let memberMessage = $state('');
  let memberError = $state('');

  // Delete confirmation
  let deletingId = $state<string | null>(null);

  // Branding/logo state
  let logoUploading = $state(false);
  let logoMessage = $state('');
  let logoError = $state('');
  let logoTimestamp = $state(Date.now());
  let dragOver = $state(false);
  let logoHistory = $state<any[]>([]);
  let activeLogo = $state('');
  let deletingLogo = $state<string | null>(null);

  // AI settings state
  let aiEnabled = $state(data.aiConfig?.enabled ?? true);
  let aiUrl = $state(data.aiConfig?.url ?? 'http://100.116.226.10:11434');
  let aiModel = $state(data.aiConfig?.model ?? 'hermes3:8b');
  let aiSaving = $state(false);
  let aiMessage = $state('');
  let aiError = $state('');
  let aiTesting = $state(false);
  let aiTestResult = $state<{ ok: boolean; models: string[]; error?: string } | null>(null);
  let aiModels = $state<string[]>([]);

  async function loadLogoHistory() {
    try {
      const res = await fetch('/api/admin/logo');
      if (res.ok) {
        const data = await res.json();
        logoHistory = data.logos || [];
        activeLogo = data.activeLogo || '';
      }
    } catch {}
  }

  async function handleDeleteLogo(filename: string) {
    deletingLogo = filename;
  }

  async function confirmDeleteLogo(filename: string) {
    try {
      const res = await fetch('/api/admin/logo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        logoMessage = 'Logo deleted';
        await loadLogoHistory();
      } else {
        logoError = result.error || 'Failed to delete logo';
      }
    } catch {
      logoError = 'An error occurred';
    }
    deletingLogo = null;
  }

  async function setActiveLogo(logoPath: string) {
    try {
      // logoPath is like /uploads/branding/logo-123.png
      const configValue = logoPath.replace('/uploads/', '');
      const res = await fetch('/api/admin/logo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoFilename: configValue })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        logoMessage = 'Active logo updated';
        activeLogo = configValue;
        logoTimestamp = Date.now();
        await loadLogoHistory();
      } else {
        logoError = result.error || 'Failed to set active logo';
      }
    } catch {
      logoError = 'An error occurred';
    }
  }

  // Load logo history when branding tab is shown
  $effect(() => {
    if (activeTab === 'branding') {
      loadLogoHistory();
    }
    if (activeTab === 'ai') {
      fetchModels();
    }
  });

  const isAdmin = $derived(data.user.role === 'admin');
  const pendingUsers = $derived(data.users.filter((u: any) => !u.approved));
  const activeUsers = $derived(data.users.filter((u: any) => u.approved));
  const tabs = $derived(isAdmin
    ? [{ id: 'profile', label: 'Profile' }, { id: 'branding', label: 'Branding' }, { id: 'ai', label: 'AI Assistant' }, { id: 'members', label: 'Family Members' }]
    : [{ id: 'profile', label: 'Profile' }, { id: 'ai', label: 'AI' }]
  );

  async function handleProfileSubmit(e: SubmitEvent) {
    e.preventDefault();
    profileSaving = true;
    profileError = '';
    profileMessage = '';

    const form = new FormData();
    form.append('name', profileName);
    form.append('email', profileEmail);

    try {
      const res = await fetch('/settings?/updateProfile', { method: 'POST', body: form });
      const result = await res.json();
      if (result.type === 'success') {
        profileMessage = 'Profile updated successfully';
      } else {
        profileError = result.data?.error || 'Failed to update profile';
      }
    } catch {
      profileError = 'An error occurred';
    }
    profileSaving = false;
  }

  async function handlePasswordSubmit(e: SubmitEvent) {
    e.preventDefault();
    passwordSaving = true;
    passwordError = '';
    passwordMessage = '';

    if (newPassword !== confirmPassword) {
      passwordError = 'New passwords do not match';
      passwordSaving = false;
      return;
    }

    const form = new FormData();
    form.append('oldPassword', oldPassword);
    form.append('newPassword', newPassword);
    form.append('confirmPassword', confirmPassword);

    try {
      const res = await fetch('/settings?/changePassword', { method: 'POST', body: form });
      const result = await res.json();
      if (result.type === 'success') {
        passwordMessage = 'Password changed successfully';
        oldPassword = '';
        newPassword = '';
        confirmPassword = '';
      } else {
        passwordError = result.data?.error || 'Failed to change password';
      }
    } catch {
      passwordError = 'An error occurred';
    }
    passwordSaving = false;
  }

  async function handleAddMember(e: SubmitEvent) {
    e.preventDefault();
    memberSaving = true;
    memberError = '';
    memberMessage = '';

    const form = new FormData();
    form.append('name', memberName);
    form.append('email', memberEmail);
    form.append('password', memberPassword);
    form.append('role', memberRole);

    try {
      const res = await fetch('/settings?/addMember', { method: 'POST', body: form });
      const result = await res.json();
      if (result.type === 'success') {
        memberMessage = 'Member added successfully';
        memberName = '';
        memberEmail = '';
        memberPassword = '';
        memberRole = 'member';
      } else {
        memberError = result.data?.error || 'Failed to add member';
      }
    } catch {
      memberError = 'An error occurred';
    }
    memberSaving = false;
  }

  async function handleDeleteMember(userId: string) {
    deletingId = userId;
  }

  async function confirmDelete(userId: string) {
    const form = new FormData();
    form.append('userId', userId);

    try {
      const res = await fetch('/settings?/deleteMember', { method: 'POST', body: form });
      const result = await res.json();
      if (result.type === 'success') {
        window.location.reload();
      } else {
        memberError = result.data?.error || 'Failed to delete member';
      }
    } catch {
      memberError = 'An error occurred';
    }
    deletingId = null;
  }

  async function approveUser(userId: string) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true })
      });
      if (res.ok) window.location.reload();
    } catch {}
  }

  async function handleToggleRole(memberId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const adminCount = data.users.filter((u: any) => u.approved && u.role === 'admin').length;
    if (currentRole === 'admin' && adminCount <= 1) {
      memberError = 'Cannot remove the last admin';
      return;
    }
    try {
      const res = await fetch(`/api/users/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) window.location.reload();
      else {
        const data = await res.json();
        memberError = data.error || 'Failed to update role';
      }
    } catch {
      memberError = 'An error occurred';
    }
  }

  async function handleLogoUpload(file: File) {
    logoUploading = true;
    logoError = '';
    logoMessage = '';

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/admin/logo', { method: 'POST', body: form });
      const result = await res.json();

      if (res.ok && result.success) {
        logoMessage = 'Logo updated! Background removed, all sizes generated.';
        logoTimestamp = Date.now();
        await loadLogoHistory();
      } else {
        logoError = result.error || 'Failed to upload logo';
      }
    } catch {
      logoError = 'An error occurred during upload';
    }
    logoUploading = false;
  }

  function handleLogoDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      handleLogoUpload(file);
    }
  }

  function handleLogoFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) handleLogoUpload(file);
    input.value = '';
  }

  async function handleSaveAI(e: Event) {
    e.preventDefault();
    aiSaving = true;
    aiError = '';
    aiMessage = '';

    try {
      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: aiEnabled, url: aiUrl, model: aiModel })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        aiMessage = 'AI settings saved successfully';
      } else {
        aiError = result.error || 'Failed to save AI settings';
      }
    } catch {
      aiError = 'An error occurred';
    }
    aiSaving = false;
  }

  async function handleTestAI() {
    aiTesting = true;
    aiTestResult = null;
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      aiTestResult = data.connection;
      if (data.connection?.ok && data.connection.models?.length) {
        aiModels = data.connection.models;
        if (!aiModels.includes(aiModel) && aiModels.length > 0) {
          aiModel = aiModels[0];
        }
      }
    } catch {
      aiTestResult = { ok: false, models: [], error: 'Connection failed' };
    }
    aiTesting = false;
  }

  async function fetchModels() {
    try {
      const res = await fetch('/api/ai/models', { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      aiModels = data.models || [];
    } catch {
      aiModels = [];
    }
  }
</script>

<svelte:head>
  <title>Settings | Family Adventures</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-8">
  <div>
    <h1 class="text-3xl font-display font-semibold text-ink-600 dark:text-cream-200">Settings</h1>
    <p class="text-ink-400 dark:text-cream-300 mt-1">Manage your account and family preferences</p>
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 p-1 card rounded-2xl">
    {#each tabs as tab}
      <button
        class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all {activeTab === tab.id
          ? 'bg-forest-500 text-white shadow-sm'
          : 'text-ink-500 hover:bg-cream-100 dark:text-cream-200 dark:hover:bg-ink-600'}"
        onclick={() => activeTab = tab.id}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Profile Tab -->
  {#if activeTab === 'profile'}
    <div class="card rounded-lg p-8 space-y-8">
      <div>
        <h2 class="text-xl font-display font-semibold text-ink-600 dark:text-cream-200 mb-1">Profile</h2>
        <p class="text-sm text-ink-400 dark:text-cream-300">Update your name and email address</p>
      </div>

      {#if profileMessage}
        <div class="p-4 rounded-lg bg-forest-50 border border-forest-200 text-forest-600 text-sm">{profileMessage}</div>
      {/if}
      {#if profileError}
        <div class="p-4 rounded-lg bg-terra-50 border border-terra-200 text-terra-600 text-sm">{profileError}</div>
      {/if}

      <form onsubmit={handleProfileSubmit} class="space-y-6">
        <div class="flex items-center gap-4">
          {#if data.user.avatar_url}
            <img src={data.user.avatar_url} alt={data.user.name} class="h-16 w-16 rounded-full object-cover" />
          {:else}
            <div class="h-16 w-16 rounded-full bg-gradient-to-br from-terra-400 to-gold-400 flex items-center justify-center text-white text-xl font-medium">
              {data.user.name?.charAt(0).toUpperCase() || '?'}
            </div>
          {/if}
          <div>
            <p class="text-sm font-medium text-ink-600 dark:text-cream-200">{data.user.name}</p>
            <p class="text-xs text-ink-400 dark:text-cream-300">
              {#if data.user.provider === 'google'}
                Signed in with Google
              {:else}
                Local account
              {/if}
            </p>
          </div>
        </div>
        <div>
          <label for="name" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-2">Name</label>
          <input
            type="text"
            id="name"
            bind:value={profileName}
            class="input w-full"
            required
          />
        </div>
        <div>
          <label for="email" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-2">Email</label>
          <input
            type="email"
            id="email"
            bind:value={profileEmail}
            class="input w-full"
            required
          />
        </div>
        <button
          type="submit"
          disabled={profileSaving}
          class="btn-primary inline-flex items-center justify-center gap-2"
        >
          {profileSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <div class="border-t border-cream-200 dark:border-ink-600 pt-8">
        <h3 class="text-lg font-display font-semibold text-ink-600 dark:text-cream-200 mb-1">Change Password</h3>
        <p class="text-sm text-ink-400 dark:text-cream-300 mb-6">Update your account password</p>

        {#if passwordMessage}
          <div class="p-4 rounded-lg bg-forest-50 border border-forest-200 text-forest-600 text-sm mb-4">{passwordMessage}</div>
        {/if}
        {#if passwordError}
          <div class="p-4 rounded-lg bg-terra-50 border border-terra-200 text-terra-600 text-sm mb-4">{passwordError}</div>
        {/if}

        <form onsubmit={handlePasswordSubmit} class="space-y-5">
          <div>
            <label for="oldPassword" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-2">Current Password</label>
            <div class="relative">
              <input
                type={showOldPassword ? 'text' : 'password'}
                id="oldPassword"
                bind:value={oldPassword}
                placeholder="Enter current password"
                class="input w-full pr-12"
                required
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:text-cream-300 dark:hover:text-cream-200"
                onclick={() => showOldPassword = !showOldPassword}
              >
                {#if showOldPassword}
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
          <div>
            <label for="newPassword" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-2">New Password</label>
            <div class="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                bind:value={newPassword}
                placeholder="Enter new password"
                class="input w-full pr-12"
                required
                minlength={6}
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:text-cream-300 dark:hover:text-cream-200"
                onclick={() => showNewPassword = !showNewPassword}
              >
                {#if showNewPassword}
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
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-2">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              bind:value={confirmPassword}
              placeholder="Confirm new password"
              class="input w-full"
              required
              minlength={6}
            />
          </div>
          <button
            type="submit"
            disabled={passwordSaving}
            class="btn-primary inline-flex items-center justify-center gap-2"
          >
            {passwordSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  {/if}

  <!-- Branding Tab (admin only) -->
  {#if activeTab === 'branding' && isAdmin}
    <div class="card rounded-lg p-8 space-y-8">
      <div>
        <h2 class="text-xl font-display font-semibold text-ink-600 dark:text-cream-200 mb-1">Site Branding</h2>
        <p class="text-sm text-ink-400 dark:text-cream-300">Upload a logo to customize your site appearance</p>
      </div>

      {#if logoMessage}
        <div class="p-4 rounded-lg bg-forest-50 border border-forest-200 text-forest-600 text-sm">{logoMessage}</div>
      {/if}
      {#if logoError}
        <div class="p-4 rounded-lg bg-terra-50 border border-terra-200 text-terra-600 text-sm">{logoError}</div>
      {/if}

      <!-- Upload Zone -->
      <div
        class="relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer
          {dragOver ? 'border-forest-400 bg-forest-50/50' : 'border-cream-300 hover:border-forest-300 hover:bg-cream-50 dark:border-ink-500 dark:hover:border-forest-300 dark:hover:bg-ink-700'}"
        ondragover={(e) => { e.preventDefault(); dragOver = true; }}
        ondragleave={() => dragOver = false}
        ondrop={handleLogoDrop}
        onclick={() => document.getElementById('logoFileInput')?.click()}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('logoFileInput')?.click(); } }}
        role="button"
        tabindex="0"
      >
        {#if logoUploading}
          <div class="flex flex-col items-center gap-3">
            <div class="h-10 w-10 rounded-full border-2 border-forest-300 border-t-forest-500 animate-spin"></div>
            <p class="text-sm text-ink-500 dark:text-cream-300">Processing logo...</p>
          </div>
        {:else}
          <div class="flex flex-col items-center gap-3">
            <svg class="h-10 w-10 text-ink-300 dark:text-cream-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-ink-600 dark:text-cream-200">Drop an image here or click to browse</p>
              <p class="text-xs text-ink-400 dark:text-cream-300 mt-1">JPG, PNG, GIF, WebP, HEIC — background will be removed automatically</p>
            </div>
          </div>
        {/if}
        <input
          type="file"
          id="logoFileInput"
          class="hidden"
          accept="image/*"
          onchange={handleLogoFileInput}
        />
      </div>

      <!-- Logo History -->
      {#if logoHistory.length > 0}
        <div>
          <h3 class="text-sm font-semibold text-ink-600 dark:text-cream-200 mb-3">Uploaded Logos ({logoHistory.length})</h3>
          <div class="space-y-3">
            {#each logoHistory as logo}
              {@const isActive = activeLogo === `branding/${logo.filename}`}
              <div class="flex items-center gap-4 p-3 rounded-lg border transition-colors
                {isActive ? 'bg-forest-50 border-forest-200' : 'bg-cream-50 border-cream-200/50 hover:border-cream-300 dark:bg-ink-800 dark:border-ink-600 dark:hover:border-ink-500'}">
                <div class="h-14 w-14 rounded-full overflow-hidden bg-ink-500/10 border border-ink-300/20 shrink-0">
                  <img src={logo.logoPath} alt="Logo" class="h-full w-full object-cover" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    {#if isActive}
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-forest-50 text-forest-600">Active</span>
                    {/if}
                    <span class="text-xs text-ink-400 dark:text-cream-300">{logo.date}</span>
                  </div>
                  <p class="text-xs text-ink-300 dark:text-cream-400 mt-0.5 truncate">{logo.filename}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  {#if !isActive}
                    <button
                      class="btn-primary text-xs px-3 py-1.5"
                      onclick={() => setActiveLogo(logo.logoPath)}
                    >
                      Set Active
                    </button>
                  {/if}
                  {#if !isActive}
                    {#if deletingLogo === logo.filename}
                      <div class="flex items-center gap-1">
                        <span class="text-xs text-terra-500">Delete?</span>
                        <button class="text-xs text-terra-500 hover:text-terra-700 font-medium" onclick={() => confirmDeleteLogo(logo.filename)}>Yes</button>
                        <button class="text-xs text-ink-400 hover:text-ink-600 dark:text-cream-300 dark:hover:text-cream-200 font-medium" onclick={() => deletingLogo = null}>No</button>
                      </div>
                    {:else}
                      <button
                        class="text-sm text-ink-300 hover:text-terra-500 dark:text-cream-400 dark:hover:text-terra-500 transition-colors"
                        onclick={() => handleDeleteLogo(logo.filename)}
                        title="Delete logo"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    {/if}
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Info -->
      <div class="p-5 rounded-lg bg-cream-50 border border-cream-200 dark:bg-ink-800 dark:border-ink-600">
        <h3 class="text-sm font-semibold text-ink-600 dark:text-cream-200 mb-2">What gets generated</h3>
        <ul class="text-sm text-ink-400 dark:text-cream-300 space-y-1.5">
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-forest-400 shrink-0"></span>
            <span><strong class="text-ink-600 dark:text-cream-200">Logo</strong> — 512x512 transparent, used in nav bar and footer</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-gold-400 shrink-0"></span>
            <span><strong class="text-ink-600 dark:text-cream-200">Favicon</strong> — 64x64 transparent, shown in browser tab</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-terra-400 shrink-0"></span>
            <span><strong class="text-ink-600 dark:text-cream-200">OG Image</strong> — 1200x630, shown when you share links on social media</span>
          </li>
        </ul>
        <p class="text-xs text-ink-400 dark:text-cream-300 mt-3">White or near-white backgrounds are automatically removed. Previous logos are kept so you can switch back or delete them.</p>
      </div>
    </div>
  {/if}

  <!-- AI Assistant Tab (admin only) -->
  {#if activeTab === 'ai' && isAdmin}
    <div class="card rounded-lg p-8 space-y-6">
      <div>
        <h2 class="text-xl font-display font-semibold text-ink-600 dark:text-cream-200 mb-1">AI Assistant</h2>
        <p class="text-sm text-ink-400 dark:text-cream-300">Configure the local AI for content generation</p>
      </div>

      {#if aiMessage}
        <div class="p-4 rounded-lg bg-forest-50 border border-forest-200 text-forest-600 text-sm">{aiMessage}</div>
      {/if}
      {#if aiError}
        <div class="p-4 rounded-lg bg-terra-50 border border-terra-200 text-terra-600 text-sm">{aiError}</div>
      {/if}

      <form onsubmit={handleSaveAI} class="space-y-5">
        <div class="flex items-center justify-between p-4 rounded-lg bg-cream-50 border border-cream-200/50 dark:bg-ink-800 dark:border-ink-600">
          <div>
            <p class="text-sm font-medium text-ink-600 dark:text-cream-200">Enable AI Assistant</p>
            <p class="text-xs text-ink-400 dark:text-cream-300 mt-0.5">Show AI buttons for content generation throughout the site</p>
          </div>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {aiEnabled ? 'bg-forest-500' : 'bg-cream-300 dark:bg-ink-500'}"
            onclick={() => aiEnabled = !aiEnabled}
          >
            <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {aiEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
          </button>
        </div>

        <div>
          <label for="aiUrl" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-2">Ollama Server URL</label>
          <input
            type="text"
            id="aiUrl"
            bind:value={aiUrl}
            placeholder="http://100.116.226.10:11434"
            class="input w-full"
          />
        </div>

        <div>
          <label for="aiModel" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-2">Model</label>
          {#if aiModels.length > 0}
            <select
              id="aiModel"
              bind:value={aiModel}
              class="input w-full"
            >
              {#each aiModels as model}
                <option value={model}>{model}</option>
              {/each}
              {#if aiModel && !aiModels.includes(aiModel)}
                <option value={aiModel}>{aiModel} (not installed)</option>
              {/if}
            </select>
          {:else}
            <input
              type="text"
              id="aiModel"
              bind:value={aiModel}
              placeholder="gpt-oss:20b"
              class="input w-full"
            />
            <p class="text-xs text-ink-400 dark:text-cream-300 mt-1">Click "Test Connection" to load available models</p>
          {/if}
        </div>

        <div class="flex gap-3">
          <button
            type="submit"
            disabled={aiSaving}
            class="btn-primary inline-flex items-center justify-center gap-2"
          >
            {aiSaving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            disabled={aiTesting}
            onclick={handleTestAI}
            class="btn-secondary inline-flex items-center justify-center gap-2"
          >
            {aiTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </form>

      {#if aiTestResult}
        <div class="p-5 rounded-lg border {aiTestResult.ok ? 'bg-forest-50 border-forest-200' : 'bg-terra-50 border-terra-200'}">
          <div class="flex items-center gap-2 mb-2">
            <span class="h-2 w-2 rounded-full {aiTestResult.ok ? 'bg-forest-500' : 'bg-terra-500'}"></span>
            <h3 class="text-sm font-semibold {aiTestResult.ok ? 'text-forest-600' : 'text-terra-600'}">
              {aiTestResult.ok ? 'Connected!' : 'Connection Failed'}
            </h3>
          </div>
          {#if aiTestResult.ok && aiTestResult.models.length > 0}
            <p class="text-sm text-ink-500 dark:text-cream-300">Available models:</p>
            <div class="flex flex-wrap gap-2 mt-2">
              {#each aiTestResult.models as model}
                <button
                  type="button"
                  class="px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    {aiModel === model ? 'bg-forest-500 text-white border-forest-500' : 'bg-white text-ink-600 border-cream-200 hover:border-forest-300 dark:bg-ink-700 dark:text-cream-200 dark:border-ink-600 dark:hover:border-forest-300'}"
                  onclick={() => aiModel = model}
                >
                  {model}
                </button>
              {/each}
            </div>
          {:else if aiTestResult.error}
            <p class="text-sm text-terra-500">{aiTestResult.error}</p>
          {/if}
        </div>
      {/if}

      <div class="p-5 rounded-lg bg-cream-50 border border-cream-200/50 dark:bg-ink-800 dark:border-ink-600">
        <h3 class="text-sm font-semibold text-ink-600 dark:text-cream-200 mb-2">What AI can do</h3>
        <ul class="text-sm text-ink-400 dark:text-cream-300 space-y-1.5">
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-forest-400 shrink-0"></span>
            <span><strong class="text-ink-600 dark:text-cream-200">Generate descriptions</strong> — Write trip summaries from basic details</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-gold-400 shrink-0"></span>
            <span><strong class="text-ink-600 dark:text-cream-200">Write stories</strong> — Create personal adventure narratives</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-terra-400 shrink-0"></span>
            <span><strong class="text-ink-600 dark:text-cream-200">Enhance content</strong> — Polish and improve existing text</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-forest-400 shrink-0"></span>
            <span><strong class="text-ink-600 dark:text-cream-200">Suggest tags</strong> — Auto-categorize adventures</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-gold-400 shrink-0"></span>
            <span><strong class="text-ink-600 dark:text-cream-200">Photo captions</strong> — Generate descriptions for photos</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-terra-400 shrink-0"></span>
            <span><strong class="text-ink-600 dark:text-cream-200">Bucket list ideas</strong> — Suggest future adventures</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-forest-400 shrink-0"></span>
            <span><strong class="text-ink-600 dark:text-cream-200">Trip planning</strong> — Create itineraries and packing lists</span>
          </li>
        </ul>
        <p class="text-xs text-ink-400 dark:text-cream-300 mt-3">All AI processing runs locally via Ollama — no data leaves your network.</p>
      </div>
    </div>
  {/if}

  <!-- Family Members Tab (admin only) -->
  {#if activeTab === 'members' && isAdmin}
    <div class="card rounded-lg p-8 space-y-8">
      <div>
        <h2 class="text-xl font-display font-semibold text-ink-600 dark:text-cream-200 mb-1">Family Members</h2>
        <p class="text-sm text-ink-400 dark:text-cream-300">Manage user accounts for your family</p>
      </div>

      <!-- Pending Approvals -->
      {#if pendingUsers.length > 0}
        <div class="p-4 rounded-lg bg-gold-50 border border-gold-200 dark:bg-ink-800 dark:border-ink-600">
          <h3 class="text-sm font-semibold text-gold-600 mb-3">Pending Approval ({pendingUsers.length})</h3>
          <div class="space-y-3">
            {#each pendingUsers as pending}
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="h-8 w-8 rounded-full bg-gradient-to-br from-gold-300 to-gold-400 flex items-center justify-center text-white text-xs font-medium">
                    {pending.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-ink-600 dark:text-cream-200">{pending.name}</p>
                    <p class="text-xs text-ink-400 dark:text-cream-300">{pending.email} &middot; {pending.provider || 'local'}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    onclick={() => approveUser(pending.id)}
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-forest-500 text-white text-xs font-medium hover:bg-forest-600 transition-colors"
                  >
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </button>
                  {#if pending.id !== data.user.id}
                    <button
                      class="text-xs text-ink-300 hover:text-terra-500 dark:text-cream-400 dark:hover:text-terra-500 transition-colors"
                      onclick={() => handleDeleteMember(pending.id)}
                      title="Reject"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Members Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-cream-200/50 dark:border-ink-600">
              <th class="text-left text-xs font-semibold text-ink-400 dark:text-cream-300 uppercase tracking-wider pb-3 pr-4">Name</th>
              <th class="text-left text-xs font-semibold text-ink-400 dark:text-cream-300 uppercase tracking-wider pb-3 pr-4">Email</th>
              <th class="text-left text-xs font-semibold text-ink-400 dark:text-cream-300 uppercase tracking-wider pb-3 pr-4">Role</th>
              <th class="text-left text-xs font-semibold text-ink-400 dark:text-cream-300 uppercase tracking-wider pb-3 pr-4">Provider</th>
              <th class="text-left text-xs font-semibold text-ink-400 dark:text-cream-300 uppercase tracking-wider pb-3 pr-4">Created</th>
              <th class="text-right text-xs font-semibold text-ink-400 dark:text-cream-300 uppercase tracking-wider pb-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cream-200/50 dark:divide-ink-600">
            {#each activeUsers as member (member.id)}
              <tr class="group">
                <td class="py-3.5 pr-4">
                  <div class="flex items-center gap-3">
                    {#if member.avatar_url}
                      <img src={member.avatar_url} alt={member.name} class="h-8 w-8 rounded-full object-cover shrink-0" />
                    {:else}
                      <div class="h-8 w-8 rounded-full bg-gradient-to-br from-terra-400 to-gold-400 flex items-center justify-center text-white text-xs font-medium shrink-0">
                        {member.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    {/if}
                    <span class="text-sm font-medium text-ink-600 dark:text-cream-200">
                      {member.name}
                      {#if member.id === data.user.id}
                        <span class="text-ink-300 dark:text-cream-400 ml-1">(you)</span>
                      {/if}
                    </span>
                  </div>
                </td>
                <td class="py-3.5 pr-4">
                  <span class="text-sm text-ink-400 dark:text-cream-300">{member.email}</span>
                </td>
                <td class="py-3.5 pr-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {member.role === 'admin' ? 'bg-forest-50 text-forest-600' : 'bg-cream-100 text-ink-500 dark:bg-ink-700 dark:text-cream-300'}">
                    {member.role}
                  </span>
                </td>
                <td class="py-3.5 pr-4">
                  <span class="text-xs text-ink-400 dark:text-cream-300">{member.provider || 'local'}</span>
                </td>
                <td class="py-3.5 pr-4">
                  <span class="text-sm text-ink-400 dark:text-cream-300">{new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </td>
                <td class="py-3.5 text-right">
                  {#if member.id !== data.user.id}
                    {#if deletingId === member.id}
                      <div class="flex items-center justify-end gap-2">
                        <span class="text-xs text-terra-500">Delete?</span>
                        <button
                          class="text-xs text-terra-500 hover:text-terra-700 font-medium"
                          onclick={() => confirmDelete(member.id)}
                        >
                          Yes
                        </button>
                        <button
                          class="text-xs text-ink-400 hover:text-ink-600 dark:text-cream-300 dark:hover:text-cream-200 font-medium"
                          onclick={() => deletingId = null}
                        >
                          No
                        </button>
                      </div>
                    {:else}
                      <div class="flex items-center justify-end gap-1">
                        <button
                          class="text-xs px-2.5 py-1 rounded-full font-medium transition-colors {member.role === 'admin' ? 'bg-forest-50 text-forest-600 hover:bg-forest-100 dark:bg-ink-700 dark:text-cream-300' : 'bg-cream-100 text-ink-500 hover:bg-cream-200 dark:bg-ink-700 dark:text-cream-300 dark:hover:bg-ink-600'}"
                          onclick={() => handleToggleRole(member.id, member.role)}
                          title={member.role === 'admin' ? 'Remove admin role' : 'Make admin'}
                        >
                          {member.role === 'admin' ? 'Demote' : 'Make Admin'}
                        </button>
                        <button
                          class="text-sm text-ink-300 hover:text-terra-500 dark:text-cream-400 dark:hover:text-terra-500 transition-colors ml-1"
                          onclick={() => handleDeleteMember(member.id)}
                          title="Remove member"
                        >
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    {/if}
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Add New Member -->
      <div class="border-t border-cream-200/50 dark:border-ink-600 pt-8">
        <h3 class="text-lg font-display font-semibold text-ink-600 dark:text-cream-200 mb-1">Add New Member</h3>
        <p class="text-sm text-ink-400 dark:text-cream-300 mb-6">Create a new family member account</p>

        {#if memberMessage}
          <div class="p-4 rounded-lg bg-forest-50 border border-forest-200 text-forest-600 text-sm mb-4">{memberMessage}</div>
        {/if}
        {#if memberError}
          <div class="p-4 rounded-lg bg-terra-50 border border-terra-200 text-terra-600 text-sm mb-4">{memberError}</div>
        {/if}

        <form onsubmit={handleAddMember} class="space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label for="memberName" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-2">Name</label>
              <input
                type="text"
                id="memberName"
                bind:value={memberName}
                placeholder="Full name"
                class="input w-full"
                required
              />
            </div>
            <div>
              <label for="memberEmail" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-2">Email</label>
              <input
                type="email"
                id="memberEmail"
                bind:value={memberEmail}
                placeholder="email@example.com"
                class="input w-full"
                required
              />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label for="memberPassword" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-2">Password</label>
              <input
                type="password"
                id="memberPassword"
                bind:value={memberPassword}
                placeholder="Min. 6 characters"
                class="input w-full"
                required
                minlength={6}
              />
            </div>
            <div>
              <label for="memberRole" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-2">Role</label>
              <select
                id="memberRole"
                bind:value={memberRole}
                class="input w-full"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={memberSaving}
            class="btn-primary inline-flex items-center justify-center gap-2"
          >
            {memberSaving ? 'Adding...' : 'Add Member'}
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  {/if}
</div>
