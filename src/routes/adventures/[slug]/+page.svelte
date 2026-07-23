<script lang="ts">
  import type { PageData } from './$types';
  import { formatDate, timeAgo } from '$lib/shared/utils';
  import { getImmichAssetUrl } from '$lib/shared/immich';
  
  let { data } = $props();
  let showShareDialog = $state(false);
  let shareLink = $state('');
  let newComment = $state('');
  let submittingComment = $state(false);

  const reactionEmojis = ['❤️', '🔥', '😊', '👏', '🌊', '✈️'];
  
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
    {#if data.adventure.cover_asset_id}
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
              src={getImmichAssetUrl(media.immich_asset_id, true)}
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
            
            <!-- Reply button -->
            {#if data.user}
              <button class="text-xs text-ocean-500 hover:text-ocean-600 mt-2">
                Reply
              </button>
            {/if}
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
