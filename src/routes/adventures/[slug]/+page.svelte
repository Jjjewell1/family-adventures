<script lang="ts">
  import type { PageData } from './$types';
  import { pushState } from '$app/navigation';
  import { page } from '$app/state';
  import { formatDate, timeAgo } from '$lib/shared/utils';
  import { onMount } from 'svelte';
  
  let { data } = $props();
  let showShareDialog = $state(false);
  let shareLink = $state('');
  let newComment = $state('');
  let submittingComment = $state(false);
  let myRating = $state(data.ratings?.find((r: any) => r.author_id === data.user?.id)?.score || 0);
  let hoverRating = $state(0);
  let showStoryForm = $state(false);
  let storyTitle = $state('');
  let storyContent = $state('');
  let submittingStory = $state(false);

  // Side Quests state
  let sideQuestView = $state<'timeline' | 'cards'>('timeline');
  let showSideQuestForm = $state(false);
  let editingSQId = $state<string | null>(null);
  let sqTitle = $state('');
  let sqDay = $state('');
  let sqNote = $state('');
  let sqRating = $state(0);
  let sqHoverRating = $state(0);
  let submittingSQ = $state(false);
  let deletingSQId = $state<string | null>(null);

  // Upload state
  let uploadingMedia = $state(false);
  let uploadProgress = $state('');
  let uploadErrors = $state<string[]>([]);
  let uploadFileProgress = $state<Record<string, { status: 'pending'|'uploading'|'done'|'error'; percent: number }>>({});
  let failedFiles = $state<File[]>([]);
  let sqUploadProgress = $state<Record<string, string>>({});
  let sqUploading = $state<Record<string, boolean>>({});
  let sqUploadErrors = $state<Record<string, string[]>>({});

  // People tagging state
  let taggingMediaId = $state<string | null>(null);
  let taggingPeople = $state<any[]>([]);
  let taggingLoading = $state(false);
  let tagSearchQuery = $state('');
  let tagSearchResults = $state<any[]>([]);
  let tagSearching = $state(false);
  let showNewPersonInput = $state(false);
  let newPersonName = $state('');
  let creatingPerson = $state(false);

  // AI state
  let aiEnabled = $state(false);
  let aiGeneratingStory = $state(false);
  let aiGeneratingCaptions = $state(false);
  let aiAnalyzing = $state<Record<string, boolean>>({});
  let aiError = $state('');

  import VideoThumbnail from '$lib/components/VideoThumbnail.svelte';
  import { detectMediaType as detectType } from '$lib/shared/utils';

  const reactionEmojis = ['❤️', '🔥', '😊', '👏', '🌊', '✈️'];

  const subAdventures = $derived(data.subAdventures || []);

  const subAdventuresByDay = $derived((() => {
    const grouped: Record<number, any[]> = {};
    const undated: any[] = [];
    for (const sq of subAdventures) {
      if (sq.day_number != null) {
        if (!grouped[sq.day_number]) grouped[sq.day_number] = [];
        grouped[sq.day_number].push(sq);
      } else {
        undated.push(sq);
      }
    }
    return { grouped, undated };
  })());
  
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

  async function setRating(score: number) {
    if (!data.user) return;
    myRating = score;
    await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adventureId: data.adventure.id, score })
    });
  }

  async function submitStory() {
    if (!storyContent.trim()) return;
    submittingStory = true;
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adventureId: data.adventure.id, title: storyTitle.trim() || null, content: storyContent.trim() })
    });
    if (res.ok) window.location.reload();
    submittingStory = false;
  }

  function startEditSQ(sq: any) {
    editingSQId = sq.id;
    showSideQuestForm = false;
    sqTitle = sq.title;
    sqDay = sq.day_number != null ? String(sq.day_number) : '';
    sqNote = sq.note || '';
    sqRating = sq.rating || 0;
  }

  function cancelEditSQ() {
    editingSQId = null;
    sqTitle = '';
    sqDay = '';
    sqNote = '';
    sqRating = 0;
  }

  async function submitSideQuest() {
    if (!sqTitle.trim()) return;
    submittingSQ = true;

    if (editingSQId) {
      const res = await fetch(`/api/sub-adventures/${editingSQId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sqTitle.trim(),
          dayNumber: sqDay ? parseInt(sqDay) : null,
          note: sqNote.trim() || null,
          rating: sqRating || null
        })
      });
      if (res.ok) window.location.reload();
    } else {
      const res = await fetch('/api/sub-adventures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adventureId: data.adventure.id,
          title: sqTitle.trim(),
          dayNumber: sqDay ? parseInt(sqDay) : null,
          note: sqNote.trim() || null,
          rating: sqRating || null
        })
      });
      if (res.ok) window.location.reload();
    }
    submittingSQ = false;
  }

  async function deleteSideQuest(id: string) {
    deletingSQId = id;
  }

  async function confirmDeleteSQ(id: string) {
    const res = await fetch(`/api/sub-adventures/${id}`, { method: 'DELETE' });
    if (res.ok) window.location.reload();
    deletingSQId = null;
  }

  async function toggleHeroImage(mediaId: string, current: boolean) {
    await fetch(`/api/media/${mediaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero_image: !current })
    });
    window.location.reload();
  }

  function sqImageUrl(media: any) {
    return media.file_path || '';
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

  async function generateStory() {
    aiGeneratingStory = true;
    aiError = '';
    try {
      const sideQuests = (data.subAdventures || []).map((sq: any) => ({ title: sq.title, note: sq.note }));
      const res = await fetch('/api/ai/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.adventure.title,
          description: data.adventure.description,
          content: data.adventure.content,
          locationName: data.adventure.location_name,
          startDate: data.adventure.start_date,
          endDate: data.adventure.end_date,
          mood: data.adventure.mood,
          templateType: data.adventure.template_type,
          sideQuests
        })
      });
      const result = await res.json();
      if (res.ok && result.result) {
        storyContent = result.result;
        storyTitle = `AI Story: ${data.adventure.title}`;
        showStoryForm = true;
      } else {
        aiError = result.error || 'Failed to generate story';
      }
    } catch {
      aiError = 'Failed to connect to AI';
    }
    aiGeneratingStory = false;
  }

  async function generateCaptions() {
    aiGeneratingCaptions = true;
    aiError = '';
    try {
      const existingCaptions = (data.adventure.media || []).filter((m: any) => m.caption).map((m: any) => m.caption);
      const uncaptionedCount = (data.adventure.media || []).filter((m: any) => !m.caption).length;
      const res = await fetch('/api/ai/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.adventure.title,
          description: data.adventure.description,
          locationName: data.adventure.location_name,
          photoCount: Math.max(uncaptionedCount, 5),
          existingCaptions
        })
      });
      const result = await res.json();
      if (res.ok && result.captions) {
        let captionIndex = 0;
        for (const media of (data.adventure.media || [])) {
          if (!media.caption && captionIndex < result.captions.length) {
            await fetch(`/api/adventures/${data.adventure.slug}/media`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mediaId: media.id, caption: result.captions[captionIndex] })
            });
            captionIndex++;
          }
        }
        window.location.reload();
      } else {
        aiError = result.error || 'Failed to generate captions';
      }
    } catch {
      aiError = 'Failed to connect to AI';
    }
    aiGeneratingCaptions = false;
  }

  onMount(() => {
    checkAIStatus();
    const handler = (e: BeforeUnloadEvent) => {
      if (uploadingMedia) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  });

  function detectMediaTypeFromName(file: File): string {
    return detectType(file.name);
  }

  async function uploadSingleFile(file: File, retries = 2): Promise<{ filePath?: string; error?: string }> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const formData = new FormData();
        formData.append('files', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          if (attempt < retries) { await new Promise(r => setTimeout(r, 500 * (attempt + 1))); continue; }
          return { error: `HTTP ${uploadRes.status}` };
        }
        const { files: results } = await uploadRes.json();
        const result = results[0];
        if (result.error) return { error: result.error };
        return { filePath: result.filePath };
      } catch {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 500 * (attempt + 1))); continue; }
        return { error: 'network error' };
      }
    }
    return { error: 'upload failed' };
  }

  async function uploadWithConcurrency(files: File[], concurrency: number): Promise<{ filePath: string; mediaType: string }[]> {
    const uploaded: { filePath: string; mediaType: string }[] = [];
    const errors: string[] = [];
    let idx = 0;

    async function worker() {
      while (idx < files.length) {
        const i = idx++;
        const file = files[i];
        const key = `${file.name}-${i}`;
        uploadFileProgress = { ...uploadFileProgress, [key]: { status: 'uploading', percent: 0 } };

        const result = await uploadSingleFile(file);
        if (result.filePath) {
          uploaded.push({ filePath: result.filePath, mediaType: detectMediaTypeFromName(file) });
          uploadFileProgress = { ...uploadFileProgress, [key]: { status: 'done', percent: 100 } };
        } else {
          errors.push(`${file.name}: ${result.error}`);
          uploadFileProgress = { ...uploadFileProgress, [key]: { status: 'error', percent: 0 } };
          failedFiles = [...failedFiles, file];
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()));
    uploadErrors = errors;
    return uploaded;
  }

  async function handleAdventureMediaUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const total = fileList.length;
    uploadingMedia = true;
    uploadErrors = [];
    failedFiles = [];
    uploadFileProgress = {};
    uploadProgress = `Uploading ${total} file${total > 1 ? 's' : ''}...`;

    const uploaded = await uploadWithConcurrency(fileList, 3);

    if (uploaded.length > 0) {
      const batchRes = await fetch(`/api/adventures/${data.adventure.slug}/media/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: uploaded.map(u => ({
            filePath: u.filePath,
            mediaType: u.mediaType
          }))
        })
      });

      if (batchRes.ok) {
        const { media: newMedia } = await batchRes.json();
        data.adventure.media = [...(data.adventure.media || []), ...newMedia];
        autoAnalyzeNewMedia(newMedia);
      }
    }

    if (failedFiles.length > 0 && uploaded.length > 0) {
      uploadProgress = `${uploaded.length} uploaded, ${failedFiles.length} failed`;
    } else if (failedFiles.length > 0) {
      uploadProgress = `All ${failedFiles.length} file${failedFiles.length > 1 ? 's' : ''} failed`;
    } else {
      uploadProgress = `${uploaded.length} file${uploaded.length > 1 ? 's' : ''} uploaded!`;
      setTimeout(() => { uploadProgress = ''; }, 2000);
    }
    uploadingMedia = false;
    input.value = '';
  }

  async function retryFailedUploads() {
    if (failedFiles.length === 0) return;
    const retryList = [...failedFiles];
    failedFiles = [];
    uploadErrors = [];
    uploadingMedia = true;
    uploadProgress = `Retrying ${retryList.length} file${retryList.length > 1 ? 's' : ''}...`;
    uploadFileProgress = {};

    const uploaded = await uploadWithConcurrency(retryList, 3);

    if (uploaded.length > 0) {
      const batchRes = await fetch(`/api/adventures/${data.adventure.slug}/media/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: uploaded.map(u => ({ filePath: u.filePath, mediaType: u.mediaType })) })
      });
      if (batchRes.ok) {
        const { media: newMedia } = await batchRes.json();
        data.adventure.media = [...(data.adventure.media || []), ...newMedia];
      }
    }

    uploadProgress = failedFiles.length > 0
      ? `${uploaded.length} recovered, ${failedFiles.length} still failed`
      : `${uploaded.length} file${uploaded.length > 1 ? 's' : ''} recovered!`;
    if (failedFiles.length === 0) setTimeout(() => { uploadProgress = ''; }, 2000);
    uploadingMedia = false;
  }

  // People tagging
  async function openTagging(mediaId: string) {
    taggingMediaId = mediaId;
    taggingLoading = true;
    tagSearchQuery = '';
    tagSearchResults = [];
    showNewPersonInput = false;
    newPersonName = '';
    // Shallow history entry so the browser back button closes the modal
    pushState('', { tagging: true });
    try {
      const res = await fetch(`/api/media/${mediaId}/people`);
      if (res.ok) {
        const result = await res.json();
        taggingPeople = result.people || [];
      }
    } catch {}
    taggingLoading = false;
  }

  function closeTagging() {
    if (!taggingMediaId) return;
    taggingMediaId = null;
    taggingPeople = [];
    if (page.state.tagging) history.back();
  }

  // Back button pressed while the tagging modal is open -> close it instead of leaving
  $effect(() => {
    if (taggingMediaId && !page.state.tagging) {
      taggingMediaId = null;
      taggingPeople = [];
    }
  });

  async function searchPeople(query: string) {
    tagSearchQuery = query;
    if (!query.trim()) { tagSearchResults = []; return; }
    tagSearching = true;
    try {
      const res = await fetch('/api/people');
      if (res.ok) {
        const { people } = await res.json();
        const q = query.toLowerCase();
        tagSearchResults = people.filter((p: any) =>
          p.name.toLowerCase().includes(q) && !taggingPeople.some((tp: any) => tp.person_id === p.id)
        );
      }
    } catch {}
    tagSearching = false;
  }

  async function tagPerson(personId?: string, personName?: string) {
    if (!taggingMediaId) return;
    try {
      const res = await fetch(`/api/media/${taggingMediaId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId, personName })
      });
      if (res.ok) {
        const { tag } = await res.json();
        taggingPeople = [...taggingPeople, {
          person_id: tag.person.id,
          person_name: tag.person.name,
          person_slug: tag.person.slug,
          person_avatar: tag.person.avatar_file_path
        }];
        tagSearchQuery = '';
        tagSearchResults = [];
        showNewPersonInput = false;
        newPersonName = '';
      }
    } catch {}
  }

  async function untagPerson(personId: string) {
    if (!taggingMediaId) return;
    try {
      await fetch(`/api/media/${taggingMediaId}/people`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId })
      });
      taggingPeople = taggingPeople.filter((p: any) => p.person_id !== personId);
    } catch {}
  }

  // AI image analysis
  async function analyzeMedia(mediaId: string, filePath: string): Promise<boolean> {
    aiAnalyzing = { ...aiAnalyzing, [mediaId]: true };
    let ok = false;
    try {
      const res = await fetch('/api/ai/analyze-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, filePath })
      });
      if (res.ok) {
        const { analysis } = await res.json();
        if (analysis) {
          const withAnalysis = (m: any) =>
            m.id === mediaId ? { ...m, ai_caption: analysis.caption, category: analysis.category, ai_tags: JSON.stringify(analysis.tags) } : m;
          data.adventure.media = data.adventure.media.map(withAnalysis);
          // Sub-adventure media lives in separate arrays
          for (const sq of subAdventures) {
            if (sq.media?.length) sq.media = sq.media.map(withAnalysis);
          }
          ok = true;
        }
      } else {
        const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        aiError = error;
      }
    } catch {
      aiError = 'Could not reach the AI analyzer';
    }
    aiAnalyzing = { ...aiAnalyzing, [mediaId]: false };
    return ok;
  }

  async function analyzeAllMedia() {
    if (!data.adventure.media) return;
    aiError = '';
    aiGeneratingCaptions = true;
    // Videos can't be sent to the vision model — photos only
    const pending = data.adventure.media.filter((m: any) => m.media_type !== 'video' && m.file_path && !m.ai_caption);
    let okCount = 0;
    for (const media of pending) {
      const ok = await analyzeMedia(media.id, media.file_path);
      if (ok) okCount++;
      else break;
    }
    if (pending.length === 0 && okCount === 0) {
      aiError = 'Nothing to analyze — every photo already has an AI caption';
    } else if (okCount > 0 && okCount < pending.length) {
      aiError = `Analyzed ${okCount} of ${pending.length} photos before stopping`;
    }
    aiGeneratingCaptions = false;
  }

  // Auto-analyze photos right after upload so they get tagged without manual clicks
  function autoAnalyzeNewMedia(newMedia: any[]) {
    if (!aiEnabled) return;
    for (const m of newMedia) {
      if (m.media_type !== 'video' && m.file_path && !m.ai_caption) {
        analyzeMedia(m.id, m.file_path);
      }
    }
  }

  async function handleSQMediaUpload(sqId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const total = fileList.length;
    sqUploading = { ...sqUploading, [sqId]: true };
    sqUploadErrors = { ...sqUploadErrors, [sqId]: [] };
    sqUploadProgress = { ...sqUploadProgress, [sqId]: `Uploading 1 of ${total}...` };

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      sqUploadProgress = { ...sqUploadProgress, [sqId]: `Uploading ${i + 1} of ${total}...` };
      const formData = new FormData();
      formData.append('files', fileList[i]);

      try {
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) { errorCount++; continue; }
        const { files: results } = await uploadRes.json();
        const result = results[0];
        if (result.error) {
          sqUploadErrors = { ...sqUploadErrors, [sqId]: [...(sqUploadErrors[sqId] || []), `${fileList[i].name}: ${result.error}`] };
          errorCount++;
          continue;
        }

        const mediaRes = await fetch(`/api/sub-adventures/${sqId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: result.filePath })
        });
        if (mediaRes.ok) {
          const newMedia = await mediaRes.json();
          const sq = subAdventures.find((s: any) => s.id === sqId);
          if (sq) sq.media = [...(sq.media || []), newMedia];
          autoAnalyzeNewMedia([newMedia]);
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    if (errorCount > 0 && successCount > 0) {
      sqUploadProgress = { ...sqUploadProgress, [sqId]: `${successCount} uploaded, ${errorCount} failed` };
    } else if (errorCount > 0) {
      sqUploadProgress = { ...sqUploadProgress, [sqId]: `Failed` };
    } else {
      sqUploadProgress = { ...sqUploadProgress, [sqId]: `${successCount} uploaded!` };
      setTimeout(() => { sqUploadProgress = { ...sqUploadProgress, [sqId]: '' }; }, 2000);
    }
    sqUploading = { ...sqUploading, [sqId]: false };
    input.value = '';
  }
</script>

<svelte:head>
  <title>{data.adventure.title} | Family Adventures</title>
  <meta name="description" content={data.adventure.description || data.adventure.title} />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content={data.adventure.title} />
  <meta property="og:description" content={data.adventure.description || data.adventure.title} />
  <meta property="og:site_name" content="Family Adventures" />
  {#if data.adventure.cover_file_path}
    <meta property="og:image" content="{data.siteUrl}{data.adventure.cover_file_path}" />
  {:else}
    <meta property="og:image" content="{data.siteUrl}{data.site?.ogImageUrl || '/og-image.png'}" />
  {/if}
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  {#if data.adventure.location_name}
    <meta property="og:latitude" content={data.adventure.lat} />
    <meta property="og:longitude" content={data.adventure.lng} />
  {/if}
  {#if data.adventure.start_date}
    <meta property="article:published_time" content={data.adventure.start_date} />
  {/if}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.adventure.title} />
  <meta name="twitter:description" content={data.adventure.description || data.adventure.title} />
  {#if data.adventure.cover_file_path}
    <meta name="twitter:image" content="{data.siteUrl}{data.adventure.cover_file_path}" />
  {:else}
    <meta name="twitter:image" content="{data.siteUrl}{data.site?.ogImageUrl || '/og-image.png'}" />
  {/if}
</svelte:head>

<article>
  <div class="max-w-4xl mx-auto">
    <!-- Back button -->
    <a href="/adventures" class="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-600 dark:text-cream-300 dark:hover:text-cream-100 mb-6 transition-colors">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Adventures
    </a>

    {#if aiError}
      <div class="mb-6 p-4 rounded-xl bg-gold-50 dark:bg-gold-900/30 border border-gold-200 dark:border-gold-800 text-gold-700 dark:text-gold-300 text-sm">
        {aiError}
        <button class="ml-2 underline" onclick={() => aiError = ''}>Dismiss</button>
      </div>
    {/if}
  </div>

  <!-- Hero -->
  <div class="relative overflow-hidden mb-8 -mx-4 sm:-mx-6 lg:-mx-8">
    {#if data.adventure.cover_file_path}
      <img
        src={data.adventure.cover_file_path}
        alt={data.adventure.title}
        class="w-full h-64 md:h-96 object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
    {:else}
      <div class="w-full h-64 md:h-96 bg-gradient-to-br from-forest-400 to-forest-600"></div>
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
          <div class="h-5 w-5 rounded-full bg-gradient-to-br from-terra-400 to-gold-400 flex items-center justify-center text-white text-xs font-medium">
            {data.adventure.author_name.charAt(0).toUpperCase()}
          </div>
          {data.adventure.author_name}
        </span>
      </div>
    </div>
  </div>

  <!-- Description -->
  <div class="max-w-4xl mx-auto">
    {#if data.adventure.description}
      <div class="card rounded-xl p-6 mb-4 border-t-4 border-terra-400">
        <p class="text-lg text-ink-500 dark:text-cream-200 leading-relaxed">{data.adventure.description}</p>
      </div>
    {/if}

    <!-- Content -->
    {#if data.adventure.content}
      <div class="bg-cream-50 dark:bg-ink-800 rounded-xl p-6 mb-4">
        <div class="prose prose-lg max-w-none">
          {@html data.adventure.content}
        </div>
      </div>
    {/if}
  </div>

  <!-- Wave: Story -> Gallery -->
  <div class="wave-divider my-2">
    <svg viewBox="0 0 1200 48" preserveAspectRatio="none" fill="none">
      <path d="M0 24 C200 48 400 0 600 24 C800 48 1000 0 1200 24 L1200 48 L0 48Z" fill="rgba(34,97,69,0.12)" />
      <path d="M0 32 C300 48 500 12 700 32 C900 48 1100 12 1200 32 L1200 48 L0 48Z" fill="rgba(34,97,69,0.08)" />
    </svg>
  </div>

  <!-- Media Gallery -->
  {#if data.adventure.media && data.adventure.media.length > 0}
    <div class="bg-forest-50 dark:bg-forest-900/30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 mb-4">
      <div class="max-w-6xl mx-auto">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div class="flex items-center gap-3">
          <span class="text-2xl">📸</span>
          <div>
            <h2 class="text-lg font-semibold text-ink-600 dark:text-cream-100">Photos & Videos</h2>
            <p class="text-xs text-ink-400 dark:text-cream-300">Moments captured along the way</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          {#if aiEnabled && data.user && data.user.id === data.adventure.author_id}
            <button
              onclick={analyzeAllMedia}
              disabled={aiGeneratingCaptions}
              class="btn-accent inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium disabled:opacity-50 transition-all"
            >
              {#if aiGeneratingCaptions}
                <div class="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                Analyzing...
              {:else}
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Analyze All
              {/if}
            </button>
          {/if}
          {#if data.user && data.user.id === data.adventure.author_id}
            <p class="text-xs text-ink-400 dark:text-cream-300">Hover photos for controls</p>
          {/if}
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#each data.adventure.media as media}
          <div class="relative aspect-square rounded-xl overflow-hidden group">
            {#if media.media_type === 'video'}
              <VideoThumbnail src={media.file_path} alt={media.caption || 'Video'} class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            {:else}
              <img
                src={`/api/media/image?path=${encodeURIComponent(media.file_path)}&w=720`}
                alt={media.caption || 'Adventure photo'}
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            {/if}
            {#if media.caption || media.ai_caption}
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p class="absolute bottom-3 left-3 right-3 text-white text-sm">{media.caption || media.ai_caption}</p>
                {#if media.ai_tags}
                  {@const tags = JSON.parse(media.ai_tags)}
                  {#if tags.length > 0}
                    <div class="absolute bottom-9 left-3 right-3 flex flex-wrap gap-1">
                      {#each tags.slice(0, 3) as tag}
                        <span class="px-1.5 py-0.5 text-[9px] rounded-full bg-white/20 text-white/70">{tag}</span>
                      {/each}
                    </div>
                  {/if}
                {/if}
              </div>
            {/if}
            {#if media.category}
              <div class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/40 text-white text-[10px] font-medium backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity capitalize">
                {media.category}
              </div>
            {/if}
            {#if data.user && data.user.id === data.adventure.author_id}
              <div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  class="p-1.5 rounded-full backdrop-blur-sm transition-all bg-black/30 text-white/60 hover:bg-forest-500/80 hover:text-white"
                  onclick={() => openTagging(media.id)}
                  title="Tag people"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {#if !media.ai_caption && media.file_path && !aiAnalyzing[media.id]}
                  <button
                    class="p-1.5 rounded-full bg-black/30 text-white/60 backdrop-blur-sm hover:bg-forest-500/80 hover:text-white transition-all"
                    onclick={() => analyzeMedia(media.id, media.file_path)}
                    title="AI analyze this photo"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </button>
                {:else if aiAnalyzing[media.id]}
                  <div class="h-7 w-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                    <div class="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                {/if}
                <button
                  class="p-1.5 rounded-full backdrop-blur-sm transition-all {media.hero_image ? 'bg-gold-400/90 text-white shadow-md' : 'bg-black/30 text-white/60 hover:bg-gold-400/80 hover:text-white'}"
                  onclick={() => toggleHeroImage(media.id, !!media.hero_image)}
                  title={media.hero_image ? 'Remove from homepage hero' : 'Feature on homepage hero'}
                >
                  <svg class="h-3.5 w-3.5" fill={media.hero_image ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
      {#if data.user}
        <div
          class="mt-4 rounded-xl border-2 border-dashed border-cream-300 dark:border-ink-600 p-4 text-center hover:border-forest-300 transition-colors {uploadingMedia ? 'pointer-events-none opacity-60' : ''}"
          role="region"
          ondragover={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-forest-400', 'bg-forest-50/50'); }}
          ondragleave={(e) => { e.currentTarget.classList.remove('border-forest-400', 'bg-forest-50/50'); }}
          ondrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-forest-400', 'bg-forest-50/50');
            const dt = e.dataTransfer;
            if (dt?.files?.length) {
              const input = document.getElementById('adventure-media-upload') as HTMLInputElement;
              if (input) { input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); }
            }
          }}
        >
          <input type="file" id="adventure-media-upload" accept="image/*,video/*" multiple class="hidden"
            onchange={handleAdventureMediaUpload} disabled={uploadingMedia} />
          <label for="adventure-media-upload" class="cursor-pointer">
            {#if uploadingMedia}
              <div class="flex items-center justify-center gap-2">
                <div class="h-4 w-4 border-2 border-forest-300 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-sm text-forest-600">{uploadProgress}</p>
              </div>
              {#if Object.keys(uploadFileProgress).length > 0}
                <div class="mt-3 space-y-1 max-h-32 overflow-y-auto">
                  {#each Object.entries(uploadFileProgress) as [key, info]}
                    <div class="flex items-center gap-2 text-xs">
                      {#if info.status === 'done'}
                        <svg class="h-3 w-3 text-forest-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                      {:else if info.status === 'error'}
                        <svg class="h-3 w-3 text-terra-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      {:else}
                        <div class="h-3 w-3 rounded-full border-2 border-forest-300 border-t-transparent animate-spin flex-shrink-0"></div>
                      {/if}
                      <span class="text-ink-500 truncate">{key.split('-').slice(0, -1).join('-')}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            {:else}
              <div class="flex items-center justify-center gap-2 text-ink-400 dark:text-cream-300 hover:text-forest-500 transition-colors">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <p class="text-sm font-medium">Add photos to this adventure</p>
              </div>
            {/if}
          </label>
          {#if uploadProgress && !uploadingMedia}
            <p class="text-xs text-forest-500 mt-1">{uploadProgress}</p>
          {/if}
          {#if uploadErrors.length > 0}
            <div class="text-xs text-terra-400 mt-1 space-y-0.5">
              {#each uploadErrors as err}<p>{err}</p>{/each}
            </div>
          {/if}
          {#if failedFiles.length > 0 && !uploadingMedia}
            <button class="btn-secondary text-xs mt-2" onclick={retryFailedUploads}>
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Retry {failedFiles.length} failed file{failedFiles.length > 1 ? 's' : ''}
            </button>
          {/if}
        </div>
      {/if}
      </div>
    </div>
  {/if}

  <!-- Wave: Gallery -> Side Quests -->
  <div class="wave-divider my-2">
    <svg viewBox="0 0 1200 48" preserveAspectRatio="none" fill="none">
      <path d="M0 16 C150 48 350 0 500 20 C650 40 850 4 1050 24 C1150 34 1180 20 1200 16 L1200 48 L0 48Z" fill="rgba(217,149,74,0.1)" />
      <path d="M0 28 C200 44 400 8 600 28 C800 44 1000 8 1200 28 L1200 48 L0 48Z" fill="rgba(217,149,74,0.07)" />
    </svg>
  </div>

  <!-- Side Quests -->
  <div class="bg-gold-50 dark:bg-gold-900/30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 mb-4">
      <div class="max-w-6xl mx-auto">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🗺️</span>
          <div>
            <h2 class="text-lg font-semibold text-ink-600 dark:text-cream-100">Side Quests</h2>
            <p class="text-xs text-ink-400 dark:text-cream-300">Detours, stops, and little adventures along the way</p>
          </div>
        </div>
        {#if subAdventures.length > 0}
          <div class="flex rounded-lg border border-cream-200 dark:border-ink-600 overflow-hidden text-xs">
            <button
              class="px-3 py-1.5 font-medium transition-colors {sideQuestView === 'timeline' ? 'bg-forest-500 text-white' : 'bg-white text-ink-500 hover:bg-cream-50 dark:bg-ink-700 dark:text-cream-200'}"
              onclick={() => sideQuestView = 'timeline'}
            >
              Timeline
            </button>
            <button
              class="px-3 py-1.5 font-medium transition-colors {sideQuestView === 'cards' ? 'bg-forest-500 text-white' : 'bg-white text-ink-500 hover:bg-cream-50 dark:bg-ink-700 dark:text-cream-200'}"
              onclick={() => sideQuestView = 'cards'}
            >
              Cards
            </button>
          </div>
        {/if}
      </div>
      {#if data.user}
        <button
          onclick={() => { if (editingSQId) cancelEditSQ(); showSideQuestForm = !showSideQuestForm; }}
          class="text-sm text-forest-500 hover:text-forest-600 font-medium"
        >
          {(showSideQuestForm || editingSQId) ? 'Cancel' : '+ Add Side Quest'}
        </button>
      {/if}

    {#if showSideQuestForm || editingSQId}
      <form class="card rounded-xl p-5 mb-6 space-y-4" onsubmit={(e) => { e.preventDefault(); submitSideQuest(); }}>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-ink-600 dark:text-cream-100">{editingSQId ? 'Edit Side Quest' : 'New Side Quest'}</h3>
          {#if editingSQId}
            <button type="button" class="text-xs text-ink-400 hover:text-ink-600 dark:text-cream-300 dark:hover:text-cream-100" onclick={cancelEditSQ}>Cancel</button>
          {/if}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="sqTitle" class="block text-sm font-medium text-ink-600 dark:text-cream-100 mb-1">Title</label>
            <input id="sqTitle" type="text" bind:value={sqTitle} placeholder="e.g. Aquarium Visit" required
              class="input w-full px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label for="sqDay" class="block text-sm font-medium text-ink-600 dark:text-cream-100 mb-1">Day (optional)</label>
            <input id="sqDay" type="number" min="1" bind:value={sqDay} placeholder="e.g. 2"
              class="input w-full px-4 py-2.5 text-sm" />
          </div>
        </div>
        <div>
          <label for="sqNote" class="block text-sm font-medium text-ink-600 dark:text-cream-100 mb-1">Note (optional)</label>
          <textarea id="sqNote" bind:value={sqNote} placeholder="A short note about this side quest..." rows="2"
            class="input w-full px-4 py-2.5 text-sm resize-none"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-600 dark:text-cream-100 mb-1">Rating (optional)</label>
          <div class="flex gap-1">
            {#each Array(5) as _, i}
              <button type="button" class="text-xl transition-transform hover:scale-110"
                onclick={() => sqRating = sqRating === i + 1 ? 0 : i + 1}
                onmouseenter={() => sqHoverRating = i + 1}
                onmouseleave={() => sqHoverRating = 0}>
                {(sqHoverRating || sqRating) > i ? '🔥' : '⚪'}
              </button>
            {/each}
            {#if sqRating > 0}
              <span class="ml-2 text-sm text-ink-400 dark:text-cream-300 self-center">{sqRating}/5</span>
            {/if}
          </div>
        </div>
        <button type="submit" disabled={submittingSQ || !sqTitle.trim()}
          class="btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50 transition-colors">
          {submittingSQ ? 'Saving...' : editingSQId ? 'Save Changes' : 'Add Side Quest'}
        </button>
      </form>
    {/if}

    {#if subAdventures.length === 0}
      <div class="card rounded-xl p-8 text-center">
        <div class="text-3xl mb-3">🗺️</div>
        <p class="text-ink-400 dark:text-cream-300 text-sm">No side quests yet. Add stops, activities, and little detours from this trip!</p>
      </div>
    {:else if sideQuestView === 'timeline'}
      <!-- Timeline View -->
      <div class="relative">
        <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-cream-200 dark:bg-ink-600"></div>
        {#each Object.entries(subAdventuresByDay.grouped).sort(([a], [b]) => Number(a) - Number(b)) as [day, items]}
          <div class="relative pl-10 pb-6">
            <div class="absolute left-2.5 top-1 h-4 w-4 rounded-full bg-forest-500 border-2 border-white shadow-sm flex items-center justify-center">
              <span class="text-[8px] text-white font-bold">{day}</span>
            </div>
            <p class="text-xs font-semibold text-forest-600 dark:text-forest-300 uppercase tracking-wider mb-3">Day {day}</p>
            <div class="space-y-3">
              {#each items as sq (sq.id)}
                <div class="card rounded-xl overflow-hidden group hover:shadow-md transition-shadow">
                  <!-- Main row: thumbnail + content -->
                  <div class="flex">
                    <!-- Thumbnail -->
                    <div class="relative w-28 h-28 sm:w-36 sm:h-32 shrink-0 overflow-hidden">
                      {#if sq.media && sq.media.length > 0}
                        {@const src = sqImageUrl(sq.media[0])}
                        {#if src}
                          <img {src} alt={sq.media[0].caption || sq.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        {:else}
                          <div class="w-full h-full bg-gradient-to-br from-cream-100 to-cream-200 dark:from-ink-600 dark:to-ink-700 flex items-center justify-center text-2xl">🗺️</div>
                        {/if}
                      {:else}
                        <div class="w-full h-full bg-gradient-to-br from-cream-100 to-cream-200 dark:from-ink-600 dark:to-ink-700 flex items-center justify-center text-2xl">🗺️</div>
                      {/if}
                      {#if data.user}
                        <input type="file" id="sq-upload-{sq.id}" accept="image/*,video/*" multiple class="hidden"
                          onchange={(e) => handleSQMediaUpload(sq.id, e)} disabled={sqUploading[sq.id]} />
                        <label for="sq-upload-{sq.id}"
                          class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          {#if sqUploading[sq.id]}
                            <div class="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {:else}
                            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                          {/if}
                        </label>
                      {/if}
                    </div>
                    <!-- Content -->
                    <div class="flex-1 min-w-0 p-3 sm:p-4">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-1">
                            <h3 class="font-semibold text-ink-600 dark:text-cream-100 text-sm truncate">{sq.title}</h3>
                            {#if sq.rating}
                              <span class="text-xs shrink-0">{Array(sq.rating).fill('🔥').join('')}</span>
                            {/if}
                          </div>
                          {#if sq.note}
                            <p class="text-xs text-ink-400 dark:text-cream-300 leading-relaxed line-clamp-2">{sq.note}</p>
                          {/if}
                        </div>
                        {#if data.user}
                          {#if deletingSQId === sq.id}
                            <div class="flex items-center gap-1.5 shrink-0">
                              <button type="button" class="text-xs text-terra-500 hover:text-terra-700 font-medium" onclick={() => confirmDeleteSQ(sq.id)}>Yes</button>
                              <button type="button" class="text-xs text-ink-400 hover:text-ink-600 dark:text-cream-300 dark:hover:text-cream-100 font-medium" onclick={() => deletingSQId = null}>No</button>
                            </div>
                          {:else}
                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                              <button type="button" class="p-1 rounded-lg text-ink-300 dark:text-cream-400 hover:text-forest-500 hover:bg-forest-50 transition-colors" onclick={() => startEditSQ(sq)} title="Edit">
                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button type="button" class="p-1 rounded-lg text-ink-300 dark:text-cream-400 hover:text-terra-500 hover:bg-terra-50 transition-colors" onclick={() => deleteSideQuest(sq.id)} title="Remove">
                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          {/if}
                        {/if}
                      </div>
                    </div>
                  </div>
                  <!-- Extra thumbnails row -->
                  {#if sq.media && sq.media.length > 1}
                    <div class="flex gap-1.5 px-3 pb-3 overflow-x-auto">
                      {#each sq.media.slice(1) as m}
                        {@const src = sqImageUrl(m)}
                        {#if src}
                          <img {src} alt={m.caption || sq.title} class="h-14 w-14 rounded-lg object-cover shrink-0" loading="lazy" />
                        {/if}
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}

        {#if subAdventuresByDay.undated.length > 0}
          <div class="relative pl-10 pb-6">
            <div class="absolute left-2.5 top-1 h-4 w-4 rounded-full bg-cream-400 border-2 border-white shadow-sm"></div>
            <p class="text-xs font-semibold text-ink-400 dark:text-cream-300 uppercase tracking-wider mb-3">Other Stops</p>
            <div class="space-y-3">
              {#each subAdventuresByDay.undated as sq (sq.id)}
                <div class="card rounded-xl overflow-hidden group hover:shadow-md transition-shadow">
                  <div class="flex">
                    <div class="relative w-28 h-28 sm:w-36 sm:h-32 shrink-0 overflow-hidden">
                      {#if sq.media && sq.media.length > 0}
                        {@const src = sqImageUrl(sq.media[0])}
                        {#if src}
                          <img {src} alt={sq.media[0].caption || sq.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        {:else}
                          <div class="w-full h-full bg-gradient-to-br from-cream-100 to-cream-200 dark:from-ink-600 dark:to-ink-700 flex items-center justify-center text-2xl">🗺️</div>
                        {/if}
                      {:else}
                        <div class="w-full h-full bg-gradient-to-br from-cream-100 to-cream-200 dark:from-ink-600 dark:to-ink-700 flex items-center justify-center text-2xl">🗺️</div>
                      {/if}
                      {#if data.user}
                        <input type="file" id="sq-upload-{sq.id}" accept="image/*,video/*" multiple class="hidden"
                          onchange={(e) => handleSQMediaUpload(sq.id, e)} disabled={sqUploading[sq.id]} />
                        <label for="sq-upload-{sq.id}"
                          class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          {#if sqUploading[sq.id]}
                            <div class="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {:else}
                            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                          {/if}
                        </label>
                      {/if}
                    </div>
                    <div class="flex-1 min-w-0 p-3 sm:p-4">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-1">
                            <h3 class="font-semibold text-ink-600 dark:text-cream-100 text-sm truncate">{sq.title}</h3>
                            {#if sq.rating}
                              <span class="text-xs shrink-0">{Array(sq.rating).fill('🔥').join('')}</span>
                            {/if}
                          </div>
                          {#if sq.note}
                            <p class="text-xs text-ink-400 dark:text-cream-300 leading-relaxed line-clamp-2">{sq.note}</p>
                          {/if}
                        </div>
                        {#if data.user}
                          {#if deletingSQId === sq.id}
                            <div class="flex items-center gap-1.5 shrink-0">
                              <button type="button" class="text-xs text-terra-500 hover:text-terra-700 font-medium" onclick={() => confirmDeleteSQ(sq.id)}>Yes</button>
                              <button type="button" class="text-xs text-ink-400 hover:text-ink-600 dark:text-cream-300 dark:hover:text-cream-100 font-medium" onclick={() => deletingSQId = null}>No</button>
                            </div>
                          {:else}
                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                              <button type="button" class="p-1 rounded-lg text-ink-300 dark:text-cream-400 hover:text-forest-500 hover:bg-forest-50 transition-colors" onclick={() => startEditSQ(sq)} title="Edit">
                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button type="button" class="p-1 rounded-lg text-ink-300 dark:text-cream-400 hover:text-terra-500 hover:bg-terra-50 transition-colors" onclick={() => deleteSideQuest(sq.id)} title="Remove">
                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          {/if}
                        {/if}
                      </div>
                    </div>
                  </div>
                  {#if sq.media && sq.media.length > 1}
                    <div class="flex gap-1.5 px-3 pb-3 overflow-x-auto">
                      {#each sq.media.slice(1) as m}
                        {@const src = sqImageUrl(m)}
                        {#if src}
                          <img {src} alt={m.caption || sq.title} class="h-14 w-14 rounded-lg object-cover shrink-0" loading="lazy" />
                        {/if}
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Cards View -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each subAdventures as sq (sq.id)}
          <div class="card rounded-xl overflow-hidden group hover:shadow-md transition-shadow">
            {#if sq.media && sq.media.length > 0}
              {@const src = sqImageUrl(sq.media[0])}
              {#if src}
                <div class="relative aspect-video overflow-hidden">
                  <img {src} alt={sq.media[0].caption || sq.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  {#if data.user}
                    <input type="file" id="sq-card-upload-{sq.id}" accept="image/*,video/*" multiple class="hidden"
                      onchange={(e) => handleSQMediaUpload(sq.id, e)} disabled={sqUploading[sq.id]} />
                    <label for="sq-card-upload-{sq.id}"
                      class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      {#if sqUploading[sq.id]}
                        <div class="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {:else}
                        <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                      {/if}
                    </label>
                  {/if}
                </div>
              {/if}
            {:else}
              <div class="relative aspect-video bg-gradient-to-br from-cream-100 to-cream-200 dark:from-ink-600 dark:to-ink-700 flex items-center justify-center">
                {#if data.user}
                  <input type="file" id="sq-card-upload-{sq.id}" accept="image/*,video/*" multiple class="hidden"
                    onchange={(e) => handleSQMediaUpload(sq.id, e)} disabled={sqUploading[sq.id]} />
                  <label for="sq-card-upload-{sq.id}" class="cursor-pointer flex flex-col items-center gap-1 text-forest-400 hover:text-forest-500 transition-colors">
                    {#if sqUploading[sq.id]}
                      <div class="h-5 w-5 border-2 border-forest-300 border-t-transparent rounded-full animate-spin"></div>
                      <span class="text-xs">{sqUploadProgress[sq.id]}</span>
                    {:else}
                      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span class="text-xs font-medium">Add photos</span>
                    {/if}
                  </label>
                {:else}
                  <span class="text-3xl">🗺️</span>
                {/if}
              </div>
            {/if}
            <div class="p-4">
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-semibold text-ink-600 dark:text-cream-100 text-sm">{sq.title}</h3>
                    {#if sq.rating}
                      <span class="text-xs">{Array(sq.rating).fill('🔥').join('')}</span>
                    {/if}
                  </div>
                  {#if sq.day_number}
                    <span class="inline-block text-[10px] font-medium text-forest-600 bg-forest-50 dark:text-forest-300 dark:bg-forest-900 rounded-full px-2 py-0.5 mb-1">Day {sq.day_number}</span>
                  {/if}
                  {#if sq.note}
                    <p class="text-xs text-ink-400 dark:text-cream-300 leading-relaxed line-clamp-2">{sq.note}</p>
                  {/if}
                </div>
                {#if data.user}
                  {#if deletingSQId === sq.id}
                    <div class="flex items-center gap-1.5 shrink-0">
                      <button type="button" class="text-xs text-terra-500 hover:text-terra-700 font-medium" onclick={() => confirmDeleteSQ(sq.id)}>Yes</button>
                      <button type="button" class="text-xs text-ink-400 hover:text-ink-600 dark:text-cream-300 dark:hover:text-cream-100 font-medium" onclick={() => deletingSQId = null}>No</button>
                    </div>
                  {:else}
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button type="button" class="p-1 rounded-lg text-ink-300 dark:text-cream-400 hover:text-forest-500 hover:bg-forest-50 transition-colors" onclick={() => startEditSQ(sq)} title="Edit">
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button type="button" class="p-1 rounded-lg text-ink-300 dark:text-cream-400 hover:text-terra-500 hover:bg-terra-50 transition-colors" onclick={() => deleteSideQuest(sq.id)} title="Remove">
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  {/if}
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
      </div>
  </div>

  <!-- Wave: Side Quests -> Social -->
  <div class="wave-divider my-2">
    <svg viewBox="0 0 1200 48" preserveAspectRatio="none" fill="none">
      <path d="M0 20 C180 44 380 4 580 24 C780 44 980 4 1200 20 L1200 48 L0 48Z" fill="rgba(192,73,81,0.1)" />
      <path d="M0 30 C250 48 450 8 650 28 C850 44 1050 12 1200 30 L1200 48 L0 48Z" fill="rgba(204,102,112,0.07)" />
    </svg>
  </div>

  <div class="max-w-4xl mx-auto">
  <!-- Reactions -->
  <div class="bg-terra-50 dark:bg-terra-900/30 rounded-xl p-6 mb-4">
    <div class="flex items-center gap-3 mb-4">
      <span class="text-2xl">❤️</span>
      <div>
        <h2 class="text-lg font-semibold text-ink-600 dark:text-cream-100">Reactions</h2>
        <p class="text-xs text-ink-400 dark:text-cream-300">Show how this adventure made you feel</p>
      </div>
    </div>
    
    <div class="flex flex-wrap gap-2 mb-4">
      {#each reactionEmojis as emoji}
        <button
          class="px-4 py-2 rounded-lg border border-cream-200 dark:border-ink-600 hover:border-forest-300 hover:bg-forest-50 dark:hover:bg-forest-900/30 transition-colors text-lg"
          onclick={() => addReaction(emoji)}
        >
          {emoji}
          {#if data.reactions.filter(r => r.emoji === emoji).length > 0}
            <span class="ml-1 text-sm text-ink-400 dark:text-cream-300">
              {data.reactions.filter(r => r.emoji === emoji).length}
            </span>
          {/if}
        </button>
      {/each}
    </div>

    {#if data.user}
      <div class="flex items-center gap-2">
        <button class="inline-flex items-center gap-2 text-sm text-forest-500 hover:text-forest-600 transition-colors">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Add Reaction
        </button>
      </div>
    {/if}
  </div>

  <!-- Comments -->
  <div class="bg-cream-50 dark:bg-ink-800 rounded-xl p-6 mb-4">
    <div class="flex items-center gap-3 mb-6">
      <span class="text-2xl">💬</span>
      <div>
        <h2 class="text-lg font-semibold text-ink-600 dark:text-cream-100">Comments</h2>
        <p class="text-xs text-ink-400 dark:text-cream-300">Share your thoughts and memories</p>
      </div>
    </div>

    {#if data.user}
      <form class="mb-6" onsubmit={(e) => { e.preventDefault(); submitComment(); }}>
        <textarea
          bind:value={newComment}
          placeholder="Share your thoughts..."
          class="input w-full p-4 resize-none"
          rows="3"
        ></textarea>
        <div class="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!newComment.trim() || submittingComment}
            class="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submittingComment ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    {:else}
      <p class="text-sm text-ink-400 dark:text-cream-300 mb-6">
        <a href="/auth/login" class="text-forest-500 hover:text-forest-600">Sign in</a> to leave a comment.
      </p>
    {/if}

    <!-- Comments list -->
    {#if data.comments.length === 0}
      <p class="text-center text-ink-400 dark:text-cream-300 py-8">No comments yet. Be the first to share!</p>
    {:else}
      <div class="space-y-4">
        {#each data.comments as comment}
          <div class="border-l-2 border-cream-200 dark:border-ink-600 pl-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="h-6 w-6 rounded-full bg-gradient-to-br from-forest-400 to-forest-500 flex items-center justify-center text-white text-xs font-medium">
                {comment.author?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <span class="text-sm font-medium text-ink-600 dark:text-cream-100">{comment.author?.name || 'Unknown'}</span>
              <span class="text-xs text-ink-400 dark:text-cream-300">{timeAgo(comment.created_at)}</span>
            </div>
            <p class="text-ink-500 dark:text-cream-200 text-sm">{comment.content}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Marshmallow Rating -->
  <div class="bg-white dark:bg-ink-800 rounded-xl p-6 mb-4 border-t-4 border-gold-400">
    <div class="flex items-center gap-3 mb-3">
      <span class="text-2xl">🔥</span>
      <div>
        <h2 class="text-lg font-semibold text-ink-600 dark:text-cream-100">Rating</h2>
        <p class="text-xs text-ink-400 dark:text-cream-300">How fire was this adventure?</p>
      </div>
    </div>
    {#if data.ratings.length > 0}
      <div class="flex items-center gap-3 mb-4">
        <span class="text-3xl">{data.avgRating >= 1 ? '🔥' : '🏕️'}</span>
        <div>
          <p class="text-2xl font-bold text-ink-600 dark:text-cream-100">{data.avgRating}</p>
          <p class="text-xs text-ink-400 dark:text-cream-300">{data.ratings.length} rating{data.ratings.length > 1 ? 's' : ''}</p>
        </div>
        <div class="flex gap-0.5 ml-2">
          {#each Array(5) as _, i}
            <span class="text-lg">{i < Math.round(data.avgRating) ? '🔥' : '⚪'}</span>
          {/each}
        </div>
      </div>
    {/if}
    {#if data.user}
      <div>
        <p class="text-sm text-ink-500 dark:text-cream-200 mb-2">Your rating:</p>
        <div class="flex gap-1">
          {#each Array(5) as _, i}
            <button
              type="button"
              class="text-2xl transition-transform hover:scale-110"
              onclick={() => setRating(i + 1)}
              onmouseenter={() => hoverRating = i + 1}
              onmouseleave={() => hoverRating = 0}
            >
              {(hoverRating || myRating) > i ? '🔥' : '⚪'}
            </button>
          {/each}
          {#if myRating > 0}
            <span class="ml-2 text-sm text-ink-400 dark:text-cream-300 self-center">{myRating}/5 fires</span>
          {/if}
        </div>
      </div>
    {:else}
      <p class="text-sm text-ink-400 dark:text-cream-300">
        <a href="/auth/login" class="text-forest-500 hover:text-forest-600">Sign in</a> to rate this adventure.
      </p>
    {/if}
  </div>

  <!-- Wave: Rating -> Stories -->
  <div class="wave-divider my-2">
    <svg viewBox="0 0 1200 48" preserveAspectRatio="none" fill="none">
      <path d="M0 24 C200 4 400 44 600 24 C800 4 1000 44 1200 24 L1200 48 L0 48Z" fill="rgba(34,97,69,0.1)" />
      <path d="M0 32 C300 12 500 44 700 24 C900 8 1100 36 1200 32 L1200 48 L0 48Z" fill="rgba(34,97,69,0.07)" />
    </svg>
  </div>

  <!-- Stories / Blog -->
  <div class="bg-forest-50 dark:bg-forest-900/30 rounded-xl p-6 mb-4">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <span class="text-2xl">📖</span>
        <div>
          <h2 class="text-lg font-semibold text-ink-600 dark:text-cream-100">Stories & Memories</h2>
          <p class="text-xs text-ink-400 dark:text-cream-300">Longer tales and favorite moments</p>
        </div>
      </div>
      {#if data.user}
        <div class="flex gap-3">
          {#if aiEnabled}
            <button
              onclick={generateStory}
              disabled={aiGeneratingStory}
              class="btn-accent inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium disabled:opacity-50 transition-all"
            >
              {#if aiGeneratingStory}
                <div class="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                Generating...
              {:else}
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Story
              {/if}
            </button>
          {/if}
          <button
            onclick={() => showStoryForm = !showStoryForm}
            class="text-sm text-forest-500 hover:text-forest-600 font-medium"
          >
            {showStoryForm ? 'Cancel' : '+ Share a Story'}
          </button>
        </div>
      {/if}
    </div>

    {#if showStoryForm}
      <form class="mb-6 space-y-3" onsubmit={(e) => { e.preventDefault(); submitStory(); }}>
        <input type="text" bind:value={storyTitle} placeholder="Story title (optional)"
          class="input w-full px-4 py-2.5 text-sm" />
        <textarea bind:value={storyContent} placeholder="Share your memory of this adventure..." rows="4"
          class="input w-full px-4 py-3 resize-y"></textarea>
        <button type="submit" disabled={submittingStory || !storyContent.trim()}
          class="btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50 transition-colors">
          {submittingStory ? 'Posting...' : 'Post Story'}
        </button>
      </form>
    {/if}

    {#if data.stories.length === 0}
      <p class="text-sm text-ink-400 dark:text-cream-300 italic">No stories yet. Be the first to share a memory!</p>
    {:else}
      <div class="space-y-4">
        {#each data.stories as story}
          <div class="p-4 rounded-xl bg-cream-50 dark:bg-ink-700 border border-cream-200 dark:border-ink-600/50">
            <div class="flex items-center gap-2 mb-2">
              {#if story.author_avatar}
                <img src={story.author_avatar} alt="" class="h-6 w-6 rounded-full object-cover" />
              {:else}
                <div class="h-6 w-6 rounded-full bg-gradient-to-br from-terra-400 to-gold-400 flex items-center justify-center text-white text-[9px] font-medium">
                  {story.author_name?.charAt(0).toUpperCase()}
                </div>
              {/if}
              <span class="text-sm font-medium text-ink-600 dark:text-cream-100">{story.author_name}</span>
              <span class="text-xs text-ink-400 dark:text-cream-300">{new Date(story.created_at).toLocaleDateString()}</span>
            </div>
            {#if story.title}
              <h3 class="font-semibold text-ink-600 dark:text-cream-100 mb-1">{story.title}</h3>
            {/if}
            <p class="text-sm text-ink-500 dark:text-cream-200 whitespace-pre-wrap">{story.content}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Actions -->
  {#if data.user && data.user.id === data.adventure.author_id}
    <div class="card rounded-xl p-6 mb-4 border-t-4 border-forest-400">
      <div class="flex flex-wrap gap-3">
      <a
        href="/adventures/{data.adventure.slug}/edit"
        class="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Adventure
      </a>
      <button
        onclick={createShareLink}
        class="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>
      </div>
    </div>
  {/if}
  </div>
</article>

<!-- Share Dialog -->
{#if showShareDialog}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="card rounded-xl p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold text-ink-600 dark:text-cream-100 mb-4">Share Adventure</h3>
      <p class="text-sm text-ink-400 dark:text-cream-300 mb-4">
        Copy this link to share this adventure with others:
      </p>
      <div class="flex items-center gap-2">
        <input
          type="text"
          value={shareLink}
          readonly
          class="input flex-1 px-4 py-2 text-sm"
        />
        <button
          onclick={copyShareLink}
          class="btn-primary px-4 py-2 text-sm font-medium transition-colors"
        >
          Copy
        </button>
      </div>
      <button
        onclick={() => showShareDialog = false}
        class="btn-secondary w-full mt-4 px-4 py-2 text-sm font-medium transition-colors"
      >
        Close
      </button>
    </div>
  </div>
{/if}

<!-- Tag People Modal -->
{#if taggingMediaId}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onclick={closeTagging}>
    <div class="card rounded-xl p-6 max-w-md w-full mx-4" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-ink-600 dark:text-cream-100">Tag People</h3>
        <button onclick={closeTagging} class="text-ink-400 hover:text-ink-600">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {#if taggingLoading}
        <div class="py-8 text-center">
          <div class="h-6 w-6 mx-auto border-2 border-forest-300 border-t-transparent rounded-full animate-spin"></div>
        </div>
      {:else}
        {#if taggingPeople.length > 0}
          <div class="flex flex-wrap gap-2 mb-4">
            {#each taggingPeople as person}
              <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-forest-50 dark:bg-forest-900/30 border border-forest-200 dark:border-forest-700">
                {#if person.person_avatar}
                  <img src={person.person_avatar} alt="" class="h-5 w-5 rounded-full object-cover" />
                {:else}
                  <div class="h-5 w-5 rounded-full bg-forest-200 dark:bg-forest-700 flex items-center justify-center text-[10px] font-bold text-forest-700 dark:text-forest-200">{person.person_name?.charAt(0).toUpperCase()}</div>
                {/if}
                <a href="/people/{person.person_slug}" class="text-sm font-medium text-forest-700 dark:text-forest-300 hover:underline">{person.person_name}</a>
                <button onclick={() => untagPerson(person.person_id)} class="text-forest-400 hover:text-red-500 transition-colors">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            {/each}
          </div>
        {/if}

        {#if showNewPersonInput}
          <form class="flex items-center gap-2 mb-4" onsubmit={(e) => { e.preventDefault(); tagPerson(undefined, newPersonName); }}>
            <input
              type="text"
              bind:value={newPersonName}
              placeholder="Enter name..."
              class="input flex-1 px-3 py-2 text-sm"
              autofocus
            />
            <button type="submit" class="btn-primary text-xs px-3 py-2" disabled={creatingPerson || !newPersonName.trim()}>
              {creatingPerson ? '...' : 'Add'}
            </button>
            <button type="button" class="btn-secondary text-xs px-3 py-2" onclick={() => { showNewPersonInput = false; newPersonName = ''; }}>Cancel</button>
          </form>
        {:else}
          <div class="relative mb-4">
            <input
              type="text"
              value={tagSearchQuery}
              oninput={(e) => searchPeople((e.target as HTMLInputElement).value)}
              placeholder="Search people or add new..."
              class="input w-full px-3 py-2 text-sm pl-9"
            />
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        {/if}

        {#if tagSearchResults.length > 0}
          <div class="space-y-1 mb-3 max-h-40 overflow-y-auto">
            {#each tagSearchResults as person}
              <button
                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-cream-100 dark:hover:bg-ink-700 transition-colors text-left"
                onclick={() => tagPerson(person.id)}
              >
                {#if person.avatar_file_path}
                  <img src={person.avatar_file_path} alt="" class="h-8 w-8 rounded-full object-cover" />
                {:else}
                  <div class="h-8 w-8 rounded-full bg-forest-100 dark:bg-forest-800 flex items-center justify-center text-sm font-bold text-forest-600">{person.name.charAt(0).toUpperCase()}</div>
                {/if}
                <div>
                  <p class="text-sm font-medium text-ink-700 dark:text-cream-200">{person.name}</p>
                  <p class="text-xs text-ink-400">{person.photo_count} photos</p>
                </div>
              </button>
            {/each}
          </div>
        {/if}

        {#if !showNewPersonInput}
          <button
            class="w-full text-left px-3 py-2 rounded-lg text-sm text-forest-500 hover:bg-forest-50 dark:hover:bg-forest-900/30 transition-colors"
            onclick={() => { showNewPersonInput = true; newPersonName = tagSearchQuery; }}
          >
            + Add "{tagSearchQuery || 'new person'}" as someone new
          </button>
        {/if}
      {/if}
    </div>
  </div>
{/if}
