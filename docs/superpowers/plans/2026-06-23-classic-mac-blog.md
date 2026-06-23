# Classic Mac Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dead-simple, 100% static personal blog with a classic Mac OS look, daily markdown posts, a shared like button, and an email contact form.

**Architecture:** Plain HTML/CSS/JS, no build step and no server. `marked.js` (CDN) renders markdown client-side; `system.css` (CDN) provides the classic Mac chrome. A `posts.json` index drives the list. Likes use the free Abacus counter API; email uses Formspree. One `app.js` holds all logic.

**Tech Stack:** HTML5, CSS, vanilla JS (ES modules not required), `marked` (CDN), `system.css` (CDN), Abacus counter API, Formspree.

## Global Constraints

- Location: `~/Development/my-blog/` — fully separate from `world-model-demos`. The 9:16 asset rule does NOT apply here.
- 100% static: no build step, no server, nothing to install. Must run by opening the HTML files (served over a local static server for `fetch` to work — see note below).
- Author posts in 2 steps only: add `posts/YYYY-MM-DD.md`, add one line to `posts.json`.
- Visual theme: `system.css` classic Mac OS (System 7 / Platinum).
- Header text: main line `This is Boeun Park`, subtitle `(also Claire)`.
- External deps limited to: `marked` (CDN), `system.css` (CDN), Abacus (likes), Formspree (email). All free, no backend.
- Graceful degradation: if Abacus or Formspree is unreachable, the rest of the page still works.

> **Local testing note:** `fetch()` of `posts.json` / `.md` files fails on the `file://` protocol in most browsers. Every "open in browser" verification step assumes the site is served locally with `python3 -m http.server 8000` from the `my-blog/` folder, opened at `http://localhost:8000`. This is for *testing only* — deployment is still just static file upload.

## Testing approach

There is no JS test framework (keeping with "nothing to install"). Each task's verification is a concrete, observable browser check served via `python3 -m http.server`. Treat the "Expected" outcome as the pass/fail gate.

## File structure

```
my-blog/
├── index.html        ← list view: window chrome + header + empty list container
├── post.html         ← single-post view: window chrome + body + like/email controls
├── style.css         ← classic-Mac styling layered on system.css
├── app.js            ← all logic: renderList, renderPost, wireLikes, wireEmail
├── posts.json        ← post index, one object per day
└── posts/
    └── 2026-06-23.md ← first post
```

---

### Task 1: Project scaffold + list-view window shell

**Files:**
- Create: `index.html`
- Create: `style.css`
- (Optional) Create: `.gitignore` and init git

**Interfaces:**
- Consumes: nothing.
- Produces: `index.html` containing an element `<div id="post-list"></div>` and a header block; loads `system.css` (CDN), `style.css`, `marked` (CDN), and `app.js` (deferred). These IDs/filenames are relied on by all later tasks.

- [ ] **Step 1: Create `index.html` with the Mac window shell and header**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My Blog</title>
  <link rel="stylesheet" href="https://unpkg.com/@sakun/system.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="window" style="max-width: 640px; margin: 32px auto;">
    <div class="title-bar">
      <button aria-label="Close" class="close"></button>
      <h1 class="title">My Blog</h1>
      <button aria-label="Resize" class="resize"></button>
    </div>
    <div class="separator"></div>
    <div class="window-pane">
      <header class="blog-header">
        <div class="avatar" aria-label="pixel art placeholder">☕🌿</div>
        <div class="identity">
          <div class="name">This is Boeun Park</div>
          <div class="alias">(also Claire)</div>
        </div>
      </header>
      <hr>
      <ul id="post-list"><li>Loading…</li></ul>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="app.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: Create `style.css` with the header layout and avatar placeholder**

```css
:root { font-family: "Geneva", "Chicago", system-ui, sans-serif; }

.blog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.blog-header .avatar {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border: 2px solid #000;
  background: #fff;
  /* square classic-Mac icon look */
}
.blog-header .name { font-weight: bold; font-size: 16px; }
.blog-header .alias { font-size: 12px; color: #444; }

#post-list { list-style: none; padding: 0; margin: 8px 0 0; }
#post-list li { padding: 6px 0; border-bottom: 1px dotted #999; }
#post-list a { text-decoration: none; color: #000; display: flex; justify-content: space-between; }
#post-list a:hover { background: #000; color: #fff; }
#post-list .date { font-variant-numeric: tabular-nums; margin-right: 12px; }
```

- [ ] **Step 3: Serve and verify the shell renders**

Run: `cd ~/Development/my-blog && python3 -m http.server 8000`
Open: `http://localhost:8000`
Expected: A classic-Mac window titled "My Blog" with a striped title bar, a header showing the `☕🌿` square placeholder + "This is Boeun Park" / "(also Claire)", and a list area showing "Loading…". (The list stays "Loading…" until Task 2 — that's fine.)

- [ ] **Step 4: (Optional) init git + commit**

> Only do this if the user wants version control. Ask first.

```bash
cd ~/Development/my-blog
git init
printf ".DS_Store\n" > .gitignore
git add index.html style.css .gitignore
git commit -m "feat: classic-Mac window shell + blog header"
```

---

### Task 2: Post index + list rendering

**Files:**
- Create: `posts.json`
- Create: `posts/2026-06-23.md`
- Create: `app.js`

**Interfaces:**
- Consumes: `#post-list` element from Task 1; global `marked` from the CDN script.
- Produces: `app.js` with a top-level router that calls `renderList()` when `#post-list` exists. `posts.json` schema: an array of `{ "date": "YYYY-MM-DD", "title": string }`, any order (rendered newest-first). Later tasks rely on the `post.html?date=YYYY-MM-DD` link format produced here.

- [ ] **Step 1: Create `posts.json` with one entry**

```json
[
  { "date": "2026-06-23", "title": "Hello, classic Mac world" }
]
```

- [ ] **Step 2: Create the first post `posts/2026-06-23.md`**

```markdown
# Hello, classic Mac world

This is my first post. Welcome to my very simple blog.

It looks like an **old Macintosh**, and that makes me happy.
```

- [ ] **Step 3: Create `app.js` with `renderList()` and a router**

```javascript
async function renderList() {
  const list = document.getElementById("post-list");
  try {
    const res = await fetch("posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error("posts.json missing");
    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      list.innerHTML = "<li>No posts yet.</li>";
      return;
    }
    posts.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
    list.innerHTML = posts.map(p => `
      <li><a href="post.html?date=${encodeURIComponent(p.date)}">
        <span><span class="date">${p.date}</span>${escapeHtml(p.title)}</span>
        <span aria-hidden="true">▸</span>
      </a></li>`).join("");
  } catch (e) {
    list.innerHTML = "<li>Could not load posts.</li>";
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Router: pick behavior by which page we're on.
if (document.getElementById("post-list")) renderList();
```

- [ ] **Step 4: Serve and verify the list renders**

Run: `cd ~/Development/my-blog && python3 -m http.server 8000` (if not already running)
Open: `http://localhost:8000`
Expected: The list now shows `2026-06-23  Hello, classic Mac world ▸`. Hovering inverts the row (black background). The link points to `post.html?date=2026-06-23` (clicking 404s until Task 3 — expected).

- [ ] **Step 5: Verify empty-state handling**

Temporarily set `posts.json` to `[]`, reload.
Expected: list shows "No posts yet." Then restore the original `posts.json` content from Step 1.

- [ ] **Step 6: Commit**

```bash
git add app.js posts.json posts/2026-06-23.md
git commit -m "feat: posts.json index + list rendering"
```

---

### Task 3: Single-post view + markdown rendering

**Files:**
- Create: `post.html`
- Modify: `app.js` (add `renderPost()` + extend the router)

**Interfaces:**
- Consumes: `marked` global; `posts.json`; `posts/<date>.md`; the `?date=` param format from Task 2.
- Produces: `post.html` with `<div id="post-body"></div>`, `<h2 id="post-title"></h2>`, `<div id="post-date"></div>`. `renderPost()` reads `?date`, looks the title up in `posts.json`, fetches and renders the markdown. Tasks 4–5 rely on `post.html` containing `#like-button`, `#like-count`, `#email-button`, `#email-form` (added now as empty placeholders, wired later).

- [ ] **Step 1: Create `post.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Post</title>
  <link rel="stylesheet" href="https://unpkg.com/@sakun/system.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="window" style="max-width: 640px; margin: 32px auto;">
    <div class="title-bar">
      <button aria-label="Close" class="close"></button>
      <h1 class="title" id="post-title">Post</h1>
      <button aria-label="Resize" class="resize"></button>
    </div>
    <div class="separator"></div>
    <div class="window-pane">
      <p><a href="index.html">‹ Back</a></p>
      <div id="post-date" class="post-date"></div>
      <article id="post-body">Loading…</article>

      <div class="post-actions">
        <button id="like-button">♥ Like <span id="like-count">…</span></button>
        <button id="email-button">✉ Send email</button>
      </div>
      <form id="email-form" hidden></form>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="app.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: Add `renderPost()` and extend the router in `app.js`**

Add this above the router line, and replace the router block:

```javascript
function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

async function renderPost() {
  const date = getParam("date");
  const body = document.getElementById("post-body");
  const titleEl = document.getElementById("post-title");
  const dateEl = document.getElementById("post-date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    body.textContent = "Post not found.";
    return null;
  }
  // Title from index (optional, falls back to date)
  try {
    const idx = await (await fetch("posts.json", { cache: "no-store" })).json();
    const meta = idx.find(p => p.date === date);
    if (meta) { titleEl.textContent = meta.title; document.title = meta.title; }
  } catch (_) { /* non-fatal */ }
  dateEl.textContent = date;
  try {
    const res = await fetch(`posts/${date}.md`, { cache: "no-store" });
    if (!res.ok) throw new Error("not found");
    const md = await res.text();
    body.innerHTML = marked.parse(md);
  } catch (e) {
    body.textContent = "Post not found.";
    return null;
  }
  return date;
}

// Router: pick behavior by which page we're on.
if (document.getElementById("post-list")) {
  renderList();
} else if (document.getElementById("post-body")) {
  renderPost();
}
```

- [ ] **Step 3: Add post styling to `style.css`**

```css
.post-date { font-size: 12px; color: #444; margin-bottom: 8px; }
#post-body h1 { font-size: 18px; }
#post-body { line-height: 1.5; }
.post-actions { margin-top: 20px; display: flex; gap: 12px; }
#email-form { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; max-width: 360px; }
```

- [ ] **Step 4: Serve and verify the post renders**

Open: `http://localhost:8000/post.html?date=2026-06-23`
Expected: Title bar reads "Hello, classic Mac world"; body shows the rendered markdown (H1 + bold "old Macintosh"); date "2026-06-23" above it; a "‹ Back" link returns to the list; Like/Send-email buttons are visible (Like shows "…", not yet wired).

- [ ] **Step 5: Verify not-found handling**

Open: `http://localhost:8000/post.html?date=1999-01-01`
Expected: body shows "Post not found." (no crash).

- [ ] **Step 6: Commit**

```bash
git add post.html app.js style.css
git commit -m "feat: single-post view with markdown rendering"
```

---

### Task 4: Like button (shared count via Abacus)

**Files:**
- Modify: `app.js` (add `wireLikes(date)`, call it from `renderPost`)

**Interfaces:**
- Consumes: `#like-button`, `#like-count` from Task 3; the `date` returned by `renderPost()`.
- Produces: `wireLikes(date)`. Uses Abacus (`https://abacus.jasoncameron.dev`): `/get/<ns>/<key>` to read, `/hit/<ns>/<key>` to increment. Namespace constant `boeun-blog`, key = the post date. One like per browser, enforced via `localStorage` key `liked:<date>`.

> **Why Abacus:** free, no signup, no backend, CORS-enabled. If it is ever down, swap the two URLs for another counter service — the rest of the code is unaffected.

- [ ] **Step 1: Add `wireLikes` to `app.js`**

```javascript
const LIKE_NS = "boeun-blog";

async function wireLikes(date) {
  const btn = document.getElementById("like-button");
  const countEl = document.getElementById("like-count");
  const base = "https://abacus.jasoncameron.dev";
  const key = encodeURIComponent(date);

  // Read current count (does not increment)
  try {
    const res = await fetch(`${base}/get/${LIKE_NS}/${key}`);
    const data = await res.json();
    countEl.textContent = data.value ?? 0;
  } catch (_) {
    countEl.textContent = "?";
  }

  const already = localStorage.getItem(`liked:${date}`);
  if (already) { btn.disabled = true; btn.classList.add("liked"); }

  btn.addEventListener("click", async () => {
    if (localStorage.getItem(`liked:${date}`)) return;
    btn.disabled = true;
    try {
      const res = await fetch(`${base}/hit/${LIKE_NS}/${key}`);
      const data = await res.json();
      countEl.textContent = data.value ?? countEl.textContent;
      localStorage.setItem(`liked:${date}`, "1");
      btn.classList.add("liked");
    } catch (_) {
      btn.disabled = false; // let them retry on failure
    }
  });
}
```

- [ ] **Step 2: Call `wireLikes` after a successful post render**

In the router, change the post branch:

```javascript
} else if (document.getElementById("post-body")) {
  renderPost().then(date => { if (date) wireLikes(date); });
}
```

- [ ] **Step 3: Add a `.liked` style to `style.css`**

```css
#like-button.liked { font-weight: bold; }
```

- [ ] **Step 4: Serve and verify like behavior**

Open: `http://localhost:8000/post.html?date=2026-06-23`
Expected: Like button shows a real number (0 or more). Click it → number increases by 1, button becomes bold and disabled. Reload → number persists, button stays disabled (localStorage remembers). Open the same URL in a private window → button is clickable again (different browser state) and the count reflects the shared total.

- [ ] **Step 5: Verify graceful failure**

In DevTools, block the `abacus.jasoncameron.dev` domain (or go offline), reload.
Expected: count shows "?", the page and markdown still render fine.

- [ ] **Step 6: Commit**

```bash
git add app.js style.css
git commit -m "feat: shared like button via Abacus counter"
```

---

### Task 5: Email contact form (Formspree)

**Files:**
- Modify: `post.html` (fill in `#email-form` fields)
- Modify: `app.js` (add `wireEmail()`, call from router)

**Interfaces:**
- Consumes: `#email-button`, `#email-form` from Task 3.
- Produces: `wireEmail()` toggling the form and submitting to Formspree via `fetch` (so the user stays on the page). Requires a Formspree form endpoint ID.

> **Prerequisite (manual, one-time):** Create a free form at https://formspree.io, copy its endpoint (looks like `https://formspree.io/f/abcdwxyz`). Paste it into `FORMSPREE_ENDPOINT` below. Until then the form will not deliver mail.

- [ ] **Step 1: Fill in the email form markup in `post.html`**

Replace the empty `<form id="email-form" hidden></form>` with:

```html
<form id="email-form" hidden>
  <label>Your name<br><input type="text" name="name" required></label>
  <label>Message<br><textarea name="message" rows="4" required></textarea></label>
  <button type="submit">Send</button>
  <span id="email-status" role="status"></span>
</form>
```

- [ ] **Step 2: Add `wireEmail()` to `app.js`**

```javascript
const FORMSPREE_ENDPOINT = "https://formspree.io/f/REPLACE_ME"; // ← paste your Formspree endpoint

function wireEmail() {
  const btn = document.getElementById("email-button");
  const form = document.getElementById("email-form");
  const status = document.getElementById("email-status");
  if (!btn || !form) return;

  btn.addEventListener("click", () => { form.hidden = !form.hidden; });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Sending…";
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(form),
      });
      if (res.ok) {
        form.reset();
        status.textContent = "Sent! Thank you.";
      } else {
        status.textContent = "Could not send. Try again later.";
      }
    } catch (_) {
      status.textContent = "Could not send. Try again later.";
    }
  });
}
```

- [ ] **Step 3: Call `wireEmail()` on the post page**

In the router's post branch:

```javascript
} else if (document.getElementById("post-body")) {
  wireEmail();
  renderPost().then(date => { if (date) wireLikes(date); });
}
```

- [ ] **Step 4: Verify the form toggles and validates**

Open: `http://localhost:8000/post.html?date=2026-06-23`
Expected: Clicking "✉ Send email" reveals the name + message form; clicking again hides it. Submitting empty fields triggers the browser's "required" validation.

- [ ] **Step 5: Verify real delivery (after pasting a real Formspree endpoint)**

Fill the form, submit.
Expected: status shows "Sent! Thank you." and an email arrives in the Formspree-linked inbox. (Formspree's first submission may show a one-time confirmation screen — confirm it once.)

- [ ] **Step 6: Commit**

```bash
git add post.html app.js
git commit -m "feat: email contact form via Formspree"
```

---

### Task 6: Final polish + author README

**Files:**
- Modify: `style.css` (classic-Mac finishing touches)
- Create: `README.md` (how to add a daily post)

**Interfaces:**
- Consumes: everything above.
- Produces: a short README documenting the 2-step posting workflow.

- [ ] **Step 1: Add finishing styles to `style.css`**

```css
body { background: #c0c0c0; }            /* classic desktop gray */
a { color: #000; }
#post-body a { text-decoration: underline; }
.post-actions button { cursor: pointer; }
```

- [ ] **Step 2: Create `README.md`**

```markdown
# Boeun's Classic Mac Blog

A dead-simple static blog. No build, no server.

## Run locally
    python3 -m http.server 8000
Then open http://localhost:8000

## Add a daily post (2 steps)
1. Create `posts/YYYY-MM-DD.md` and write your post in markdown.
2. Add one line to `posts.json`:
       { "date": "YYYY-MM-DD", "title": "Your title" }

Newest posts show first automatically.

## Config
- Likes: Abacus counter API (namespace `boeun-blog`), no setup.
- Email: set `FORMSPREE_ENDPOINT` in `app.js` to your Formspree form URL.

## TODO
- Replace the header `☕🌿` placeholder with real pixel art (garden + coffee).
```

- [ ] **Step 3: Verify the full flow end-to-end**

Add a second post: create `posts/2026-06-24.md` with any content, add its line to `posts.json`. Reload `http://localhost:8000`.
Expected: Two posts listed, 2026-06-24 on top; both open and render; like + email work on each.

- [ ] **Step 4: Commit**

```bash
git add style.css README.md posts.json posts/2026-06-24.md
git commit -m "chore: polish styles + author README"
```

---

## Self-Review

**Spec coverage:**
- Location / separate folder / no-9:16 → Global Constraints ✓
- 100% static, no build/server/install → Global Constraints + all tasks ✓
- marked.js / system.css → Task 1, 3 ✓
- Folder structure → matches spec exactly ✓
- 2-step posting → Task 2 + README (Task 6) ✓
- List view + header ("This is Boeun Park" / "(also Claire)") + pixel-art placeholder → Task 1 ✓
- Post view + markdown render → Task 3 ✓
- Likes (shared count) → Task 4 ✓
- Email (Formspree) → Task 5 ✓
- Error handling (missing index, missing post, counter/email failure) → Tasks 2, 3, 4, 5 verification steps ✓
- Future work pixel-art placeholder noted → Task 6 README TODO ✓

**Placeholder scan:** The only intentional `REPLACE_ME` is the Formspree endpoint, which is an explicit user-supplied secret with a documented prerequisite — not a plan gap.

**Type consistency:** `renderPost()` returns the `date` string (or `null`), consumed by `wireLikes(date)`. `wireLikes`/`wireEmail` names consistent across router and definitions. Element IDs (`post-list`, `post-body`, `post-title`, `post-date`, `like-button`, `like-count`, `email-button`, `email-form`, `email-status`) consistent between HTML and JS. `LIKE_NS`/`FORMSPREE_ENDPOINT` constants referenced consistently.
