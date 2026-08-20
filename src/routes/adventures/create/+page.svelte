<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import LocationInput from '$lib/components/LocationInput.svelte';
  
  let { data } = $props();
  
  let title = $state('');
  let description = $state('');
  let content = $state('');
  let locationName = $state('');
  let lat = $state<number | null>(null);
  let lng = $state<number | null>(null);
  let startDate = $state('');
  let endDate = $state('');
  let mood = $state('');
  let templateType = $state('');
  let visibility = $state<'private' | 'family' | 'public'>('family');
  let isDraft = $state(true);
  let selectedTags = $state<string[]>([]);
  let submitting = $state(false);
  let error = $state('');

  // AI state
  let aiEnabled = $state(false);
  let aiGeneratingDescription = $state(false);
  let aiEnhancingDescription = $state(false);
  let aiEnhancingContent = $state(false);
  let aiSuggestingTags = $state(false);
  let aiSuggestedTags = $state<{ name: string; isNew: boolean }[]>([]);
  let aiError = $state('');

  onMount(() => { checkAIStatus(); });

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

  async function handleSubmit(publish: boolean = false) {
    if (!title.trim()) {
      error = 'Please enter a title';
      return;
    }

    submitting = true;
    error = '';

    try {
      const response = await fetch('/api/adventures', {
        method: 'POST',
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
          isDraft: !publish,
          tags: selectedTags
        })
      });

      if (response.ok) {
        const result = await response.json();
        goto(`/adventures/${result.slug}`);
      } else {
        const err = await response.json();
        error = err.message || 'Failed to create adventure';
      }
    } catch (e) {
      error = 'An error occurred. Please try again.';
    }
    submitting = false;
  }
</script>

<svelte:head>
  <title>Create Adventure | Family Adventures</title>
</svelte:head>

<div class="max-w-3xl mx-auto">
  <a href="/adventures" class="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-600 mb-6 transition-colors">
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Back to Adventures
  </a>

  <div class="card p-6 md:p-8 animate-in">
    <h1 class="text-2xl md:text-3xl font-display font-semibold text-ink-800 dark:text-cream-100 mb-6">
      New Adventure
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

    <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSubmit(false); }}>
      <!-- Title -->
      <div>
        <label for="title" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">
          Title *
        </label>
        <input
          type="text"
          id="title"
          bind:value={title}
          placeholder="Our Amazing Beach Vacation"
          class="input"
          required
        />
      </div>

      <!-- Description -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label for="description" class="block text-sm font-medium text-ink-600 dark:text-cream-200">
            Description
          </label>
          {#if aiEnabled}
            <div class="flex gap-2">
              <button
                type="button"
                onclick={generateDescription}
                disabled={aiGeneratingDescription}
                class="btn-accent text-xs px-3 py-1"
              >
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
                <button
                  type="button"
                  onclick={enhanceDescription}
                  disabled={aiEnhancingDescription}
                  class="btn-secondary text-xs px-3 py-1"
                >
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
        <textarea
          id="description"
          bind:value={description}
          placeholder="A brief summary of this adventure..."
          rows="3"
          class="input resize-none"
        ></textarea>
      </div>

      <!-- Content / Story -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label for="content" class="block text-sm font-medium text-ink-600 dark:text-cream-200">
            Story
          </label>
          {#if aiEnabled && content.trim()}
            <button
              type="button"
              onclick={enhanceContent}
              disabled={aiEnhancingContent}
              class="btn-secondary text-xs px-3 py-1"
            >
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
        <textarea
          id="content"
          bind:value={content}
          placeholder="Tell the story of this adventure..."
          rows="8"
          class="input resize-y"
        ></textarea>
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
          <label for="startDate" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">
            Start Date
          </label>
          <input type="date" id="startDate" bind:value={startDate} class="input" />
        </div>
        <div>
          <label for="endDate" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">
            End Date
          </label>
          <input type="date" id="endDate" bind:value={endDate} class="input" />
        </div>
      </div>

      <!-- Location -->
      <div>
        <label for="location" class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">
          Location
        </label>
        <LocationInput bind:value={locationName} bind:lat bind:lng />
      </div>

      <!-- Mood -->
      <div>
        <label class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">
          Mood
        </label>
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
            <label class="block text-sm font-medium text-ink-600 dark:text-cream-200">
              Tags
            </label>
            {#if aiEnabled}
              <button
                type="button"
                onclick={suggestTags}
                disabled={aiSuggestingTags}
                class="btn-accent text-xs px-3 py-1"
              >
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
                  <button
                    type="button"
                    class="badge border border-forest-200 text-forest-600 hover:bg-forest-100 transition-colors dark:border-forest-700 dark:text-forest-300"
                    onclick={() => applyTag(tag.name)}
                  >
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
        <label class="block text-sm font-medium text-ink-600 dark:text-cream-200 mb-1.5">
          Visibility
        </label>
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

      <!-- Actions -->
      <div class="flex flex-wrap gap-3 pt-4 border-t border-cream-200 dark:border-ink-600">
        <button
          type="button"
          onclick={() => handleSubmit(false)}
          disabled={submitting}
          class="btn-secondary disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onclick={() => handleSubmit(true)}
          disabled={submitting}
          class="btn-primary disabled:opacity-50"
        >
          {submitting ? 'Publishing...' : 'Publish Adventure'}
        </button>
      </div>
    </form>
  </div>
</div>
