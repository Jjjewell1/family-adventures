<script lang="ts">
  import type { PageData } from './$types';
  import { formatDate, timeAgo } from '$lib/shared/utils';
  import { getImmichAssetUrl } from '$lib/shared/immich';
  
  let { data } = $props();
  let showShareDialog = $state(false);
  let shareLink = $state('');
  let newComment = $state('');
  let submittingComment = $state(false);
  let myRating = $state(data.ratings?.find((r: any) => r.author_id === data.user?.id)?.score || 0);
  let hoverRating = $state(0);
  let showStoryForm = $state(false);
  let storyTitle = $state('');
  let storyContent = $state('');
  let submittingStory = $state(false);

  // Side Quests state
  let sideQuestView = $state<'timeline' | 'cards'>('timeline');
  let showSideQuestForm = $state(false);
  let editingSQId = $state<string | null>(null);
  let sqTitle = $state('');
  let sqDay = $state('');
  let sqNote = $state('');
  let sqRating = $state(0);
  let sqHoverRating = $state(0);
  let submittingSQ = $state(false);
  let deletingSQId = $state<string | null>(null);

  const reactionEmojis = ['❤️', '🔥', '😊', '👏', '🌊', '✈️'];

  const subAdventures = $derived(data.subAdventures || []);

  const subAdventuresByDay = $derived((() => {
    const grouped: Record<number, any[]> = {};
    const undated: any[] = [];
    for (const sq of subAdventures) {
      if (sq.day_number != null) {
        if (!grouped[sq.day_number]) grouped[sq.day_number] = [];
        grouped[sq.day_number].push(sq);
      } else {
        undated.push(sq);
      }
    }
    return { grouped, undated };
  })());
  
  async function addReaction(emoji: string) {
    const response = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adventureId: data.adventure.id, emoji })
    });
    
    if (response.ok) {
      window.location.reload();
    }
  }

  async function submitComment(parentId: string | null = null) {
    if (!newComment.trim()) return;
    submittingComment = true;

    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adventureId: data.adventure.id,
        content: newComment,
        parentId
      })
    });

    if (response.ok) {
      newComment = '';
      window.location.reload();
    }
    submittingComment = false;
  }

  async function createShareLink() {
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adventureId: data.adventure.id })
    });

    if (response.ok) {
      const result = await response.json();
      shareLink = `${window.location.origin}/share/${result.token}`;
      showShareDialog = true;
    }
  }

  function copyShareLink() {
    navigator.clipboard.writeText(shareLink);
  }

  async function setRating(score: number) {
    if (!data.user) return;
    myRating = score;
    await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adventureId: data.adventure.id, score })
    });
  }

  async function submitStory() {
    if (!storyContent.trim()) return;
    submittingStory = true;
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adventureId: data.adventure.id, title: storyTitle.trim() || null, content: storyContent.trim() })
    });
    if (res.ok) window.location.reload();
    submittingStory = false;
  }

  function startEditSQ(sq: any) {
    editingSQId = sq.id;
    showSideQuestForm = false;
    sqTitle = sq.title;
    sqDay = sq.day_number != null ? String(sq.day_number) : '';
    sqNote = sq.note || '';
    sqRating = sq.rating || 0;
  }

  function cancelEditSQ() {
    editingSQId = null;
    sqTitle = '';
    sqDay = '';
    sqNote = '';
    sqRating = 0;
  }

  async function submitSideQuest() {
    if (!sqTitle.trim()) return;
    submittingSQ = true;

    if (editingSQId) {
      const res = await fetch(`/api/sub-adventures/${editingSQId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sqTitle.trim(),
          dayNumber: sqDay ? parseInt(sqDay) : null,
          note: sqNote.trim() || null,
          rating: sqRating || null
        })
      });
      if (res.ok) window.location.reload();
    } else {
      const res = await fetch('/api/sub-adventures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adventureId: data.adventure.id,
          title: sqTitle.trim(),
          dayNumber: sqDay ? parseInt(sqDay) : null,
          note: sqNote.trim() || null,
          rating: sqRating || null
        })
      });
      if (res.ok) window.location.reload();
    }
    submittingSQ = false;
  }

  async function deleteSideQuest(id: string) {
    deletingSQId = id;
  }

  async function confirmDeleteSQ(id: string) {
    const res = await fetch(`/api/sub-adventures/${id}`, { method: 'DELETE' });
    if (res.ok) window.location.reload();
    deletingSQId = null;
  }

  function sqImageUrl(media: any) {
    if (media.file_path) return `/uploads/${media.file_path}`;
    if (media.immich_asset_id) return getImmichAssetUrl(media.immich_asset_id, true);
    return '';
  }
</script>

<svelte:head>
  <title>{data.adventure.title} | Family Adventures</title>
  <meta name="description" content={data.adventure.description || data.adventure.title} />
  
  <!-- Open Graph -->
  <meta property="og:title" content={data.adventure.title} />
  <meta property="og:description" content={data.adventure.description || ''} />
  {#if data.adventure.cover_asset_id}
    <meta property="og:image" content="{data.siteUrl}/api/immich/asset/{data.adventure.cover_asset_id}" />
  {/if}
  <meta property="og:type" content="article" />
</svelte:head>

<article class="max-w-4xl mx-auto">
  <!-- Back button -->
  <a href="/adventures" class="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-navy-600 mb-6 transition-colors">
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Back to Adventures
  </a>

  <!-- Hero -->
  <div class="relative rounded-3xl overflow-hidden mb-8">
    {#if data.adventure.cover_file_path}
      <img
        src={data.adventure.cover_file_path}
        alt={data.adventure.title}
        class="w-full h-64 md:h-96 object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
    {:else if data.adventure.cover_asset_id}
      <img
        src={getImmichAssetUrl(data.adventure.cover_asset_id)}
        alt={data.adventure.title}
        class="w-full h-64 md:h-96 object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
    {:else}
      <div class="w-full h-64 md:h-96 bg-gradient-to-br from-ocean-400 to-ocean-600"></div>
    {/if}
    
    <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8">
      <!-- Tags -->
      {#if data.adventure.tags && data.adventure.tags.length > 0}
        <div class="flex flex-wrap gap-2 mb-3">
          {#each data.adventure.tags as tag}
            <span 
              class="px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm"
            >
              {tag.name}
            </span>
          {/each}
        </div>
      {/if}

      <h1 class="text-3xl md:text-4xl font-display font-semibold text-white mb-2">
        {data.adventure.title}
      </h1>

      <div class="flex flex-wrap items-center gap-4 text-white/80 text-sm">
        {#if data.adventure.start_date}
          <span class="flex items-center gap-1.5">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(data.adventure.start_date)}
            {#if data.adventure.end_date && data.adventure.end_date !== data.adventure.start_date}
              - {formatDate(data.adventure.end_date)}
            {/if}
          </span>
        {/if}

        {#if data.adventure.location_name}
          <span class="flex items-center gap-1.5">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {data.adventure.location_name}
          </span>
        {/if}

        <span class="flex items-center gap-1.5">
          <div class="h-5 w-5 rounded-full bg-gradient-to-br from-coral-400 to-sunset-400 flex items-center justify-center text-white text-xs font-medium">
            {data.adventure.author_name.charAt(0).toUpperCase()}
          </div>
          {data.adventure.author_name}
        </span>
      </div>
    </div>
  </div>

  <!-- Description -->
  {#if data.adventure.description}
    <div class="glass rounded-2xl p-6 mb-8">
      <p class="text-lg text-navy-500 leading-relaxed">{data.adventure.description}</p>
    </div>
  {/if}

  <!-- Content -->
  {#if data.adventure.content}
    <div class="prose prose-lg max-w-none mb-8">
      {@html data.adventure.content}
    </div>
  {/if}

  <!-- Media Gallery -->
  {#if data.adventure.media && data.adventure.media.length > 0}
    <div class="mb-8">
      <h2 class="text-xl font-semibold text-navy-600 mb-4">Photos & Videos</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#each data.adventure.media as media}
          <div class="relative aspect-square rounded-2xl overflow-hidden group">
            <img
              src={media.file_path || getImmichAssetUrl(media.immich_asset_id, true)}
              alt={media.caption || 'Adventure photo'}
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {#if media.caption}
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p class="absolute bottom-3 left-3 right-3 text-white text-sm">{media.caption}</p>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Side Quests -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-semibold text-navy-600">Side Quests</h2>
        {#if subAdventures.length > 0}
          <div class="flex rounded-lg border border-sand-200 overflow-hidden text-xs">
            <button
              class="px-3 py-1.5 font-medium transition-colors {sideQuestView === 'timeline' ? 'bg-ocean-500 text-white' : 'bg-white text-navy-500 hover:bg-sand-50'}"
              onclick={() => sideQuestView = 'timeline'}
            >
              Timeline
            </button>
            <button
              class="px-3 py-1.5 font-medium transition-colors {sideQuestView === 'cards' ? 'bg-ocean-500 text-white' : 'bg-white text-navy-500 hover:bg-sand-50'}"
              onclick={() => sideQuestView = 'cards'}
            >
              Cards
            </button>
          </div>
        {/if}
      </div>
      {#if data.user}
        <button
          onclick={() => { if (editingSQId) cancelEditSQ(); showSideQuestForm = !showSideQuestForm; }}
          class="text-sm text-ocean-500 hover:text-ocean-600 font-medium"
        >
          {(showSideQuestForm || editingSQId) ? 'Cancel' : '+ Add Side Quest'}
        </button>
      {/if}
    </div>

    {#if showSideQuestForm || editingSQId}
      <form class="glass rounded-2xl p-5 mb-6 space-y-4" onsubmit={(e) => { e.preventDefault(); submitSideQuest(); }}>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-navy-600">{editingSQId ? 'Edit Side Quest' : 'New Side Quest'}</h3>
          {#if editingSQId}
            <button type="button" class="text-xs text-navy-400 hover:text-navy-600" onclick={cancelEditSQ}>Cancel</button>
          {/if}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="sqTitle" class="block text-sm font-medium text-navy-600 mb-1">Title</label>
            <input id="sqTitle" type="text" bind:value={sqTitle} placeholder="e.g. Aquarium Visit" required
              class="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100" />
          </div>
          <div>
            <label for="sqDay" class="block text-sm font-medium text-navy-600 mb-1">Day (optional)</label>
            <input id="sqDay" type="number" min="1" bind:value={sqDay} placeholder="e.g. 2"
              class="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100" />
          </div>
        </div>
        <div>
          <label for="sqNote" class="block text-sm font-medium text-navy-600 mb-1">Note (optional)</label>
          <textarea id="sqNote" bind:value={sqNote} placeholder="A short note about this side quest..." rows="2"
            class="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100 resize-none"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-navy-600 mb-1">Rating (optional)</label>
          <div class="flex gap-1">
            {#each Array(5) as _, i}
              <button type="button" class="text-xl transition-transform hover:scale-110"
                onclick={() => sqRating = sqRating === i + 1 ? 0 : i + 1}
                onmouseenter={() => sqHoverRating = i + 1}
                onmouseleave={() => sqHoverRating = 0}>
                {(sqHoverRating || sqRating) > i ? '🔥' : '⚪'}
              </button>
            {/each}
            {#if sqRating > 0}
              <span class="ml-2 text-sm text-navy-400 self-center">{sqRating}/5</span>
            {/if}
          </div>
        </div>
        <button type="submit" disabled={submittingSQ || !sqTitle.trim()}
          class="rounded-full bg-ocean-500 px-5 py-2 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50 transition-colors">
          {submittingSQ ? 'Saving...' : editingSQId ? 'Save Changes' : 'Add Side Quest'}
        </button>
      </form>
    {/if}

    {#if subAdventures.length === 0}
      <div class="glass rounded-2xl p-8 text-center">
        <div class="text-3xl mb-3">🗺️</div>
        <p class="text-navy-400 text-sm">No side quests yet. Add stops, activities, and little detours from this trip!</p>
      </div>
    {:else if sideQuestView === 'timeline'}
      <!-- Timeline View -->
      <div class="relative">
        <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-sand-200"></div>
        {#each Object.entries(subAdventuresByDay.grouped).sort(([a], [b]) => Number(a) - Number(b)) as [day, items]}
          <div class="relative pl-10 pb-6">
            <div class="absolute left-2.5 top-1 h-4 w-4 rounded-full bg-ocean-500 border-2 border-white shadow-sm flex items-center justify-center">
              <span class="text-[8px] text-white font-bold">{day}</span>
            </div>
            <p class="text-xs font-semibold text-ocean-600 uppercase tracking-wider mb-3">Day {day}</p>
            <div class="space-y-3">
              {#each items as sq (sq.id)}
                <div class="glass rounded-2xl overflow-hidden group hover:shadow-md transition-shadow">
                  <!-- Main row: thumbnail + content -->
                  <div class="flex">
                    <!-- Thumbnail -->
                    <div class="w-28 h-28 sm:w-36 sm:h-32 shrink-0 overflow-hidden">
                      {#if sq.media && sq.media.length > 0}
                        {@const src = sqImageUrl(sq.media[0])}
                        {#if src}
                          <img {src} alt={sq.media[0].caption || sq.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        {:else}
                          <div class="w-full h-full bg-gradient-to-br from-ocean-100 to-ocean-200 flex items-center justify-center text-2xl">🗺️</div>
                        {/if}
                      {:else}
                        <div class="w-full h-full bg-gradient-to-br from-ocean-100 to-ocean-200 flex items-center justify-center text-2xl">🗺️</div>
                      {/if}
                    </div>
                    <!-- Content -->
                    <div class="flex-1 min-w-0 p-3 sm:p-4">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-1">
                            <h3 class="font-semibold text-navy-600 text-sm truncate">{sq.title}</h3>
                            {#if sq.rating}
                              <span class="text-xs shrink-0">{Array(sq.rating).fill('🔥').join('')}</span>
                            {/if}
                          </div>
                          {#if sq.note}
                            <p class="text-xs text-navy-400 leading-relaxed line-clamp-2">{sq.note}</p>
                          {/if}
                        </div>
                        {#if data.user}
                          {#if deletingSQId === sq.id}
                            <div class="flex items-center gap-1.5 shrink-0">
                              <button type="button" class="text-xs text-coral-500 hover:text-coral-700 font-medium" onclick={() => confirmDeleteSQ(sq.id)}>Yes</button>
                              <button type="button" class="text-xs text-navy-400 hover:text-navy-600 font-medium" onclick={() => deletingSQId = null}>No</button>
                            </div>
                          {:else}
                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                              <button type="button" class="p-1 rounded-lg text-navy-300 hover:text-ocean-500 hover:bg-ocean-50 transition-colors" onclick={() => startEditSQ(sq)} title="Edit">
                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button type="button" class="p-1 rounded-lg text-navy-300 hover:text-coral-500 hover:bg-coral-50 transition-colors" onclick={() => deleteSideQuest(sq.id)} title="Remove">
                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          {/if}
                        {/if}
                      </div>
                    </div>
                  </div>
                  <!-- Extra thumbnails row -->
                  {#if sq.media && sq.media.length > 1}
                    <div class="flex gap-1.5 px-3 pb-3 overflow-x-auto">
                      {#each sq.media.slice(1) as m}
                        {@const src = sqImageUrl(m)}
                        {#if src}
                          <img {src} alt={m.caption || sq.title} class="h-14 w-14 rounded-lg object-cover shrink-0" loading="lazy" />
                        {/if}
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}

        {#if subAdventuresByDay.undated.length > 0}
          <div class="relative pl-10 pb-6">
            <div class="absolute left-2.5 top-1 h-4 w-4 rounded-full bg-sand-400 border-2 border-white shadow-sm"></div>
            <p class="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-3">Other Stops</p>
            <div class="space-y-3">
              {#each subAdventuresByDay.undated as sq (sq.id)}
                <div class="glass rounded-2xl overflow-hidden group hover:shadow-md transition-shadow">
                  <div class="flex">
                    <div class="w-28 h-28 sm:w-36 sm:h-32 shrink-0 overflow-hidden">
                      {#if sq.media && sq.media.length > 0}
                        {@const src = sqImageUrl(sq.media[0])}
                        {#if src}
                          <img {src} alt={sq.media[0].caption || sq.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        {:else}
                          <div class="w-full h-full bg-gradient-to-br from-ocean-100 to-ocean-200 flex items-center justify-center text-2xl">🗺️</div>
                        {/if}
                      {:else}
                        <div class="w-full h-full bg-gradient-to-br from-ocean-100 to-ocean-200 flex items-center justify-center text-2xl">🗺️</div>
                      {/if}
                    </div>
                    <div class="flex-1 min-w-0 p-3 sm:p-4">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-1">
                            <h3 class="font-semibold text-navy-600 text-sm truncate">{sq.title}</h3>
                            {#if sq.rating}
                              <span class="text-xs shrink-0">{Array(sq.rating).fill('🔥').join('')}</span>
                            {/if}
                          </div>
                          {#if sq.note}
                            <p class="text-xs text-navy-400 leading-relaxed line-clamp-2">{sq.note}</p>
                          {/if}
                        </div>
                        {#if data.user}
                          {#if deletingSQId === sq.id}
                            <div class="flex items-center gap-1.5 shrink-0">
                              <button type="button" class="text-xs text-coral-500 hover:text-coral-700 font-medium" onclick={() => confirmDeleteSQ(sq.id)}>Yes</button>
                              <button type="button" class="text-xs text-navy-400 hover:text-navy-600 font-medium" onclick={() => deletingSQId = null}>No</button>
                            </div>
                          {:else}
                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                              <button type="button" class="p-1 rounded-lg text-navy-300 hover:text-ocean-500 hover:bg-ocean-50 transition-colors" onclick={() => startEditSQ(sq)} title="Edit">
                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button type="button" class="p-1 rounded-lg text-navy-300 hover:text-coral-500 hover:bg-coral-50 transition-colors" onclick={() => deleteSideQuest(sq.id)} title="Remove">
                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          {/if}
                        {/if}
                      </div>
                    </div>
                  </div>
                  {#if sq.media && sq.media.length > 1}
                    <div class="flex gap-1.5 px-3 pb-3 overflow-x-auto">
                      {#each sq.media.slice(1) as m}
                        {@const src = sqImageUrl(m)}
                        {#if src}
                          <img {src} alt={m.caption || sq.title} class="h-14 w-14 rounded-lg object-cover shrink-0" loading="lazy" />
                        {/if}
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Cards View -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each subAdventures as sq (sq.id)}
          <div class="glass rounded-2xl overflow-hidden group hover:shadow-md transition-shadow">
            {#if sq.media && sq.media.length > 0}
              {@const src = sqImageUrl(sq.media[0])}
              {#if src}
                <div class="aspect-video overflow-hidden">
                  <img {src} alt={sq.media[0].caption || sq.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
              {/if}
            {:else}
              <div class="aspect-video bg-gradient-to-br from-ocean-100 to-ocean-200 flex items-center justify-center">
                <span class="text-3xl">🗺️</span>
              </div>
            {/if}
            <div class="p-4">
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-semibold text-navy-600 text-sm">{sq.title}</h3>
                    {#if sq.rating}
                      <span class="text-xs">{Array(sq.rating).fill('🔥').join('')}</span>
                    {/if}
                  </div>
                  {#if sq.day_number}
                    <span class="inline-block text-[10px] font-medium text-ocean-600 bg-ocean-50 rounded-full px-2 py-0.5 mb-1">Day {sq.day_number}</span>
                  {/if}
                  {#if sq.note}
                    <p class="text-xs text-navy-400 leading-relaxed line-clamp-2">{sq.note}</p>
                  {/if}
                </div>
                {#if data.user}
                  {#if deletingSQId === sq.id}
                    <div class="flex items-center gap-1.5 shrink-0">
                      <button type="button" class="text-xs text-coral-500 hover:text-coral-700 font-medium" onclick={() => confirmDeleteSQ(sq.id)}>Yes</button>
                      <button type="button" class="text-xs text-navy-400 hover:text-navy-600 font-medium" onclick={() => deletingSQId = null}>No</button>
                    </div>
                  {:else}
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button type="button" class="p-1 rounded-lg text-navy-300 hover:text-ocean-500 hover:bg-ocean-50 transition-colors" onclick={() => startEditSQ(sq)} title="Edit">
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button type="button" class="p-1 rounded-lg text-navy-300 hover:text-coral-500 hover:bg-coral-50 transition-colors" onclick={() => deleteSideQuest(sq.id)} title="Remove">
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  {/if}
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Reactions -->
  <div class="glass rounded-2xl p-6 mb-8">
    <h2 class="text-lg font-semibold text-navy-600 mb-4">Reactions</h2>
    
    <div class="flex flex-wrap gap-2 mb-4">
      {#each reactionEmojis as emoji}
        <button
          class="px-4 py-2 rounded-full border border-sand-200 hover:border-ocean-300 hover:bg-ocean-50 transition-colors text-lg"
          onclick={() => addReaction(emoji)}
        >
          {emoji}
          {#if data.reactions.filter(r => r.emoji === emoji).length > 0}
            <span class="ml-1 text-sm text-navy-400">
              {data.reactions.filter(r => r.emoji === emoji).length}
            </span>
          {/if}
        </button>
      {/each}
    </div>

    {#if data.user}
      <div class="flex items-center gap-2">
        <button class="inline-flex items-center gap-2 text-sm text-ocean-500 hover:text-ocean-600 transition-colors">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Add Reaction
        </button>
      </div>
    {/if}
  </div>

  <!-- Comments -->
  <div class="glass rounded-2xl p-6 mb-8">
    <h2 class="text-lg font-semibold text-navy-600 mb-6">Comments</h2>

    {#if data.user}
      <form class="mb-6" onsubmit={(e) => { e.preventDefault(); submitComment(); }}>
        <textarea
          bind:value={newComment}
          placeholder="Share your thoughts..."
          class="w-full rounded-xl border border-sand-200 bg-white p-4 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100 resize-none"
          rows="3"
        ></textarea>
        <div class="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!newComment.trim() || submittingComment}
            class="inline-flex items-center gap-2 rounded-full bg-ocean-500 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submittingComment ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    {:else}
      <p class="text-sm text-navy-400 mb-6">
        <a href="/auth/login" class="text-ocean-500 hover:text-ocean-600">Sign in</a> to leave a comment.
      </p>
    {/if}

    <!-- Comments list -->
    {#if data.comments.length === 0}
      <p class="text-center text-navy-400 py-8">No comments yet. Be the first to share!</p>
    {:else}
      <div class="space-y-4">
        {#each data.comments as comment}
          <div class="border-l-2 border-sand-200 pl-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="h-6 w-6 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-500 flex items-center justify-center text-white text-xs font-medium">
                {comment.author?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <span class="text-sm font-medium text-navy-600">{comment.author?.name || 'Unknown'}</span>
              <span class="text-xs text-navy-400">{timeAgo(comment.created_at)}</span>
            </div>
            <p class="text-navy-500 text-sm">{comment.content}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Marshmallow Rating -->
  <div class="glass rounded-2xl p-6 mb-8">
    <h2 class="text-lg font-semibold text-navy-600 mb-3">Rating</h2>
    {#if data.ratings.length > 0}
      <div class="flex items-center gap-3 mb-4">
        <span class="text-3xl">{data.avgRating >= 1 ? '🔥' : '🏕️'}</span>
        <div>
          <p class="text-2xl font-bold text-navy-600">{data.avgRating}</p>
          <p class="text-xs text-navy-400">{data.ratings.length} rating{data.ratings.length > 1 ? 's' : ''}</p>
        </div>
        <div class="flex gap-0.5 ml-2">
          {#each Array(5) as _, i}
            <span class="text-lg">{i < Math.round(data.avgRating) ? '🔥' : '⚪'}</span>
          {/each}
        </div>
      </div>
    {/if}
    {#if data.user}
      <div>
        <p class="text-sm text-navy-500 mb-2">Your rating:</p>
        <div class="flex gap-1">
          {#each Array(5) as _, i}
            <button
              type="button"
              class="text-2xl transition-transform hover:scale-110"
              onclick={() => setRating(i + 1)}
              onmouseenter={() => hoverRating = i + 1}
              onmouseleave={() => hoverRating = 0}
            >
              {(hoverRating || myRating) > i ? '🔥' : '⚪'}
            </button>
          {/each}
          {#if myRating > 0}
            <span class="ml-2 text-sm text-navy-400 self-center">{myRating}/5 fires</span>
          {/if}
        </div>
      </div>
    {:else}
      <p class="text-sm text-navy-400">
        <a href="/auth/login" class="text-ocean-500 hover:text-ocean-600">Sign in</a> to rate this adventure.
      </p>
    {/if}
  </div>

  <!-- Stories / Blog -->
  <div class="glass rounded-2xl p-6 mb-8">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-navy-600">Stories & Memories</h2>
      {#if data.user}
        <button
          onclick={() => showStoryForm = !showStoryForm}
          class="text-sm text-ocean-500 hover:text-ocean-600 font-medium"
        >
          {showStoryForm ? 'Cancel' : '+ Share a Story'}
        </button>
      {/if}
    </div>

    {#if showStoryForm}
      <form class="mb-6 space-y-3" onsubmit={(e) => { e.preventDefault(); submitStory(); }}>
        <input type="text" bind:value={storyTitle} placeholder="Story title (optional)"
          class="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100" />
        <textarea bind:value={storyContent} placeholder="Share your memory of this adventure..." rows="4"
          class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100 resize-y"></textarea>
        <button type="submit" disabled={submittingStory || !storyContent.trim()}
          class="rounded-full bg-ocean-500 px-5 py-2 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50 transition-colors">
          {submittingStory ? 'Posting...' : 'Post Story'}
        </button>
      </form>
    {/if}

    {#if data.stories.length === 0}
      <p class="text-sm text-navy-400 italic">No stories yet. Be the first to share a memory!</p>
    {:else}
      <div class="space-y-4">
        {#each data.stories as story}
          <div class="p-4 rounded-xl bg-sand-50 border border-sand-200/50">
            <div class="flex items-center gap-2 mb-2">
              {#if story.author_avatar}
                <img src={story.author_avatar} alt="" class="h-6 w-6 rounded-full object-cover" />
              {:else}
                <div class="h-6 w-6 rounded-full bg-gradient-to-br from-coral-400 to-sunset-400 flex items-center justify-center text-white text-[9px] font-medium">
                  {story.author_name?.charAt(0).toUpperCase()}
                </div>
              {/if}
              <span class="text-sm font-medium text-navy-600">{story.author_name}</span>
              <span class="text-xs text-navy-400">{new Date(story.created_at).toLocaleDateString()}</span>
            </div>
            {#if story.title}
              <h3 class="font-semibold text-navy-600 mb-1">{story.title}</h3>
            {/if}
            <p class="text-sm text-navy-500 whitespace-pre-wrap">{story.content}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Actions -->
  {#if data.user && data.user.id === data.adventure.author_id}
    <div class="flex flex-wrap gap-3">
      <a
        href="/adventures/{data.adventure.slug}/edit"
        class="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-4 py-2 text-sm font-medium text-navy-600 hover:bg-sand-50 transition-colors"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Adventure
      </a>
      <button
        onclick={createShareLink}
        class="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-4 py-2 text-sm font-medium text-navy-600 hover:bg-sand-50 transition-colors"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>
    </div>
  {/if}
</article>

<!-- Share Dialog -->
{#if showShareDialog}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="glass rounded-3xl p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold text-navy-600 mb-4">Share Adventure</h3>
      <p class="text-sm text-navy-400 mb-4">
        Copy this link to share this adventure with others:
      </p>
      <div class="flex items-center gap-2">
        <input
          type="text"
          value={shareLink}
          readonly
          class="flex-1 rounded-xl border border-sand-200 bg-white px-4 py-2 text-sm text-navy-600"
        />
        <button
          onclick={copyShareLink}
          class="rounded-xl bg-ocean-500 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
        >
          Copy
        </button>
      </div>
      <button
        onclick={() => showShareDialog = false}
        class="w-full mt-4 rounded-xl border border-sand-200 bg-white px-4 py-2 text-sm font-medium text-navy-600 hover:bg-sand-50 transition-colors"
      >
        Close
      </button>
    </div>
  </div>
{/if}
