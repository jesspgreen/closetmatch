# ClosetMatch MVP Deployment Guide

## 💰 Total Cost Breakdown

| Item | Cost | When |
|------|------|------|
| Vercel Hosting | $0 | Free tier: 100GB bandwidth |
| Supabase (optional) | $0 | Free tier: 500MB, 50K users |
| Anthropic API | ~$0.003/chat | Pay per use |
| Domain (optional) | $0 | Use yourapp.vercel.app |
| **Month 1 Total** | **$0-15** | Depends on usage |

---

## 🚀 Deployment Steps

### Step 1: Prerequisites (5 minutes)

```bash
# Install Node.js 18+ from https://nodejs.org
# Install Git from https://git-scm.com

# Verify installation
node --version  # Should be 18+
git --version
```

### Step 2: Get Your Anthropic API Key (2 minutes)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up (free, no credit card required for signup)
3. Go to **API Keys** → **Create Key**
4. Copy and save the key (starts with `sk-ant-...`)
5. Add $5 credits to start (this gives ~1,600 chat messages)

### Step 3: Create GitHub Repository (3 minutes)

1. Go to [github.com](https://github.com) and sign in (or create free account)
2. Click **New Repository**
3. Name: `closetmatch`
4. Keep it **Public** (required for Vercel free tier)
5. Click **Create repository**

### Step 4: Push Code to GitHub (5 minutes)

```bash
# Clone your empty repo
git clone https://github.com/YOUR_USERNAME/closetmatch.git
cd closetmatch

# Copy all project files into this folder, then:
git add .
git commit -m "Initial commit - ClosetMatch MVP"
git push origin main
```

### Step 5: Deploy to Vercel (5 minutes)

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **Add New Project**
3. Import your `closetmatch` repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your API key from Step 2
6. Click **Deploy**

✅ Your app is now live at `https://closetmatch.vercel.app`!

---

## 📱 Make It Feel Like a Real App (PWA)

The app is already configured as a Progressive Web App. Users can:

**On iPhone:**
1. Open the site in Safari
2. Tap Share → "Add to Home Screen"
3. App icon appears on home screen

**On Android:**
1. Open in Chrome
2. Tap menu → "Add to Home Screen"
3. Or accept the install prompt

---

## 🔒 Security Checklist

- [x] API key stored as environment variable (never in code)
- [x] Edge function proxies API calls (key never exposed to browser)
- [x] Rate limiting can be added with Upstash Redis (free tier)
- [ ] Add authentication before production launch

---

## 📊 Monitoring & Analytics (Free)

### Add Vercel Analytics
1. In Vercel dashboard → Project → Analytics
2. Enable Web Analytics (free tier: 2,500 events/month)

### Add Error Tracking (Optional)
```bash
npm install @sentry/react
```
Sentry free tier: 5,000 errors/month

---

## 🗄️ Add User Accounts (Optional - Still Free)

### Using Supabase

1. Go to [supabase.com](https://supabase.com) → Create project
2. Get your project URL and anon key
3. Install: `npm install @supabase/supabase-js`

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)
```

Add to Vercel environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 💳 When to Upgrade (Usage Thresholds)

| Service | Free Limit | Upgrade Trigger |
|---------|------------|-----------------|
| Vercel | 100GB bandwidth | ~50K visits/mo |
| Supabase | 500MB database | ~10K users |
| Anthropic | Pay-per-use | Budget limit |

---

## 🎯 Cost Optimization Tips

### 1. Limit AI Chat Length
```javascript
// In api/chat.js
max_tokens: Math.min(body.max_tokens || 500, 1000) // Cap at 1000
```

### 2. Cache Common Responses
Store outfit suggestions in localStorage to avoid repeat API calls.

### 3. Use Haiku for Simple Tasks
```javascript
model: 'claude-3-haiku-20240307' // 10x cheaper than Sonnet
```

### 4. Set Budget Alerts
In Anthropic Console → Usage → Set spending limit

---

## 🚨 Before Public Launch

1. **Add Terms of Service** - Required for app stores
2. **Add Privacy Policy** - Required for data collection
3. **Enable Authentication** - Before storing real user data
4. **Test on Real Devices** - iPhone Safari, Android Chrome
5. **Set Up Monitoring** - Know when things break

---

## 📁 Project Structure

```
closetmatch/
├── api/
│   └── chat.js          # Vercel Edge Function (AI proxy)
├── public/
│   ├── manifest.json    # PWA config
│   └── icons/           # App icons
├── src/
│   ├── App.jsx          # Main application
│   ├── main.jsx         # Entry point
│   └── index.css        # Tailwind CSS
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## 🆘 Troubleshooting

### "API not working"
- Check Vercel logs: Dashboard → Project → Logs
- Verify ANTHROPIC_API_KEY is set in environment variables
- Check you have credits in Anthropic console

### "Build failed"
- Run `npm run build` locally first
- Check for TypeScript/ESLint errors
- Verify all imports are correct

### "PWA not installing"
- Must be served over HTTPS (Vercel does this)
- Check manifest.json is valid
- Icons must be correct sizes (192x192, 512x512)

---

## 🎉 You're Live!

Your ClosetMatch MVP is now deployed and accessible worldwide.

**Next Steps:**
1. Share with 10 friends for feedback
2. Track usage in Vercel Analytics
3. Iterate based on feedback
4. Add features users actually want

**Estimated Time to Deploy: 20-30 minutes**
**Estimated Cost: $0-5 for first month**
