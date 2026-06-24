# Greek Life App Deployment Guide

## 🚨 **FIXED: White Screen Issue**

The white screen issue has been resolved by removing the hardcoded homepage URL. Your app will now work on any deployment platform.

---

## Option 1: Netlify (Recommended - Easiest & Free)

### Step 1: Build the App
```bash
npm run build
```

### Step 2: Deploy to Netlify
1. Go to [Netlify.com](https://netlify.com) and sign up/login
2. Drag and drop your `build` folder to the Netlify dashboard
3. Wait for deployment (usually 30-60 seconds)
4. Get your shareable URL instantly!

**Your app will be live at:** `https://random-name-123456.netlify.app`

### Step 3: Customize URL (Optional)
- In Netlify dashboard, go to "Site settings" → "Change site name"
- Choose a custom name like `greek-life-app`
- Your URL becomes: `https://greek-life-app.netlify.app`

---

## Option 2: Vercel (Alternative - Also Free)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy
```bash
vercel
```

Follow the prompts to connect your GitHub account and deploy.

---

## Option 3: GitHub Pages (For GitHub Users)

### Step 1: Update package.json for GitHub Pages
Add this line to your `package.json`:
```json
"homepage": "https://jonahortega.github.io/greek-life"
```

### Step 2: Deploy
```bash
npm run deploy
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll to "Pages" section
4. Select "Deploy from a branch"
5. Choose "gh-pages" branch
6. Click "Save"

---

## Option 4: Firebase Hosting (Alternative - Free)

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login and Initialize
```bash
firebase login
firebase init hosting
```

### Step 3: Build and Deploy
```bash
npm run build
firebase deploy
```

---

## 🎯 **Quick Start (Recommended)**

**For immediate deployment:**

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify:**
   - Go to [Netlify.com](https://netlify.com)
   - Drag and drop the `build` folder
   - Get your URL instantly!

3. **Share your app:**
   - Copy the Netlify URL
   - Share with anyone!

---

## Troubleshooting

### If you still see a white screen:

1. **Check the browser console:**
   - Right-click → "Inspect" → "Console" tab
   - Look for any red error messages

2. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

3. **Try a different browser:**
   - Test in Chrome, Firefox, Safari

4. **Check the deployment logs:**
   - In Netlify/Vercel dashboard, check the deployment logs

### Common Issues:

1. **404 Errors**: Make sure you're deploying the `build` folder, not the entire project
2. **Build Errors**: Run `npm run build` locally first to check for issues
3. **CORS Issues**: Usually not a problem with static hosting

---

## Testing Your Deployment

After deployment, test these features:
- ✅ Welcome screen loads
- ✅ University selection works
- ✅ Navigation between screens
- ✅ All images load properly
- ✅ Responsive design on mobile

---

## Quick Commands Summary

```bash
# 1. Build the app
npm run build

# 2. Deploy to Netlify (drag build folder)
# OR deploy to Vercel
vercel

# 3. Share your URL! 🎉
```

Your app will be live and shareable! The white screen issue has been fixed. 🚀 