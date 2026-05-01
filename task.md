# Deployment Migration Tasks

## Server — Database (SQLite → Turso LibSQL)
- [x] Rewrite `server/db.js` using `@libsql/client`
- [x] Update `server/package.json` (remove sqlite3/puppeteer, add @libsql/client/html-pdf-node)
- [x] Rewrite `server/pdf-gen.js` using `html-pdf-node` instead of puppeteer

## Server — Render Config
- [x] Update `server/index.js` (dynamic PORT, updated CORS)
- [x] Create `render.yaml`
- [x] Create `server/.env.example`

## Frontend — Vercel Config
- [x] Update `client/src/api/index.js` (use VITE_API_URL)
- [x] Create `client/.env.example`
- [x] Create `client/vercel.json`

## Push & Deploy
- [ ] `git add`, `git commit`, `git push`
- [ ] Deploy on Render (set env vars)
- [ ] Deploy on Vercel (set VITE_API_URL)
