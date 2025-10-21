# NewsFlow AI - Complete Deployment Guide

## 🚀 Deploy to Vercel

### Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Your API keys ready:
  - NewsAPI Key (from https://newsapi.org)
  - Groq API Key (from https://console.groq.com)

---

## Step 1: Prepare Your Project

### 1.1 Create a `.gitignore` file (if not exists)

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
.next/
out/

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor directories
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
.cache/
```

### 1.2 Push to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - NewsFlow AI"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/newsflow-ai.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### 2.1 Import Project to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 2.2 Add Environment Variables

In the Vercel project settings, add these environment variables:

```
VITE_NEWS_API_KEY=your_newsapi_key_here
VITE_GROQ_API_KEY=your_groq_api_key_here
```

**Steps:**

1. Go to your Vercel project dashboard
2. Click on "Settings"
3. Click on "Environment Variables"
4. Add both variables with their values
5. Select "Production", "Preview", and "Development" for each

### 2.3 Deploy

Click "Deploy" and Vercel will:

- Install dependencies
- Build your project
- Deploy to a production URL

Your site will be live at: `https://your-project-name.vercel.app`

---

## Step 3: Set Up GitHub Actions for Auto-Refresh

### 3.1 Create GitHub Actions Workflow

Create this file: `.github/workflows/refresh-deployment.yml`

```yaml
name: Refresh Deployment Every 12 Hours

on:
  schedule:
    # Runs at 6 AM and 6 PM UTC every day (every 12 hours)
    - cron: "0 6,18 * * *"
  workflow_dispatch: # Allows manual trigger

jobs:
  trigger-vercel-redeploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Deployment
        run: |
          curl -X POST "https://api.vercel.com/v1/integrations/deploy/${{ secrets.VERCEL_DEPLOY_HOOK }}"
```

### 3.2 Create Vercel Deploy Hook

1. Go to your Vercel project dashboard
2. Click "Settings" → "Git"
3. Scroll down to "Deploy Hooks"
4. Click "Create Hook"
5. Name it: `Auto Refresh Hook`
6. Branch: `main`
7. Click "Create Hook"
8. Copy the generated URL (looks like: `https://api.vercel.com/v1/integrations/deploy/...`)

### 3.3 Add Deploy Hook to GitHub Secrets

1. Go to your GitHub repository
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `VERCEL_DEPLOY_HOOK`
5. Value: Paste the full Vercel deploy hook URL
6. Click "Add secret"

### 3.4 Commit and Push the Workflow

```bash
git add .github/workflows/refresh-deployment.yml
git commit -m "Add auto-refresh GitHub Action"
git push
```

---

## Step 4: Verify Everything Works

### 4.1 Test Manual Trigger

1. Go to your GitHub repository
2. Click "Actions" tab
3. Click "Refresh Deployment Every 12 Hours"
4. Click "Run workflow" → "Run workflow"
5. Check that Vercel starts a new deployment

### 4.2 Check Schedule

The workflow will automatically run:

- Every day at 6:00 AM UTC
- Every day at 6:00 PM UTC

To customize the schedule, modify the cron expression:

```yaml
# Examples:
- cron: "0 */12 * * *" # Every 12 hours
- cron: "0 0,12 * * *" # At midnight and noon UTC
- cron: "0 8,20 * * *" # At 8 AM and 8 PM UTC
```

---

## Step 5: Custom Domain (Optional)

### 5.1 Add Custom Domain in Vercel

1. Go to your Vercel project
2. Click "Settings" → "Domains"
3. Add your domain
4. Follow the DNS configuration instructions

---

## Step 6: Performance Optimization

### 6.1 Enable Caching in `vercel.json`

Create `vercel.json` in your project root:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 6.2 Update `vite.config.ts` for Optimization

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "ui-vendor": ["lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

---

## Step 7: Monitoring and Maintenance

### 7.1 Monitor API Usage

- **NewsAPI Free Tier**: 100 requests/day
- **Groq Free Tier**: 14,400 requests/day

**How the app uses APIs:**

- Each page load: ~1-2 NewsAPI requests
- AI Enhancement: 5-10 Groq requests per load
- With caching (5 min), actual API usage is minimized

### 7.2 Check Deployment Logs

1. Go to Vercel Dashboard
2. Click on your deployment
3. Click "Functions" or "Logs" to see any errors

### 7.3 GitHub Actions Monitoring

1. Go to GitHub repository
2. Click "Actions" tab
3. View workflow runs and check for failures

---

## Troubleshooting

### Issue: Deployment Fails

**Solution:**

1. Check Vercel build logs
2. Verify environment variables are set
3. Ensure `package.json` has correct build script:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### Issue: API Keys Not Working

**Solution:**

1. Verify keys are correctly set in Vercel
2. Make sure variables start with `VITE_`
3. Redeploy after adding/updating environment variables

### Issue: GitHub Action Not Running

**Solution:**

1. Check if workflow file is in `.github/workflows/`
2. Verify `VERCEL_DEPLOY_HOOK` secret is set correctly
3. Check Actions tab for error messages

### Issue: News Not Loading

**Solution:**

1. Open browser console (F12)
2. Check for API errors
3. Verify NewsAPI key is valid
4. Check if API rate limit is exceeded

---

## Summary of URLs

After deployment, you'll have:

1. **Production URL**: `https://your-project.vercel.app`
2. **Vercel Dashboard**: `https://vercel.com/your-username/your-project`
3. **GitHub Repository**: `https://github.com/your-username/newsflow-ai`
4. **GitHub Actions**: `https://github.com/your-username/newsflow-ai/actions`

---

## Auto-Refresh Schedule Summary

✅ **Automatic Refresh**: Every 12 hours (6 AM & 6 PM UTC)  
✅ **Manual Trigger**: Available in GitHub Actions  
✅ **Zero Server Cost**: Uses GitHub Actions free tier  
✅ **Fresh Content**: News updates automatically twice daily

---

## Additional Features You Can Add

### 1. Build Status Badge

Add to your `README.md`:

```markdown
![Deployment Status](https://img.shields.io/github/deployments/YOUR_USERNAME/newsflow-ai/production?label=vercel&logo=vercel)
```

### 2. Environment-Specific Configs

Create multiple environments in Vercel:

- Production: `main` branch
- Preview: All other branches
- Different API keys per environment

### 3. Analytics

Add Vercel Analytics:

```bash
npm install @vercel/analytics
```

In `src/main.tsx`:

```typescript
import { Analytics } from "@vercel/analytics/react";

// Add <Analytics /> in your root component
```

---

## Cost Breakdown

| Service        | Free Tier                       | Cost After Free Tier |
| -------------- | ------------------------------- | -------------------- |
| Vercel         | Unlimited for personal projects | $20/month for teams  |
| GitHub Actions | 2,000 minutes/month             | $0.008/minute        |
| NewsAPI        | 100 requests/day                | $449/month for 250k  |
| Groq           | 14,400 requests/day             | Free during beta     |

**Expected Monthly Cost**: $0 (within free tiers) 🎉

---

## 🎯 Quick Start Checklist

- [ ] Push code to GitHub
- [ ] Create Vercel account
- [ ] Import GitHub repo to Vercel
- [ ] Add environment variables in Vercel
- [ ] Deploy and get live URL
- [ ] Create Vercel Deploy Hook
- [ ] Add deploy hook to GitHub Secrets
- [ ] Create GitHub Actions workflow file
- [ ] Test manual workflow trigger
- [ ] Verify automatic schedule works

---

## Support and Updates

For issues or questions:

1. Check Vercel deployment logs
2. Check GitHub Actions logs
3. Verify API keys and rate limits
4. Check browser console for errors

Your NewsFlow AI app will now automatically refresh every 12 hours with fresh content! 🚀
