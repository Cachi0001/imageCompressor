# Global Image Optimization Service

A high-performance, centralized image optimization microservice designed to serve multiple websites (including MuseFactory). It deploys to Vercel and handles on-the-fly compression, resizing, and storage to your own S3 bucket.

## Architecture

This service acts as a centralized "Image CDN". All your websites (Clients) point their image `src` to this service.

```mermaid
graph LR
    ClientA[Website A] -->|Request Image| Service[Image Optimization Service (Vercel)]
    ClientB[MuseFactory] -->|Request Image| Service
    Service -->|Check Cache| S3[S3 Bucket]
    Service -->|If Miss: Optimize| Sharp[Sharp Engine]
    Sharp -->|Save| S3
    S3 -->|Return Image| ClientA
    S3 -->|Return Image| ClientB
```

## Deployment

This entire repository is the service. You deploy this ONCE to Vercel, and all your other projects use the URL it generates.

1.  **Deploy to Vercel**:
    Run the following command from the root directory:
    ```bash
    vercel
    ```

2.  **Environment Variables (Vercel)**:
    Set these in your Vercel Project Settings:
    *   `S3_BUCKET`: Your bucket name
    *   `S3_REGION`: e.g., us-east-1
    *   `S3_ACCESS_KEY_ID`: AWS Access Key
    *   `S3_SECRET_ACCESS_KEY`: AWS Secret Key
    *   `EMAIL_HOST`: smtp.gmail.com
    *   `EMAIL_USER`: your-email@gmail.com
    *   `EMAIL_PASS`: your-app-password

## Client Integration

### 1. MuseFactory (and other websites)

In your frontend code (Next.js, React, Vue, etc.), do not upload images directly to Cloudinary. Instead, upload to this service or request optimized versions.

**To Optimize an External URL:**
```javascript
const SERVICE_URL = "https://your-image-service.vercel.app";
const originalImage = "https://some-source.com/image.jpg";

// Request optimized WebP version
const optimizedSrc = `${SERVICE_URL}/upload?url=${encodeURIComponent(originalImage)}&width=800&format=webp`;
```

**To Upload Directly:**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('width', '1920');
formData.append('quality', 'auto:good');

const response = await fetch('https://your-image-service.vercel.app/upload', {
  method: 'POST',
  body: formData
});
const data = await response.json();
console.log(data.secureUrl); // URL of the optimized image in S3
```

## Migration

If you have existing images in Cloudinary for MuseFactory, use the migration script in `musefactory/scripts/migrate.ts` (documented in `musefactory/README.md`) to pull them into this new S3 bucket.
