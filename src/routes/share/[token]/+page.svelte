<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/state';
  import { formatDate, detectMediaType } from '$lib/shared/utils';

  let { data } = $props();

  // ------- Guest sign-in state -------
  let joinName = $state('');
  let joinPasscode = $state('');
  let joining = $state(false);
  let joinError = $state('');

  const isSignedIn = $derived(!!data.sessionUser);

  // ------- Comments state -------
  let newComment = $state('');
  let replyingToId = $state<string | null>(null);
  let replyText = $state('');
  let submittingComment = $state(false);

  // ------- Stories state -------
  let showStoryForm = $state(false);
  let storyTitle = $state('');
  let storyContent = $state('');
  let submittingStory = $state(false);

  // ------- Upload state -------
  let uploadingFile = $state(false);
  let uploadProgress = $state('');
  let uploadError = $state('');
  let uploadErrors = $state<string[]>([]);
  let failedFiles = $state<File[]>([]);
  let uploadFileProgress = $state<Record<string, { status: 'pending'|'uploading'|'done'|'error'; percent: number }>>({});
  let newMediaCaption = $state('');

  async function joinAsGuest() {
    joining = true;
    joinError = '';
    try {
      const res = await fetch('/api/share/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: page.params.token, name: joinName, passcode: joinPasscode })
      });
      const json = await res.json();
      if (!res.ok) {
        joinError = json.error || 'Unable to sign in';
        return;
      }
      window.location.reload();
    } finally {
      joining = false;
    }
  }

  async function leaveAsGuest() {
    await fetch('/api/share/join', { method: 'DELETE' });
    window.location.reload();
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    submittingComment = true;
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adventureId: data.adventure.id, content: newComment.trim() })
      });
      if (res.ok) {
        newComment = '';
        // Optimistically prepend a pending comment client-side, then reload for the full thread
        window.location.reload();
      } else {
        const json = await res.json();
        joinError = json.error || 'Could not post comment';
      }
    } finally {
      submittingComment = false;
    }
  }

  async function submitStory() {
    if (!storyContent.trim()) return;
    submittingStory = true;
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adventureId: data.adventure.id, title: storyTitle.trim() || undefined, content: storyContent.trim() })
      });
      if (res.ok) {
        storyContent = '';
        storyTitle = '';
        showStoryForm = false;
        window.location.reload();
      } else {
        const json = await res.json();
        joinError = json.error || 'Could not post your story';
      }
    } finally {
      submittingStory = false;
    }
  }

  // ------- Upload flow (mirrors the edit page) -------
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
          uploaded.push({ filePath: result.filePath, mediaType: detectMediaType(file.name) });
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

  function retryFailedUploads() {
    if (failedFiles.length === 0) return;
    const filesToRetry = [...failedFiles];
    failedFiles = [];
    uploadErrors = [];
    uploadFileProgress = {};
    doUpload(filesToRetry);
  }

  async function doUpload(fileList: File[]) {
    const total = fileList.length;
    uploadingFile = true;
    uploadErrors = [];
    uploadFileProgress = {};
    uploadProgress = `Uploading ${total} file${total > 1 ? 's' : ''}...`;

    const uploaded = await uploadWithConcurrency(fileList, 3);

    if (uploaded.length > 0) {
      const attachRes = await fetch(`/api/share/${page.params.token}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: uploaded.map(u => ({ filePath: u.filePath, mediaType: u.mediaType, caption: newMediaCaption.trim() || undefined }))
        })
      });
      if (!attachRes.ok) {
        const j = await attachRes.json();
        uploadError = j.error || 'Could not add photos to this adventure';
      }
    }

    if (failedFiles.length > 0 && uploaded.length > 0) {
      uploadError = `${uploaded.length} uploaded, ${failedFiles.length} failed — click retry to try again`;
    } else if (failedFiles.length > 0) {
      uploadError = `All ${failedFiles.length} file${failedFiles.length > 1 ? 's' : ''} failed — click retry to try again`;
    } else if (uploaded.length > 0) {
      uploadProgress = `${uploaded.length} file${uploaded.length > 1 ? 's' : ''} uploaded!`;
      setTimeout(() => { uploadProgress = ''; }, 2000);
      newMediaCaption = '';
      setTimeout(() => window.location.reload(), 600);
    }
    uploadingFile = false;
  }

  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      doUpload([...files]);
      input.value = '';
    }
  }
</script>

<svelte:head>
  <title>{data.adventure.title} | Family Adventures</title>
  <meta name="description" content={data.adventure.description || data.adventure.title} />

  <meta property="og:title" content={data.adventure.title} />
  <meta property="og:description" content={data.adventure.description || ''} />
  {#if data.adventure.cover_file_path}
    <meta property="og:image" content="{data.siteUrl}{data.adventure.cover_file_path}" />
  {/if}
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Family Adventures" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.adventure.title} />
  <meta name="twitter:description" content={data.adventure.description || ''} />
  {#if data.adventure.cover_file_path}
    <meta name="twitter:image" content="{data.siteUrl}{data.adventure.cover_file_path}" />
  {/if}
</svelte:head>

<div class="max-w-4xl mx-auto">
  <div class="text-center mb-8">
    <a href="/" class="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-600 mb-4 transition-colors">
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Family Adventures
    </a>
    <p class="text-xs text-ink-300 uppercase tracking-wider">Shared Adventure</p>
  </div>

  <div class="relative rounded-2xl overflow-hidden mb-8">
    {#if data.adventure.cover_file_path}
      <img
        src={`/api/media/image?path=${encodeURIComponent(data.adventure.cover_file_path)}&w=1600`}
        alt={data.adventure.title}
        class="w-full h-64 md:h-96 object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
    {:else}
      <div class="w-full h-64 md:h-96 bg-gradient-to-br from-forest-400 to-terra-400"></div>
    {/if}

    <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8">
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
      </div>
    </div>
  </div>

  {#if data.adventure.description}
    <div class="card p-6 mb-8">
      <p class="text-lg text-ink-500 leading-relaxed dark:text-cream-200">{data.adventure.description}</p>
    </div>
  {/if}

  {#if data.adventure.content}
    <div class="prose prose-lg max-w-none mb-8">
      {@html data.adventure.content}
    </div>
  {/if}

  <!-- ============ Photos & Videos ============ -->
  {#if (data.adventure.media && data.adventure.media.length > 0) || isSignedIn}
    <div class="mb-8">
      <h2 class="text-xl font-display font-semibold text-ink-800 dark:text-cream-100 mb-4">Photos & Videos</h2>
      {#if data.adventure.media && data.adventure.media.length > 0}
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          {#each data.adventure.media as media}
            <div class="relative aspect-square rounded-xl overflow-hidden group">
              {#if media.media_type === 'video'}
                <video
                  src={`/api/media/image?path=${media.file_path}&w=480`}
                  muted
                  preload="metadata"
                  class="w-full h-full object-cover"
                ></video>
              {:else if media.media_type === 'audio'}
                <div class="w-full h-full flex items-center justify-center bg-ink-700">
                  <svg class="h-8 w-8 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19a2 2 0 01-2 2 2 2 0 01-2-2 2 2 0 012-2 2 2 0 012 2zM4 6a2 2 0 012-2 2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2z" />
                  </svg>
                </div>
              {:else}
                <img
                  src={`/api/media/image?path=${encodeURIComponent(media.file_path)}&w=480`}
                  alt={media.caption || 'Adventure photo'}
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              {/if}
              {#if media.caption}
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p class="absolute bottom-3 left-3 right-3 text-white text-sm">{media.caption}</p>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      {#if isSignedIn}
        <!-- Guest upload -->
        <div class="mt-6">
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
                <p class="text-sm text-ink-500 font-medium">Add your photos & videos</p>
                <p class="text-xs text-ink-400 mt-1">Select multiple files or drag & drop them here</p>
              {/if}
            </label>
          </div>
          {#if uploadProgress && !uploadingFile}
            <p class="text-sm text-forest-500 mt-2">{uploadProgress}</p>
          {/if}
          {#if uploadError}
            <p class="text-sm text-terra-500 mt-2">{uploadError}</p>
          {/if}
          {#if failedFiles.length > 0 && !uploadingFile}
            <button class="mt-2 text-sm text-forest-500 hover:text-forest-600 font-medium underline" onclick={retryFailedUploads}>
              Retry {failedFiles.length} failed file{failedFiles.length > 1 ? 's' : ''}
            </button>
          {/if}
          {#if Object.keys(uploadFileProgress).length > 0}
            <div class="space-y-1 mt-2">
              {#each Object.entries(uploadFileProgress) as [key, info]}
                {@const name = key.replace(/-\d+$/, '')}
                <div class="flex items-center gap-2 text-xs">
                  {#if info.status === 'done'}
                    <svg class="h-3.5 w-3.5 text-forest-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                  {:else if info.status === 'error'}
                    <svg class="h-3.5 w-3.5 text-terra-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  {:else}
                    <div class="h-3.5 w-3.5 rounded-full border-2 border-forest-300 border-t-forest-500 animate-spin shrink-0"></div>
                  {/if}
                  <span class="truncate {info.status === 'error' ? 'text-terra-500' : info.status === 'done' ? 'text-forest-500' : 'text-ink-500'}">{name}</span>
                </div>
              {/each}
            </div>
          {/if}
          {#if uploadErrors.length > 0}
            <div class="text-xs text-terra-400 space-y-0.5 mt-1">
              {#each uploadErrors as err}
                <p>{err}</p>
              {/each}
            </div>
          {/if}
          <input type="text" bind:value={newMediaCaption} placeholder="Caption for your photos (optional)" class="input mt-3" />
        </div>
      {/if}
    </div>
  {/if}

  <!-- ============ Guest sign-in / contribution gate ============ -->
  <div class="card p-6 mb-8">
    {#if isSignedIn}
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm text-ink-400">Signed in as</p>
          <p class="text-lg font-display font-semibold text-ink-800 dark:text-cream-100">
            {data.sessionUser!.name}
          </p>
          <p class="text-xs text-ink-400 dark:text-cream-300 mt-1">You can add photos, comment, and share your story below.</p>
        </div>
        <button onclick={leaveAsGuest} class="btn-secondary px-4 py-2 text-sm font-medium">Sign out</button>
      </div>
    {:else}
      <h3 class="text-lg font-display font-semibold text-ink-800 dark:text-cream-100 mb-1">Join in and share your memories</h3>
      <p class="text-sm text-ink-400 dark:text-cream-300 mb-4">
        Add photos, leave a comment, or tell your story about this adventure. Enter your name and the passcode sent with the link.
      </p>
      <div class="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          bind:value={joinName}
          placeholder="Your name"
          class="input flex-1 px-4 py-2 text-sm"
        />
        <input
          type="password"
          bind:value={joinPasscode}
          placeholder="Passcode"
          class="input flex-1 px-4 py-2 text-sm"
        />
        <button
          onclick={joinAsGuest}
          disabled={joining}
          class="btn-primary px-4 py-2 text-sm font-medium transition-colors"
        >
          {joining ? 'Joining...' : 'Join in'}
        </button>
      </div>
      {#if joinError}
        <p class="text-sm text-terra-500 mt-2">{joinError}</p>
      {/if}
    {/if}
  </div>

  <!-- ============ Comments ============ -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-display font-semibold text-ink-800 dark:text-cream-100">Comments</h2>
    </div>

    {#if isSignedIn}
      <div class="card p-4 mb-6">
        <textarea
          bind:value={newComment}
          placeholder="Share your thoughts..."
          rows="3"
          class="input w-full px-4 py-2 text-sm"
        ></textarea>
        <div class="flex justify-end mt-2">
          <button
            onclick={submitComment}
            disabled={submittingComment || !newComment.trim()}
            class="btn-primary px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {submittingComment ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>
    {/if}

    {#if data.comments.length === 0}
      <p class="text-center text-ink-400 dark:text-cream-300 py-8">No comments yet.{isSignedIn ? ' Be the first to share!' : ''}</p>
    {:else}
      <div class="space-y-4">
        {#each data.comments as comment}
          <div class="card p-4">
            <div class="flex items-center gap-3 mb-2">
              <div class="h-9 w-9 rounded-full bg-forest-100 dark:bg-ink-600 flex items-center justify-center">
                {#if comment.author_avatar}
                  <img src={comment.author_avatar} alt="" class="h-9 w-9 rounded-full object-cover" />
                {:else}
                  <span class="text-sm font-semibold text-forest-600">{(comment.author_name || '?').charAt(0).toUpperCase()}</span>
                {/if}
              </div>
              <div>
                <p class="text-sm font-medium text-ink-700 dark:text-cream-100">{comment.author_name || 'Guest'}</p>
                <p class="text-xs text-ink-400">{formatDate(comment.created_at)}</p>
              </div>
            </div>
            <p class="text-sm text-ink-500 dark:text-cream-200 leading-relaxed">{comment.content}</p>

            {#if comment.replies && comment.replies.length > 0}
              <div class="mt-3 ml-6 space-y-3 border-l-2 border-cream-200 dark:border-ink-600 pl-4">
                {#each comment.replies as reply}
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs font-semibold text-forest-600">{reply.author_name || 'Guest'}</span>
                      <span class="text-xs text-ink-400">{formatDate(reply.created_at)}</span>
                    </div>
                    <p class="text-sm text-ink-500 dark:text-cream-200">{reply.content}</p>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ============ Their stories ============ -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-display font-semibold text-ink-800 dark:text-cream-100">Family Stories</h2>
      {#if isSignedIn && !showStoryForm}
        <button onclick={() => showStoryForm = true} class="btn-secondary px-4 py-2 text-sm font-medium">
          + Tell Your Story
        </button>
      {/if}
    </div>

    {#if showStoryForm}
      <div class="card p-4 mb-6">
        <input
          type="text"
          bind:value={storyTitle}
          placeholder="Story title (optional)"
          class="input w-full px-4 py-2 text-sm mb-3"
        />
        <textarea
          bind:value={storyContent}
          placeholder="Share your memory of this adventure..."
          rows="4"
          class="input w-full px-4 py-2 text-sm"
        ></textarea>
        <div class="flex justify-end gap-2 mt-2">
          <button onclick={() => showStoryForm = false} class="btn-secondary px-4 py-2 text-sm font-medium">Cancel</button>
          <button
            onclick={submitStory}
            disabled={submittingStory || !storyContent.trim()}
            class="btn-primary px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {submittingStory ? 'Posting...' : 'Post Story'}
          </button>
        </div>
      </div>
    {/if}

    {#if data.stories.length === 0}
      <p class="text-sm text-ink-400 dark:text-cream-300 italic py-4">No stories yet.{isSignedIn ? ' Be the first to share a memory!' : ''}</p>
    {:else}
      <div class="space-y-4">
        {#each data.stories as story}
          <div class="card p-5">
            <div class="flex items-center gap-3 mb-3">
              <div class="h-9 w-9 rounded-full bg-forest-100 dark:bg-ink-600 flex items-center justify-center">
                {#if story.author_avatar}
                  <img src={story.author_avatar} alt="" class="h-9 w-9 rounded-full object-cover" />
                {:else}
                  <span class="text-sm font-semibold text-forest-600">{(story.author_name || '?').charAt(0).toUpperCase()}</span>
                {/if}
              </div>
              <div>
                <p class="text-sm font-medium text-ink-700 dark:text-cream-100">{story.author_name || 'Guest'}</p>
                <p class="text-xs text-ink-400">{formatDate(story.created_at)}</p>
              </div>
            </div>
            {#if story.title}
              <h3 class="text-lg font-display font-semibold text-ink-800 dark:text-cream-100 mb-2">{story.title}</h3>
            {/if}
            <p class="text-sm text-ink-500 dark:text-cream-200 leading-relaxed whitespace-pre-line">{story.content}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="text-center py-8 border-t border-cream-200 dark:border-ink-600">
    <p class="text-sm text-ink-400">
      Shared with love from 
      <a href="/" class="text-forest-500 hover:text-forest-600">Family Adventures</a>
    </p>
  </div>
</div>
