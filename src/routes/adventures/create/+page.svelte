<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  let { data } = $props();
  
  let title = $state('');
  let description = $state('');
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
  <a href="/adventures" class="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-navy-600 mb-6 transition-colors">
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Back to Adventures
  </a>

  <div class="glass rounded-3xl p-6 md:p-8">
    <h1 class="text-2xl md:text-3xl font-display font-semibold text-navy-600 mb-6">
      New Adventure
    </h1>

    {#if error}
      <div class="mb-6 p-4 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 text-sm">
        {error}
      </div>
    {/if}

    <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSubmit(false); }}>
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

      <!-- Actions -->
      <div class="flex flex-wrap gap-3 pt-4 border-t border-sand-200">
        <button
          type="button"
          onclick={() => handleSubmit(false)}
          disabled={submitting}
          class="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-5 py-2.5 text-sm font-medium text-navy-600 hover:bg-sand-50 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onclick={() => handleSubmit(true)}
          disabled={submitting}
          class="inline-flex items-center gap-2 rounded-full bg-ocean-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Publishing...' : 'Publish Adventure'}
        </button>
      </div>
    </form>
  </div>
</div>
