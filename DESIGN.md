# Family Adventures Design System

> The implementation contract for this app. Every color, size, spacing step, component
> pattern, and motion value in `src/` must trace back to a token named here.
> If a value is needed and is not here, add it here **first**, then use it.

---

## 1. Atmosphere & Identity

A family scrapbook that happens to be an app. Warm paper, evergreen ink, terracotta
accents, and a serif that reads like a photo album caption. It should feel like flipping
through a well-kept album on a couch — unhurried, personal, tactile — and it should feel
like it was built by Apple, because on a phone that is what "feels right" means.

**The signature is layered warm paper under cool frosted glass.** Content sits on
parchment surfaces with soft, hue-tinted shadow; navigation floats above it as a
translucent, blurred material that picks up the paper's warmth underneath. Scroll and the
chrome condenses. Nothing is a flat rectangle on a flat background.

**Direction (locked):** keep the warm brand (`cream` / `forest` / `terra` / `gold` /
`ink`), keep the Playfair Display + Inter editorial pairing, and add a rigorous iOS-native
**behavior layer** on top. The app must be mobile-first at 375px and degrade upward. This is
not an Apple reskin — the warmth is the product.

---

## 2. Color

### 2.1 Brand ramp (existing — unchanged)

These are the identity. Do not modify, re-tune, or introduce a second accent family.

| Token | Ramp | Role |
|-------|------|------|
| `--color-cream-50…900` | `#FBF7F0 → #3D3020` | Parchment surfaces, light background |
| `--color-forest-50…900` | `#EDF4EF → #12251E` | Evergreen — primary action, navigation, success |
| `--color-terra-50…900` | `#FDEAE1 → #4A1B10` | Terracotta — emphasis, labels, destructive |
| `--color-gold-50…900` | `#FBF6E9 → #3F2A0D` | Amber — highlights, streaks, celebration |
| `--color-ink-50…900` | `#F9F7F3 → #1E1A15` | Espresso — all body text |

Rules:
- **One accent family per surface role.** `forest` is action/navigation. `terra` is
  emphasis and destructive. `gold` is decorative highlight only, never an action color.
- Never a raw hex outside this document. Extend the ramp before adding a stop.
- Shadows carry the warm hue (`rgba(62, 48, 32, …)`), never pure black — pure-black shadow
  on parchment reads grey and dirty.

### 2.2 Semantic surface tokens (new — this is the iOS layer)

The brand ramp is a *palette*, not a *surface system*. iOS UI is organized around named
surface roles that flip with the color scheme. These tokens are the new source of truth for
backgrounds, and they are what every component should reference.

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface / base | `--surface-base` | `#FBF7F0` | `#000000` | Page background |
| Surface / grouped | `--surface-grouped` | `#F6EFE3` | `#0B0B0B` | Inset list groups, page bands |
| Surface / card | `--surface-card` | `#FFFDF8` | `#141210` | Cards, list rows, panels |
| Surface / elevated | `--surface-elevated` | `#FFFFFF` | `#1C1917` | Sheets, popovers, menus |
| Surface / chrome | `--surface-chrome` | `rgba(251,247,240,.82)` | `rgba(10,10,10,.76)` | Nav bar, tab bar (frosted) |
| Surface / scrim | `--surface-scrim` | `rgba(30,26,21,.38)` | `rgba(0,0,0,.55)` | Modal/sheet backdrop |
| Text / primary | `--text-primary` | `#2C2721` | `#F6EFE3` | Headlines, body |
| Text / secondary | `--text-secondary` | `#6F6556` | `#A99E8C` | Captions, metadata |
| Text / tertiary | `--text-tertiary` | `#6F6556` | `#A99E8C` | Disabled, hints |
| Text / on-accent | `--text-on-accent` | `#FFFFFF` | `#FFFFFF` | Text on forest/terra fills |
| Border / default | `--border-default` | `rgba(207,183,150,.55)` | `rgba(120,110,95,.28)` | Card edges, field outlines |
| Border / subtle | `--border-subtle` | `rgba(224,210,183,.75)` | `rgba(90,82,70,.24)` | Row separators, soft splits |
| Accent / action | `--accent-action` | `#3B6F54` | `#6F9F7F` | Primary buttons, active tab, focus |
| Accent / pressed | `--accent-pressed` | `#2F5A43` | `#4C8567` | Pressed fill |
| Status / success | `--status-success` | `#2F5A43` | `#6F9F7F` | Confirmations |
| Status / warning | `--status-warning` | `#A36F23` | `#E0C079` | Cautions |
| Status / error | `--status-error` | `#AD422A` | `#EA8A6C` | Errors, destructive |
| Status / info | `--status-info` | `#3B6F54` | `#A7CCAD` | Informational |

**`ink-300` and `ink-400` are decorative-only.** On `cream-50` they measure 2.4:1 and
3.6:1 — both fail AA for text. They are legal for borders, dividers, placeholder glyphs,
disabled states, and decoration. Any *text* usage in light mode must be `ink-500` or
darker. In dark mode the ordering inverts and `ink-300` is fine on near-black, so
`dark:text-ink-300` is allowed; `dark:text-ink-400` is not needed at all.

**Dark mode is OLED-black, not warm-brown.** `--surface-base` is true `#000000` so the
family's photos are the only light source on an iPhone at night. Elevation in dark mode is
carried by *lighter warm-tinted greys stepping upward* (`#0B0B0B → #141210 → #1C1917`),
exactly the way iOS separates grouped content on black.

### 2.3 Contrast floors

- Body text ≥ **4.5:1** against its own surface. Metadata/captions ≥ **4.5:1** — the old
  `ink-300` (`#AB9F8C`) on `cream-50` is 2.1:1 and **fails**; captions use
  `--text-secondary` or darker.
- Non-text UI (borders on interactive controls, focus rings) ≥ **3:1**.
- Never convey state by color alone — pair with an icon, weight, or label.

---

## 3. Typography

### 3.1 Font stacks

```
--font-sans:  -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif;
--font-display: 'Playfair Display', 'New York', Georgia, serif;
```

**`-apple-system` leads the sans stack on purpose.** On an actual iPhone the app renders in
real SF Pro — the single highest-leverage move for "iPhone feel," because SF's native
letterforms, optical sizing, and native tracking are what the platform expects. Every other
platform gets Inter, which is the accepted free SF Pro substitute. Headings stay Playfair
everywhere, because that is the brand.

- Max **2** families. Body text never below 14px. Mono not currently used — if added, use
  `ui-monospace, 'SF Mono', 'JetBrains Mono', monospace`.

### 3.2 Scale

| Level | Size | Weight | Line height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Large title | `clamp(2rem, 1.5rem + 2.2vw, 2.75rem)` | 700 | 1.08 | -0.022em | iOS collapsing nav title, page hero |
| Title 1 | `clamp(1.5rem, 1.25rem + 1.1vw, 2rem)` | 700 | 1.14 | -0.018em | Section header |
| Title 2 | 1.25rem / 20px | 600 | 1.22 | -0.012em | Card title, list section |
| Title 3 | 1.0625rem / 17px | 600 | 1.29 | -0.008em | Row title, control label |
| Body | 1rem / 16px | 400 | 1.5 | -0.011em | Default text (iOS body floor) |
| Callout | 0.9375rem / 15px | 400 | 1.47 | -0.006em | Secondary body, descriptions |
| Footnote | 0.8125rem / 13px | 400 | 1.38 | 0 | Metadata, timestamps |
| Caption | 0.75rem / 12px | 500 | 1.33 | 0.006em | Labels, tab bar text |
| Micro | 0.6875rem / 11px | 600 | 1.27 | 0.04em | Overline, badge, legal |
| Numerals | inherit | inherit | inherit | — | Always `font-variant-numeric: tabular-nums` |

### 3.3 Rules

- Sentence case for all headings. Never Title Case On Every Header.
- Display sizes use negative tracking; micro labels use positive. Match the table.
- Body paragraphs cap at ~65ch (`max-width: 65ch`) and use `text-wrap: pretty`.
- Tabular numerals on every stat, count, date, and currency value.
- `text-wrap: balance` on headings so no orphan word lands on its own line.

---

## 4. Spacing, Radius & Layout

### 4.1 Spacing — base unit 4px

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Icon-to-label, hairline gaps |
| `--space-2` | 8px | Compact list internals, inline groups |
| `--space-3` | 12px | Default field padding, list row gaps |
| `--space-4` | 16px | Standard card padding, screen gutter |
| `--space-5` | 20px | Comfortable section inner spacing |
| `--space-6` | 24px | Card padding (default) |
| `--space-8` | 32px | Between card groups |
| `--space-10` | 40px | Between page sections |
| `--space-12` | 48px | Major section breaks |
| `--space-16` | 64px | Page-level vertical rhythm |
| `--space-20` | 80px | Hero spacing |
| `--space-24` | 96px | Maximum section separation |

**Mobile screen gutter is `--space-4` (16px).** Desktop grows to 24px/32px. Content max
width `1280px`, centered.

### 4.2 Radius scale

iOS uses deliberate radius tiers, not one rounded-everything value.

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | 6px | Chips, tiny tags, input fields |
| `--radius-sm` | 10px | Inline controls, small buttons, thumbnails |
| `--radius-md` | 14px | Buttons, list rows, inputs |
| `--radius-lg` | 20px | Cards, panels |
| `--radius-xl` | 28px | Sheets, large modules, hero cards |
| `--radius-full` | 9999px | Pills, avatars, badges, FAB |

The old blanket `1.25rem` maps to `--radius-lg`. Inner elements are **tighter** than their
container — never the same radius inside and out.

### 4.3 Breakpoints — mobile-first

| Name | Width | Change |
|------|-------|--------|
| base | 0–639px | **Primary target.** Single column. Bottom tab bar. 375px is the design width. |
| `sm` | 640px | Two-column grids begin |
| `md` | 768px | Wider gutters, 3-col grids |
| `lg` | 1024px | Desktop chrome: top nav bar replaces bottom tab bar |
| `xl` | 1280px | Max content width reached |

Below `lg` the bottom tab bar is the primary navigation. At `lg`+ it is replaced by a
sticky top nav. Never both. Every layout is authored base-first and enhanced upward.

### 4.4 iOS viewport & safe-area contract

- **Never `100vh` and never `h-screen`.** Use `min-height: 100dvh` for full-height shells.
  `100vh` on iOS Safari is the *largest* viewport, so content overflows by exactly the
  height of the collapsing URL bar.
- Top safe area: `padding-top: max(env(safe-area-inset-top), 8px)`.
- Bottom: the tab bar reserves `49px + env(safe-area-inset-bottom)`; page content
  reserves the same via `padding-bottom`.
- Horizontal: `padding-inline: max(env(safe-area-inset-left), var(--space-4))`.
- Under `apple-mobile-web-app-status-bar-style: black-translucent` the web view extends
  under the status bar, so **every** fixed top chrome must carry its own top inset.

---

## 5. Components

Primitives live in `src/lib/components/`. Reusable patterns, their states, and their
iOS behavior. Anything used 2+ times belongs here and gets documented here.

### 5.1 `Icon`
- **Structure:** single inline SVG sprite component, `24×24` viewBox, `stroke: currentColor`.
- **Variants:** named set only (see 5.10).
- **States:** n/a (inherits color from parent).
- **Accessibility:** decorative by default (`aria-hidden="true"`). Pass `label` to make it
  announce; never leave an icon-only control unlabelled.
- **Rule:** replaces the per-page inline `<path>` blobs and the `iconFor()` string map.
  One stroke weight (`1.75` regular, `2.25` for selected/emphasis) across the whole app.
  No emoji, ever, as icons.

### 5.2 `NavBar` (iOS large-title)
- **Structure:** fixed top bar, two tiers — compact tier (44pt, blurred, hairline bottom
  border, centered or leading title) and large title tier (34pt bold, collapses on scroll).
- **Variants:** `large` (default, root tabs), `compact` (detail pages), `transparent`
  (over media, e.g. gallery lightbox).
- **States:** expanded, collapsed (scroll > 8px), over-scrolled (hairline appears).
- **Behavior:** collapsing is driven by `transform`/`opacity` only — never `height`.
  Back button is a leading chevron + previous screen label, truncating at 120px.
- **Accessibility:** title is `h1` when expanded; collapses to visually-hidden text when
  compact. `aria-current="page"` on the active root.
- **Scroll owner:** the document.

### 5.3 `TabBar` (iOS bottom tab bar)
- **Structure:** fixed bottom bar, `49px` content height + `env(safe-area-inset-bottom)`,
  frosted `--surface-chrome`, 1px top hairline. 4 root destinations + 1 center action slot.
- **States:** active (filled icon, `--accent-action`, 600 weight label), inactive
  (1.6px stroke, `--text-secondary`), pressed (label dims).
- **Behavior:** 44pt minimum hit area per item. Center slot is a 48pt raised circle with a
  ring, sitting 8px proud of the bar.
- **Accessibility:** `<nav aria-label="Main">`; each link `aria-current="page"`.
- **Layout:** cluster, equal flex, items bottom-aligned.

### 5.4 `Sheet` (bottom sheet, iOS detent)
- **Structure:** scrim + panel anchored to bottom, `--radius-xl`, drag handle, safe-area
  bottom padding.
- **Variants:** `medium` (half height), `large` (near full).
- **States:** closed, dragging, open, closing.
- **Behavior:** drag-to-dismiss with rubber-band resistance past the top detent; backdrop
  tap closes; focus trapped while open; `Esc` closes; body scroll locked; returns focus to
  the trigger on close. Enter/exit 400ms on the iOS sheet curve `cubic-bezier(0.32,0.72,0,1)`.
- **Accessibility:** `role="dialog"` + `aria-modal="true"`, labelled by its title.

### 5.5 `PullToRefresh`
- **Structure:** a spinner + label revealed by overscrolling a scroll container at `scrollTop === 0`.
- **States:** idle, armed (threshold crossed), refreshing, complete.
- **Behavior:** rubber-band (`overscroll-behavior-y: contain`), triggers at 64px of
  overscroll, springs to a 52px holding position while refreshing, then collapses. Disabled
  when the container is already mid-scroll-up or when reduced motion is set.
- **Accessibility:** a real `<button>` at the top of the list, reachable by keyboard/AT, so
  refresh is not gesture-only.

### 5.6 `SegmentedControl`
- **Structure:** pill track, `--radius-sm`, 2–4 options, animated selection indicator.
- **Variants:** 2–4 segments. Destructive tint for "destructive" segments.
- **States:** selected, unselected, pressed, disabled.
- **Behavior:** indicator slides via `transform`/`width`; 44pt tall; full-width option
  distribution. ARIA `role="tablist"` when it drives panels, `role="radiogroup"` otherwise.

### 5.7 `ListRow`
- **Structure:** horizontal row in an inset grouped list — leading accessory (avatar/icon),
  title + optional subtitle, trailing accessory (value, chevron, switch), optional
  1px separator inset to the leading edge.
- **Variants:** plain, with-icon, with-avatar, with-value, destructive, disclosure.
- **States:** default, pressed (fill shifts), disabled, selected.
- **Behavior:** whole row is the tap target, min 44pt; separators inset to align with the
  title, never full-bleed. Press feedback is a background fill change plus
  `scale(0.985)`, ≤120ms.
- **Accessibility:** row is a single link/button; title is the accessible name; chevron is
  `aria-hidden`.

### 5.8 `Button`
- **Variants:** `primary` (forest fill), `secondary` (tinted surface + border), `ghost`
  (label only), `destructive` (terra fill), `fab`.
- **States:** default, hover (pointer devices only), pressed (`scale(0.97)` + darker fill),
  focus-visible (2px ring, 3px offset), disabled (40% opacity, no pointer events),
  loading (label swaps to a spinner, width held to prevent layout shift).
- **Behavior:** minimum 44×44pt hit area even when the visual box is smaller.
- **Accessibility:** real `<button type>`; `aria-busy` while loading.

### 5.9 `Input` / `Field` + `Switch` / `ButtonRow`
- `Field`: label above, input at `--radius-md`, helper/error text below. Error swaps the
  border to `--status-error` and is linked via `aria-describedby`. `font-size ≥ 16px` at
  all breakpoints — smaller input text makes iOS Safari zoom on focus.
- `Switch`: 51×31pt track, 27pt knob, 250ms iOS ease, respects `prefers-reduced-motion`,
  `role="switch"` + `aria-checked`.
- `ButtonRow`: destructive confirm/cancel pair, cancel is the safe default and is styled
  neutral, never both buttons filled.

### 5.10 Icon set (named, single stroke weight)

`home`, `compass`, `pin`, `photo`, `bell`, `moon`, `sun`, `plus`, `more`, `chevron-left`,
`chevron-right`, `chevron-down`, `search`, `filter`, `settings`, `person`, `people`,
`calendar`, `camera`, `heart`, `star`, `check`, `close`, `share`, `map`, `list`, `grid`,
`trash`, `edit`, `download`, `location`, `sparkles`, `chart`, `bookmark`. No other glyphs.

---

## 6. Motion & Interaction

### 6.1 Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 100–140ms | `cubic-bezier(0.2, 0, 0, 1)` | Button press, toggle, tab indicator |
| Standard | 250–300ms | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheet present, nav collapse, menu |
| Emphasis | 400–500ms | `cubic-bezier(0.32, 0.72, 0, 1)` | Page transition, pull-to-refresh spring |
| Scroll-driven | tied to scroll | linear | Nav collapse, parallax, progress |

### 6.2 Rules

- **Animate only `transform` and `opacity`.** Never `width`, `height`, `top`, `left`,
  `margin`, or `padding`. The selection indicator uses a scaled pseudo-element, not layout.
- Every interactive element has visible `:hover` (pointer devices), `:active`, and
  `:focus-visible` states. Hover is inside `@media (hover: hover)`.
- Motion must communicate something — press confirmation, state change, spatial origin.
  No decorative loops, no motion on non-interactive elements, no gratuitous parallax.
- Scroll-driven reveals use `IntersectionObserver`, never a `scroll` listener in
  component code. The only justified scroll listener is the nav-collapse threshold and it
  must be `{ passive: true }` and rAF-throttled.
- `@media (prefers-reduced-motion: reduce)` reduces every duration to 0.01ms, disables
  pull-to-refresh animation, and replaces skeleton shimmer with a static block. This is a
  hard requirement, not a nicety.

### 6.3 iOS interaction behaviors to implement

1. **Edge-swipe back** — a drag starting within 20px of the left screen edge (or from the
   back chevron) drives a horizontal translate + dim, and commits a SvelteKit `back()`
   past 50% width or a 500px throw. Must not hijack horizontal scrolling inside carousels
   or Leaflet map drags.
2. **Tap highlight reset** — `-webkit-tap-highlight-color: transparent` globally; every
   control supplies its own press state instead.
3. **Overscroll** — `overscroll-behavior-y: none` on `html`/`body` to kill the browser
   pull-to-refresh; scroll containers opt back in with
   `overscroll-behavior-y: contain` so pull-to-refresh works without page-level bounce.
4. **No text-selection callout on controls** — `user-select: none` on buttons, tab items,
   and nav; text remains selectable in content.
5. **Momentum** — `-webkit-overflow-scrolling: touch` is legacy; native momentum is
   automatic. Do **not** add JS smooth-scroll hijacking — it breaks iOS scrolling.
6. **No `scroll-behavior: smooth` on `html`** — it makes iOS rubber-band feel broken.
   Smooth-scroll only explicit anchors, and only if the target is not already in view.
7. **Haptic proxy** — `navigator.vibrate` (where supported) on destructive confirm and
   pull-to-refresh arm. Never on scroll or passive taps.

---

## 7. Depth & Surface

**Strategy: mixed — hue-tinted shadow for paper surfaces, frosted translucency for chrome.**

| Level | Treatment | Usage |
|-------|-----------|-------|
| 0 | Flat `--surface-base` | Page background |
| 1 | `1px --border-subtle`, no shadow | Inset rows, quiet panels |
| 2 | `--radius-lg` + shadow `--shadow-card` | Cards at rest |
| 3 | `--shadow-elevated` | Popovers, menus, FAB |
| 4 | Scrim + `--shadow-sheet` | Sheets, modals |
| Chrome | `backdrop-filter: blur(20px) saturate(180%)` + hairline + inner highlight | Nav bar, tab bar |

| Shadow token | Value |
|--------------|-------|
| `--shadow-card` | `0 1px 2px rgba(62,48,32,.05), 0 4px 16px rgba(62,48,32,.06)` |
| `--shadow-elevated` | `0 2px 6px rgba(62,48,32,.07), 0 12px 32px rgba(62,48,32,.12)` |
| `--shadow-sheet` | `0 -8px 40px rgba(30,26,21,.18)` |
| `--shadow-fab` | `0 6px 20px rgba(59,111,84,.38)` |

Rules:
- Single consistent light source: **above**. Every shadow's darkest stop sits above the
  element. Never mix an under-shadow and a side-shadow.
- Chrome material is a *recipe*, not a lone `blur()`: translucent fill + backdrop blur +
  saturate + 1px hairline + inner top highlight. A single `backdrop-filter` is the flat trap.
- Glass is for **chrome only** (nav, tab bar, sheets). Never put a blurred glass card behind
  body content — it destroys text contrast and costs paint performance on mobile.

### Z-index scale (replaces ad-hoc values like `z-index: 9999`)

| Token | Value | Layer |
|-------|-------|-------|
| `--z-base` | 0 | Content |
| `--z-raised` | 10 | Sticky headers, card hover lift |
| `--z-chrome` | 40 | Nav bar, tab bar |
| `--z-overlay` | 60 | Menus, popovers |
| `--z-sheet` | 70 | Sheets, drawers |
| `--z-scrim` | 65 | Backdrops (sits under sheet content) |
| `--z-toast` | 80 | Toasts, banners |
| `--z-skip` | 100 | Skip link |

---

## 8. Accessibility Constraints & Accepted Debt

### Constraints
- **WCAG 2.2 AA.** Contrast floor 4.5:1 body / 3:1 large text and UI. Enforced, including
  for captions — the current `ink-300` on `cream-50` is 2.1:1 and must not ship.
- Every interactive element is keyboard reachable with a visible `:focus-visible` ring
  (2px `--accent-action`, 3px offset). Focus is never trapped except inside an open sheet,
  where it must be returned to the trigger on close.
- Every input has a programmatic label. Icon-only controls have an accessible name.
- Tap targets ≥ 44×44pt (Apple HIG). Adjacent targets get ≥ 8px separation.
- `prefers-reduced-motion` respected globally (Section 6.2).
- `prefers-color-scheme` honored live, even when the user has set a manual override — the
  override wins but the system listener stays live so returning to "System" works without
  a reload.
- No information conveyed by color alone.
- No emoji as UI content or icons.
- Light and dark themes are both first-class; neither is an afterthought inversion.

### Accepted Debt
| Item | Location | Why accepted | Owner / Exit |
|------|----------|--------------|--------------|
| Inter still leads the sans stack off-Apple platforms | `app.css` `--font-sans` | SF Pro is not web-distributable; Inter is the accepted substitute and keeps desktop identity consistent | Replace if a licensed SF webfont becomes available |
| `BeachScene` canvas background is a fixed full-bleed painted layer | `+layout.svelte` | Brand signature; it is `aria-hidden`, non-interactive, and disabled under reduced motion | Keep |
| Leaflet map does not adopt iOS chrome | `/map` | Leaflet's own control styling; a full iOS skin is a separate project | Follow-up if the map becomes a primary surface |
| Local images are served unoptimized from disk | `data/` | Self-hosted single-file SQLite deployment; no CDN budget | Revisit if payload becomes the bottleneck |
| Emoji remain as **content** in feed reactions and star ratings | `feed/+page.svelte`, `adventures/[slug]/+page.svelte` | Hearts and stars are user-authored reaction values, not UI iconography, so they are legitimately emoji. The structural cases (adventure type / mood pickers, bucket-list categories, activity-type icons) were migrated to `Icon.svelte`. | Migrate the ratings to the `star` icon if the family ever wants a non-emoji visual voice |
| `text-ink-300` / `text-ink-400` still used for borders and decoration | various | Legal per §2.2; only *text* usage was migrated to `ink-500` | — |
