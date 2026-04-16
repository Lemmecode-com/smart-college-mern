# Staging Auto-Deploy — Developer Guide

**Staging URL:** https://novaa.lemmecode.com  
**Staging branch:** `Features`  
**Auto-deploy time:** ~40 seconds after push

---

## How It Works

Every time you push to the `Features` branch, the staging server automatically:

1. Pulls the latest code from `Features`
2. Installs dependencies
3. Builds the frontend
4. Deploys to the server
5. Restarts the backend

You do not need to do anything manually. Just push and wait ~40 seconds.

---

## Normal Workflow

```
# Work on your feature branch as usual
git checkout feature/dev1/your-feature
# ... make changes ...
git add .
git commit -m "feat: your change"
git push origin feature/dev1/your-feature

# When ready to test on staging — merge into Features
git checkout Features
git pull origin Features
git merge feature/dev1/your-feature
git push origin Features

# Wait ~40 seconds → check https://novaa.lemmecode.com
```

---

## How to Check If Deploy Succeeded

### Option 1 — Check the deploy log on server
```bash
tail -50 /home/lemmecode-novaa/deploy-webhook/deploy.log
```

A successful deploy looks like:
```
Deploy started: Thu Apr 16 11:24:46 AM UTC 2026
[1/6] Pulling Features...     Done.
[2/6] Installing backend deps... Done.
[3/6] Installing frontend deps... Done.
[4/6] Building frontend...    Done.
[5/6] Deploying frontend...   Done.
[6/6] Deploying backend...    Done.
Deploy finished: Thu Apr 16 11:25:25 AM UTC 2026
```

### Option 2 — Check GitHub webhook deliveries
Go to: `https://github.com/Lemmecode-com/smart-college-mern/settings/hooks`  
Click the webhook → Recent Deliveries → check response code is `200`

---

## If Something Breaks After Your Push

### Step 1 — Check what broke
```bash
# Check deploy log for build errors
tail -100 /home/lemmecode-novaa/deploy-webhook/deploy.log

# Check backend is running
pm2 list

# Check backend logs for runtime errors
pm2 logs novaa-backend --lines 30 --nostream
```

### Step 2 — Quick revert (undo your last push)

```bash
cd /home/lemmecode-novaa/smart-college-mern
git checkout Features
git pull origin Features

# Revert the last commit on Features
git revert HEAD --no-edit
git push origin Features

# This triggers a new auto-deploy with the revert applied
# Wait ~40 seconds
```

### Step 3 — If you need to go back further

```bash
# See recent commits on Features
git log --oneline -10

# Reset to a specific commit (replace <commit-hash> with the good commit)
git reset --hard <commit-hash>
git push origin Features --force

# Wait ~40 seconds for auto-deploy
```

> ⚠️ Use `--force` push carefully — it rewrites history.  
> Always confirm with the team before force pushing to `Features`.

---

## If the Deploy Gets Stuck

The deploy uses a lockfile to prevent two deploys running at the same time.  
If a deploy crashed mid-way, the lockfile may still exist and block future deploys.

```bash
# Remove the lockfile manually
rm -f /tmp/novaa-deploy.lock

# Then push a small change to Features to trigger a fresh deploy
```

---

## If the Webhook Server Itself Is Down

```bash
# Check status
pm2 list

# If novaa-deploy-webhook is not online, restart it
pm2 restart novaa-deploy-webhook

# Check its logs
pm2 logs novaa-deploy-webhook --lines 20 --nostream
```

---

## Important Rules

| Rule | Why |
|---|---|
| Never push broken code directly to `Features` | It deploys immediately to staging — everyone is affected |
| Always test your build locally before merging to `Features` | `npm run build` must pass with no errors |
| Never commit `.env` files | They are gitignored for security |
| Coordinate with the team before force pushing to `Features` | It affects everyone's staging environment |
| `main` branch is production — never push directly | Always go through `Features` → PR → `main` |

---

## Files on the Server (Do Not Delete)

| File | Purpose |
|---|---|
| `/home/lemmecode-novaa/deploy-webhook/server.js` | Webhook receiver |
| `/home/lemmecode-novaa/deploy-webhook/deploy.sh` | Deploy script |
| `/home/lemmecode-novaa/deploy-webhook/.env` | Webhook secret + config |
| `/home/lemmecode-novaa/deploy-webhook/deploy.log` | Deploy history |
| `/home/lemmecode-novaa/smart-college-mern/frontend/.env.production` | Frontend build config — server only, not in git |

---

## Quick Reference

| Task | Command |
|---|---|
| Check deploy log | `tail -50 /home/lemmecode-novaa/deploy-webhook/deploy.log` |
| Watch live deploy | `tail -f /home/lemmecode-novaa/deploy-webhook/deploy.log` |
| Check PM2 processes | `pm2 list` |
| Check backend logs | `pm2 logs novaa-backend --lines 30 --nostream` |
| Restart backend manually | `pm2 restart novaa-backend` |
| Remove stuck lockfile | `rm -f /tmp/novaa-deploy.lock` |
| Revert last push | `git revert HEAD --no-edit && git push origin Features` |
