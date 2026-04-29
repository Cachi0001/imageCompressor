# Global Image Service API Reference

This document defines the **Universal API** for the Image Optimization Service.
Any application (Web, Mobile, Backend) can use these endpoints to upload, retrieve, and delete images.

**Base URL:**
`https://cf-image-worker.sabimage.workers.dev`

---

## 1. Upload Image (POST)
Uploads a file directly to Cloudflare R2 storage.

**Endpoint:** `POST /upload`
**Content-Type:** `multipart/form-data`

### Parameters
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `image` | File | **Yes** | The binary file to upload. |
| `client` | String | **Yes** | Client ID (e.g., `musefactory`, `teemplot`). |

### Example Request (cURL)
```bash
curl -X POST -F "image=@photo.jpg" -F "client=musefactory" https://cf-image-worker.sabimage.workers.dev/upload
```

### Example Response (JSON)
```json
{
  "key": "musefactory/17000000-abc.jpg",
  "url": "https://cf-image-worker.sabimage.workers.dev/image?r2key=musefactory%2F17000000-abc.jpg"
}
```

---

## 2. Get/Optimize Image (GET)
Retrieves an image, optionally resizing and compressing it on the fly.

**Endpoint:** `GET /image`

### Parameters
| Parameter | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `url` | Yes* | Full URL of source image. | `https://site.com/img.jpg` |
| `r2key` | Yes* | Key from `/upload` (Alternative to `url`). | `musefactory/abc.jpg` |
| `width` | No | Target width (px). | `800` |
| `quality` | No | Compression quality (1-100). | `80` |
| `format` | No | `webp`, `avif`, `jpeg`, `png`. | `webp` |

*\*Either `url` OR `r2key` must be provided.*

### Example Request
```
GET https://cf-image-worker.sabimage.workers.dev/image?r2key=musefactory/abc.jpg&width=400&format=webp
```

---

## 3. Delete Image (DELETE)
Permanently removes an image from storage.

**Endpoint:** `DELETE /delete`
**Content-Type:** `application/json`

### Body
```json
{
  "key": "musefactory/17000000-abc.jpg"
}
```

### Example Request (cURL)
```bash
curl -X DELETE -d '{"key":"musefactory/abc.jpg"}' -H "Content-Type: application/json" https://cf-image-worker.sabimage.workers.dev/delete
```

---

## Client Integration Examples

For specific code examples on how to integrate this into your React applications, see:
[REACT_EXAMPLES.md](REACT_EXAMPLES.md)
