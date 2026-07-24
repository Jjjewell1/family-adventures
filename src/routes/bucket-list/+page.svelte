<script lang="ts">
  import type { PageData } from './$types';
  import { getImmichAssetUrl } from '$lib/shared/immich';

  let { data } = $props();

  let showAddForm = $state(false);
  let newTitle = $state('');
  let newDescription = $state('');
  let newLocation = $state('');
  let newCategory = $state('destination');
  let newStatus = $state('wishlist');
  let submitting = $state(false);
  let error = $state('');
  let expandedId = $state<string | null>(null);
  let commentText = $state('');
  let votingId = $state<string | null>(null);

  const categories = [
    { id: 'destination', label: 'Destination', icon: '🌍' },
    { id: 'activity', label: 'Activity', icon: '🎯' },
    { id: 'trip', label: 'Trip Idea', icon: '✈️' },
    { id: 'event', label: 'Event', icon: '🎉' },
    { id: 'other', label: 'Other', icon: '📌' }
  ];

  const statuses = [
    { id: 'wishlist', label: 'Wishlist', color: 'bg-sand-200 text-navy-500' },
    { id: 'next_up', label: 'Next Up', color: 'bg-ocean-100 text-ocean-600' },
    { id: 'planning', label: 'Planning', color: 'bg-sunset-100 text-sunset-600' },
    { id: 'booked', label: 'Booked', color: 'bg-coral-100 text-coral-600' }
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
          category: newCategory,
          status: newStatus
        })
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        error = err.error || 'Failed to add item';
      }
    } catch {
      error = 'An error occurred';
    }
    submitting = false;
  }

  async function vote(itemId: string, vote: number) {
    votingId = itemId;
    error = '';
    try {
      const res = await fetch('/api/bucket-list/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketItemId: itemId, vote })
      });
      if (res.ok) window.location.reload();
      else error = 'Failed to vote';
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
      if (res.ok) window.location.reload();
      else error = 'Failed to add comment';
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
      if (res.ok) window.location.reload();
      else error = 'Failed to update status';
    } catch { error = 'Network error'; }
  }

  async function deleteItem(itemId: string) {
    error = '';
    try {
      const res = await fetch(`/api/bucket-list/${itemId}`, { method: 'DELETE' });
      if (res.ok) window.location.reload();
      else error = 'Failed to delete item';
    } catch { error = 'Network error'; }
  }
</script>

<svelte:head>
  <title>Bucket List | Family Adventures</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm uppercase tracking-wider text-ocean-500 font-medium">Dream & Plan</p>
      <h1 class="text-3xl md:text-4xl font-display font-semibold text-navy-600 mt-2">Bucket List</h1>
      <p class="text-navy-400 mt-1">Places to go, things to do — vote on what's next!</p>
    </div>
    {#if data.user}
      <button
        onclick={() => showAddForm = !showAddForm}
        class="inline-flex items-center gap-2 rounded-full bg-ocean-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add
      </button>
    {/if}
  </div>

  {#if showAddForm}
    <div class="glass rounded-3xl p-6">
      <h2 class="text-lg font-semibold text-navy-600 mb-4">Add to Bucket List</h2>
      {#if error}
        <div class="mb-4 p-3 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 text-sm">{error}</div>
      {/if}
      <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); addItem(); }}>
        <div>
          <label for="bl-title" class="block text-sm font-medium text-navy-600 mb-1">What do you want to do?</label>
          <input type="text" id="bl-title" bind:value={newTitle} placeholder="Visit Yellowstone, Go skiing, etc."
            class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100" required />
        </div>
        <div>
          <label for="bl-desc" class="block text-sm font-medium text-navy-600 mb-1">Details</label>
          <textarea id="bl-desc" bind:value={newDescription} placeholder="Why is this on the list?" rows="2"
            class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100 resize-none"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="bl-loc" class="block text-sm font-medium text-navy-600 mb-1">Location</label>
            <input type="text" id="bl-loc" bind:value={newLocation} placeholder="Optional"
              class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100" />
          </div>
          <div>
            <label for="bl-cat" class="block text-sm font-medium text-navy-600 mb-1">Category</label>
            <select id="bl-cat" bind:value={newCategory}
              class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100">
              {#each categories as cat}
                <option value={cat.id}>{cat.icon} {cat.label}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="flex gap-3">
          <button type="submit" disabled={submitting}
            class="rounded-full bg-ocean-500 px-5 py-2 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50 transition-colors">
            {submitting ? 'Adding...' : 'Add to List'}
          </button>
          <button type="button" onclick={() => showAddForm = false}
            class="rounded-full border border-sand-300 bg-white px-5 py-2 text-sm font-medium text-navy-600 hover:bg-sand-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Group by status -->
  {#each statuses as status}
    {@const items = data.items.filter((i: any) => i.status === status.id)}
    {#if items.length > 0}
      <div>
        <div class="flex items-center gap-2 mb-3">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {status.color}">{status.label}</span>
          <span class="text-xs text-navy-400">({items.length})</span>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          {#each items as item (item.id)}
            <div class="glass rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-lg">{categories.find(c => c.id === item.category)?.icon || '📌'}</span>
                    <h3 class="font-semibold text-navy-600 truncate">{item.title}</h3>
                  </div>
                  {#if item.description}
                    <p class="text-sm text-navy-400 line-clamp-2">{item.description}</p>
                  {/if}
                  {#if item.location_name}
                    <p class="text-xs text-navy-400 mt-1 flex items-center gap-1">
                      <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {item.location_name}
                    </p>
                  {/if}
                </div>

                <!-- Vote buttons -->
                {#if data.user}
                  <div class="flex flex-col items-center gap-1 shrink-0">
                    <button onclick={() => vote(item.id, 1)}
                      class="h-8 w-8 rounded-full flex items-center justify-center hover:bg-ocean-50 transition-colors {votingId === item.id ? 'opacity-50' : ''}"
                      title="I want to go!">
                      <svg class="h-4 w-4 text-ocean-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <span class="text-sm font-semibold {item.vote_score > 0 ? 'text-ocean-500' : item.vote_score < 0 ? 'text-coral-500' : 'text-navy-400'}">
                      {item.vote_score}
                    </span>
                    <button onclick={() => vote(item.id, -1)}
                      class="h-8 w-8 rounded-full flex items-center justify-center hover:bg-coral-50 transition-colors"
                      title="Not interested">
                      <svg class="h-4 w-4 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                {/if}
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-between mt-3 pt-3 border-t border-sand-100">
                <div class="flex items-center gap-2">
                  {#if item.author_avatar}
                    <img src={item.author_avatar} alt="" class="h-5 w-5 rounded-full object-cover" />
                  {:else}
                    <div class="h-5 w-5 rounded-full bg-gradient-to-br from-coral-400 to-sunset-400 flex items-center justify-center text-white text-[8px] font-medium">
                      {item.author_name?.charAt(0).toUpperCase()}
                    </div>
                  {/if}
                  <span class="text-xs text-navy-400">{item.author_name}</span>
                </div>
                <div class="flex items-center gap-3">
                  <button onclick={() => expandedId = expandedId === item.id ? null : item.id}
                    class="text-xs text-navy-400 hover:text-navy-600 transition-colors flex items-center gap-1">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {item.comment_count}
                  </button>
                  {#if data.user && data.user.role === 'admin'}
                    <select value={item.status} onchange={(e) => updateStatus(item.id, (e.target as HTMLSelectElement).value)}
                      class="text-xs rounded-lg border border-sand-200 bg-white px-2 py-1 text-navy-500 focus:outline-none">
                      {#each statuses as s}
                        <option value={s.id}>{s.label}</option>
                      {/each}
                    </select>
                  {/if}
                </div>
              </div>

              <!-- Comments section -->
              {#if expandedId === item.id}
                <div class="mt-3 pt-3 border-t border-sand-100">
                  <p class="text-xs text-navy-400 mb-2">Comments</p>
                  {#if data.user}
                    <form class="flex gap-2 mb-3" onsubmit={(e) => { e.preventDefault(); addComment(item.id); }}>
                      <input type="text" bind:value={commentText} placeholder="Share your thoughts..."
                        class="flex-1 rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-1 focus:ring-ocean-100" />
                      <button type="submit" class="rounded-full bg-ocean-500 px-3 py-2 text-xs font-medium text-white hover:bg-ocean-600 transition-colors">
                        Post
                      </button>
                    </form>
                  {/if}
                  <p class="text-xs text-navy-400 italic">View full discussion on the detail page</p>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/each}

  {#if data.items.length === 0}
    <div class="glass rounded-3xl p-12 text-center">
      <div class="h-16 w-16 mx-auto mb-4 rounded-full bg-ocean-100 flex items-center justify-center">
        <svg class="h-8 w-8 text-ocean-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-navy-600 mb-2">Nothing on the list yet</h2>
      <p class="text-navy-400">Start dreaming — add places you'd love to visit!</p>
    </div>
  {/if}
</div>
