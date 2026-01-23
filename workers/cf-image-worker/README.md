# Cloudflare Image Worker

**URL**: `https://cf-image-worker.sabimage.workers.dev`

This service provides high-performance, edge-based image resizing and compression, and **direct uploads**.

## Usage

### 1. Uploading Images (Direct to Cloudflare)
**Endpoint:** `POST /upload`
**Body:** `FormData` with `image` file and `client` string.

```bash
curl -X POST -F "image=@my.jpg" -F "client=test" https://cf-image-worker.sabimage.workers.dev/upload
```
Returns a JSON with `url` that you can use immediately.

### 2. Displaying Images
**Endpoint:** `GET /image`

### Parameters
| Name | Description | Default |
| :--- | :--- | :--- |
| `url` | Source image URL (or use `r2key`) | - |
| `r2key` | Key from upload response | - |
| `width` | Target width | Original |
| `quality` | Compression quality (1-100) | `80` |
| `format` | Output format (`webp`, `avif`, `jpeg`, `png`) | `webp` |
| `fit` | Resize mode (`cover`, `contain`, `scale-down`) | `cover` |

### Example
```
https://cf-image-worker.sabimage.workers.dev/image?url=https://example.com/pic.jpg&width=800&format=webp
```

## Setup & Deployment

1.  **Install Wrangler**: `npm i -g wrangler`
2.  **Login**: `wrangler login`
3.  **Deploy**: `wrangler deploy`

## Configuration (`wrangler.toml`)

*   **ALLOWED_HOSTS**: Restrict which domains can be optimized (comma-separated).
*   **USE_R2_CACHE**: Set to `"1"` to save transformed images to your R2 bucket (`my-images`) to save costs on re-processing.
*   **MAX_WIDTH/HEIGHT**: Limits to prevent abuse.

## Architecture
*   **Runtime**: Cloudflare Workers (Edge)
*   **Image Engine**: Cloudflare Image Resizing (Native)
*   **Cache**: Edge Cache (7 days) + Optional R2 Persistence 
