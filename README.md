# Family Adventures

A self-hosted family album for trips, everyday outings, photos, and future plans.

## What is here

- A family dashboard with recent adventures and shortcuts to planning and discovery.
- Adventure journals with dates, places, tags, drafts, and photo/video/audio uploads.
- Searchable adventure and media libraries, a map, people tagging, memories, and statistics.
- Bucket-list ideas, votes, comments, shared stories, and family reactions.
- Optional Ollama or Gemini assistance and Python face recognition.
- Password and Google sign-in, account approval, share links, and installable PWA support.

## Development

Requires Node.js 20 or later. Install dependencies with `npm ci`, then run `npm run dev`.
On Windows PowerShell with restricted script execution, use `npm.cmd`.

- `npm run check`: Svelte and TypeScript diagnostics.
- `npm run build`: production build with the Node adapter.
- `npm run preview`: preview the production build.
- `node --test tests/date-utils.test.mjs`: date regression tests (Node 24).

The stack is Svelte 5, SvelteKit 2, TypeScript, Tailwind CSS 4, and SQLite via sql.js.
The visual contract is in DESIGN.md. Pages and API routes live in src/routes;
shared UI is in src/lib/components and server integrations in src/lib/server.

## Data and configuration

SQLite defaults to `./data/family-adventures.db`; override it with `DATABASE_PATH`.
Uploads live under `data/uploads`. Back up both the database and uploads.
Never commit environment files or family data. Configure a strong `SESSION_SECRET`.
Optional integrations read their environment configuration in the corresponding
server modules; AI settings may also be managed through the app settings.

## Docker

The Dockerfile builds the SvelteKit Node server on port 3000 and includes Python,
Pillow, ffmpeg, InsightFace, and ONNX Runtime. Persist `/app/data` in deployment.
Deployment routing and Cloudflare setup follow the parent workspace runbook.

For PWA updates behind Cloudflare, bypass edge caching for `/sw.js` and
`/manifest.webmanifest`; keep versioned application assets immutable.
