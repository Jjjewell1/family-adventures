<script lang="ts">
  import type { PageData } from './$types';
  let { data } = $props();

  const stateColors: Record<string, string> = {};
  const ALL_ABBRS = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

  let maxCount = 1;
  for (const val of Object.values(data.byYear)) if (val > maxCount) maxCount = val;
  for (const val of Object.values(data.byType)) if (val > maxCount) maxCount = val;
  for (const val of Object.values(data.byMood)) if (val > maxCount) maxCount = val;
</script>

<div class="max-w-4xl mx-auto space-y-8">
  <div>
    <h1 class="text-3xl font-display font-bold text-ocean-600 mb-2">Family Stats Dashboard</h1>
    <p class="text-navy-400">A look at all our adventures together</p>
  </div>

  <!-- Top stats -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
    <div class="glass rounded-2xl p-4 text-center">
      <p class="text-3xl font-bold text-ocean-600">{data.totalAdventures}</p>
      <p class="text-xs text-navy-400 mt-1">Adventures</p>
    </div>
    <div class="glass rounded-2xl p-4 text-center">
      <p class="text-3xl font-bold text-coral-500">{data.statesCount}</p>
      <p class="text-xs text-navy-400 mt-1">States Visited</p>
    </div>
    <div class="glass rounded-2xl p-4 text-center">
      <p class="text-3xl font-bold text-sunset-500">{data.totalMedia}</p>
      <p class="text-xs text-navy-400 mt-1">Photos & Videos</p>
    </div>
    <div class="glass rounded-2xl p-4 text-center">
      <p class="text-3xl font-bold text-sage-500">{data.totalComments}</p>
      <p class="text-xs text-navy-400 mt-1">Comments</p>
    </div>
    <div class="glass rounded-2xl p-4 text-center">
      <p class="text-3xl font-bold text-coral-400">{data.totalBucketItems}</p>
      <p class="text-xs text-navy-400 mt-1">Bucket List Items</p>
    </div>
  </div>

  <!-- US States Map Grid -->
  <div class="glass rounded-2xl p-6">
    <h2 class="text-lg font-semibold text-navy-600 mb-4">States Visited ({data.statesCount}/50)</h2>
    <div class="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-1.5">
      {#each ALL_ABBRS as abbr}
        <div
          class="w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all"
          class:bg-ocean-400={data.statesVisited.includes(abbr)}
          class:text-white={data.statesVisited.includes(abbr)}
          class:bg-sand-200={!data.statesVisited.includes(abbr)}
          class:text-navy-300={!data.statesVisited.includes(abbr)}
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
    <div class="glass rounded-2xl p-6">
      <h2 class="text-lg font-semibold text-navy-600 mb-4">By Year</h2>
      <div class="space-y-2">
        {#each Object.entries(data.byYear).sort(([a],[b]) => b.localeCompare(a)) as [year, count]}
          <div class="flex items-center gap-3">
            <span class="text-sm text-navy-500 w-12 text-right">{year}</span>
            <div class="flex-1 h-6 bg-sand-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-ocean-400 to-ocean-500 rounded-full flex items-center pl-2"
                style="width: {Math.max((count / maxCount) * 100, 8)}%">
                <span class="text-[10px] font-medium text-white">{count}</span>
              </div>
            </div>
          </div>
        {/each}
        {#if Object.keys(data.byYear).length === 0}
          <p class="text-sm text-navy-400 italic">No adventures yet</p>
        {/if}
      </div>
    </div>

    <!-- Adventures by Type -->
    <div class="glass rounded-2xl p-6">
      <h2 class="text-lg font-semibold text-navy-600 mb-4">By Type</h2>
      <div class="space-y-2">
        {#each Object.entries(data.byType).sort(([,a],[,b]) => b - a) as [type, count]}
          <div class="flex items-center gap-3">
            <span class="text-sm text-navy-500 w-24 text-right truncate">{type}</span>
            <div class="flex-1 h-6 bg-sand-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-coral-400 to-sunset-500 rounded-full flex items-center pl-2"
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
    <div class="glass rounded-2xl p-6">
      <h2 class="text-lg font-semibold text-navy-600 mb-4">By Mood</h2>
      <div class="space-y-2">
        {#each Object.entries(data.byMood).sort(([,a],[,b]) => b - a) as [mood, count]}
          <div class="flex items-center gap-3">
            <span class="text-sm text-navy-500 w-20 text-right">{mood}</span>
            <div class="flex-1 h-6 bg-sand-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-sunset-400 to-sunset-500 rounded-full flex items-center pl-2"
                style="width: {Math.max((count / maxCount) * 100, 8)}%">
                <span class="text-[10px] font-medium text-white">{count}</span>
              </div>
            </div>
          </div>
        {/each}
        {#if Object.keys(data.byMood).length === 0}
          <p class="text-sm text-navy-400 italic">No moods recorded yet</p>
        {/if}
      </div>
    </div>

    <!-- Top Adventurers -->
    <div class="glass rounded-2xl p-6">
      <h2 class="text-lg font-semibold text-navy-600 mb-4">Top Adventurers</h2>
      <div class="space-y-2">
        {#each Object.entries(data.byAuthor).sort(([,a],[,b]) => b - a) as [author, count]}
          <div class="flex items-center gap-3">
            <div class="h-7 w-7 rounded-full bg-gradient-to-br from-coral-400 to-sunset-400 flex items-center justify-center text-white text-xs font-medium shrink-0">
              {author.charAt(0).toUpperCase()}
            </div>
            <span class="text-sm text-navy-600 flex-1">{author}</span>
            <span class="text-xs text-navy-400 bg-sand-100 rounded-full px-2 py-0.5">{count}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
