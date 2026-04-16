# Staging Auto-Deploy Plan

**Date:** April 2026
**Server:** novaa.lemmecode.com (CloudPanel 6.0.8 on Ubuntu 24.04 LTS)
**Goal:** Push to a branch on GitHub → server automatically pulls, builds, and deploys

---

## Server Facts (Current State)

| Item | Value |
|---|---|
| OS | Ubuntu 24.04.3 LTS |
| Panel | CloudPanel 6.0.8 (at cp.lemmecode.in) |
| Running as | root |
| Disk | 48G total, 29G used, 20G free |
| RAM | 3.8GB total, 2.2GB used, 1.6GB available |
| Swap | 2GB total, 1.6GB used — **under pressure** |
| Node.js | v18.20.8 — Vite wants v20+, build works but warns |
| Nginx | 1.28.0 |
| Process manager | PM2 |

### Sites on this server

| Site | Home user | PM2 process | Port |
|---|---|---|---|
| novaa.lemmecode.com | lemmecode-novaa | novaa-backend (id: 0) | 3000 |
| course.mart.lemmecode.com | lemmecode-course-mart | coursemart-backend (id: 3) | — |
| cp.lemmecode.in | clp | CloudPanel itself | 8443 |

### Novaa file layout

```
/home/lemmecode-novaa/
├── htdocs/
│   └── novaa.lemmecode.com/
│       ├── public/          ← nginx serves frontend from here
│       ├── src/             ← backend source (manually synced)
│       ├── app.js
│       ├── server.js
│       └── node_modules/
├── smart-college-mern/      ← git repo lives here
│   ├── backend/
│   ├── frontend/
│   └── sprint-docs/
└── logs/
    └── nginx/
```

### Nginx routing (novaa.lemmecode.com)

- `/api/*` → proxied to `http://127.0.0.1:3000/api/`
- `/assets/*` → served from `public/` (immutable cache, 1 year)
- `/*` → served from `public/index.html` (SPA fallback, no-cache)

---

## The Goal

```
Developer pushes to staging branch on GitHub
            ↓
GitHub fires a webhook POST to https://novaa.lemmecode.com/deploy-hook
            ↓
Webhook receiver on server validates X-Hub-Signature-256 + branch name
            ↓
Deploy script runs:
  1. git fetch origin
  2. git checkout staging && git pull origin staging
  3. cd backend  → npm install --production
  4. cd frontend → npm install && npm run build
  5. cp -r frontend/dist/* /htdocs/novaa.lemmecode.com/public/
  6. rsync backend/src/ /htdocs/novaa.lemmecode.com/src/
  7. cp backend/app.js /htdocs/novaa.lemmecode.com/app.js
  8. cp backend/server.js /htdocs/novaa.lemmecode.com/server.js
  9. pm2 restart novaa-backend
            ↓
novaa.lemmecode.com reflects the staging branch within ~90 seconds
```

---

## Branch Strategy

```
main          → production (manual deploy only, never auto)
staging       → this server (auto-deploy on every push)
feature/*     → developer branches (no auto-deploy, merge to staging to test)
```

**Workflow for developers:**
1. Work on `feature/dev1/billing-model`
2. When ready to test: `git merge feature/dev1/billing-model staging` and push
3. Server auto-deploys within ~90 seconds
4. Test on `novaa.lemmecode.com`
5. When approved: open PR from `staging` → `main` for production

---

## What Needs to Be Built

### 1. Webhook receiver — `/home/lemmecode-novaa/deploy-webhook/server.js`

Small Node.js Express server that:
- Listens on port 4000 (internal only, not exposed directly)
- Accepts `POST /deploy` from GitHub
- Validates `X-Hub-Signature-256` header using shared secret
- Checks `ref` field — only fires if branch is `refs/heads/staging`
- Spawns `deploy.sh` as a child process
- Logs result to `/home/lemmecode-novaa/deploy-webhook/deploy.log`
- Returns 200 immediately, deploy runs async

### 2. Deploy script — `/home/lemmecode-novaa/deploy-webhook/deploy.sh`

Bash script that does the actual work (see flow above).
Logs start time, each step, and end time to `deploy.log`.
On any error: logs the failure and exits — does NOT restart PM2 with broken code.

### 3. PM2 process for webhook receiver

```bash
pm2 start /home/lemmecode-novaa/deploy-webhook/server.js --name novaa-deploy-webhook
pm2 save
```

### 4. Nginx location block for `/deploy-hook`

Add to `novaa.lemmecode.com.conf` inside the server block:

```nginx
location /deploy-hook {
  proxy_pass http://127.0.0.1:4000/deploy;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_read_timeout 10s;
}
```

**Note:** CloudPanel may overwrite manual nginx edits. Use CloudPanel's
"Vhost" custom config field at `cp.lemmecode.in` to add this block safely.

### 5. GitHub webhook configuration

In repo Settings → Webhooks → Add webhook:
- Payload URL: `https://novaa.lemmecode.com/deploy-hook`
- Content type: `application/json`
- Secret: (value from `.env`, generated with `openssl rand -hex 32`)
- Events: **Just the push event**
- Active: ✅

### 6. Webhook secret storage

File: `/home/lemmecode-novaa/deploy-webhook/.env`
```
WEBHOOK_SECRET=<generated_secret>
STAGING_BRANCH=staging
REPO_PATH=/home/lemmecode-novaa/smart-college-mern
HTDOCS_PATH=/home/lemmecode-novaa/htdocs/novaa.lemmecode.com
PM2_PROCESS=novaa-backend
```

This file must never be committed to git.

---

## Constraints & Risks

| Risk | Mitigation |
|---|---|
| Swap nearly full (1.6/2GB) — `npm run build` may OOM | Upgrade Node.js to v20 first (smaller memory footprint). Monitor first deploy. |
| Node.js v18 — Vite requires v20+ | Upgrade to Node.js v20 LTS before building this |
| CloudPanel may overwrite nginx conf edits | Use CloudPanel vhost custom config field, not direct file edit |
| Two PM2 processes on same server | Deploy script only restarts `novaa-backend`, never touches `coursemart-backend` |
| Copying files to `htdocs/` is destructive | Keep previous `public/` as `public.bak/` before each deploy |
| Long build time blocks webhook response | Webhook returns 200 immediately, deploy runs in background |
| Concurrent deploys if two pushes happen fast | Deploy script uses a lockfile — second deploy waits or skips |
| GitHub webhook secret must stay secret | Stored only in `.env`, never in git |

---

## Pre-Requisites (Do Before Building)

| # | Task | Command / Notes |
|---|---|---|
| P-1 | Upgrade Node.js to v20 LTS | `nvm install 20 && nvm alias default 20` |
| P-2 | Create `staging` branch on GitHub | `git checkout -b staging && git push origin staging` |
| P-3 | Generate webhook secret | `openssl rand -hex 32` |
| P-4 | Confirm CloudPanel vhost custom config field | Log in to cp.lemmecode.in → Sites → novaa.lemmecode.com → Vhost |
| P-5 | Check `animate.css` is in `package.json` | Already installed manually — add to `package.json` so it survives `npm install` |

---

## Build Order

1. Complete all pre-requisites (P-1 through P-5)
2. Create `staging` branch from current `main`
3. Write and manually test `deploy.sh`
4. Write `server.js` webhook receiver
5. Create `.env` with generated secret
6. Register webhook receiver in PM2
7. Add nginx location block via CloudPanel vhost config
8. Reload nginx: `nginx -s reload`
9. Configure GitHub webhook with the secret
10. Test end-to-end: push a small change to `staging` → watch `deploy.log`

---

## Open Questions

| # | Question | Who decides |
|---|---|---|
| Q-1 | Auto-deploy from `staging` only, or any `feature/*` branch? | Tech lead |
| Q-2 | Should failed deploys send a notification (email or Slack)? | Tech lead |
| Q-3 | Should `public/` be backed up before each deploy, or just overwrite? | Tech lead |
| Q-4 | Should `htdocs/novaa.lemmecode.com/` become the repo itself (simpler), or keep repo separate and sync? | Tech lead |
| Q-5 | Node.js upgrade — upgrade system Node or use nvm? (nvm already installed on server) | DevOps |
