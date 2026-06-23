// ---- shared helpers ----------------------------------------------------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const LIKE_NS = "boeun-blog";
const ABACUS = "https://abacus.jasoncameron.dev";
const FEED_LIMIT = 10;
const FORMSPREE_ENDPOINT = "https://formspree.io/f/REPLACE_ME"; // ← paste your Formspree endpoint

// Wire one like button (scoped to its own card's elements).
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

// ---- feed --------------------------------------------------------------

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
        </div>
      </div>
    </div>`;
}

// Fetch each post's markdown, render full cards, append into `target`,
// and wire the like button on every newly added card.
async function renderCards(posts, target) {
  const cards = await Promise.all(posts.map(async (p) => {
    try {
      const md = await (await fetch(`posts/${p.date}.md`, { cache: "no-store" })).text();
      return feedCardHtml(p, marked.parse(md));
    } catch (_) {
      return feedCardHtml(p, "<em>Could not load this post.</em>");
    }
  }));
  target.insertAdjacentHTML("beforeend", cards.join(""));
  target.querySelectorAll(".post-card:not([data-wired])").forEach((card) => {
    card.dataset.wired = "1";
    attachLike(
      card.querySelector(".like-button"),
      card.querySelector(".like-count"),
      card.dataset.date
    );
  });
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

  feed.innerHTML = "";
  await renderCards(recent, feed);

  // Older posts: a button that expands the rest inline (no separate page).
  if (older.length) {
    const box = document.getElementById("older");
    const btn = document.getElementById("show-older");
    const olderFeed = document.getElementById("older-feed");
    btn.textContent = `▾ Show older posts (${older.length})`;
    box.hidden = false;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Loading…";
      await renderCards(older, olderFeed);
      box.hidden = true;
    });
  }
}

// ---- router ------------------------------------------------------------

attachEmail(
  document.getElementById("email-button"),
  document.getElementById("email-form"),
  document.getElementById("email-status")
);
renderFeed();
