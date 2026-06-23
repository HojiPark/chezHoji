# Boeun's Classic Mac Blog — Design Spec

**Date:** 2026-06-23
**Author:** Boeun Park (Claire)
**Status:** Approved

## Concept

An extremely simple personal blog that combines:
- **Bear Blog's radical minimalism** — posts only, no clutter
- **Classic Mac OS look** (System 7 / Platinum) via `system.css`
- **One markdown post per day**

The guiding principle is **"아주 심플" (dead simple)**: no build step, no server, nothing to install. Just edit files.

## Location

`~/Development/my-blog/` — a brand-new folder, fully separate from `world-model-demos`.

Note: the 9:16 asset rule from `world-model-demos/CLAUDE.md` does NOT apply here — this is a different project.

## Stack

100% static — plain HTML / CSS / JS. No build, no backend, no install.

| Concern | Choice | Notes |
|---|---|---|
| Markdown rendering | `marked.js` via CDN | client-side, renders `.md` in the browser |
| Visual theme | `system.css` | classic Mac OS chrome (striped title bar, beveled buttons, Chicago/Geneva pixel font) |
| Likes | free counter API (e.g. a hosted hit-counter service) | persists a shared count across visitors; no backend to run |
| Email / contact | Formspree (free tier) | visitor submits a small form → email arrives in Boeun's inbox |

The like-counter and Formspree are the only external dependencies, and both are free, no-backend services. This is what lets the blog stay purely static while the like button and email form genuinely work.

## Folder structure

```
my-blog/
├── index.html        ← post list + header
├── post.html         ← single post view (body + likes + email)
├── style.css         ← classic-Mac styling layered on system.css
├── app.js            ← loads markdown, renders, wires likes + email
├── posts.json        ← post index, one line per day
└── posts/
    ├── 2026-06-23.md
    ├── 2026-06-24.md
    └── ...
```

No build script. Adding a post is a manual 2-step (chosen over a `node build.js` automation specifically to avoid requiring a Node install).

## How posting works (daily, 2 steps)

1. Create `posts/YYYY-MM-DD.md` and write the post in markdown.
2. Add one line to `posts.json`:
   ```json
   { "date": "2026-06-24", "title": "오늘의 제목" }
   ```

Save the files — it's live. No command to run.

`posts.json` is the source of truth for the list and ordering (newest first, by date).

## Screens

### List view (`index.html`)

A single Mac window containing:
- **Header / identity block** at top:
  - Pixel-art portrait (placeholder for now — see Future Work)
  - Main line: **"This is Boeun Park"**
  - Subtitle: **"(also Claire)"**
- A divider, then the **post list**: `date · title ▸`, newest first, each linking to `post.html?date=YYYY-MM-DD`.

```
╔═══════════════════════════════════════╗
║ ▦  My Blog                       □  ✕ ║
╠═══════════════════════════════════════╣
║  ┌──────┐                             ║
║  │ ▦▦▦ │  This is Boeun Park          ║
║  │ ☕🌿 │  (also Claire)               ║
║  └──────┘                             ║
║ ───────────────────────────────────── ║
║   2026-06-24   오늘의 제목 ▸           ║
║   2026-06-23   어제 쓴 글 ▸            ║
╚═══════════════════════════════════════╝
```

### Post view (`post.html`)

Reads `?date=YYYY-MM-DD` from the URL, fetches `posts/<date>.md`, renders it, and shows:
- Date + rendered markdown body
- **♥ Like button** with shared count (free counter API, keyed per post date)
- **✉ Email button** — clicking expands an inline form (name + message); submit posts to Formspree → email to Boeun.

```
╔═══════════════════════════════════════╗
║ ▦  오늘의 제목                   □  ✕ ║
╠═══════════════════════════════════════╣
║   2026-06-24                          ║
║                                       ║
║   (rendered markdown body)            ║
║                                       ║
║   ┌──────────┐   ┌──────────────┐     ║
║   │ ♥ Like 12 │   │ ✉ Send email │     ║
║   └──────────┘   └──────────────┘     ║
╚═══════════════════════════════════════╝
```

## Visual details (system.css)

- Gray striped title bar, square window frame, raised beveled buttons
- Chicago / Geneva pixel font, black text on white, gray chrome
- Dotted / double-line borders, classic-Mac square corners
- Each major surface reads as a "window"

## Components & responsibilities

- **`index.html`** — static shell for the list view (window chrome + header markup + empty list container).
- **`post.html`** — static shell for a single post (window chrome + body container + like/email controls).
- **`app.js`** — the only logic file:
  - `renderList()` — fetch `posts.json`, sort by date desc, render links.
  - `renderPost()` — read `?date`, fetch `posts/<date>.md`, render via marked.js.
  - `wireLikes(date)` — read + increment the shared counter for this post.
  - `wireEmail()` — toggle the inline form, submit to Formspree.
- **`style.css`** — project styling layered on top of system.css.
- **`posts.json` / `posts/*.md`** — content, author-edited.

Each piece has one job and can be understood without reading the others.

## Error handling

- Missing/empty `posts.json` → list shows a friendly "no posts yet" line.
- `?date` missing or `posts/<date>.md` not found → post view shows "post not found" in the window.
- Counter API or Formspree unreachable → button shows a small inline error; the rest of the page still works (graceful degradation, since these are non-essential enhancements).

## Testing

Manual, matching the simplicity:
1. Open `index.html` locally → header + list render, links work.
2. Open a post → markdown renders correctly.
3. Like button increments and persists on reload.
4. Email form submits and an email arrives.
5. Add a new `.md` + `posts.json` line → it appears at the top.

## Future work (out of scope for v1)

- Replace the header pixel-art **placeholder** with real pixel art of Boeun drinking coffee in a garden. Generation method (free placeholder now; possibly fal `gpt-image-2`, which is paid and requires explicit OK before running) to be decided later.
