<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';

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
    <div class="card-flat text-center py-16">
      <div class="h-14 w-14 mx-auto rounded-full bg-cream-100 flex items-center justify-center mb-4">
        <svg class="h-7 w-7 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-ink-700 dark:text-cream-200">No people tagged yet</h3>
      <p class="text-ink-400 mt-2 text-sm">Tag people in your adventure photos to see them here!</p>
    </div>
  {:else}
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {#each data.people as person}
        <a href="/people/{person.slug}" class="card overflow-hidden group cursor-pointer">
          <div class="relative aspect-square bg-cream-100 overflow-hidden">
            {#if person.avatar_file_path}
              <img
                src={person.avatar_file_path}
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
            <p class="text-xs text-ink-400 mt-0.5">
              {person.photo_count} {person.photo_count === 1 ? 'photo' : 'photos'}
            </p>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

{#if showAddModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showAddModal = false}>
    <div class="card p-6 w-full max-w-sm mx-4" onclick={(e) => e.stopPropagation()}>
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
          autofocus
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
