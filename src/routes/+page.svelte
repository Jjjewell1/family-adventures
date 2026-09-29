<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import type { IconName } from '$lib/components/Icon.svelte';
  import { formatDate } from '$lib/shared/utils';
  let { data } = $props();
  const photos = $derived((data.heroImages || []).filter((image: any) => image.file_path));
  const featured = $derived(photos[0]);
  const recent = $derived(data.recentAdventures || []);
  const stats = $derived(data.stats);
  const destinations: { href: string; icon: IconName; title: string; text: string }[] = [
    { href: '/bucket-list', icon: 'bookmark', title: 'Dream up the next one', text: 'Save ideas and choose your next family outing.' },
    { href: '/map', icon: 'map', title: 'Follow your footsteps', text: 'Rediscover the places that became part of your story.' },
    { href: '/people', icon: 'people', title: 'The people in the pictures', text: 'Find familiar faces and the moments you shared.' }
  ];
  function photoUrl(path: string, width = 800) {
    return `/api/media/image?path=${encodeURIComponent(path)}&w=${width}`;
  }
</script>

<svelte:head><title>Our family album | Family Adventures</title></svelte:head>

<div class="album-home">
  <section class="album-hero" aria-labelledby="welcome-title">
    <div class="album-intro">
      <p class="album-eyebrow"><Icon name="compass" size={18} /> Our family album</p>
      <h1 id="welcome-title">Little moments.<br /><em>Lasting memories.</em></h1>
      <p class="album-lead">{data.user ? `Welcome back, ${data.user.name.split(' ')[0]}.` : 'A place for the stories you share.'} Gather your photos, remember the good days, and make room for the next adventure.</p>
      <div class="album-actions">
        <a class="btn-primary" href={data.user ? '/adventures/create' : '/auth/login'}><Icon name={data.user ? 'plus' : 'person'} size={18} />{data.user ? 'Add an adventure' : 'Sign in to join in'}</a>
        <a class="btn-secondary" href="/adventures">Explore the album <Icon name="chevron-right" size={18} /></a>
      </div>
      <p class="album-note">Big trips, small outings, and everything in between.</p>
    </div>
    {#if featured}
      <a class="album-feature" href="/adventures/{featured.slug}" aria-label="Open {featured.adventure_title}">
        <img src={photoUrl(featured.file_path, 1200)} alt={featured.adventure_title} fetchpriority="high" />
        <div class="album-photo-caption"><span>A moment worth keeping</span><h2>{featured.adventure_title}</h2><span class="album-photo-link">Open the story <Icon name="chevron-right" size={18} /></span></div>
      </a>
    {:else}
      <div class="album-placeholder">
        <div class="album-placeholder-icon"><Icon name="camera" size={64} /></div>
        <p class="album-eyebrow">Your story starts here</p>
        <h2>Good days deserve<br />a place to stay.</h2>
        <p>Add your first adventure and turn a favorite day into a family keepsake.</p>
      </div>
    {/if}
  </section>

  <section class="album-stats" aria-label="Your album at a glance">
    {#each [{ value: stats?.total_adventures || 0, label: 'Adventures', href: '/adventures', icon: 'compass' }, { value: stats?.total_photos || 0, label: 'Photos', href: '/gallery', icon: 'photo' }, { value: stats?.total_videos || 0, label: 'Videos', href: '/gallery', icon: 'camera' }, { value: stats?.total_contributors || 0, label: 'Storytellers', href: '/people', icon: 'people' }] as stat}
      <a href={stat.href}><Icon name={stat.icon as IconName} size={20} /><div><strong>{stat.value}</strong><span>{stat.label}</span></div><Icon name="chevron-right" size={16} /></a>
    {/each}
  </section>

  <section class="album-section" aria-labelledby="recent-title">
    <div class="album-section-heading"><div><p class="album-eyebrow">Pages from our story</p><h2 id="recent-title">Recent adventures</h2></div><a class="btn-secondary" href="/adventures">View all <Icon name="chevron-right" size={16} /></a></div>
    {#if recent.length}
      <div class="album-journals">
        {#each recent as adventure}
          {@const cover = adventure.cover_file_path || photos.find((photo: any) => photo.slug === adventure.slug)?.file_path}
          <a class="album-journal" href="/adventures/{adventure.slug}">
            <div class="album-journal-image">{#if cover}<img src={photoUrl(cover)} alt="" loading="lazy" />{:else}<Icon name="compass" size={48} />{/if}</div>
            <div class="album-journal-copy"><p class="album-eyebrow">{adventure.start_date ? formatDate(adventure.start_date) : 'A day to remember'}</p><h3>{adventure.title}</h3><p>{adventure.description || 'Open this chapter of the family album.'}</p><span class="album-location"><Icon name="pin" size={16} />{adventure.location_name || 'Together is a good place to be'}<Icon name="chevron-right" size={16} /></span></div>
          </a>
        {/each}
      </div>
    {:else}
      <div class="album-empty"><Icon name="photo" size={36} /><div><h3>The first page is yours.</h3><p>Start with a day out, a few favorite photos, and a story you want to remember.</p></div><a class="btn-primary" href={data.user ? '/adventures/create' : '/auth/signup'}>{data.user ? 'Create an adventure' : 'Join the family album'}</a></div>
    {/if}
  </section>

  <section class="album-discover" aria-label="More ways to make memories">
    {#each destinations as destination}<a href={destination.href}><Icon name={destination.icon} size={24} /><h3>{destination.title}</h3><p>{destination.text}</p><span>Explore <Icon name="chevron-right" size={16} /></span></a>{/each}
  </section>
</div>
