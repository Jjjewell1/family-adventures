<script lang="ts">
  import { timeAgo } from '$lib/shared/utils';
  let { data } = $props();
  let items = $state(data.items);
  let loading = $state(false);
  let page = $state(1);
  let hasMore = $state(true);

  function parseMeta(meta: string | null): any {
    if (!meta) return {};
    try { return JSON.parse(meta); } catch { return {}; }
  }

  async function loadMore() {
    if (loading || !hasMore) return;
    loading = true;
    page++;
    try {
      const res = await fetch(`/api/feed?page=${page}`);
      const result = await res.json();
      if (result.items?.length) {
        items = [...items, ...result.items];
      }
      hasMore = result.hasMore;
    } catch {}
    loading = false;
  }

  function getActionVerb(item: any): string {
    const meta = parseMeta(item.metadata);
    switch (item.action_type) {
      case 'created_adventure': return 'started a new adventure';
      case 'commented': return 'commented on';
      case 'reacted': return `reacted ${meta.emoji || ''} to`;
      case 'shared': return 'shared';
      case 'joined': return 'joined the family!';
      case 'rated': return `rated ${meta.score || ''}⭐ on`;
      case 'uploaded_photo': return 'added a photo to';
      case 'created_story': return 'wrote a story for';
      default: return 'interacted with';
    }
  }

  function getIcon(actionType: string): string {
    switch (actionType) {
      case 'created_adventure': return '🧭';
      case 'commented': return '💬';
      case 'reacted': return '';
      case 'shared': return '🔗';
      case 'joined': return '🎉';
      case 'rated': return '⭐';
      case 'uploaded_photo': return '📸';
      case 'created_story': return '📖';
      default: return '📌';
    }
  }

  function getAccentColor(actionType: string): string {
    switch (actionType) {
      case 'created_adventure': return 'border-l-forest-600';
      case 'commented': return 'border-l-cream-300';
      case 'reacted': return 'border-l-terra-500';
      case 'joined': return 'border-l-forest-600';
      case 'rated': return 'border-l-gold-500';
      case 'uploaded_photo': return 'border-l-forest-500';
      case 'created_story': return 'border-l-gold-500';
      default: return 'border-l-cream-300';
    }
  }
</script>

<svelte:head>
  <title>Feed — Family Adventures</title>
</svelte:head>

<div class="max-w-2xl mx-auto">
  <div class="page-header animate-in">
    <p class="page-header-label">Latest Updates</p>
    <h1 class="page-header-title">Activity Feed</h1>
    <p class="page-header-desc">See what the family has been up to</p>
  </div>

  {#if items.length === 0}
    <div class="card-flat p-12 text-center animate-in">
      <div class="text-4xl mb-4">🧭</div>
      <p class="text-ink-400">No activity yet. Start an adventure!</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each items as item (item.id)}
        {@const meta = parseMeta(item.metadata)}
        <div class="card p-4 border-l-4 {getAccentColor(item.action_type)}">
          <div class="flex gap-3">
            <!-- Avatar -->
            <div class="shrink-0">
              {#if item.user_avatar}
                <img src={item.user_avatar} alt="" class="h-10 w-10 rounded-full object-cover ring-2 ring-cream-200" />
              {:else}
                <div class="h-10 w-10 rounded-full bg-terra-500 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-cream-200">
                  {item.user_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              {/if}
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm text-ink-700">
                  <a href="/settings" class="font-semibold hover:underline">{item.user_name}</a>
                  {' '}{getActionVerb(item.action_type)}{' '}
                  {#if item.adventure_id && item.adventure_title}
                    <a href="/adventures/{item.adventure_slug}" class="font-medium text-forest-600 hover:underline">{item.adventure_title}</a>
                  {:else if item.action_type === 'joined'}
                    <span class="font-medium text-forest-600">the family</span>
                  {/if}
                </p>
                <span class="text-xs text-ink-400 whitespace-nowrap shrink-0">{timeAgo(item.created_at)}</span>
              </div>

              <!-- Comment preview -->
              {#if item.action_type === 'commented' && meta.commentId}
                <div class="mt-2 px-3 py-2 rounded-lg bg-cream-50 border border-cream-200 text-xs text-ink-500 italic">
                  "{meta.content || 'view comment →'}"
                </div>
              {/if}

              <!-- Reaction emoji display -->
              {#if item.action_type === 'reacted' && meta.emoji}
                <span class="text-lg">{meta.emoji}</span>
              {/if}

              <!-- Rating display -->
              {#if item.action_type === 'rated' && meta.score}
                <div class="mt-1 flex gap-0.5">
                  {#each Array(5) as _, i}
                    <span class="text-sm {i < meta.score ? 'text-gold-500' : 'text-cream-300'}">★</span>
                  {/each}
                </div>
              {/if}

              <!-- Photo thumbnail -->
              {#if item.action_type === 'uploaded_photo' && item.media_file_path}
                <div class="mt-2">
                  <img src={`/api/media/image?path=${encodeURIComponent(item.media_file_path)}&w=160`} alt="" class="h-24 w-24 rounded-lg object-cover border border-cream-200" />
                </div>
              {/if}

              <!-- Joined celebration -->
              {#if item.action_type === 'joined'}
                <div class="mt-2 px-3 py-2 rounded-lg bg-cream-50 border border-cream-200 text-xs text-forest-600">
                  🎊 Everyone welcome {item.target_user_name || 'a new member'}!
                </div>
              {/if}

              <!-- Action icon -->
              {#if item.action_type !== 'reacted' && item.action_type !== 'rated' && getIcon(item.action_type)}
                <span class="inline-block mt-1 text-xs text-ink-400">{getIcon(item.action_type)}</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>

    {#if hasMore}
      <div class="text-center py-6">
        <button
          onclick={loadMore}
          disabled={loading}
          class="btn-secondary text-sm disabled:opacity-50"
        >
          {#if loading}
            <div class="inline-block h-4 w-4 rounded-full border-2 border-forest-500/30 border-t-forest-600 animate-spin mr-2"></div>
            Loading...
          {:else}
            Load more
          {/if}
        </button>
      </div>
    {/if}
  {/if}
</div>
