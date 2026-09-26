# Family Adventures

Self-hosted family Christmas wish-list app. A parent dashboard plus a kid portal with budget limits, URL scraping, share links for relatives, a 12 Days board, countdown, and PWA "share to list" support.

## Features

- **Kid portal** — each kid gets a 4-digit PIN, their own list, drag-to-move items, and a confetti moment when they hit a spending milestone.
- **Budget rules** — Big (max 3), Small (max 5), Wildcard (max 1, uncapped). Optional soft ceiling (default 60%) with green / amber / red progress bands.
- **URL scraping** — add an item by pasting a link; title/image are fetched from the page's OpenGraph tags (rate-limited, SSRF-guarded).
- **Share links** — revocable magic links (per-kid and whole-family) so relatives can view lists and claim items ("Grandma will buy this!") without an account.
- **Surprise mode** — items can be marked as surprises; they are hidden from the kid's own list and from share views (kept in "the vault").
- **12 Days board & countdown** — festive homepage that kids and parents both see.
- **PWA** — installable, with a Web Share Target so kids can share a product link straight into their list from any phone browser.

## Tech

- Next.js 15 (App Router) + React 19 + TypeScript
- Prisma 6 + SQLite (single-file DB, easy backup)
- Tailwind CSS v4
- Custom auth: scrypt-hashed parent password + per-kid PIN, JWT sessions (jose)
- Docker (multi-stage, non-root) / Coolify / Cloudflare Tunnel

## Local development

```bash
npm install
# copy .env.example to .env and set SESSION_SECRET (openssl rand -base64 32)
npm run dev
```

- Open `http://localhost:3000` — the first visit to `/login` bootstraps the parent admin account (shown only while no admin exists).
- `npm run build` + `npx tsc --noEmit` should be clean.
- The SQLite file lives at `prisma/data/christmas.db` (relative Prisma paths are resolved from the schema directory).

### Seeding

```bash
npx prisma migrate deploy   # apply migrations to a fresh DB
node prisma/seed.mjs        # idempotent: 2026 year + 6 placeholder kids
```

## Docker

```bash
# optional: prefill env
cp .env.example .env

docker compose up -d --build
```

- DB and migrated/seed are handled automatically on container start.
- The database is stored in a Docker volume at `/app/data` (SQLite file `christmas.db`) — **back this up**; it is the entire app's data.
- Runtime env vars: `DATABASE_URL` (defaults to `file:/app/data/christmas.db` inside the container), `SESSION_SECRET`, `NEXT_PUBLIC_BASE_URL`, `TZ`.

### Building yourself

```bash
docker build -t santas-list .
docker run -d -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  -e SESSION_SECRET="$(openssl rand -base64 32)" \
  -e NEXT_PUBLIC_BASE_URL="https://christmas.yourdomain.com" \
  --restart unless-stopped santas-list
```

- DB and migrated/seed are handled automatically on container start.
- The database is stored in a Docker volume at `/app/data` (SQLite file `christmas.db`) — **back this up**; it is the entire app's data.
- Runtime env vars: `DATABASE_URL` (defaults to `file:/app/data/christmas.db` inside the container), `SESSION_SECRET`, `NEXT_PUBLIC_BASE_URL`, `TZ`.
- First visit to `/login` creates the parent account — do that before sharing any links.

## PWA / iOS notes

- "Add to Home Screen" works on iOS 16.4+; on iOS the Web Share Target appears in the share sheet when the installed app is running Safari share.
- If icons look stale, regenerate with `node scripts/generate-icons.mjs`.

### Required: bypass the edge cache for the service worker

`sw.js` and `manifest.webmanifest` are static files served by the adapter's static
handler, so application code cannot set headers on them — they arrive with a 4-hour
`max-age`. Behind Cloudflare that means the edge holds a **stale service worker**
for hours after a deploy. The worker precaches the previous build's hashed chunks and
keeps serving the old app, so a deploy that succeeded looks like one that never
landed, and repeat visits never pick up new code.

Add a Cloudflare Cache Rule (Rules → Cache Rules → Create rule):

- **Expression:** `(http.request.uri.path eq "/sw.js") or (http.request.uri.path eq "/manifest.webmanifest")`
- **Action:** Bypass cache

Then purge the cached `/sw.js` once (`Caching → Configuration → Purge Everything`, or
purge by URL) so the rule takes effect immediately rather than after the current
4-hour TTL rolls off. HTML documents are already `no-cache, must-revalidate` from
`src/hooks.server.ts`; hashed assets under `/_app/immutable/` stay immutable for a year
by design.

## Project layout

```
prisma/schema.prisma       data model
prisma/seed.mjs            idempotent seed
lib/                       prisma client, auth, session, budget, scrape, guards
app/actions/               server actions (auth, admin, items, share)
app/admin/                 parent dashboard
app/kid/                   kid portal
app/share/                 relative share links
app/api/                   scrape + health endpoints
components/                UI (KidListApp, AddItemModal, ShareLinkBlock, ...)
scripts/                   icon generation, smoke tests
public/                    PWA assets + service worker
```