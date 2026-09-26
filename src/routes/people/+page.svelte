<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import EmptyState from '$lib/components/EmptyState.svelte';

  let { data } = $props();
  let showAddModal = $state(false);
  let newName = $state('');
  let saving = $state(false);
  let error = $state('');

  async function addPerson() {
    if (!newName.trim()) return;
    saving = true;
    error = '';
    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      const result = await res.json();
      if (res.ok) {
        goto(`/people/${result.person.slug}`);
      } else {
        error = result.error || 'Failed to add person';
      }
    } catch {
      error = 'Network error';
    }
    saving = false;
  }
</script>

<svelte:head>
  <title>People | Family Adventures</title>
</svelte:head>

<div class="space-y-6">
  <div class="page-header flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
      <p class="page-header-label">Everyone</p>
      <h1 class="page-header-title">People</h1>
      <p class="page-header-desc">{data.people.length} {data.people.length === 1 ? 'person' : 'people'} tagged across adventures</p>
    </div>
    {#if data.user}
      <button class="btn-primary" onclick={() => { showAddModal = true; newName = ''; error = ''; }}>
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Person
      </button>
    {/if}
  </div>

  {#if data.people.length === 0}
    <EmptyState
      icon="people"
      signedIn={!!data.user}
      title="Nobody tagged yet"
      body="Tag someone in an adventure photo and they collect here, alongside every adventure they have been part of."
      actionHref={data.user ? '/adventures' : undefined}
      actionLabel={data.user ? 'Go to adventures' : undefined}
    />
  {:else}
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {#each data.people as person}
        <a href="/people/{person.slug}" class="card overflow-hidden group cursor-pointer">
          <div class="relative aspect-square bg-cream-100 dark:bg-ink-700 overflow-hidden">
            {#if person.avatar_file_path}
              <img
                src={`/api/media/image?path=${encodeURIComponent(person.avatar_file_path)}&w=480`}
                alt={person.name}
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            {:else}
              <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-forest-100 to-terra-100">
                <span class="text-3xl font-display font-bold text-forest-600">{person.name.charAt(0).toUpperCase()}</span>
              </div>
            {/if}
          </div>
          <div class="p-3">
            <h3 class="font-semibold text-ink-800 dark:text-cream-100 group-hover:text-forest-600 transition-colors text-sm truncate">
              {person.name}
            </h3>
            <p class="text-xs text-ink-500 mt-0.5">
              {person.photo_count} {person.photo_count === 1 ? 'photo' : 'photos'}
            </p>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

{#if showAddModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="button" tabindex="-1" aria-label="Close" onclick={() => showAddModal = false} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') showAddModal = false; }}>
    <div class="card p-6 w-full max-w-sm mx-4" role="dialog" aria-label="Add person" tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <h2 class="text-lg font-display font-semibold text-ink-800 dark:text-cream-100 mb-4">Add Person</h2>
      {#if error}
        <div class="mb-4 p-3 rounded-lg bg-terra-50 border border-terra-200 text-terra-600 text-sm">{error}</div>
      {/if}
      <form onsubmit={(e) => { e.preventDefault(); addPerson(); }}>
        <input
          type="text"
          bind:value={newName}
          placeholder="Person's name"
          class="input w-full mb-4"
        />
        <div class="flex justify-end gap-3">
          <button type="button" class="btn-secondary" onclick={() => showAddModal = false}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={saving || !newName.trim()}>
            {saving ? 'Adding...' : 'Add Person'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
