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
