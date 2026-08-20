<script lang="ts">
  import { onMount } from 'svelte';

  let open = $state(false);
  let input = $state('');
  let messages = $state<{ role: 'user' | 'assistant'; content: string }[]>([]);
  let streaming = $state(false);
  let streamContent = $state('');
  let inputEl: HTMLInputElement;
  let messagesEl: HTMLDivElement;
  let aiEnabled = $state(false);

  onMount(async () => {
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      aiEnabled = data.config?.enabled && data.connection?.ok;
    } catch {
      aiEnabled = false;
    }
  });

  $effect(() => {
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });

  $effect(() => {
    if (open && inputEl) {
      setTimeout(() => inputEl?.focus(), 100);
    }
  });

  function toggle() {
    open = !open;
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    messages = [...messages, { role: 'user', content: text }];
    input = '';
    streaming = true;
    streamContent = '';

    const allMessages = [...messages];

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages })
      });

      if (!res.ok) {
        const err = await res.json();
        messages = [...messages, { role: 'assistant', content: err.error || 'Sorry, something went wrong.' }];
        streaming = false;
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                streamContent += parsed.content;
              }
              if (parsed.error) {
                streamContent += `\n\n*${parsed.error}*`;
              }
            } catch { /* skip */ }
          }
        }
      }

      if (streamContent) {
        messages = [...messages, { role: 'assistant', content: streamContent }];
      }
    } catch {
      messages = [...messages, { role: 'assistant', content: 'Could not connect to the AI assistant. Please try again.' }];
    }

    streamContent = '';
    streaming = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
</script>

{#if aiEnabled}
  <!-- Toggle Button -->
  <button
    onclick={toggle}
    class="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg shadow-forest-500/20 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-forest-500/30
      {open ? 'bg-ink-700 dark:bg-cream-200 rotate-0' : 'bg-forest-500 hover:bg-forest-600'}"
    aria-label="Chat assistant"
  >
    {#if open}
      <svg class="h-5 w-5 text-cream-100 dark:text-ink-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    {:else}
      <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <!-- Notification dot for first visit -->
      {#if messages.length === 0}
        <div class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-terra-500 flex items-center justify-center">
          <div class="h-2 w-2 rounded-full bg-white animate-pulse"></div>
        </div>
      {/if}
    {/if}
  </button>

  <!-- Chat Panel -->
  {#if open}
    <div class="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] rounded-2xl shadow-2xl shadow-black/10 overflow-hidden border border-cream-200 dark:border-ink-600
      {open ? 'animate-in' : ''} bg-white dark:bg-ink-800">
      <!-- Header -->
      <div class="bg-gradient-to-r from-forest-600 to-forest-500 px-5 py-4">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">Adventure Assistant</h3>
            <p class="text-xs text-white/70">Ask about your trips, photos & plans</p>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div bind:this={messagesEl} class="h-80 overflow-y-auto px-5 py-4 space-y-4 scroll-smooth">
        {#if messages.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-center">
            <div class="h-14 w-14 rounded-full bg-forest-50 dark:bg-forest-900/30 flex items-center justify-center mb-3">
              <svg class="h-7 w-7 text-forest-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p class="text-sm font-medium text-ink-600 dark:text-cream-200">Hi! I'm your adventure assistant.</p>
            <p class="text-xs text-ink-400 dark:text-cream-400 mt-1 max-w-xs">Ask me about your trips, who's in the photos, or what's on your bucket list.</p>
            <div class="flex flex-wrap gap-1.5 mt-4 justify-center">
              <button class="text-xs px-3 py-1.5 rounded-full bg-cream-100 dark:bg-ink-700 text-ink-600 dark:text-cream-300 hover:bg-cream-200 dark:hover:bg-ink-600 transition-colors"
                onclick={() => { input = 'What adventures have we been on?'; send(); }}>
                Recent trips
              </button>
              <button class="text-xs px-3 py-1.5 rounded-full bg-cream-100 dark:bg-ink-700 text-ink-600 dark:text-cream-300 hover:bg-cream-200 dark:hover:bg-ink-600 transition-colors"
                onclick={() => { input = 'What\'s on our bucket list?'; send(); }}>
                Bucket list
              </button>
              <button class="text-xs px-3 py-1.5 rounded-full bg-cream-100 dark:bg-ink-700 text-ink-600 dark:text-cream-300 hover:bg-cream-200 dark:hover:bg-ink-600 transition-colors"
                onclick={() => { input = 'Who have we tagged in photos?'; send(); }}>
                Who's in photos?
              </button>
            </div>
          </div>
        {:else}
          {#each messages as msg}
            <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
              <div class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                {msg.role === 'user'
                  ? 'bg-forest-500 text-white rounded-br-md'
                  : 'bg-cream-100 dark:bg-ink-700 text-ink-700 dark:text-cream-200 rounded-bl-md'}">
                {msg.content}
              </div>
            </div>
          {/each}
          {#if streaming && streamContent}
            <div class="flex justify-start">
              <div class="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed bg-cream-100 dark:bg-ink-700 text-ink-700 dark:text-cream-200">
                {streamContent}<span class="inline-block w-1.5 h-4 bg-forest-400 ml-0.5 animate-pulse rounded-full"></span>
              </div>
            </div>
          {/if}
          {#if streaming && !streamContent}
            <div class="flex justify-start">
              <div class="rounded-2xl rounded-bl-md px-4 py-3 bg-cream-100 dark:bg-ink-700">
                <div class="flex gap-1">
                  <div class="h-2 w-2 rounded-full bg-ink-300 dark:bg-cream-500 animate-bounce" style="animation-delay: 0s;"></div>
                  <div class="h-2 w-2 rounded-full bg-ink-300 dark:bg-cream-500 animate-bounce" style="animation-delay: 0.15s;"></div>
                  <div class="h-2 w-2 rounded-full bg-ink-300 dark:bg-cream-500 animate-bounce" style="animation-delay: 0.3s;"></div>
                </div>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Input -->
      <div class="border-t border-cream-200 dark:border-ink-600 px-4 py-3">
        <form onsubmit={(e) => { e.preventDefault(); send(); }} class="flex items-center gap-2">
          <input
            bind:this={inputEl}
            bind:value={input}
            onkeydown={handleKeydown}
            placeholder="Ask about your adventures..."
            disabled={streaming}
            class="flex-1 text-sm bg-cream-50 dark:bg-ink-700 border-0 rounded-full px-4 py-2.5 text-ink-700 dark:text-cream-200 placeholder-ink-400 dark:placeholder-cream-500 focus:ring-2 focus:ring-forest-300 dark:focus:ring-forest-600 outline-none disabled:opacity-50 transition-shadow"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            class="h-10 w-10 rounded-full bg-forest-500 text-white flex items-center justify-center hover:bg-forest-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shrink-0"
          >
            {#if streaming}
              <div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            {:else}
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            {/if}
          </button>
        </form>
      </div>
    </div>
  {/if}
{/if}

<style>
  @keyframes animate-in {
    from { opacity: 0; transform: translateY(10px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .animate-in {
    animation: animate-in 0.25s ease-out;
  }
</style>
