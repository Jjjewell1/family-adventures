<script module lang="ts">
  export type IconName =
    | 'home'
    | 'compass'
    | 'pin'
    | 'photo'
    | 'bell'
    | 'moon'
    | 'sun'
    | 'plus'
    | 'more'
    | 'chevron-left'
    | 'chevron-right'
    | 'chevron-down'
    | 'search'
    | 'filter'
    | 'settings'
    | 'person'
    | 'people'
    | 'calendar'
    | 'camera'
    | 'heart'
    | 'star'
    | 'check'
    | 'close'
    | 'share'
    | 'map'
    | 'list'
    | 'grid'
    | 'trash'
    | 'edit'
    | 'download'
    | 'location'
    | 'sparkles'
    | 'chart'
    | 'bookmark'
    | 'beach'
    | 'roadtrip'
    | 'holiday'
    | 'camping'
    | 'plane'
    | 'city'
    | 'tree'
    | 'note'
    | 'mountain'
    | 'adventurous'
    | 'relaxing'
    | 'exciting'
    | 'peaceful'
    | 'fun'
    | 'romantic'
    | 'refresh'
    | 'logout'
    | 'warning';

  interface Glyph {
    /** Stroked outlines, drawn at 24x24 with a 1.75px nominal stroke. */
    d: string[];
    /** Filled shapes rendered alongside the strokes, for solid variants. */
    fill?: string[];
  }
</script>

<script lang="ts">
  type Props = {
    name: IconName;
    size?: number | string;
    /** Overrides the default weight. Use sparingly — 1.75 is the system default. */
    strokeWidth?: number;
    /**
     * Announced to assistive tech. Omit for purely decorative icons so they are
     * hidden from the tree instead of adding noise to every button.
     */
    label?: string;
    filled?: boolean;
    class?: string;
  };

  let { name, size = 24, strokeWidth, label, filled = false, class: className = '' }: Props = $props();

  const GLYPHS: Record<IconName, Glyph> = {
    home: { d: ['M3 10.4 12 3l9 7.4', 'M5.5 9.2V20a1 1 0 0 0 1 1h4v-6h3v6h4a1 1 0 0 0 1-1V9.2'] },
    compass: { d: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'm15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1Z'] },
    pin: { d: ['M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'] },
    photo: { d: ['M4 19V6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z', 'm4 16 4.6-4.6a1.5 1.5 0 0 1 2.1 0L14 14.7', 'm14.4 13.6 1.6-1.6a1.5 1.5 0 0 1 2.1 0L20 14', 'M9.5 9.5h.01'] },
    bell: { d: ['M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15L18 15.5Z', 'M10 21h4'] },
    moon: { d: ['M20.4 14.4A8.5 8.5 0 0 1 9.6 3.6a8.5 8.5 0 1 0 10.8 10.8Z'] },
    sun: { d: ['M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z', 'M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4'] },
    plus: { d: ['M12 5.5v13M5.5 12h13'] },
    more: { d: ['M6 12h.01M12 12h.01M18 12h.01'] },
    'chevron-left': { d: ['m14.5 5-7 7 7 7'] },
    'chevron-right': { d: ['m9.5 5 7 7-7 7'] },
    'chevron-down': { d: ['m5 9.5 7 7 7-7'] },
    search: { d: ['M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z', 'm20.5 20.5-4.2-4.2'] },
    filter: { d: ['M4 6h16M7 12h10M10 18h4'] },
    settings: { d: ['M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z', 'M19.1 14.4a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-2.6-1.1l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.2a1.8 1.8 0 1 1 0-3.6h.1A1.5 1.5 0 0 0 5.3 6.5l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1A1.5 1.5 0 0 0 10.6 2.7v-.2a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 2.6 1.1l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4 9Z'] },
    person: { d: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20.2a7.7 7.7 0 0 1 15 0'] },
    people: { d: ['M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M2.5 20a6.5 6.5 0 0 1 13 0', 'M16 5.2a3.5 3.5 0 0 1 0 6.6', 'M17.5 14.4A6.5 6.5 0 0 1 21.5 20'] },
    calendar: { d: ['M4.5 6.5h15A1.5 1.5 0 0 1 21 8v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19V8a1.5 1.5 0 0 1 1.5-1.5Z', 'M3 10.5h18', 'M8 3.5v4M16 3.5v4'] },
    camera: { d: ['M4 8.5h3l1.6-2.3h6.8L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5Z', 'M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z'] },
    heart: { d: ['M12 20s-7.5-4.4-7.5-9.4A4.6 4.6 0 0 1 12 7.6a4.6 4.6 0 0 1 7.5 3c0 5-7.5 9.4-7.5 9.4Z'] },
    star: { d: ['m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6L12 17.2l-5.3 2.9 1.1-6L3.4 9.9l6-.8L12 3.5Z'] },
    check: { d: ['m5 12.5 4.5 4.5L19 7.5'] },
    close: { d: ['m6 6 12 12M18 6 6 18'] },
    share: { d: ['M12 3.5v12', 'm8 7 4-3.5L16 7', 'M6 12.5H4.5v7A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-7H18'] },
    map: { d: ['m9 4.5-5 2v13l5-2 6 2 5-2v-13l-5 2-6-2Z', 'M9 4.5v13M15 6.5v13'] },
    list: { d: ['M8.5 6.5H20M8.5 12H20M8.5 17.5H20', 'M4 6.5h.01M4 12h.01M4 17.5h.01'] },
    grid: { d: ['M4 5.5h6v6H4zM14 5.5h6v6h-6zM4 14.5h6v6H4zM14 14.5h6v6h-6z'] },
    trash: { d: ['M4.5 7h15', 'M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7', 'M6.5 7l.9 12.1A1.5 1.5 0 0 0 8.9 20.5h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7'] },
    edit: { d: ['M16.5 4.5 19.5 7.5 8 19H5v-3L16.5 4.5Z', 'm14.5 6.5 3 3'] },
    download: { d: ['M12 3.5v11', 'm8 10.5 4 4 4-4', 'M4.5 18.5v1A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-1'] },
    location: { d: ['M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'] },
    sparkles: { d: ['m12 3.5 1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7L12 3.5Z', 'm18.5 15.5.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z', 'm5.5 3 .7 1.6 1.6.7-1.6.7L5.5 7.6 4.8 6 3.2 5.3l1.6-.7L5.5 3Z'] },
    chart: { d: ['M4 20V4', 'M4 20h16', 'M8 20v-6M12.5 20V9M17 20v-9'] },
    bookmark: { d: ['M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1Z'] },
    beach: { d: ['M12 21v-7', 'M12 14a5 5 0 0 0 0-10 5 5 0 0 0 0 10Z', 'M12 4V2.5', 'M3.5 18.5c2-1.4 3.6-1.4 5.5 0s3.5 1.4 5.5 0 3.6-1.4 5.5 0'] },
    roadtrip: { d: ['M4 15.5 5.8 9A2 2 0 0 1 7.7 7.5h8.6a2 2 0 0 1 1.9 1.5L20 15.5', 'M4 15.5h16v3.2a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-1v-.7H7.2v.7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3.2Z', 'M7 15.5v-3h2', 'M14 12.5h3'] },
    holiday: { d: ['M12 3.5 14.4 9l6 .7-4.4 4.1 1.2 6L12 16.8 6.8 19.8 8 13.8 3.6 9.7l6-.7L12 3.5Z'] },
    camping: { d: ['M12 4 3 19.5h18L12 4Z', 'M12 4v15.5', 'M9 19.5 12 13l3 6.5'] },
    plane: { d: ['M10.5 20.5 12 15l7.4-2.2a1.6 1.6 0 0 0 0-3.1L12 7.5 10.5 2l2 .6v5L8 9.3a1.6 1.6 0 0 0 0 3.1l4.5 1.7'] },
    city: { d: ['M3.5 20.5V6.5l7-3v17', 'M10.5 20.5V10.5h9a1 1 0 0 1 1 1v9', 'M4.5 20.5h16', 'M13.5 14h1.5M13.5 17h1.5M6.5 9h1M6.5 12.5h1M6.5 16h1'] },
    tree: { d: ['M12 3.5 6.5 12h3L6 17.5h12L14.5 12h3L12 3.5Z', 'M12 17.5v3'] },
    note: { d: ['M6 3.5h9.5L20 8v12a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5Z', 'M15 3.5V8h5', 'M8.5 13h7M8.5 16.5h5'] },
    mountain: { d: ['M2.5 20 9 7.5l4 6.5 2.5-3.5 6 9.5', 'M9 7.5 12.5 14'] },
    adventurous: { d: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'm15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1Z'] },
    relaxing: { d: ['M4 14c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5c0 1.5-1.5 2.5-3 2.5-2 0-2.5-1-5-1s-3 1-5 1c-1.5 0-3-1-3-2.5Z', 'M3 19.5c2 1 4 1 6 0s4-1 6 0 4 1 6 0'] },
    exciting: { d: ['m12 2.5 2.4 5.6 6 .6-4.5 4 1.4 5.9L12 15.5l-5.3 3.1 1.4-5.9-4.5-4 6-.6L12 2.5Z', 'M18.5 3v3M20 4.5h-3'] },
    peaceful: { d: ['M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z', 'M17 3v3.5M15.2 4.8h3.5'] },
    fun: { d: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M8.5 14.5a4.5 4.5 0 0 0 7 0', 'M9 9.5h.01M15 9.5h.01'] },
    romantic: { d: ['M12 20.5S3.5 15.6 3.5 9.9A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 8.5 3.3c0 5.7-8.5 10.6-8.5 10.6Z'] },
    refresh: { d: ['M20 12a8 8 0 1 1-2.4-5.7', 'M20.5 4v4.5H16'] },
    logout: { d: ['M15 8V6a1.5 1.5 0 0 0-1.5-1.5h-7A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 15 18v-2', 'M10.5 12H21', 'm17.5 8.5 3.5 3.5-3.5 3.5'] },
    warning: { d: ['M12 4.5 21 20H3L12 4.5Z', 'M12 10v4', 'M12 17h.01'] }
  };

  let glyph = $derived(GLYPHS[name] ?? GLYPHS.home);
  let weight = $derived(strokeWidth ?? (filled ? 0 : 1.75));
  let dimension = $derived(typeof size === 'number' ? `${size}px` : size);
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={dimension}
  height={dimension}
  fill="none"
  stroke="currentColor"
  stroke-width={weight}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
  focusable="false"
>
  {#each glyph.d as path}
    <path d={path} />
  {/each}
  {#if filled && glyph.fill}
    {#each glyph.fill as path}
      <path d={path} fill="currentColor" stroke="none" />
    {/each}
  {/if}
</svg>
