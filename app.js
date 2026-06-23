// ---- shared helpers ----------------------------------------------------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

const LIKE_NS = "boeun-blog";
const ABACUS = "https://abacus.jasoncameron.dev";
const FEED_LIMIT = 10;
const FORMSPREE_ENDPOINT = "https://formspree.io/f/REPLACE_ME"; // ← paste your Formspree endpoint

// Wire one like button (scoped to its own elements, works in feed or permalink).
async function attachLike(btn, countEl, date) {
  if (!btn || !countEl) return;
  const key = encodeURIComponent(date);

  // Read current count (does not increment)
  try {
    const data = await (await fetch(`${ABACUS}/get/${LIKE_NS}/${key}`)).json();
    countEl.textContent = data.value ?? 0;
  } catch (_) {
    countEl.textContent = "?";
  }

  if (localStorage.getItem(`liked:${date}`)) {
    btn.disabled = true;
    btn.classList.add("liked");
  }

  btn.addEventListener("click", async () => {
    if (localStorage.getItem(`liked:${date}`)) return;
    btn.disabled = true;
    try {
      const data = await (await fetch(`${ABACUS}/hit/${LIKE_NS}/${key}`)).json();
      countEl.textContent = data.value ?? countEl.textContent;
      localStorage.setItem(`liked:${date}`, "1");
      btn.classList.add("liked");
    } catch (_) {
      btn.disabled = false; // let them retry on failure
    }
  });
}

// Wire the email contact form (one per page).
function attachEmail(btn, form, status) {
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

async function loadIndex() {
  const res = await fetch("posts.json", { cache: "no-store" });
  if (!res.ok) throw new Error("posts.json missing");
  const posts = await res.json();
  if (!Array.isArray(posts)) throw new Error("posts.json malformed");
  posts.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
  return posts;
}

// ---- home feed ---------------------------------------------------------

function feedCardHtml(post, bodyHtml) {
  return `
    <div class="window page-window post-card" data-date="${escapeHtml(post.date)}">
      <div class="title-bar">
        <button aria-label="Close" class="close"></button>
        <h1 class="title">${escapeHtml(post.title)}</h1>
        <button aria-label="Resize" class="resize"></button>
      </div>
      <div class="separator"></div>
      <div class="window-pane">
        <div class="post-date">${escapeHtml(post.date)}</div>
        <article class="post-body">${bodyHtml}</article>
        <div class="post-actions">
          <button class="like-button">♥ Like <span class="like-count">…</span></button>
          <a class="permalink" href="post.html?date=${encodeURIComponent(post.date)}">permalink</a>
        </div>
      </div>
    </div>`;
}

async function renderFeed() {
  const feed = document.getElementById("feed");
  let posts;
  try {
    posts = await loadIndex();
  } catch (_) {
    feed.innerHTML = `<div class="window page-window"><div class="window-pane">Could not load posts.</div></div>`;
    return;
  }
  if (posts.length === 0) {
    feed.innerHTML = `<div class="window page-window"><div class="window-pane">No posts yet.</div></div>`;
    return;
  }

  const recent = posts.slice(0, FEED_LIMIT);
  const older = posts.slice(FEED_LIMIT);

  // Fetch each recent post body (in parallel), render full feed.
  const cards = await Promise.all(recent.map(async (p) => {
    try {
      const md = await (await fetch(`posts/${p.date}.md`, { cache: "no-store" })).text();
      return feedCardHtml(p, marked.parse(md));
    } catch (_) {
      return feedCardHtml(p, "<em>Could not load this post.</em>");
    }
  }));
  feed.innerHTML = cards.join("");

  // Wire one like button per card.
  feed.querySelectorAll(".post-card").forEach((card) => {
    attachLike(
      card.querySelector(".like-button"),
      card.querySelector(".like-count"),
      card.dataset.date
    );
  });

  // Older posts: date list, only if there are extras.
  if (older.length) {
    const olderBox = document.getElementById("older");
    const list = document.getElementById("older-list");
    list.innerHTML = older.map(p => `
      <li><a href="post.html?date=${encodeURIComponent(p.date)}">
        <span><span class="date">${escapeHtml(p.date)}</span>${escapeHtml(p.title)}</span>
        <span aria-hidden="true">▸</span>
      </a></li>`).join("");
    olderBox.hidden = false;
  }
}

// ---- single post permalink --------------------------------------------

async function renderPost() {
  const date = getParam("date");
  const body = document.getElementById("post-body");
  const titleEl = document.getElementById("post-title");
  const dateEl = document.getElementById("post-date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    body.textContent = "Post not found.";
    return null;
  }
  try {
    const idx = await loadIndex();
    const meta = idx.find(p => p.date === date);
    if (meta) { titleEl.textContent = meta.title; document.title = meta.title; }
  } catch (_) { /* non-fatal */ }
  dateEl.textContent = date;
  try {
    const res = await fetch(`posts/${date}.md`, { cache: "no-store" });
    if (!res.ok) throw new Error("not found");
    body.innerHTML = marked.parse(await res.text());
  } catch (_) {
    body.textContent = "Post not found.";
    return null;
  }
  return date;
}

// ---- router ------------------------------------------------------------

if (document.getElementById("feed")) {
  // Home: email at top, then the feed.
  attachEmail(
    document.getElementById("email-button"),
    document.getElementById("email-form"),
    document.getElementById("email-status")
  );
  renderFeed();
} else if (document.getElementById("post-body")) {
  // Permalink page.
  attachEmail(
    document.getElementById("email-button"),
    document.getElementById("email-form"),
    document.getElementById("email-status")
  );
  renderPost().then(date => {
    if (date) attachLike(
      document.getElementById("like-button"),
      document.getElementById("like-count"),
      date
    );
  });
}
