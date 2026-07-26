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
      case 'created_adventure': return 'border-l-ocean-400';
      case 'commented': return 'border-l-sand-400';
      case 'reacted': return 'border-l-coral-400';
      case 'joined': return 'border-l-emerald-400';
      case 'rated': return 'border-l-sunset-400';
      case 'uploaded_photo': return 'border-l-ocean-300';
      case 'created_story': return 'border-l-sunset-300';
      default: return 'border-l-sand-300';
    }
  }
</script>

<svelte:head>
  <title>Feed — Family Adventures</title>
</svelte:head>

<div class="max-w-2xl mx-auto space-y-1">
  <div class="mb-6">
    <h1 class="text-2xl font-display font-bold text-navy-600">Activity Feed</h1>
    <p class="text-sm text-navy-400 mt-1">See what the family has been up to</p>
  </div>

  {#if items.length === 0}
    <div class="glass rounded-2xl p-12 text-center">
      <div class="text-4xl mb-4">🌊</div>
      <p class="text-navy-400">No activity yet. Start an adventure!</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each items as item (item.id)}
        {@const meta = parseMeta(item.metadata)}
        <div class="glass rounded-xl p-4 border-l-4 {getAccentColor(item.action_type)} hover:shadow-md transition-shadow">
          <div class="flex gap-3">
            <!-- Avatar -->
            <div class="shrink-0">
              {#if item.user_avatar}
                <img src={item.user_avatar} alt="" class="h-10 w-10 rounded-full object-cover ring-2 ring-sand-200/50" />
              {:else}
                <div class="h-10 w-10 rounded-full bg-gradient-to-br from-coral-400 to-sunset-400 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-sand-200/50">
                  {item.user_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              {/if}
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm text-navy-600">
                  <a href="/settings" class="font-semibold hover:underline">{item.user_name}</a>
                  {' '}{getActionVerb(item.action_type)}{' '}
                  {#if item.adventure_id && item.adventure_title}
                    <a href="/adventures/{item.adventure_slug}" class="font-medium text-ocean-500 hover:underline">{item.adventure_title}</a>
                  {:else if item.action_type === 'joined'}
                    <span class="font-medium text-emerald-500">the family</span>
                  {/if}
                </p>
                <span class="text-xs text-navy-300 whitespace-nowrap shrink-0">{timeAgo(item.created_at)}</span>
              </div>

              <!-- Comment preview -->
              {#if item.action_type === 'commented' && meta.commentId}
                <div class="mt-2 px-3 py-2 rounded-lg bg-sand-50/50 border border-sand-200/30 text-xs text-navy-400 italic">
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
                    <span class="text-sm {i < meta.score ? 'text-sunset-400' : 'text-navy-200'}">★</span>
                  {/each}
                </div>
              {/if}

              <!-- Photo thumbnail -->
              {#if item.action_type === 'uploaded_photo' && item.media_file_path}
                <div class="mt-2">
                  <img src={item.media_file_path} alt="" class="h-24 w-24 rounded-lg object-cover border border-sand-200/30" />
                </div>
              {/if}

              <!-- Joined celebration -->
              {#if item.action_type === 'joined'}
                <div class="mt-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200/50 text-xs text-emerald-600">
                  🎊 Everyone welcome {item.target_user_name || 'a new member'}!
                </div>
              {/if}

              <!-- Action icon -->
              {#if item.action_type !== 'reacted' && item.action_type !== 'rated' && getIcon(item.action_type)}
                <span class="inline-block mt-1 text-xs text-navy-300">{getIcon(item.action_type)}</span>
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
          class="px-6 py-2.5 rounded-full glass border border-sand-200/50 text-sm font-medium text-navy-500 hover:text-ocean-500 hover:border-ocean-300/50 transition-colors disabled:opacity-50"
        >
          {#if loading}
            <div class="inline-block h-4 w-4 rounded-full border-2 border-ocean-300/30 border-t-ocean-500 animate-spin mr-2"></div>
            Loading...
          {:else}
            Load more
          {/if}
        </button>
      </div>
    {/if}
  {/if}
</div>
