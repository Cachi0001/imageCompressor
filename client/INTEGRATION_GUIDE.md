# Image Optimization Service Integration Guide

This guide explains how to integrate the **Global Image Optimization Service** into your application. This service provides on-the-fly image optimization, caching (via Cloudflare Edge & R2), and **Direct Uploads** (eliminating Render).

## 1. Service Endpoint

**Primary Endpoint (Cloudflare Worker):**
Use this for BOTH uploading and displaying images.

```env
# .env
VITE_IMAGE_SERVICE_URL=https://cf-image-worker.sabimage.workers.dev
```

## 2. Usage (Displaying Images)

### A. Constructing URLs
To optimize an image, simply append parameters to the service URL:

```
https://cf-image-worker.sabimage.workers.dev/image?url={SOURCE_IMAGE_URL}&width={WIDTH}&quality={QUALITY}&format={FORMAT}
```

**Or if using an uploaded file key:**
```
https://cf-image-worker.sabimage.workers.dev/image?r2key={KEY}
```

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `url` | string | **Yes** | The full URL of the original image. | `https://example.com/hero.jpg` |
| `r2key` | string | **Yes (alt)**| The Key returned from `/upload`. | `default/17000-abc.jpg` |
| `width` | number | No | Target width in pixels. | `800` |
| `quality` | number | No | Quality (1-100). Default: `80` | `90` |
| `format` | string | No | Format (`webp`, `avif`, `jpeg`, `png`). Default: `webp` | `avif` |

**Example:**
```html
<img src="https://cf-image-worker.sabimage.workers.dev/image?url=https%3A%2F%2Fmysite.com%2Fimg.jpg&width=1200&format=webp" />
```

## 3. Uploading Files (Direct to Cloudflare)

We now support **Direct Uploads** to Cloudflare R2 via the Worker. This eliminates the slow Render server.

**Endpoint:** `POST https://cf-image-worker.sabimage.workers.dev/upload`

**Body (FormData):**
*   `image`: The file object (binary).
*   `client`: Client ID (e.g., `teemplot`).

**Response (JSON):**
```json
{
  "key": "teemplot/1739832-ab12.jpg",
  "url": "https://cf-image-worker.sabimage.workers.dev/image?r2key=teemplot%2F1739832-ab12.jpg"
}
```

**Example Code (Frontend):**

```typescript
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('client', 'teemplot');

  const response = await fetch('https://cf-image-worker.sabimage.workers.dev/upload', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  console.log('Use this URL:', data.url);
  return data.url;
};
```

**Why this is better:**
*   **No Cold Starts:** Workers wake up in < 10ms. Render takes 10s+.
*   **Direct Storage:** File goes straight to R2.
*   **Secure:** No API keys exposed on the client.

## 4. Deleting Files

To delete a file (image or video) to free up storage, send a DELETE request.

**Endpoint:** `DELETE https://cf-image-worker.sabimage.workers.dev/delete`

**Body (JSON):**
```json
{
  "key": "client/hash.webp"
}
```

**Example Code:**
```typescript
const deleteImage = async (key: string) => {
  const response = await fetch('https://cf-image-worker.sabimage.workers.dev/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key })
  });
  
  if (!response.ok) throw new Error('Delete failed');
  return true;
};
```

## 5. Client IDs & Analytics

Use the appropriate `client` parameter for your project to ensure analytics isolation:

*   **MuseFactory**: `musefactory`
*   **Teemplot**: `teemplot`
*   **UGlobalHorizons**: `uglobalhorizons`

## 6. Troubleshooting

*   **404 Not Found**: Check if the source `url` parameter is correct.
*   **500 Upload Failed**: Check if the Worker has the correct R2 binding (`IMG_CACHE`).

## 7. Deployment (Cloudflare Workers)

### Deployment Steps
1.  **Login**: `npx wrangler login`
2.  **Deploy**: `npx wrangler deploy`

Config is located in `workers/cf-image-worker/wrangler.toml`.
Source code is in `workers/cf-image-worker/src/index.ts`.
