<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte';

  interface Props {
    icon: IconName;
    title: string;
    body: string;
    signedIn: boolean;
    actionHref?: string;
    actionLabel?: string;
  }

  let { icon, title, body, signedIn, actionHref, actionLabel }: Props = $props();
</script>

<div class="card-flat px-6 py-14 text-center">
  <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cream-100 dark:bg-forest-900/50">
    <Icon name={icon} size={28} class="text-ink-500 dark:text-cream-300" />
  </div>

  <h3 class="text-lg font-semibold text-ink-700 dark:text-cream-200">{title}</h3>
  <p class="mx-auto mt-2 max-w-sm text-sm text-ink-500 dark:text-cream-300">{body}</p>

  {#if actionHref && actionLabel}
    <a href={actionHref} class="btn-primary mt-5">{actionLabel}</a>
  {/if}

  {#if !signedIn}
    <div class="mx-auto mt-7 max-w-sm border-t border-cream-200 pt-5 dark:border-forest-800">
      <p class="text-sm text-ink-600 dark:text-cream-200">
        This is the family's own album. Anyone can look, but adding is for family.
      </p>
      <p class="mt-1 text-xs text-ink-500 dark:text-cream-300">
        New accounts are approved by a parent first, so yours will be waiting a little
        while.
      </p>
      <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
        <a href="/auth/signup" class="btn-primary">Ask to join</a>
        <a href="/auth/login" class="btn-secondary">Log in</a>
      </div>
    </div>
  {/if}
</div>
