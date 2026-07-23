<script lang="ts">
  import { goto } from '$app/navigation';
  import { getImmichAssetUrl } from '$lib/shared/immich';

  let { data } = $props();

  let title = $state(data.adventure.title);
  let description = $state(data.adventure.description || '');
  let content = $state(data.adventure.content || '');
  let locationName = $state(data.adventure.location_name || '');
  let lat = $state<number | null>(data.adventure.lat);
  let lng = $state<number | null>(data.adventure.lng);
  let startDate = $state(data.adventure.start_date || '');
  let endDate = $state(data.adventure.end_date || '');
  let mood = $state(data.adventure.mood || '');
  let templateType = $state(data.adventure.template_type || '');
  let visibility = $state<'private' | 'family' | 'public'>(data.adventure.visibility || 'family');
  let isDraft = $state(!!data.adventure.is_draft);
  let selectedTags = $state<string[]>(data.adventure.selectedTags || []);
  let media = $state([...(data.adventure.media || [])]);
  let submitting = $state(false);
  let error = $state('');
  let showDeleteConfirm = $state(false);
  let newAssetId = $state('');
  let newMediaCaption = $state('');
  let newMediaType = $state<'photo' | 'video' | 'audio'>('photo');
  let addingMedia = $state(false);
  let uploadingFile = $state(false);
  let uploadError = $state('');

  const templates = [
    { id: 'beach', label: 'Beach Trip', icon: '🏖️' },
    { id: 'roadtrip', label: 'Road Trip', icon: '🚗' },
    { id: 'holiday', label: 'Holiday', icon: '🎄' },
    { id: 'camping', label: 'Camping', icon: '⛺' },
    { id: 'international', label: 'International', icon: '✈️' },
    { id: 'city', label: 'City Break', icon: '🏙️' },
    { id: 'nature', label: 'Nature', icon: '🌲' },
    { id: 'other', label: 'Other', icon: '📝' }
  ];

  const moods = [
    { id: 'adventurous', label: 'Adventurous', icon: '🗺️' },
    { id: 'relaxing', label: 'Relaxing', icon: '😌' },
    { id: 'exciting', label: 'Exciting', icon: '🎉' },
    { id: 'peaceful', label: 'Peaceful', icon: '🧘' },
    { id: 'fun', label: 'Fun', icon: '😄' },
    { id: 'romantic', label: 'Romantic', icon: '💕' }
  ];

  function toggleTag(tagId: string) {
    if (selectedTags.includes(tagId)) {
      selectedTags = selectedTags.filter(t => t !== tagId);
    } else {
      selectedTags = [...selectedTags, tagId];
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      error = 'Please enter a title';
      return;
    }

    submitting = true;
    error = '';

    try {
      const response = await fetch(`/api/adventures/${data.adventure.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          content,
          locationName,
          lat,
          lng,
          startDate,
          endDate,
          mood,
          templateType,
          visibility,
          isDraft,
          tags: selectedTags
        })
      });

      if (response.ok) {
        const result = await response.json();
        goto(`/adventures/${result.slug}`);
      } else {
        const err = await response.json();
        error = err.message || 'Failed to save changes';
      }
    } catch (e) {
      error = 'An error occurred. Please try again.';
    }
    submitting = false;
  }

  async function handleDelete() {
    submitting = true;
    error = '';

    try {
      const response = await fetch(`/api/adventures/${data.adventure.slug}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        goto('/adventures');
      } else {
        const err = await response.json();
        error = err.message || 'Failed to delete adventure';
      }
    } catch (e) {
      error = 'An error occurred. Please try again.';
    }
    submitting = false;
    showDeleteConfirm = false;
  }

  async function addMedia() {
    if (!newAssetId.trim()) return;

    addingMedia = true;
    error = '';

    try {
      const response = await fetch(`/api/adventures/${data.adventure.slug}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adventureId: data.adventure.id,
          immichAssetId: newAssetId.trim(),
          caption: newMediaCaption || null,
          mediaType: newMediaType
        })
      });

      if (response.ok) {
        const result = await response.json();
        media = [...media, result.media];
        newAssetId = '';
        newMediaCaption = '';
      } else {
        const err = await response.json();
        error = err.message || 'Failed to add media';
      }
    } catch (e) {
      error = 'An error occurred. Please try again.';
    }
    addingMedia = false;
  }

  async function removeMedia(mediaId: string) {
    error = '';

    try {
      const response = await fetch(`/api/adventures/${data.adventure.slug}/media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adventureId: data.adventure.id,
          mediaId
        })
      });

      if (response.ok) {
        media = media.filter(m => m.id !== mediaId);
      } else {
        const err = await response.json();
        error = err.message || 'Failed to remove media';
      }
    } catch (e) {
      error = 'An error occurred. Please try again.';
    }
  }

  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploadingFile = true;
    uploadError = '';

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        uploadError = err.error || 'Upload failed';
        return;
      }

      const { filePath } = await uploadRes.json();

      // Add media to adventure
      const mediaRes = await fetch(`/api/adventures/${data.adventure.slug}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adventureId: data.adventure.id,
          filePath,
          caption: newMediaCaption || null,
          mediaType: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'photo'
        })
      });

      if (mediaRes.ok) {
        const result = await mediaRes.json();
        media = [...media, result.media];
        newMediaCaption = '';
      } else {
        const err = await mediaRes.json();
        uploadError = err.message || 'Failed to add media';
      }
    } catch (e) {
      uploadError = 'Upload failed. Please try again.';
    }
    uploadingFile = false;
    input.value = '';
  }
</script>

<svelte:head>
  <title>Edit: {data.adventure.title} | Family Adventures</title>
</svelte:head>

<div class="max-w-3xl mx-auto">
  <a href="/adventures/{data.adventure.slug}" class="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-navy-600 mb-6 transition-colors">
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Back to Adventure
  </a>

  <div class="glass rounded-3xl p-6 md:p-8">
    <h1 class="text-2xl md:text-3xl font-display font-semibold text-navy-600 mb-6">
      Edit Adventure
    </h1>

    {#if error}
      <div class="mb-6 p-4 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 text-sm">
        {error}
      </div>
    {/if}

    <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <!-- Title -->
      <div>
        <label for="title" class="block text-sm font-medium text-navy-600 mb-2">
          Title *
        </label>
        <input
          type="text"
          id="title"
          bind:value={title}
          placeholder="Our Amazing Beach Vacation"
          class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
          required
        />
      </div>

      <!-- Description -->
      <div>
        <label for="description" class="block text-sm font-medium text-navy-600 mb-2">
          Description
        </label>
        <textarea
          id="description"
          bind:value={description}
          placeholder="A brief summary of this adventure..."
          rows="3"
          class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100 resize-none"
        ></textarea>
      </div>

      <!-- Content / Story -->
      <div>
        <label for="content" class="block text-sm font-medium text-navy-600 mb-2">
          Story
        </label>
        <textarea
          id="content"
          bind:value={content}
          placeholder="Tell the story of this adventure..."
          rows="8"
          class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100 resize-y"
        ></textarea>
        <p class="mt-1 text-xs text-navy-400">HTML is supported for rich formatting.</p>
      </div>

      <!-- Template -->
      <div>
        <label class="block text-sm font-medium text-navy-600 mb-2">
          Adventure Type
        </label>
        <div class="grid grid-cols-4 gap-2">
          {#each templates as template}
            <button
              type="button"
              class="flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors
                {templateType === template.id
                  ? 'border-ocean-300 bg-ocean-50 text-ocean-600'
                  : 'border-sand-200 bg-white text-navy-500 hover:border-sand-300'}"
              onclick={() => templateType = template.id}
            >
              <span class="text-2xl">{template.icon}</span>
              <span class="text-xs">{template.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Dates -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="startDate" class="block text-sm font-medium text-navy-600 mb-2">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            bind:value={startDate}
            class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
          />
        </div>
        <div>
          <label for="endDate" class="block text-sm font-medium text-navy-600 mb-2">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            bind:value={endDate}
            class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
          />
        </div>
      </div>

      <!-- Location -->
      <div>
        <label for="location" class="block text-sm font-medium text-navy-600 mb-2">
          Location
        </label>
        <input
          type="text"
          id="location"
          bind:value={locationName}
          placeholder="Maui, Hawaii"
          class="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
        />
      </div>

      <!-- Mood -->
      <div>
        <label class="block text-sm font-medium text-navy-600 mb-2">
          Mood
        </label>
        <div class="flex flex-wrap gap-2">
          {#each moods as m}
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors
                {mood === m.id
                  ? 'border-ocean-300 bg-ocean-50 text-ocean-600'
                  : 'border-sand-200 bg-white text-navy-500 hover:border-sand-300'}"
              onclick={() => mood = m.id}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Tags -->
      {#if data.tags.length > 0}
        <div>
          <label class="block text-sm font-medium text-navy-600 mb-2">
            Tags
          </label>
          <div class="flex flex-wrap gap-2">
            {#each data.tags as tag}
              <button
                type="button"
                class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                style="background-color: {selectedTags.includes(tag.id) ? tag.color : '#F5E6D3'}; color: {selectedTags.includes(tag.id) ? 'white' : '#1A2B3C'}"
                onclick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Visibility -->
      <div>
        <label class="block text-sm font-medium text-navy-600 mb-2">
          Visibility
        </label>
        <div class="flex gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" bind:group={visibility} value="private" class="text-ocean-500 focus:ring-ocean-300" />
            <span class="text-sm text-navy-500">Private</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" bind:group={visibility} value="family" class="text-ocean-500 focus:ring-ocean-300" />
            <span class="text-sm text-navy-500">Family</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" bind:group={visibility} value="public" class="text-ocean-500 focus:ring-ocean-300" />
            <span class="text-sm text-navy-500">Public</span>
          </label>
        </div>
      </div>

      <!-- Draft toggle -->
      <div>
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" bind:checked={isDraft} class="rounded border-sand-300 text-ocean-500 focus:ring-ocean-300" />
          <div>
            <span class="text-sm font-medium text-navy-600">Save as draft</span>
            <p class="text-xs text-navy-400">Draft adventures are only visible to you</p>
          </div>
        </label>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-3 pt-4 border-t border-sand-200">
        <button
          type="submit"
          disabled={submitting}
          class="inline-flex items-center gap-2 rounded-full bg-ocean-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>
        <a
          href="/adventures/{data.adventure.slug}"
          class="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-5 py-2.5 text-sm font-medium text-navy-600 hover:bg-sand-50 transition-colors"
        >
          Cancel
        </a>
        <button
          type="button"
          onclick={() => showDeleteConfirm = true}
          class="inline-flex items-center gap-2 rounded-full border border-coral-200 bg-white px-5 py-2.5 text-sm font-medium text-coral-600 hover:bg-coral-50 transition-colors ml-auto"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Adventure
        </button>
      </div>
    </form>
  </div>

  <!-- Media Management -->
  <div class="glass rounded-3xl p-6 md:p-8 mt-6">
    <h2 class="text-xl font-semibold text-navy-600 mb-4">Media</h2>

    {#if media.length > 0}
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {#each media as m}
          <div class="relative aspect-square rounded-2xl overflow-hidden group">
            <img
              src={m.file_path || getImmichAssetUrl(m.immich_asset_id, true)}
              alt={m.caption || 'Adventure photo'}
              class="w-full h-full object-cover"
              loading="lazy"
            />
            {#if m.caption}
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p class="text-white text-xs">{m.caption}</p>
              </div>
            {/if}
            <button
              type="button"
              onclick={() => removeMedia(m.id)}
              class="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              title="Remove media"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-sm text-navy-400 mb-4">No media added yet.</p>
    {/if}

    <!-- Add media form -->
    <div class="border-t border-sand-200 pt-4">
      <h3 class="text-sm font-medium text-navy-600 mb-3">Add Media</h3>
      <div class="space-y-4">
        <!-- File Upload -->
        <div class="rounded-2xl border-2 border-dashed border-sand-300 p-6 text-center hover:border-ocean-300 transition-colors">
          <input
            type="file"
            accept="image/*,video/*,audio/*"
            onchange={handleFileUpload}
            id="file-upload"
            class="hidden"
            disabled={uploadingFile}
          />
          <label for="file-upload" class="cursor-pointer">
            <svg class="h-8 w-8 mx-auto text-navy-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {#if uploadingFile}
              <p class="text-sm text-navy-400">Uploading...</p>
            {:else}
              <p class="text-sm text-navy-500 font-medium">Click to upload photos, videos, or audio</p>
              <p class="text-xs text-navy-400 mt-1">Max 20MB per file</p>
            {/if}
          </label>
        </div>
        {#if uploadError}
          <p class="text-sm text-coral-500">{uploadError}</p>
        {/if}

        <!-- Caption -->
        <input
          type="text"
          bind:value={newMediaCaption}
          placeholder="Caption for next upload (optional)"
          class="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
        />

        <!-- Immich Asset ID (advanced) -->
        <details class="group">
          <summary class="text-xs text-navy-400 cursor-pointer hover:text-navy-500 transition-colors">
            Or add from Immich (advanced)
          </summary>
          <div class="flex gap-3 mt-2">
            <input
              type="text"
              bind:value={newAssetId}
              placeholder="Paste Immich asset ID"
              class="flex-1 rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm text-navy-600 placeholder:text-navy-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
            />
            <select
              bind:value={newMediaType}
              class="rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm text-navy-600 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
            >
              <option value="photo">Photo</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
            <button
              type="button"
              onclick={addMedia}
              disabled={!newAssetId.trim() || addingMedia}
              class="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-4 py-2 text-sm font-medium text-navy-600 hover:bg-sand-50 disabled:opacity-50 transition-colors"
            >
              {addingMedia ? 'Adding...' : 'Add'}
            </button>
          </div>
        </details>
      </div>
    </div>
  </div>
</div>

<!-- Delete Confirmation Dialog -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="glass rounded-3xl p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold text-navy-600 mb-2">Delete Adventure</h3>
      <p class="text-sm text-navy-400 mb-6">
        Are you sure you want to delete "{data.adventure.title}"? This will permanently remove the adventure, all media, comments, and reactions. This action cannot be undone.
      </p>
      <div class="flex gap-3">
        <button
          onclick={() => showDeleteConfirm = false}
          disabled={submitting}
          class="flex-1 rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-600 hover:bg-sand-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={handleDelete}
          disabled={submitting}
          class="flex-1 rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-coral-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Deleting...' : 'Yes, Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}
