# Image Optimization Service Integration Guide

This guide explains how to integrate the **Global Image Optimization Service** into your application. This service provides on-the-fly image optimization, caching (via S3/R2), and resizing.

## 1. Service Endpoint

You should configure the service URL in your environment variables.

```env
# .env
VITE_IMAGE_SERVICE_URL=https://image-compressor-f5lk.onrender.com/api/optimize
```

*(This is your active Render deployment URL)*

## 2. Usage

### A. Constructing URLs Manually

To optimize an image, simply append parameters to the service URL:

```
GET /api/optimize?url={SOURCE_IMAGE_URL}&w={WIDTH}&q={QUALITY}&f={FORMAT}&client={CLIENT_ID}
```

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `url` | string | **Yes** | The full URL of the original image. | `https://example.com/hero.jpg` |
| `w` | number | No | Target width in pixels. | `800` |
| `q` | number | No | Quality (1-100) or `lossless`. Default: `80` | `90` |
| `f` | string | No | Format (`webp`, `avif`, `auto`). Default: `webp` | `avif` |
| `client` | string | No | Client ID for isolation/analytics. | `musefactory` |

**Example:**
```
https://image-compressor-f5lk.onrender.com/api/optimize?url=https%3A%2F%2Fmysite.com%2Fimg.jpg&w=1200&f=webp&client=teemplot
```

### B. Direct File Upload (Images & Video)

If you need to upload a file directly from the user's device (e.g., `<input type="file" />`), use the Upload Endpoint.

**Endpoint:** `POST /api/upload`

**Body (FormData):**
*   `image`: The file object (binary). Supports **Images** (jpg, png, webp) and **Videos** (mp4, webm, mov).
*   `client`: Client ID (e.g., `teemplot`).
*   `w`: Target width (optional).
*   `q`: Quality (optional).
*   `f`: Format (optional).

**Video Note:** Videos are automatically compressed to MP4 (h.264) or WebM (vp9) based on the `f` parameter.

**Example Code (React):**

```typescript
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('client', 'teemplot');
  formData.append('w', '800');

  const response = await fetch('https://image-compressor-f5lk.onrender.com/api/upload', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  console.log('Optimized File URL:', data.url);
  return data.url;
};
```

### C. Deleting Files

To delete a file (image or video) to free up storage, send a DELETE request.

**Endpoint:** `DELETE /api/delete`

**Body (JSON):**
```json
{
  "key": "client/hash.webp"
}
```
*OR*
```json
{
  "url": "https://pub-xxx.r2.dev/client/hash.webp"
}
```

**Example Code:**
```typescript
await fetch('https://image-compressor-f5lk.onrender.com/api/delete', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://...' })
});
```

### D. Using the Helper Utility (Recommended for URLs)

Copy the `image-optimizer.ts` (or `image-loader.ts`) file into your project's `src/lib` directory.

**Usage in React/Vue/TS:**

```typescript
import { getOptimizedUrl } from '@/lib/image-optimizer';

// In your component
const myImage = getOptimizedUrl({
  src: 'https://example.com/banner.png',
  width: 1200,
  quality: 90,
  format: 'avif'
});

return <img src={myImage} alt="Banner" />;
```

## 3. Client IDs

Use the appropriate `client` parameter for your project to ensure analytics and storage isolation work correctly:

*   **MuseFactory**: `musefactory`
*   **Teemplot**: `teemplot` (or `client-a`)
*   **UGlobalHorizons**: `uglobalhorizons` (or `client-b`)

## 4. Under the Hood: How It Works

This section details the internal logic of the service for debugging and understanding performance.

### A. Compression Logic
The service uses **Sharp**, a high-performance Node.js image processing library.

1.  **Input**: Accepts raw binary data (Buffer) from a URL fetch or Direct Upload.
2.  **Pipeline**:
    *   **Resizing**: If `w` (width) is provided, the image is resized maintaining aspect ratio.
    *   **Format Conversion**: Converts the image to the requested format (default `webp`). WebP is chosen for its superior compression-to-quality ratio (typically 30% smaller than JPEG).
    *   **Optimization**: Applies lossy compression based on the `q` (quality) parameter (default `80`). This removes invisible visual data to save space.
3.  **Output**: Returns a Buffer of the optimized image and metadata (width, height, size).

### B. Storage & Caching Strategy
To avoid re-processing the same image multiple times, we use a content-addressable storage strategy.

1.  **Hashing**: Before uploading, we generate an **MD5 hash** of the *optimized* image data.
2.  **Key Generation**: The storage key (path) is constructed as:
    `{CLIENT_ID}/{HASH}.{FORMAT}`
    *   *Example*: `teemplot/a1b2c3d4e5...99.webp`
3.  **Deduplication**: If two different users upload the exact same image (pixel-for-pixel identical after optimization), they will generate the same hash and share the same storage file, saving space.
4.  **Storage Provider**: Files are uploaded to **Cloudflare R2** (using the AWS S3 SDK). R2 provides global distribution and zero egress fees.

### C. Encoding & Parameters
*   **Encoding**: Images are processed in memory as Buffers. We do not write temporary files to disk, which keeps the service fast and stateless (friendly for Serverless/Render).
*   **Parameter Explanation**:
    *   `w` (Width): Controls the resolution. Smaller width = smaller file size. Use this to match the display size on the client (e.g., don't serve a 4000px image for a 300px card).
    *   `q` (Quality): Controls the compression level. 80 is "High Quality" (visually lossless). 60 is "Medium" (good for thumbnails). 100 is "Max" (large file size).
    *   `f` (Format): `webp` is supported by all modern browsers. `avif` offers even better compression but is slower to encode.

## 5. Troubleshooting

*   **net::ERR_NAME_NOT_RESOLVED**: This usually means the `S3_PUBLIC_URL` environment variable is missing or incorrect. The service is trying to guess the URL but failing for R2. Ensure your Render Environment Variables include the public URL of your bucket.
*   **400 Invalid URL**: Ensure the `url` parameter is a valid, publicly accessible URL.
*   **Images not updating**: The service caches heavily. Change the `q` or `w` slightly to force a re-optimization if you changed the source image but kept the URL the same.
