# Video Upload Flow and Limits

## Overview
This document explains how video uploads are handled across the platform, current limits and validation logic, Cloudflare Wrangler deployment details, and recommended changes to support uploads up to 500MB reliably.

## Architecture & Paths
- Express server endpoint (Node):
  - Route: `POST /api/upload`
  - Handler uses Multer with `memoryStorage` and inspects mimetype for `video/*`.
  - References: [server.ts](file:///c:/Users/DELL/Saas/imageCompressor/server.ts#L64-L145)
- Cloudflare Worker endpoint:
  - Route: `POST /upload`
  - Handler streams `FormData` file directly to R2 (no transcoding).
  - References: [index.ts](file:///c:/Users/DELL/Saas/imageCompressor/workers/cf-image-worker/src/index.ts#L57-L100)
- Cloudflare Worker compatibility endpoints:
  - Routes:
    - `GET /api/files/<encodedKey>` (and `HEAD`) → stream from R2
    - `GET /api/videos/<key>` (and `HEAD`) → stream from R2
    - `PUT /api/videos/<key>` → streaming upload to R2 (recommended for 500MB+)
  - References: [index.ts](file:///c:/Users/DELL/Saas/imageCompressor/workers/cf-image-worker/src/index.ts)
- Vercel API variant:
  - Route: `POST /api/upload`
  - Notes indicate “Image optimization only (FFmpeg removed)”, not a video pipeline.
  - References: [api/index.ts](file:///c:/Users/DELL/Saas/imageCompressor/api/index.ts#L60-L127), [vercel.json](file:///c:/Users/DELL/Saas/imageCompressor/vercel.json)

## Current Limits & Validation
- Multer limit (Express):
  - `limits.fileSize` tied to `config.optimization.maxFileSize` (default 100MB).
  - References: [app.ts](file:///c:/Users/DELL/Saas/imageCompressor/src/app.ts#L12-L38), [UploadHandler.ts](file:///c:/Users/DELL/Saas/imageCompressor/src/core/UploadHandler.ts#L93-L116)
- Application-level validation:
  - Upload handler validates size against `config.optimization.maxFileSize` and returns an error when exceeded.
  - References: [UploadHandler.ts](file:///c:/Users/DELL/Saas/imageCompressor/src/core/UploadHandler.ts#L93-L116)
- Remote fetch caps (client optimize API):
  - `axios` uses `maxContentLength: 50MB`, limiting remote source ingestion.
  - References: [client/api/optimize.ts](file:///c:/Users/DELL/Saas/imageCompressor/client/api/optimize.ts#L63-L75)
- Cloudflare Worker upload:
  - No explicit size cap in code; streams payload to R2.
  - References: [index.ts](file:///c:/Users/DELL/Saas/imageCompressor/workers/cf-image-worker/src/index.ts)

## Cloudflare Wrangler Configuration
- Config file: [wrangler.toml](file:///c:/Users/DELL/Saas/imageCompressor/workers/cf-image-worker/wrangler.toml)
- Key settings:
  - `name = "cf-image-worker"`
  - `main = "src/index.ts"`
  - `compatibility_date = "2025-12-01"`
  - `vars`: `DEFAULT_QUALITY`, `DEFAULT_FORMAT`, `USE_R2_CACHE`, `MAX_WIDTH`, `MAX_HEIGHT`, etc.
  - `r2_buckets`:
    - `IMG_CACHE` → `my-images` (images/files)
    - `VID_CACHE` → `sabimage-videos` (videos)

## Known Failure Scenarios
- Uploads ≥100MB via Express:
  - Trigger Multer `limits.fileSize` and application validation, causing “file too large” errors.
- Memory pressure (Express):
  - `memoryStorage` holds the entire file in RAM; large files can cause process instability or failure.
- Vercel API path:
  - The Vercel variant is documented for images only; large video uploads may fail or be unsupported by the runtime.
- Remote fetch caps:
  - Any path that fetches external content via `axios` is limited to 50MB.

## Recommendations to Support 500MB
1. Prefer Cloudflare Worker for large videos:
   - Prefer `PUT /api/videos/<key>` with raw bytes (streams request body to R2; avoids buffering multipart).
   - Keep `POST /upload` for smaller files, testing, or apps that can’t switch yet.
2. If keeping Express video uploads:
   - Increase `config.optimization.maxFileSize` to `500 * 1024 * 1024` and propagate to Multer.
   - Switch from `memoryStorage` to streaming or disk-backed storage (e.g., Busboy or Multer with streaming to S3/R2).
   - Ensure processing/transcoding (if any) reads from a stream to avoid RAM spikes.
3. Avoid Vercel serverless for large video payloads:
   - Keep Vercel path for images or small files only; route large videos to the Worker.
4. Review client constraints:
   - Remove or raise client-side caps (e.g., `axios maxContentLength`) for video flows that stream directly to the Worker/R2.

## Client Integration Notes
- Field names:
  - Express expects `image` for `upload.single('image')`.
  - Cloudflare Worker supports `file` or `image` in `FormData`.
- Example (Worker):
  ```bash
  curl -X POST https://<your-worker-domain>/upload \
    -F file=@./video_300mb.mp4
  ```
- Example (Worker, streaming raw bytes — recommended for large videos):
  ```bash
  curl -X PUT "https://<your-worker-domain>/api/videos/myvideo.mp4" \
    -H "Content-Type: video/mp4" \
    --data-binary "@./video_500mb.mp4"
  ```
- Example (Express — only if limits and storage are updated):
  ```bash
  curl -X POST https://<your-express-domain>/api/upload \
    -F image=@./video_300mb.mp4
  ```

## Operational Guidance
- Use the Worker route for production-scale (>100MB) uploads.
- Monitor R2 bucket usage and enable multipart uploads if needed for very large files.
- Log validation failures and return clear error payloads so client apps can react appropriately.

## References
- Express upload route: [server.ts](file:///c:/Users/DELL/Saas/imageCompressor/server.ts#L64-L145)
- Cloudflare Worker route: [index.ts](file:///c:/Users/DELL/Saas/imageCompressor/workers/cf-image-worker/src/index.ts#L57-L100)
- Multer config and validation: [app.ts](file:///c:/Users/DELL/Saas/imageCompressor/src/app.ts#L12-L38), [UploadHandler.ts](file:///c:/Users/DELL/Saas/imageCompressor/src/core/UploadHandler.ts#L93-L116)
- Client optimize API limits: [client/api/optimize.ts](file:///c:/Users/DELL/Saas/imageCompressor/client/api/optimize.ts#L63-L75)
- Wrangler config: [wrangler.toml](file:///c:/Users/DELL/Saas/imageCompressor/workers/cf-image-worker/wrangler.toml)
