/**
 * Factory function for creating ImagePipeline instances
 */

import { ImagePipeline } from '../core/ImagePipeline';
import { ImagePipelineConfig } from '../types';
import { ConfigurationError } from '../errors';

/**
 * Creates a new ImagePipeline instance with the provided configuration
 */
export function createImagePipeline(config: ImagePipelineConfig): ImagePipeline {
  if (!config) {
    throw new ConfigurationError('Configuration is required');
  }

  return new ImagePipeline(config);
}

/**
 * Creates ImagePipeline from environment variables
 */
export function createImagePipelineFromEnv(): ImagePipeline {
  const config: ImagePipelineConfig = {
    // Cloudinary is now optional
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',
    } : undefined,
    s3: process.env.S3_BUCKET ? {
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION || 'auto',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        endpoint: process.env.S3_ENDPOINT
    } : undefined,
    email: {
        host: process.env.EMAIL_HOST || '',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
        from: process.env.EMAIL_USER || '',
        adminEmail: process.env.EMAIL_USER || ''
    },
    optimization: {
      maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || '1200', 10),
      quality: (process.env.IMAGE_QUALITY as 'auto:eco' | 'auto:good' | 'auto:best') || 'auto:eco',
      formats: ['webp', 'avif', 'auto'],
      maxFileSize: parseInt(process.env.IMAGE_MAX_FILE_SIZE || '10485760', 10), // 10MB
    },
    delivery: {
      enableLazyLoading: process.env.ENABLE_LAZY_LOADING !== 'false',
      responsiveBreakpoints: [300, 600, 1200],
      cacheUrls: process.env.CACHE_URLS !== 'false',
    },
  };

  return createImagePipeline(config);
}