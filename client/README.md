# MuseFactory Image Optimizer

A high-performance, on-the-fly image optimization service designed to replace Cloudinary. Deployable on Vercel and backed by AWS S3 (or any S3-compatible storage like R2, DigitalOcean Spaces).

## Features

- **Blazing Fast**: Uses `sharp` (libvips) for extremely fast image compression.
- **On-the-fly Optimization**: Resize, format conversion (WebP, AVIF), and compression via URL parameters.
- **Smart Caching**: Optimizes once, caches in S3, and serves directly or via CDN for subsequent requests.
- **Cost Effective**: Bypasses Cloudinary free tier limits by using your own S3 bucket.

## Prerequisites

1.  **Vercel Account**: For hosting the optimization API.
2.  **S3 Bucket**: AWS S3, Cloudflare R2, or DigitalOcean Spaces bucket.
    -   Create a bucket (e.g., `musefactory-images`).
    -   Set bucket policy to allow public read (if you want direct access) or configure the Vercel function to sign URLs (simpler to just make it public-read for assets).

## Setup & Deployment

1.  **Install Dependencies**:
    ```bash
    cd musefactory
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file in `musefactory` (or set in Vercel Dashboard):
    ```
    S3_REGION=us-east-1
    S3_ACCESS_KEY_ID=your_access_key
    S3_SECRET_ACCESS_KEY=your_secret_key
    S3_BUCKET=musefactory-images
    S3_ENDPOINT=https://... (Optional, for R2/DigitalOcean)
    S3_PUBLIC_URL=https://... (Optional, for CDN URL)
    
    # For Migration only
    CLOUDINARY_CLOUD_NAME=...
    CLOUDINARY_API_KEY=...
    CLOUDINARY_API_SECRET=...
    ```

3.  **Deploy to Vercel**:
    ```bash
    vercel
    ```
    Follow the prompts.

## Usage

### 1. Optimize On-the-Fly

Use the deployed Vercel URL to optimize any image:

```
https://your-app.vercel.app/api/optimize?url=IMAGE_URL&w=800&q=80&f=webp
```

-   `url`: The source image URL (can be your old Cloudinary URL or any public URL).
-   `w`: Target width (optional).
-   `q`: Quality (1-100, default 80).
-   `f`: Format (webp, avif, jpeg, png, default webp).

**How it works**:
1.  Checks if this specific variant exists in S3.
2.  If yes -> Redirects to S3 (Fast!).
3.  If no -> Downloads source, optimizes, uploads to S3, and serves image.

### 2. Direct Access (Migrated Images)

If you have migrated your images, you can access them directly from S3 for maximum speed:
`https://your-bucket.s3.amazonaws.com/image-id.webp`

## Migration from Cloudinary

To move your existing images from Cloudinary to S3 (optimized):

1.  Configure `.env` with Cloudinary and S3 credentials.
2.  Run the migration script:
    ```bash
    npx ts-node scripts/migrate.ts
    ```
    This will:
    -   List all images in Cloudinary.
    -   Download them.
    -   Compress them to WebP.
    -   Upload them to your S3 bucket.

## Integration with Other Software

For your other websites, simply replace the image `src` with the Vercel API URL:

**React/Next.js Example**:
```jsx
const ImageComponent = ({ src, alt }) => {
  const optimizedSrc = `https://musefactory.vercel.app/api/optimize?url=${encodeURIComponent(src)}&w=800&f=webp`;
  
  return <img src={optimizedSrc} alt={alt} loading="lazy" />;
};
```

This ensures "very very fast" loading as the heavy lifting is offloaded to your Vercel service.
