<script lang="ts">
  import type { PageData } from './$types';
  import LocationInput from '$lib/components/LocationInput.svelte';
  import { onMount } from 'svelte';

  let { data } = $props();

  // svelte-ignore state_referenced_locally
  let items = $state<any[]>(data.items);
  let showAddForm = $state(false);
  let newTitle = $state('');
  let newDescription = $state('');
  let newLocation = $state('');
  let newLat = $state<number | null>(null);
  let newLng = $state<number | null>(null);
  let newCategory = $state('destination');
  let newStatus = $state('wishlist');
  let submitting = $state(false);
  let error = $state('');
  let expandedId = $state<string | null>(null);
  let commentText = $state('');
  let votingId = $state<string | null>(null);

  // AI state
  let aiEnabled = $state(false);
  let aiLoading = $state(false);
  let aiSuggestions = $state<{ title: string; description: string; locationName: string; category: string }[]>([]);
  let aiError = $state('');

  const categories = [
    { id: 'destination', label: 'Destination', icon: '🌍' },
    { id: 'activity', label: 'Activity', icon: '🎯' },
    { id: 'trip', label: 'Trip Idea', icon: '✈️' },
    { id: 'event', label: 'Event', icon: '🎉' },
    { id: 'other', label: 'Other', icon: '📌' }
  ];

  const statuses = [
    { id: 'wishlist', label: 'Wishlist', color: 'bg-cream-100 text-ink-500' },
    { id: 'next_up', label: 'Next Up', color: 'bg-forest-50 text-forest-600' },
    { id: 'planning', label: 'Planning', color: 'bg-gold-50 text-gold-600' },
    { id: 'booked', label: 'Booked', color: 'bg-terra-50 text-terra-600' }
  ];

  async function addItem() {
    if (!newTitle.trim()) { error = 'Title is required'; return; }
    submitting = true;
    error = '';

    try {
      const res = await fetch('/api/bucket-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          locationName: newLocation.trim() || null,
          lat: newLat,
          lng: newLng,
          category: newCategory,
          status: newStatus
        })
      });

      if (res.ok) {
        const newItem = await res.json();
        items = [newItem, ...items];
        newTitle = '';
        newDescription = '';
        newLocation = '';
        newLat = null;
        newLng = null;
        showAddForm = false;
      } else {
        const err = await res.json();
        error = err.error || 'Failed to add item';
      }
    } catch {
      error = 'An error occurred';
    }
    submitting = false;
  }

  async function vote(itemId: string, voteValue: number) {
    votingId = itemId;
    error = '';
    try {
      const res = await fetch('/api/bucket-list/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketItemId: itemId, vote: voteValue })
      });
      if (res.ok) {
        // Optimistically update vote score
        items = items.map(item => {
          if (item.id === itemId) {
            // Simple increment/decrement — server handles the actual math
            return { ...item, vote_score: (item.vote_score || 0) + voteValue };
          }
          return item;
        });
      } else {
        error = 'Failed to vote';
      }
    } catch { error = 'Network error'; }
    votingId = null;
  }

  async function addComment(itemId: string) {
    if (!commentText.trim()) return;
    error = '';
    try {
      const res = await fetch('/api/bucket-list/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketItemId: itemId, content: commentText.trim() })
      });
      if (res.ok) {
        items = items.map(item => {
          if (item.id === itemId) {
            return { ...item, comment_count: (item.comment_count || 0) + 1 };
          }
          return item;
        });
        commentText = '';
      } else {
        error = 'Failed to add comment';
      }
    } catch { error = 'Network error'; }
  }

  async function updateStatus(itemId: string, status: string) {
    error = '';
    try {
      const res = await fetch(`/api/bucket-list/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        items = items.map(item => item.id === itemId ? { ...item, status } : item);
      } else {
        error = 'Failed to update status';
      }
    } catch { error = 'Network error'; }
  }

  async function deleteItem(itemId: string) {
    error = '';
    try {
      const res = await fetch(`/api/bucket-list/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        items = items.filter(item => item.id !== itemId);
      } else {
        error = 'Failed to delete item';
      }
    } catch { error = 'Network error'; }
  }

  async function checkAIStatus() {
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      aiEnabled = data.config?.enabled && data.connection?.ok;
    } catch {
      aiEnabled = false;
    }
  }

  async function getAISuggestions() {
    aiLoading = true;
    aiError = '';
    try {
      const res = await fetch('/api/ai/bucket-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const result = await res.json();
      if (res.ok && result.suggestions) {
        aiSuggestions = result.suggestions;
      } else {
        aiError = result.error || 'Failed to get suggestions';
      }
    } catch {
      aiError = 'Failed to connect to AI';
    }
    aiLoading = false;
  }

  async function addSuggestion(suggestion: { title: string; description: string; locationName: string; category: string }) {
    try {
      const res = await fetch('/api/bucket-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.description || null,
          locationName: suggestion.locationName || null,
          category: suggestion.category || 'destination',
          status: 'wishlist'
        })
      });
      if (res.ok) {
        const newItem = await res.json();
        items = [newItem, ...items];
        aiSuggestions = aiSuggestions.filter(s => s.title !== suggestion.title);
      }
    } catch {}
  }

  onMount(() => { checkAIStatus(); });
</script>

<svelte:head>
  <title>Bucket List | Family Adventures</title>
</svelte:head>

<div class="space-y-6">
  <div class="page-header flex items-center justify-between">
    <div>
      <p class="page-header-label">Dream & Plan</p>
      <h1 class="page-header-title">Bucket List</h1>
      <p class="page-header-desc">Places to go, things to do — vote on what's next!</p>
    </div>
    {#if data.user}
      <div class="flex gap-2 shrink-0">
        {#if aiEnabled}
          <button
            onclick={getAISuggestions}
            disabled={aiLoading}
            class="btn-accent"
          >
            {#if aiLoading}
              <div class="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
              Getting ideas...
            {:else}
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Suggestions
            {/if}
          </button>
        {/if}
        <button
          onclick={() => showAddForm = !showAddForm}
          class="btn-secondary"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>
    {/if}
  </div>

  {#if showAddForm}
    <div class="card p-6 animate-in">
      <h2 class="text-lg font-display font-semibold text-ink-800 dark:text-cream-100 mb-4">Add to Bucket List</h2>
      {#if error}
        <div class="mb-4 p-3 rounded-lg bg-terra-50 border border-terra-200 text-terra-600 text-sm">{error}</div>
      {/if}
      <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); addItem(); }}>
        <div>
          <label for="bl-title" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">What do you want to do?</label>
          <input type="text" id="bl-title" bind:value={newTitle} placeholder="Visit Yellowstone, Go skiing, etc."
            class="input" required />
        </div>
        <div>
          <label for="bl-desc" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">Details</label>
          <textarea id="bl-desc" bind:value={newDescription} placeholder="Why is this on the list?" rows="2"
            class="input resize-none"></textarea>
        </div>
        <div>
          <label for="bl-loc" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">Location</label>
          <LocationInput bind:value={newLocation} bind:lat={newLat} bind:lng={newLng} placeholder="Search for a location..." />
        </div>
        <div>
          <label for="bl-cat" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">Category</label>
          <select id="bl-cat" bind:value={newCategory} class="input">
            {#each categories as cat}
              <option value={cat.id}>{cat.icon} {cat.label}</option>
            {/each}
          </select>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} class="btn-primary disabled:opacity-50">
            {submitting ? 'Adding...' : 'Add to List'}
          </button>
          <button type="button" onclick={() => showAddForm = false} class="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  {/if}

  {#if aiError}
    <div class="p-4 rounded-lg bg-gold-50 border border-gold-200 text-gold-700 text-sm">
      {aiError}
      <button class="ml-2 underline" onclick={() => aiError = ''}>Dismiss</button>
    </div>
  {/if}

  {#if aiSuggestions.length > 0}
    <div class="card p-6 animate-in">
      <h2 class="text-lg font-display font-semibold text-ink-800 dark:text-cream-100 mb-1">AI Suggestions</h2>
      <p class="text-xs text-ink-400 mb-4">Based on your family's travel history</p>
      <div class="grid gap-3 md:grid-cols-2">
        {#each aiSuggestions as suggestion}
          <div class="p-4 rounded-lg bg-forest-50 border border-forest-100 dark:bg-forest-900 dark:border-forest-800">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-ink-700 dark:text-cream-100">{suggestion.title}</h3>
                {#if suggestion.description}
                  <p class="text-sm text-ink-400 mt-1">{suggestion.description}</p>
                {/if}
                {#if suggestion.locationName}
                  <p class="text-xs text-ink-400 mt-1 flex items-center gap-1">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {suggestion.locationName}
                  </p>
                {/if}
              </div>
              <button
                onclick={() => addSuggestion(suggestion)}
                class="btn-primary shrink-0 text-xs px-3 py-1.5"
              >
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Group by status -->
  {#each statuses as status}
    {@const itemsList = items.filter((i: any) => i.status === status.id)}
    {#if itemsList.length > 0}
      <div>
        <div class="flex items-center gap-2 mb-3">
          <span class="badge {status.color}">{status.label}</span>
          <span class="text-xs text-ink-400">({itemsList.length})</span>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          {#each itemsList as item (item.id)}
            <div class="card p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-lg">{categories.find(c => c.id === item.category)?.icon || '📌'}</span>
                    <h3 class="font-semibold text-ink-800 dark:text-cream-100 truncate">{item.title}</h3>
                  </div>
                  {#if item.description}
                    <p class="text-sm text-ink-400 line-clamp-2">{item.description}</p>
                  {/if}
                  {#if item.location_name}
                    <p class="text-xs text-ink-400 mt-1 flex items-center gap-1">
                      <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {item.location_name}
                    </p>
                  {/if}
                </div>

                <!-- Vote buttons -->
                {#if data.user}
                  <div class="flex flex-col items-center gap-0.5 shrink-0">
                    <button onclick={() => vote(item.id, 1)}
                      class="h-7 w-7 rounded-md flex items-center justify-center hover:bg-forest-50 dark:hover:bg-forest-900 transition-colors {votingId === item.id ? 'opacity-50' : ''}"
                      title="I want to go!">
                      <svg class="h-4 w-4 text-forest-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <span class="text-sm font-semibold {item.vote_score > 0 ? 'text-forest-500' : item.vote_score < 0 ? 'text-terra-500' : 'text-ink-400'}">
                      {item.vote_score}
                    </span>
                    <button onclick={() => vote(item.id, -1)}
                      class="h-7 w-7 rounded-md flex items-center justify-center hover:bg-terra-50 dark:hover:bg-terra-900 transition-colors"
                      title="Not interested">
                      <svg class="h-4 w-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                {/if}
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-between mt-3 pt-3 border-t border-cream-200 dark:border-ink-600">
                <div class="flex items-center gap-2">
                  {#if item.author_avatar}
                    <img src={item.author_avatar} alt="" class="h-5 w-5 rounded-full object-cover" />
                  {:else}
                    <div class="h-5 w-5 rounded-full bg-terra-500 flex items-center justify-center text-white text-[9px] font-medium">
                      {item.author_name?.charAt(0).toUpperCase()}
                    </div>
                  {/if}
                  <span class="text-xs text-ink-400">{item.author_name}</span>
                </div>
                <div class="flex items-center gap-2">
                  <button onclick={() => expandedId = expandedId === item.id ? null : item.id}
                    class="text-xs text-ink-400 hover:text-ink-600 transition-colors flex items-center gap-1">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {item.comment_count}
                  </button>
                  {#if data.user && data.user.role === 'admin'}
                    <select value={item.status} onchange={(e) => updateStatus(item.id, (e.target as HTMLSelectElement).value)}
                      class="text-xs rounded-md border border-cream-200 bg-white px-2 py-1 text-ink-500 focus:outline-none dark:bg-ink-700 dark:border-ink-600 dark:text-cream-200">
                      {#each statuses as s}
                        <option value={s.id}>{s.label}</option>
                      {/each}
                    </select>
                  {/if}
                </div>
              </div>

              <!-- Comments section -->
              {#if expandedId === item.id}
                <div class="mt-3 pt-3 border-t border-cream-200 dark:border-ink-600">
                  <p class="text-xs text-ink-400 mb-2">Comments</p>
                  {#if data.user}
                    <form class="flex gap-2 mb-3" onsubmit={(e) => { e.preventDefault(); addComment(item.id); }}>
                      <input type="text" bind:value={commentText} placeholder="Share your thoughts..."
                        class="input flex-1 py-2 text-sm" />
                      <button type="submit" class="btn-primary text-xs px-3 py-2">Post</button>
                    </form>
                  {/if}
                  <p class="text-xs text-ink-400 italic">View full discussion on the detail page</p>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/each}

  {#if items.length === 0}
    <div class="card-flat p-12 text-center">
      <div class="h-14 w-14 mx-auto mb-4 rounded-full bg-cream-100 flex items-center justify-center">
        <svg class="h-7 w-7 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 class="text-xl font-display font-semibold text-ink-700 dark:text-cream-200 mb-2">Nothing on the list yet</h2>
      <p class="text-ink-400">Start dreaming — add places you'd love to visit!</p>
    </div>
  {/if}
</div>
