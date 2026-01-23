# Simple Deployment Guide

This service runs 100% on Cloudflare (Workers + R2). **You do not need Render.**

I have updated the configuration (`wrangler.toml`) to use your existing:
- **Account ID:** `95cf2d563e935370edd0213aa03cc92d`
- **Bucket:** `my-images`

## Step 1: Login (Do this once)
Open your terminal in this folder (`workers/cf-image-worker`) and run:

```powershell
npx wrangler login
```

1. It will ask to open your browser. Press **'y'**.
2. Log in with your existing Cloudflare account.
3. Click **"Allow"**.
4. Close the browser tab when it says "Successfully logged in".

## Step 2: Publish the Service
Run this command to push the code to Cloudflare:

```powershell
npx wrangler deploy
```

That's it! Your service is live at:
**`https://cf-image-worker.sabimage.workers.dev`**

## Step 3: Use It

### Display Images (Fast & Compressed)
```
https://cf-image-worker.sabimage.workers.dev/image?url=https://mysite.com/pic.jpg&width=800
```

### Upload Images (Direct & Fast)
POST to: `https://cf-image-worker.sabimage.workers.dev/upload`
(See Integration Guide for code examples)

## Troubleshooting Credentials
If you need API keys for other tools, here is where to find them in your screenshot:
1. Go to **R2 Object Storage** (where you see the bucket list).
2. Look at the right side for a link called **"Manage R2 API Tokens"**.
3. Click that to generate new keys if you ever need `S3_ACCESS_KEY_ID` or `S3_SECRET_ACCESS_KEY` again.
