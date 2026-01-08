# Deployment Guide

## Deployment Options

This application supports two deployment methods:

| Platform | URL Pattern | Auto-Deploy |
|----------|-------------|-------------|
| **Lovable.dev** | `yoursite.lovable.app` | ✅ Automatic |
| **GitHub Pages** | `username.github.io/ot-csir-training/` | ✅ Via Actions |

---

## Lovable.dev Deployment

The simplest deployment method. Click **Publish** in the Lovable editor to deploy instantly.

- Environment variables are auto-configured
- Custom domains supported (paid plans)
- No additional setup required

---

## GitHub Pages Deployment

### Prerequisites

1. GitHub repository connected to Lovable project
2. Repository secrets configured
3. GitHub Pages source set to "GitHub Actions"

### Step 1: Configure Repository Secrets

Go to **GitHub repo → Settings → Secrets and variables → Actions** and add:

| Secret Name | Value |
|-------------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |

> **Where to find these values:** In Lovable, go to Settings → Cloud to view your project credentials.

### Step 2: Configure GitHub Pages Source

1. Go to **GitHub repo → Settings → Pages**
2. Under "Build and deployment" → "Source"
3. Select **"GitHub Actions"** (not "Deploy from a branch")

### Step 3: Trigger Deployment

The workflow runs automatically on every push to `main`. To manually trigger:

1. Go to **Actions** tab in GitHub
2. Select "Deploy to GitHub Pages" workflow
3. Click **"Run workflow"** → **"Run workflow"**

### Step 4: Verify Deployment

After the workflow completes (~2-3 minutes):

1. Check workflow status in **Actions** tab (should show green ✓)
2. Visit your site at: `https://[username].github.io/ot-csir-training/`

---

## Workflow Configuration

The deployment workflow is defined in `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

---

## Technical Configuration

### Vite Base Path

The `vite.config.ts` is configured to use the correct base path for GitHub Pages:

```typescript
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/ot-csir-training/' : '/',
  // ...
}));
```

### Router Configuration

The app uses `HashRouter` for GitHub Pages compatibility, which handles client-side routing without server configuration:

```typescript
// App.tsx
import { HashRouter } from 'react-router-dom';
```

### 404 Fallback

A custom `public/404.html` redirects deep links to the hash-based router, ensuring direct URL access works correctly.

### Asset Loading

The `index.html` uses a relative script path to ensure assets load correctly from the subdirectory:

```html
<script type="module" src="./src/main.tsx"></script>
```

### React Runtime Optimization

To prevent duplicate React instances that cause hook errors, `vite.config.ts` explicitly includes React dependencies:

```typescript
optimizeDeps: {
  include: ['react', 'react-dom', 'react-router-dom'],
},
```

---

## Supabase Configuration

### Authentication Redirect URLs

For authentication to work on GitHub Pages, you must add the redirect URL in your Supabase project:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to "Redirect URLs":
   ```
   https://[username].github.io/ot-csir-training/
   ```

> **Important:** Include the trailing slash!

---

## Troubleshooting

### Issue: White/Blank Page

**Possible Causes:**

| Symptom | Solution |
|---------|----------|
| Console shows 404 for assets | Check `base` path in `vite.config.ts` |
| No errors, just blank | Verify secrets are configured correctly |
| JavaScript errors | Check browser console for details |

### Issue: Workflow Not Running

**Possible Causes:**

| Symptom | Solution |
|---------|----------|
| No workflow in Actions tab | Verify `.github/workflows/deploy.yml` exists |
| Workflow shows as skipped | Check GitHub Pages source is set to "GitHub Actions" |
| Permission errors | Verify workflow has correct permissions |

### Issue: Auth Not Working

**Possible Causes:**

| Symptom | Solution |
|---------|----------|
| Redirect fails after login | Add GitHub Pages URL to Supabase redirect URLs |
| Session not persisting | Check cookies/localStorage settings |

### Issue: Secrets Not Found

**Verification Steps:**

1. Go to **Settings → Secrets and variables → Actions**
2. Confirm both secrets exist with correct names (case-sensitive)
3. Re-run the workflow after adding secrets

---

## Environment Variables Summary

| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | GitHub Secrets | Supabase API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | GitHub Secrets | Supabase public/anon key |

> **Note:** These are publishable keys safe for client-side use. Never expose service role keys.

---

## Deployment Checklist

- [ ] Repository secrets configured (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- [ ] GitHub Pages source set to "GitHub Actions"
- [ ] Supabase redirect URLs include GitHub Pages domain
- [ ] Workflow runs successfully (green check in Actions)
- [ ] Site loads without blank page
- [ ] Authentication flow works correctly
