# Work Agenda

A simple, private, **editable** web version of the WORK AGENDA table — the front
page *is* the working page. It looks like the original PDF agenda (white
background, black borders, grey headers, centred section headings), but every
cell is live and editable, and everything saves automatically to your browser.

No backend, no database, no login. Just a static front-end that stores its data
in `localStorage`.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) (via the official Vite plugin)
- `localStorage` for persistence
- [pdf.js](https://mozilla.github.io/pdf.js/) for local PDF text extraction (lazy-loaded)
- **Rachel**, an AI assistant powered by the [Anthropic API](https://docs.anthropic.com/) via a small server route

## Rachel (AI assistant)

**Rachel** is the floating assistant (bottom-right). Type a question and it goes
to Anthropic through a secure server route, **with your current agenda as
context**, so she can answer about matters, priorities, waiting items and court
dates. Drop a PDF and she extracts the text **locally** and proposes agenda
updates you confirm with **Apply / Cancel** (nothing is applied silently).

### Set your API key

The key is read **only on the server** (the API routes + the Vite dev
middleware) and is never bundled into the browser. The same endpoints
(`/api/chat`, `/api/extract-agenda`) are implemented for several hosts:

- **Local dev** — a Vite middleware (`vite.config.js`) reads `.env`.
- **Cloudflare Pages** — `functions/api/*.js` (read `env.ANTHROPIC_API_KEY`).
- **Vercel** — `api/*.js` (read `process.env.ANTHROPIC_API_KEY`).

All three reuse one runtime-agnostic helper, `api/_anthropic.js`.

1. Copy `.env.example` to `.env`.
2. Set `ANTHROPIC_API_KEY=...` (optionally `ANTHROPIC_MODEL`, defaults to `claude-sonnet-4-6`).
3. `npm run dev` — chat now uses Anthropic.

If the key or route is unavailable, Rachel automatically **falls back to local
answers** (urgent / waiting / court-date / summarise) so the app keeps working.

### Deploy on Cloudflare Pages

1. Connect the GitHub repo in the Cloudflare dashboard (Workers & Pages → Create → Pages → Connect to Git).
2. Settings: **Framework preset** `Vite` · **Build command** `npm run build` · **Build output directory** `dist` · **Root directory** `/`.
3. Add the secret **`ANTHROPIC_API_KEY`** under Settings → Variables and Secrets (Production).
4. Deploy. The `functions/api/*` routes are picked up automatically — no extra config.

### Privacy

When you use Rachel, your **chat messages, the current agenda data, and any text
extracted from a dropped PDF** may be sent to Anthropic to generate a response.
Uploaded PDFs are **not stored** — only their extracted text is read in the
browser and kept in memory for the current chat (cleared on "Clear chat"). If
you don't set an API key, nothing is sent anywhere (local mode only).

## What it does

- Title **WORK AGENDA**, editable month (June 2026) and the two names top-right.
- The four-column table: **Matter · Previous Action · Next Steps · Next Court Date**.
- Pre-loaded with the matters extracted from the PDF, under the **HIGH PRIORITY**
  and **RELLO** section headings.
- Click any cell to edit it. Changes auto-save.
- **Previous Action** and **Next Steps** are task lists: each bullet has a
  checkbox, editable text, a delete (×) button, and there's an "+ Add task" button.
- Per-matter **Priority** (Critical / High / Medium / Low / Waiting) and
  **Status** (Not Started / In Progress / Waiting on Client / Waiting on Counsel /
  Waiting on Other Side / Filed / Completed) pickers.
- Control bar: **Search**, **Filter by priority**, **Filter by status**,
  **Add Matter**, **Add Section**, **Reset Demo Data**, **Print / Export PDF**.
- Per-matter controls: move up/down, duplicate, delete, and move to another section.
- Per-section controls: add, rename (click the title), delete (only when empty).

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer (includes `npm`).

## Install dependencies

```bash
cd work-agenda
npm install
```

## Run locally (development)

```bash
npm run dev
```

Then open the URL it prints (usually <http://localhost:5173>).

## Build for production

```bash
npm run build
```

The static site is output to the `dist/` folder.

## Preview the production build

```bash
npm run preview
```

## Deploy cheaply (free tiers)

This is a static site, so hosting is free on either platform.

### Netlify

1. Push this folder to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Build command: `npm run build` — Publish directory: `dist`.
4. Deploy.

Or, without Git, drag-and-drop the `dist/` folder onto <https://app.netlify.com/drop>.

### Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project**, import the repo.
3. Vercel auto-detects Vite (build `npm run build`, output `dist`). Deploy.

Or via CLI:

```bash
npm i -g vercel
vercel        # follow the prompts
```

## Where the data lives

- All edits are stored in your browser under the `localStorage` key
  `work-agenda-v1` (see `src/storage.js`).
- Because it's per-browser, the data is private to this machine/browser and is
  **not** shared between devices. (That's the "quick, cheap, simple" trade-off —
  see *Going further* below if you later want shared/multi-device data.)
- **Reset Demo Data** wipes your edits and reloads the original PDF agenda.

## Customising

- **Starter data** (the matters from the PDF): `src/seedData.js`.
- **Priority / status options and colours**: `src/constants.js`.
- **Layout / table look**: `src/App.jsx` and `src/components/`.
- **Print styles**: the `@media print` block in `src/index.css`.

## Project structure

```
work-agenda/
├─ index.html
├─ package.json
├─ vite.config.js
├─ src/
│  ├─ main.jsx            # entry point
│  ├─ App.jsx             # state, all actions, page layout + table
│  ├─ index.css           # Tailwind import + button & print styles
│  ├─ seedData.js         # initial data extracted from the PDF
│  ├─ storage.js          # localStorage load/save
│  ├─ constants.js        # priority/status options + colours
│  ├─ utils.js            # uid() id generator
│  └─ components/
│     ├─ ControlBar.jsx   # search, filters, page actions
│     ├─ MatterRow.jsx    # one matter (the 4 cells + controls)
│     ├─ TaskList.jsx     # checkable bullet list
│     └─ Editable.jsx     # inline text editor (input / auto-grow textarea)
```

## Going further (optional, later)

Version 1 is intentionally local-only. If you later want the agenda shared
across devices or between the two of you, the cheapest next step is to swap
`src/storage.js` for a tiny hosted store (e.g. Supabase free tier, or a JSON
blob on a serverless function) — the rest of the app wouldn't need to change much.
