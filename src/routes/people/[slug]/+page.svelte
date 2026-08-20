<script lang="ts">
  import type { PageData } from './$types';

  let { data } = $props();
  let selectedMedia = $state<any>(null);
  let lightboxOpen = $state(false);
  let editing = $state(false);
  let editName = $state('');
  let saving = $state(false);
  let error = $state('');

  function openLightbox(media: any) {
    selectedMedia = media;
    lightboxOpen = true;
  }

  function closeLightbox() {
    lightboxOpen = false;
    selectedMedia = null;
  }

  function navigate(direction: number) {
    if (!selectedMedia) return;
    const idx = data.photos.indexOf(selectedMedia);
    if (idx === -1) return;
    const newIdx = (idx + direction + data.photos.length) % data.photos.length;
    selectedMedia = data.photos[newIdx];
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!lightboxOpen) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  }

  async function saveName() {
    if (!editName.trim()) return;
    saving = true;
    error = '';
    try {
      const res = await fetch(`/api/people/${data.person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const result = await res.json();
        error = result.error || 'Failed to update';
      }
    } catch {
      error = 'Network error';
    }
    saving = false;
  }

  async function deletePerson() {
    if (!confirm(`Delete "${data.person.name}"? This removes their tags but not the photos.`)) return;
    try {
      await fetch(`/api/people/${data.person.id}`, { method: 'DELETE' });
      window.location.href = '/people';
    } catch {}
  }

  async function removeTag(mediaId: string) {
    if (!confirm('Remove this person from this photo?')) return;
    try {
      await fetch(`/api/media/${mediaId}/people`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: data.person.id })
      });
      data.photos = data.photos.filter((p: any) => p.id !== mediaId);
    } catch {}
  }
</script>

<svelte:head>
  <title>{data.person?.name || 'Person'} | People | Family Adventures</title>
</svelte:head>

<div class="space-y-6">
  <!-- Back link -->
  <a href="/people" class="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-600 transition-colors">
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    All People
  </a>

  <!-- Person header -->
  <div class="flex flex-col sm:flex-row items-start gap-6">
    <div class="w-24 h-24 rounded-2xl overflow-hidden bg-cream-100 flex-shrink-0">
      {#if data.person?.avatar_file_path}
        <img src={data.person.avatar_file_path} alt={data.person.name} class="w-full h-full object-cover" />
      {:else}
        <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-forest-100 to-terra-100">
          <span class="text-3xl font-display font-bold text-forest-600">{data.person?.name?.charAt(0).toUpperCase()}</span>
        </div>
      {/if}
    </div>
    <div class="flex-1">
      {#if editing}
        <form onsubmit={(e) => { e.preventDefault(); saveName(); }} class="flex items-center gap-2">
          <input type="text" bind:value={editName} class="input flex-1" autofocus />
          <button type="submit" class="btn-primary text-xs" disabled={saving}>Save</button>
          <button type="button" class="btn-secondary text-xs" onclick={() => editing = false}>Cancel</button>
        </form>
        {#if error}
          <p class="text-terra-500 text-sm mt-1">{error}</p>
        {/if}
      {:else}
        <h1 class="text-2xl md:text-3xl font-display font-semibold text-ink-800 dark:text-cream-100">
          {data.person?.name}
        </h1>
        <p class="text-ink-400 mt-1">
          {data.photos?.length || 0} {(data.photos?.length || 0) === 1 ? 'photo' : 'photos'}
          {#if data.adventures?.length > 0}
            across {data.adventures.length} {data.adventures.length === 1 ? 'adventure' : 'adventures'}
          {/if}
        </p>
        {#if data.user}
          <div class="flex items-center gap-2 mt-3">
            <button class="btn-secondary text-xs" onclick={() => { editing = true; editName = data.person.name; }}>
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Rename
            </button>
            <button class="btn-secondary text-xs text-terra-500 hover:text-terra-600" onclick={deletePerson}>
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Adventures this person appears in -->
  {#if data.adventures?.length > 0}
    <div class="space-y-2">
      <h2 class="text-sm font-medium text-ink-400 uppercase tracking-wide">Adventures</h2>
      <div class="flex flex-wrap gap-2">
        {#each data.adventures as adv}
          <a href="/adventures/{adv.slug}" class="badge bg-forest-50 text-forest-700 hover:bg-forest-100 transition-colors">
            {adv.title}
            <span class="text-forest-400 ml-1">({adv.photo_count})</span>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Photo grid -->
  {#if data.photos?.length > 0}
    <div class="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
      {#each data.photos as media}
        <div class="break-inside-avoid rounded-xl overflow-hidden group relative">
          <button class="w-full" onclick={() => openLightbox(media)}>
            <img
              src={media.file_path}
              alt={media.caption || media.adventure_title || 'Photo'}
              class="w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div class="absolute bottom-3 left-3 right-3">
                {#if media.caption}
                  <p class="text-white text-sm font-medium truncate">{media.caption}</p>
                {/if}
                <p class="text-white/70 text-xs truncate">{media.adventure_title}</p>
              </div>
            </div>
            {#if media.media_type === 'video'}
              <div class="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center">
                <svg class="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            {/if}
          </button>
          {#if data.user}
            <button
              class="absolute top-2 left-2 h-7 w-7 rounded-full bg-black/40 flex items-center justify-center text-white/60 hover:bg-red-500/80 hover:text-white transition-all opacity-0 group-hover:opacity-100"
              onclick={() => removeTag(media.id)}
              title="Remove from this person"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="card-flat text-center py-12">
      <p class="text-ink-400">No photos tagged with {data.person?.name} yet.</p>
    </div>
  {/if}
</div>

<!-- Lightbox -->
<svelte:window onkeydown={handleKeydown} />
{#if lightboxOpen && selectedMedia}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
    onclick={closeLightbox}
    role="dialog"
    tabindex="-1"
  >
    <button
      class="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
      onclick={closeLightbox}
    >
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    {#if data.photos.length > 1}
      <button class="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10" onclick={(e) => { e.stopPropagation(); navigate(-1); }}>
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
    {/if}

    <div class="max-w-4xl max-h-[90vh] mx-4" onclick={(e) => e.stopPropagation()}>
      {#if selectedMedia.media_type === 'video'}
        <video controls class="max-w-full max-h-[80vh] rounded-xl" src={selectedMedia.file_path} />
      {:else}
        <img src={selectedMedia.file_path} alt={selectedMedia.caption || 'Photo'} class="max-w-full max-h-[80vh] rounded-xl object-contain" />
      {/if}
      {#if selectedMedia.caption || selectedMedia.adventure_title}
        <div class="mt-4 text-center">
          {#if selectedMedia.caption}
            <p class="text-white text-lg">{selectedMedia.caption}</p>
          {/if}
          {#if selectedMedia.adventure_title}
            <p class="text-white/60 text-sm mt-1">
              from <a href="/adventures/{selectedMedia.adventure_slug}" class="text-forest-300 hover:text-forest-200">{selectedMedia.adventure_title}</a>
            </p>
          {/if}
        </div>
      {/if}
    </div>

    {#if data.photos.length > 1}
      <button class="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10" onclick={(e) => { e.stopPropagation(); navigate(1); }}>
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      </button>
    {/if}
  </div>
{/if}
