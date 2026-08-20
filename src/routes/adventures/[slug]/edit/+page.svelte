<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import LocationInput from '$lib/components/LocationInput.svelte';

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
  let coverFilePath = $state<string | null>(data.adventure.cover_file_path ?? null);
  let submitting = $state(false);
  let error = $state('');
  let showDeleteConfirm = $state(false);
  let newMediaCaption = $state('');
  let uploadingFile = $state(false);
  let uploadError = $state('');
  let uploadProgress = $state('');
  let uploadErrors = $state<string[]>([]);

  // AI state
  let aiEnabled = $state(false);
  let aiGeneratingDescription = $state(false);
  let aiEnhancingDescription = $state(false);
  let aiEnhancingContent = $state(false);
  let aiSuggestingTags = $state(false);
  let aiSuggestedTags = $state<{ name: string; isNew: boolean }[]>([]);
  let aiError = $state('');

  onMount(() => {
    checkAIStatus();
    const handler = (e: BeforeUnloadEvent) => {
      if (uploadingFile) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  });

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

  async function checkAIStatus() {
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      aiEnabled = data.config?.enabled && data.connection?.ok;
    } catch {
      aiEnabled = false;
    }
  }

  async function generateDescription() {
    aiGeneratingDescription = true;
    aiError = '';
    try {
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, locationName, startDate, endDate, mood, templateType, description })
      });
      const data = await res.json();
      if (res.ok && data.result) {
        description = data.result;
      } else {
        aiError = data.error || 'Failed to generate description';
      }
    } catch {
      aiError = 'Failed to connect to AI';
    }
    aiGeneratingDescription = false;
  }

  async function enhanceDescription() {
    if (!description.trim()) return;
    aiEnhancingDescription = true;
    aiError = '';
    try {
      const res = await fetch('/api/ai/enhance-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: description, fieldName: 'description' })
      });
      const data = await res.json();
      if (res.ok && data.result) {
        description = data.result;
      } else {
        aiError = data.error || 'Failed to enhance description';
      }
    } catch {
      aiError = 'Failed to connect to AI';
    }
    aiEnhancingDescription = false;
  }

  async function enhanceContent() {
    if (!content.trim()) return;
    aiEnhancingContent = true;
    aiError = '';
    try {
      const res = await fetch('/api/ai/enhance-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, fieldName: 'content' })
      });
      const data = await res.json();
      if (res.ok && data.result) {
        content = data.result;
      } else {
        aiError = data.error || 'Failed to enhance content';
      }
    } catch {
      aiError = 'Failed to connect to AI';
    }
    aiEnhancingContent = false;
  }

  async function suggestTags() {
    aiSuggestingTags = true;
    aiError = '';
    try {
      const res = await fetch('/api/ai/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, content, locationName, templateType })
      });
      const data = await res.json();
      if (res.ok && data.tags) {
        aiSuggestedTags = data.tags;
      } else {
        aiError = data.error || 'Failed to suggest tags';
      }
    } catch {
      aiError = 'Failed to connect to AI';
    }
    aiSuggestingTags = false;
  }

  async function applyTag(tagName: string) {
    const existingTag = data.tags.find((t: any) => t.name.toLowerCase() === tagName.toLowerCase());
    if (existingTag && !selectedTags.includes(existingTag.id)) {
      selectedTags = [...selectedTags, existingTag.id];
    }
    aiSuggestedTags = aiSuggestedTags.filter(t => t.name !== tagName);
  }

  function setThumbnail(m: any) {
    if (m.file_path) {
      coverFilePath = m.file_path;
    }
  }

  function isThumbnail(m: any) {
    if (m.file_path && coverFilePath) return m.file_path === coverFilePath;
    return false;
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
          tags: selectedTags,
          coverFilePath
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
        const removedItem = media.find(m => m.id === mediaId);
        if (removedItem && isThumbnail(removedItem)) {
          coverFilePath = null;
        }
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
    const files = input.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const total = fileList.length;
    uploadingFile = true;
    uploadError = '';
    uploadErrors = [];
    uploadProgress = `Uploading 1 of ${total}...`;

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < fileList.length; i++) {
        uploadProgress = `Uploading ${i + 1} of ${total}...`;

        const formData = new FormData();
        formData.append('files', fileList[i]);

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          uploadErrors.push(`${fileList[i].name}: upload failed (HTTP ${uploadRes.status})`);
          errorCount++;
          continue;
        }

        const { files: results } = await uploadRes.json();
        const result = results[0];

        if (result.error) {
          uploadErrors.push(`${fileList[i].name}: ${result.error}`);
          errorCount++;
          continue;
        }

        const mediaRes = await fetch(`/api/adventures/${data.adventure.slug}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adventureId: data.adventure.id,
            filePath: result.filePath,
            mediaType: result.filePath.match(/\.(mp4|webm|mov)$/i) ? 'video' : result.filePath.match(/\.(mp3|wav|ogg)$/i) ? 'audio' : 'photo'
          })
        });

        if (mediaRes.ok) {
          const { media: newMedia } = await mediaRes.json();
          media = [...media, newMedia];
          successCount++;
        } else {
          const errBody = await mediaRes.json().catch(() => ({ error: 'Unknown error' }));
          uploadErrors.push(`${fileList[i].name}: ${errBody.error || 'failed to save to adventure'}`);
          errorCount++;
        }
      }

      if (errorCount > 0 && successCount > 0) {
        uploadError = `${successCount} uploaded, ${errorCount} failed`;
      } else if (errorCount > 0) {
        uploadError = `All ${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload`;
      } else {
        uploadProgress = `${successCount} file${successCount > 1 ? 's' : ''} uploaded!`;
        setTimeout(() => { uploadProgress = ''; }, 2000);
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
  <a href="/adventures/{data.adventure.slug}" class="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-600 mb-6 transition-colors">
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Back to Adventure
  </a>

  <div class="card p-6 md:p-8 animate-in">
    <h1 class="text-2xl md:text-3xl font-display font-semibold text-ink-800 dark:text-cream-100 mb-6">
      Edit Adventure
    </h1>

    {#if error}
      <div class="mb-6 p-3 rounded-lg bg-terra-50 border border-terra-200 text-terra-600 text-sm">
        {error}
      </div>
    {/if}

    {#if aiError}
      <div class="mb-6 p-3 rounded-lg bg-gold-50 border border-gold-200 text-gold-700 text-sm">
        {aiError}
        <button class="ml-2 underline" onclick={() => aiError = ''}>Dismiss</button>
      </div>
    {/if}

    <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <!-- Title -->
      <div>
        <label for="title" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">
          Title *
        </label>
        <input type="text" id="title" bind:value={title} placeholder="Our Amazing Beach Vacation" class="input" required />
      </div>

      <!-- Description -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label for="description" class="block text-sm font-medium text-ink-600 dark:text-cream-200">
            Description
          </label>
          {#if aiEnabled}
            <div class="flex gap-2">
              <button type="button" onclick={generateDescription} disabled={aiGeneratingDescription} class="btn-accent text-xs px-3 py-1">
                {#if aiGeneratingDescription}
                  <div class="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  Generating...
                {:else}
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate
                {/if}
              </button>
              {#if description.trim()}
                <button type="button" onclick={enhanceDescription} disabled={aiEnhancingDescription} class="btn-secondary text-xs px-3 py-1">
                  {#if aiEnhancingDescription}
                    <div class="h-3 w-3 rounded-full border-2 border-forest-300 border-t-forest-500 animate-spin"></div>
                  {:else}
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  {/if}
                  Enhance
                </button>
              {/if}
            </div>
          {/if}
        </div>
        <textarea id="description" bind:value={description} placeholder="A brief summary of this adventure..." rows="3" class="input resize-none"></textarea>
      </div>

      <!-- Content / Story -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label for="content" class="block text-sm font-medium text-ink-600 dark:text-cream-200">
            Story
          </label>
          {#if aiEnabled && content.trim()}
            <button type="button" onclick={enhanceContent} disabled={aiEnhancingContent} class="btn-secondary text-xs px-3 py-1">
              {#if aiEnhancingContent}
                <div class="h-3 w-3 rounded-full border-2 border-forest-300 border-t-forest-500 animate-spin"></div>
              {:else}
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              {/if}
              Enhance Story
            </button>
          {/if}
        </div>
        <textarea id="content" bind:value={content} placeholder="Tell the story of this adventure..." rows="8" class="input resize-y"></textarea>
        <p class="mt-1 text-xs text-ink-300">HTML is supported for rich formatting.</p>
      </div>

      <!-- Template -->
      <div>
        <label class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">
          Adventure Type
        </label>
        <div class="grid grid-cols-4 gap-2">
          {#each templates as template}
            <button
              type="button"
              class="flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors
                {templateType === template.id
                  ? 'border-forest-400 bg-forest-50 text-forest-600 dark:bg-forest-900 dark:text-forest-300'
                  : 'border-cream-200 bg-white text-ink-500 hover:border-cream-300 dark:bg-ink-700 dark:border-ink-600'}"
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
          <label for="startDate" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">Start Date</label>
          <input type="date" id="startDate" bind:value={startDate} class="input" />
        </div>
        <div>
          <label for="endDate" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">End Date</label>
          <input type="date" id="endDate" bind:value={endDate} class="input" />
        </div>
      </div>

      <!-- Location -->
      <div>
        <label for="location" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">Location</label>
        <LocationInput bind:value={locationName} bind:lat bind:lng />
      </div>

      <!-- Mood -->
      <div>
        <label class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">Mood</label>
        <div class="flex flex-wrap gap-2">
          {#each moods as m}
            <button
              type="button"
              class="badge border {mood === m.id
                ? 'border-forest-400 bg-forest-50 text-forest-600 dark:bg-forest-900 dark:text-forest-300'
                : 'border-cream-200 bg-white text-ink-500 hover:border-cream-300 dark:bg-ink-700 dark:border-ink-600'}"
              onclick={() => mood = m.id}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Tags -->
      {#if data.tags.length > 0 || aiEnabled}
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-sm font-medium text-ink-600 dark:text-cream-200">Tags</label>
            {#if aiEnabled}
              <button type="button" onclick={suggestTags} disabled={aiSuggestingTags} class="btn-accent text-xs px-3 py-1">
                {#if aiSuggestingTags}
                  <div class="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  Suggesting...
                {:else}
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Suggest Tags
                {/if}
              </button>
            {/if}
          </div>
          {#if data.tags.length > 0}
            <div class="flex flex-wrap gap-2">
              {#each data.tags as tag}
                <button
                  type="button"
                  class="badge transition-colors"
                  style="background-color: {selectedTags.includes(tag.id) ? tag.color : 'var(--color-cream-100)'}; color: {selectedTags.includes(tag.id) ? 'white' : 'var(--color-ink-500)'}"
                  onclick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              {/each}
            </div>
          {/if}
          {#if aiSuggestedTags.length > 0}
            <div class="mt-3 p-3 rounded-lg bg-forest-50 border border-forest-100 dark:bg-forest-900 dark:border-forest-800">
              <p class="text-xs font-medium text-forest-600 dark:text-forest-300 mb-2">AI Suggested Tags:</p>
              <div class="flex flex-wrap gap-2">
                {#each aiSuggestedTags as tag}
                  <button type="button" class="badge border border-forest-200 text-forest-600 hover:bg-forest-100 transition-colors dark:border-forest-700 dark:text-forest-300" onclick={() => applyTag(tag.name)}>
                    {tag.name}
                    {#if tag.isNew}
                      <span class="text-[10px] text-forest-400">(new)</span>
                    {/if}
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Visibility -->
      <div>
        <label class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">Visibility</label>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" bind:group={visibility} value="private" class="accent-forest-500" />
            <span class="text-sm text-ink-500 dark:text-cream-200">Private</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" bind:group={visibility} value="family" class="accent-forest-500" />
            <span class="text-sm text-ink-500 dark:text-cream-200">Family</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" bind:group={visibility} value="public" class="accent-forest-500" />
            <span class="text-sm text-ink-500 dark:text-cream-200">Public</span>
          </label>
        </div>
      </div>

      <!-- Draft toggle -->
      <div>
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" bind:checked={isDraft} class="rounded border-cream-300 accent-forest-500" />
          <div>
            <span class="text-sm font-medium text-ink-600 dark:text-cream-200">Save as draft</span>
            <p class="text-xs text-ink-400">Draft adventures are only visible to you</p>
          </div>
        </label>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-3 pt-4 border-t border-cream-200 dark:border-ink-600">
        <button type="submit" disabled={submitting} class="btn-primary disabled:opacity-50">
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>
        <a href="/adventures/{data.adventure.slug}" class="btn-secondary">
          Cancel
        </a>
        <button
          type="button"
          onclick={() => showDeleteConfirm = true}
          class="btn-secondary border-terra-200 text-terra-600 hover:bg-terra-50 ml-auto"
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
  <div class="card p-6 md:p-8 mt-6">
    <h2 class="text-xl font-display font-semibold text-ink-800 dark:text-cream-100 mb-4">Media</h2>

    {#if media.length > 0}
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {#each media as m}
          <div class="relative aspect-square rounded-xl overflow-hidden group">
            <img
              src={m.file_path}
              alt={m.caption || 'Adventure photo'}
              class="w-full h-full object-cover"
              loading="lazy"
            />
            {#if m.caption}
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p class="text-white text-xs">{m.caption}</p>
              </div>
            {/if}
            {#if isThumbnail(m)}
              <div class="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-forest-500/90 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Thumbnail
              </div>
            {:else}
              <button
                type="button"
                onclick={() => setThumbnail(m)}
                class="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink-800/80 px-2 py-0.5 text-xs font-medium text-cream-100 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-ink-700"
                title="Set as thumbnail"
              >
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Set as thumbnail
              </button>
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
      <p class="text-sm text-ink-400 mb-4">No media added yet.</p>
    {/if}

    <div class="border-t border-cream-200 dark:border-ink-600 pt-4">
      <h3 class="text-sm font-medium text-ink-600 dark:text-cream-200 mb-3">Add Media</h3>
      <div class="space-y-4">
        <div
          class="rounded-xl border-2 border-dashed border-cream-300 p-6 text-center hover:border-forest-300 transition-colors dark:border-ink-600"
          role="region"
          ondragover={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-forest-400', 'bg-forest-50/50'); }}
          ondragleave={(e) => { e.currentTarget.classList.remove('border-forest-400', 'bg-forest-50/50'); }}
          ondrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-forest-400', 'bg-forest-50/50');
            const dt = e.dataTransfer;
            if (dt?.files?.length) {
              const input = document.getElementById('file-upload') as HTMLInputElement;
              if (input) {
                input.files = dt.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          }}
        >
          <input type="file" accept="image/*,video/*,audio/*" multiple onchange={handleFileUpload} id="file-upload" class="hidden" disabled={uploadingFile} />
          <label for="file-upload" class="cursor-pointer">
            {#if uploadingFile}
              <div class="flex items-center justify-center gap-2 mb-2">
                <svg class="h-5 w-5 text-forest-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p class="text-sm font-medium text-forest-600">{uploadProgress || 'Uploading...'}</p>
              </div>
            {:else}
              <svg class="h-8 w-8 mx-auto text-ink-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="text-sm text-ink-500 font-medium">Click to upload or drag & drop photos, videos, or audio</p>
              <p class="text-xs text-ink-400 mt-1">Select multiple files or an entire folder</p>
            {/if}
          </label>
        </div>
        {#if uploadProgress && !uploadingFile}
          <p class="text-sm text-forest-500">{uploadProgress}</p>
        {/if}
        {#if uploadError}
          <p class="text-sm text-terra-500">{uploadError}</p>
        {/if}
        {#if uploadErrors.length > 0}
          <div class="text-xs text-terra-400 space-y-0.5 mt-1">
            {#each uploadErrors as err}
              <p>{err}</p>
            {/each}
          </div>
        {/if}

        <input type="text" bind:value={newMediaCaption} placeholder="Caption for next upload (optional)" class="input" />
      </div>
    </div>
  </div>
</div>

<!-- Delete Confirmation Dialog -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="card p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-display font-semibold text-ink-800 dark:text-cream-100 mb-2">Delete Adventure</h3>
      <p class="text-sm text-ink-400 mb-6">
        Are you sure you want to delete "{data.adventure.title}"? This will permanently remove the adventure, all media, comments, and reactions. This action cannot be undone.
      </p>
      <div class="flex gap-3">
        <button onclick={() => showDeleteConfirm = false} disabled={submitting} class="flex-1 btn-secondary">
          Cancel
        </button>
        <button onclick={handleDelete} disabled={submitting} class="flex-1 bg-terra-500 px-4 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-terra-600 disabled:opacity-50 transition-colors">
          {submitting ? 'Deleting...' : 'Yes, Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}
