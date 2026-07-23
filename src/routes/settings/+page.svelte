<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

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

  const isAdmin = $derived(data.user.role === 'admin');
  const tabs = $derived(isAdmin
    ? [{ id: 'profile', label: 'Profile' }, { id: 'immich', label: 'Immich' }, { id: 'members', label: 'Family Members' }]
    : [{ id: 'profile', label: 'Profile' }, { id: 'immich', label: 'Immich' }]
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
</script>

<svelte:head>
  <title>Settings | Family Adventures</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-8">
  <div>
    <h1 class="text-3xl font-display font-semibold text-navy-600">Settings</h1>
    <p class="text-navy-400 mt-1">Manage your account and family preferences</p>
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 p-1 glass rounded-2xl">
    {#each tabs as tab}
      <button
        class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all {activeTab === tab.id
          ? 'bg-ocean-500 text-white shadow-sm'
          : 'text-navy-500 hover:bg-sand-100'}"
        onclick={() => activeTab = tab.id}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Profile Tab -->
  {#if activeTab === 'profile'}
    <div class="glass rounded-3xl p-8 space-y-8">
      <div>
        <h2 class="text-xl font-display font-semibold text-navy-600 mb-1">Profile</h2>
        <p class="text-sm text-navy-400">Update your name and email address</p>
      </div>

      {#if profileMessage}
        <div class="p-4 rounded-xl bg-ocean-50 border border-ocean-200 text-ocean-600 text-sm">{profileMessage}</div>
      {/if}
      {#if profileError}
        <div class="p-4 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 text-sm">{profileError}</div>
      {/if}

      <form onsubmit={handleProfileSubmit} class="space-y-6">
        <div>
          <label for="name" class="block text-sm font-medium text-navy-600 mb-2">Name</label>
          <input
            type="text"
            id="name"
            bind:value={profileName}
            class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
            required
          />
        </div>
        <div>
          <label for="email" class="block text-sm font-medium text-navy-600 mb-2">Email</label>
          <input
            type="email"
            id="email"
            bind:value={profileEmail}
            class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
            required
          />
        </div>
        <button
          type="submit"
          disabled={profileSaving}
          class="inline-flex items-center justify-center gap-2 rounded-full bg-ocean-500 px-6 py-3 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50 transition-colors"
        >
          {profileSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <div class="border-t border-sand-200/50 pt-8">
        <h3 class="text-lg font-display font-semibold text-navy-600 mb-1">Change Password</h3>
        <p class="text-sm text-navy-400 mb-6">Update your account password</p>

        {#if passwordMessage}
          <div class="p-4 rounded-xl bg-ocean-50 border border-ocean-200 text-ocean-600 text-sm mb-4">{passwordMessage}</div>
        {/if}
        {#if passwordError}
          <div class="p-4 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 text-sm mb-4">{passwordError}</div>
        {/if}

        <form onsubmit={handlePasswordSubmit} class="space-y-5">
          <div>
            <label for="oldPassword" class="block text-sm font-medium text-navy-600 mb-2">Current Password</label>
            <div class="relative">
              <input
                type={showOldPassword ? 'text' : 'password'}
                id="oldPassword"
                bind:value={oldPassword}
                placeholder="Enter current password"
                class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 pr-12 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
                required
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
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
            <label for="newPassword" class="block text-sm font-medium text-navy-600 mb-2">New Password</label>
            <div class="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                bind:value={newPassword}
                placeholder="Enter new password"
                class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 pr-12 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
                required
                minlength={6}
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
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
            <label for="confirmPassword" class="block text-sm font-medium text-navy-600 mb-2">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              bind:value={confirmPassword}
              placeholder="Confirm new password"
              class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
              required
              minlength={6}
            />
          </div>
          <button
            type="submit"
            disabled={passwordSaving}
            class="inline-flex items-center justify-center gap-2 rounded-full bg-ocean-500 px-6 py-3 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50 transition-colors"
          >
            {passwordSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  {/if}

  <!-- Immich Tab -->
  {#if activeTab === 'immich'}
    <div class="glass rounded-3xl p-8 space-y-6">
      <div>
        <h2 class="text-xl font-display font-semibold text-navy-600 mb-1">Immich Integration</h2>
        <p class="text-sm text-navy-400">Photo and video server configuration</p>
      </div>

      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 rounded-xl bg-sand-50 border border-sand-200/50">
          <div>
            <p class="text-sm font-medium text-navy-600">IMMICH_API_URL</p>
            <p class="text-xs text-navy-400 mt-0.5">Server URL for the Immich API</p>
          </div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium {data.immichConfigured ? 'bg-ocean-50 text-ocean-600' : 'bg-sand-200 text-navy-400'}">
            <span class="h-1.5 w-1.5 rounded-full {data.immichConfigured ? 'bg-ocean-500' : 'bg-navy-300'}"></span>
            {data.immichUrl}
          </span>
        </div>

        <div class="flex items-center justify-between p-4 rounded-xl bg-sand-50 border border-sand-200/50">
          <div>
            <p class="text-sm font-medium text-navy-600">IMMICH_API_KEY</p>
            <p class="text-xs text-navy-400 mt-0.5">API key for authenticating with Immich</p>
          </div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium {data.immichConfigured ? 'bg-ocean-50 text-ocean-600' : 'bg-sand-200 text-navy-400'}">
            <span class="h-1.5 w-1.5 rounded-full {data.immichConfigured ? 'bg-ocean-500' : 'bg-navy-300'}"></span>
            {data.immichKey}
          </span>
        </div>
      </div>

      <div class="p-5 rounded-xl bg-sand-50 border border-sand-200/50">
        <h3 class="text-sm font-semibold text-navy-600 mb-2">Configuration</h3>
        <p class="text-sm text-navy-400 leading-relaxed">
          These values are configured through environment variables in your Coolify/Docker deployment.
          To update them, edit the environment variables in your Coolify dashboard:
        </p>
        <div class="mt-3 p-3 rounded-lg bg-navy-500/5 border border-navy-500/10 font-mono text-xs text-navy-500 space-y-1">
          <p>IMMICH_API_URL=https://your-immich-server.com</p>
          <p>IMMICH_API_KEY=your-api-key-here</p>
        </div>
        <p class="text-xs text-navy-400 mt-3">A restart is required after changing environment variables.</p>
      </div>
    </div>
  {/if}

  <!-- Family Members Tab (admin only) -->
  {#if activeTab === 'members' && isAdmin}
    <div class="glass rounded-3xl p-8 space-y-8">
      <div>
        <h2 class="text-xl font-display font-semibold text-navy-600 mb-1">Family Members</h2>
        <p class="text-sm text-navy-400">Manage user accounts for your family</p>
      </div>

      <!-- Members Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-sand-200/50">
              <th class="text-left text-xs font-semibold text-navy-400 uppercase tracking-wider pb-3 pr-4">Name</th>
              <th class="text-left text-xs font-semibold text-navy-400 uppercase tracking-wider pb-3 pr-4">Email</th>
              <th class="text-left text-xs font-semibold text-navy-400 uppercase tracking-wider pb-3 pr-4">Role</th>
              <th class="text-left text-xs font-semibold text-navy-400 uppercase tracking-wider pb-3 pr-4">Created</th>
              <th class="text-right text-xs font-semibold text-navy-400 uppercase tracking-wider pb-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sand-200/50">
            {#each data.users as member (member.id)}
              <tr class="group">
                <td class="py-3.5 pr-4">
                  <div class="flex items-center gap-3">
                    <div class="h-8 w-8 rounded-full bg-gradient-to-br from-coral-400 to-sunset-400 flex items-center justify-center text-white text-xs font-medium shrink-0">
                      {member.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span class="text-sm font-medium text-navy-600">
                      {member.name}
                      {#if member.id === data.user.id}
                        <span class="text-navy-300 ml-1">(you)</span>
                      {/if}
                    </span>
                  </div>
                </td>
                <td class="py-3.5 pr-4">
                  <span class="text-sm text-navy-400">{member.email}</span>
                </td>
                <td class="py-3.5 pr-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {member.role === 'admin' ? 'bg-ocean-50 text-ocean-600' : 'bg-sand-200 text-navy-500'}">
                    {member.role}
                  </span>
                </td>
                <td class="py-3.5 pr-4">
                  <span class="text-sm text-navy-400">{new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </td>
                <td class="py-3.5 text-right">
                  {#if member.id !== data.user.id}
                    {#if deletingId === member.id}
                      <div class="flex items-center justify-end gap-2">
                        <span class="text-xs text-coral-500">Delete?</span>
                        <button
                          class="text-xs text-coral-500 hover:text-coral-700 font-medium"
                          onclick={() => confirmDelete(member.id)}
                        >
                          Yes
                        </button>
                        <button
                          class="text-xs text-navy-400 hover:text-navy-600 font-medium"
                          onclick={() => deletingId = null}
                        >
                          No
                        </button>
                      </div>
                    {:else}
                      <button
                        class="text-sm text-navy-300 hover:text-coral-500 transition-colors"
                        onclick={() => handleDeleteMember(member.id)}
                        title="Remove member"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    {/if}
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Add New Member -->
      <div class="border-t border-sand-200/50 pt-8">
        <h3 class="text-lg font-display font-semibold text-navy-600 mb-1">Add New Member</h3>
        <p class="text-sm text-navy-400 mb-6">Create a new family member account</p>

        {#if memberMessage}
          <div class="p-4 rounded-xl bg-ocean-50 border border-ocean-200 text-ocean-600 text-sm mb-4">{memberMessage}</div>
        {/if}
        {#if memberError}
          <div class="p-4 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 text-sm mb-4">{memberError}</div>
        {/if}

        <form onsubmit={handleAddMember} class="space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label for="memberName" class="block text-sm font-medium text-navy-600 mb-2">Name</label>
              <input
                type="text"
                id="memberName"
                bind:value={memberName}
                placeholder="Full name"
                class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
                required
              />
            </div>
            <div>
              <label for="memberEmail" class="block text-sm font-medium text-navy-600 mb-2">Email</label>
              <input
                type="email"
                id="memberEmail"
                bind:value={memberEmail}
                placeholder="email@example.com"
                class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
                required
              />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label for="memberPassword" class="block text-sm font-medium text-navy-600 mb-2">Password</label>
              <input
                type="password"
                id="memberPassword"
                bind:value={memberPassword}
                placeholder="Min. 6 characters"
                class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
                required
                minlength={6}
              />
            </div>
            <div>
              <label for="memberRole" class="block text-sm font-medium text-navy-600 mb-2">Role</label>
              <select
                id="memberRole"
                bind:value={memberRole}
                class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={memberSaving}
            class="inline-flex items-center justify-center gap-2 rounded-full bg-ocean-500 px-6 py-3 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50 transition-colors"
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
