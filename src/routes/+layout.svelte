<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <title>Family Adventures</title>
  <meta name="description" content="Our family's collection of adventures, memories, and shared moments" />
  <meta property="og:title" content="Family Adventures" />
  <meta property="og:description" content="Our family's collection of adventures, memories, and shared moments" />
</svelte:head>

{@render children()}
