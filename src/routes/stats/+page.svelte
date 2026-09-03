<script lang="ts">
  import type { PageData } from './$types';
  let { data } = $props();

  const stateColors: Record<string, string> = {};
  const ALL_ABBRS = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

  const maxCount = $derived(
    Math.max(1,
      ...Object.values(data.byYear),
      ...Object.values(data.byType),
      ...Object.values(data.byMood)
    )
  );
</script>

<div class="max-w-4xl mx-auto space-y-8 animate-in">
  <header class="page-header">
    <p class="page-header-label">Statistics</p>
    <h1 class="page-header-title">Family Stats Dashboard</h1>
    <p class="page-header-desc">A look at all our adventures together</p>
  </header>

  <!-- Top stats -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
    <div class="card-flat p-4 text-center">
      <p class="text-3xl font-bold text-forest-600">{data.totalAdventures}</p>
      <p class="text-xs text-ink-400 mt-1">Adventures</p>
    </div>
    <div class="card-flat p-4 text-center">
      <p class="text-3xl font-bold text-terra-500">{data.statesCount}</p>
      <p class="text-xs text-ink-400 mt-1">States Visited</p>
    </div>
    <div class="card-flat p-4 text-center">
      <p class="text-3xl font-bold text-gold-500">{data.totalMedia}</p>
      <p class="text-xs text-ink-400 mt-1">Photos & Videos</p>
    </div>
    <div class="card-flat p-4 text-center">
      <p class="text-3xl font-bold text-forest-500">{data.totalComments}</p>
      <p class="text-xs text-ink-400 mt-1">Comments</p>
    </div>
    <div class="card-flat p-4 text-center">
      <p class="text-3xl font-bold text-terra-400">{data.totalBucketItems}</p>
      <p class="text-xs text-ink-400 mt-1">Bucket List Items</p>
    </div>
  </div>

  <!-- US States Map Grid -->
  <div class="card p-6">
    <h2 class="text-lg font-semibold text-ink-700 mb-4">States Visited ({data.statesCount}/50)</h2>
    <div class="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-1.5">
      {#each ALL_ABBRS as abbr}
        <div
          class="w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all"
          class:bg-forest-500={data.statesVisited.includes(abbr)}
          class:text-white={data.statesVisited.includes(abbr)}
          class:bg-cream-100={!data.statesVisited.includes(abbr)}
          class:text-ink-300={!data.statesVisited.includes(abbr)}
          title={abbr}
        >
          {abbr}
        </div>
      {/each}
    </div>
  </div>

  <!-- Charts row -->
  <div class="grid md:grid-cols-2 gap-6">
    <!-- Adventures by Year -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-ink-700 mb-4">By Year</h2>
      <div class="space-y-2">
        {#each Object.entries(data.byYear).sort(([a],[b]) => b.localeCompare(a)) as [year, count]}
          <div class="flex items-center gap-3">
            <span class="text-sm text-ink-500 w-12 text-right">{year}</span>
            <div class="flex-1 h-6 bg-cream-100 rounded-full overflow-hidden">
              <div class="h-full bg-forest-500 rounded-full flex items-center pl-2"
                style="width: {Math.max((count / maxCount) * 100, 8)}%">
                <span class="text-[10px] font-medium text-white">{count}</span>
              </div>
            </div>
          </div>
        {/each}
        {#if Object.keys(data.byYear).length === 0}
          <p class="text-sm text-ink-400 italic">No adventures yet</p>
        {/if}
      </div>
    </div>

    <!-- Adventures by Type -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-ink-700 mb-4">By Type</h2>
      <div class="space-y-2">
        {#each Object.entries(data.byType).sort(([,a],[,b]) => b - a) as [type, count]}
          <div class="flex items-center gap-3">
            <span class="text-sm text-ink-500 w-24 text-right truncate">{type}</span>
            <div class="flex-1 h-6 bg-cream-100 rounded-full overflow-hidden">
              <div class="h-full bg-terra-500 rounded-full flex items-center pl-2"
                style="width: {Math.max((count / maxCount) * 100, 8)}%">
                <span class="text-[10px] font-medium text-white">{count}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Mood & Authors row -->
  <div class="grid md:grid-cols-2 gap-6">
    <!-- Adventures by Mood -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-ink-700 mb-4">By Mood</h2>
      <div class="space-y-2">
        {#each Object.entries(data.byMood).sort(([,a],[,b]) => b - a) as [mood, count]}
          <div class="flex items-center gap-3">
            <span class="text-sm text-ink-500 w-20 text-right">{mood}</span>
            <div class="flex-1 h-6 bg-cream-100 rounded-full overflow-hidden">
              <div class="h-full bg-gold-500 rounded-full flex items-center pl-2"
                style="width: {Math.max((count / maxCount) * 100, 8)}%">
                <span class="text-[10px] font-medium text-white">{count}</span>
              </div>
            </div>
          </div>
        {/each}
        {#if Object.keys(data.byMood).length === 0}
          <p class="text-sm text-ink-400 italic">No moods recorded yet</p>
        {/if}
      </div>
    </div>

    <!-- Top Adventurers -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-ink-700 mb-4">Top Adventurers</h2>
      <div class="space-y-2">
        {#each Object.entries(data.byAuthor).sort(([,a],[,b]) => b - a) as [author, count]}
          <div class="flex items-center gap-3">
            <div class="h-7 w-7 rounded-full bg-terra-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
              {author.charAt(0).toUpperCase()}
            </div>
            <span class="text-sm text-ink-700 flex-1">{author}</span>
            <span class="badge bg-cream-100 text-ink-500">{count}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
