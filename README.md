# Boeun's Classic Mac Blog

A dead-simple static blog with a classic Mac OS look. No build, no server.
Live at https://hojipark.github.io/chezHoji/

## Write a post (easiest: local admin)
1. Run locally: `python3 -m http.server 8000`
2. Open http://localhost:8000/write.html (local only — never deployed)
3. Paste your GitHub token once, write the post, click **Publish**.
   It commits the `.md` + updates `posts.json`, and the site rebuilds in ~1–3 min.

## Write a post (manual, no token)
1. Create `posts/YYYY-MM-DD.md` and write it in markdown.
2. Add one line to `posts.json`:
       { "date": "YYYY-MM-DD", "title": "Your title" }

Newest posts show first automatically. The home page shows the latest 10 in
full; older ones expand inline via "Show older posts".

## Config
- Likes: Abacus counter API (namespace `boeun-blog`), no setup.

## TODO
- Replace the header `☕🌿` placeholder with real pixel art (garden + coffee).
