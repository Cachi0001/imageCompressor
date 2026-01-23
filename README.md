# Global Image Optimization Service

A high-performance, centralized image optimization microservice designed to serve multiple websites. It uses **Cloudflare Workers** for fast edge delivery and a Node.js backend for file uploads.

## Architecture

This service acts as a centralized "Image CDN". All your websites (Clients) point their image `src` to this service.

```mermaid
graph LR
    ClientA[Website A] -->|Fetch Optimized| Worker[Cloudflare Worker (Edge)]
    ClientB[MuseFactory] -->|Upload File| NodeApp[Node Upload Service (Render)]
    Worker -->|Resize & Cache| R2[Cloudflare R2 Storage]
    NodeApp -->|Save Original| R2
    Worker -->|Return WebP/AVIF| ClientA
```

## Quick Links

*   **Integration Guide**: [client/INTEGRATION_GUIDE.md](client/INTEGRATION_GUIDE.md) - **Start Here**
*   **Worker Deployment**: [workers/cf-image-worker/DEPLOY.md](workers/cf-image-worker/DEPLOY.md)
*   **Worker Source**: [workers/cf-image-worker/](workers/cf-image-worker/)

## Services

### 1. Delivery Service (Cloudflare Worker)
*   **URL**: `https://cf-image-worker.sabimage.workers.dev`
*   **Purpose**: Fetches, resizes, and compresses images on the fly at the edge.
*   **Latency**: < 100ms globally (cached).

### 2. Upload Service (Node.js/Express)
*   **URL**: `https://image-compressor-f5lk.onrender.com/api/upload`
*   **Purpose**: Handles file uploads (multipart/form-data) from admin panels.
*   **Storage**: Saves files to R2 bucket `my-images`.

## Deployment

### A. Deploy the Worker (Fast Delivery)
See [workers/cf-image-worker/DEPLOY.md](workers/cf-image-worker/DEPLOY.md).

```bash
cd workers/cf-image-worker
npx wrangler login
npx wrangler deploy
```

### B. Deploy the Upload Service (Backend)
This is a standard Node.js app deployable to Render/Vercel.
*   Ensure environment variables `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` (my-images), and `S3_ENDPOINT` are set.
