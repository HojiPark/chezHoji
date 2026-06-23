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

// Router: pick behavior by which page we're on.
if (document.getElementById("post-list")) {
  renderList();
} else if (document.getElementById("post-body")) {
  wireEmail();
  renderPost().then(date => { if (date) wireLikes(date); });
}
