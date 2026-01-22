/**
 * Core type definitions for the Image Optimization Pipeline
 */

// Configuration Types
export interface ImagePipelineConfig {
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    uploadPreset: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    publicUrl?: string;
  };
  local?: {
    rootPath: string;
    publicUrl?: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    adminEmail: string;
  };
  optimization: {
    maxWidth: number;
    quality: 'auto:eco' | 'auto:good' | 'auto:best' | number;
    formats: ('webp' | 'avif' | 'auto' | 'jpeg' | 'png')[];
    maxFileSize: number; // in bytes
  };
  delivery: {
    enableLazyLoading: boolean;
    responsiveBreakpoints: number[];
    cacheUrls: boolean;
  };
  storage?: {
    database?: DatabaseAdapter;
    cacheTable?: string;
  };
}

export interface DatabaseAdapter {
  saveOptimizedUrl(originalId: string, optimizedUrl: string): Promise<void>;
  getOptimizedUrl(originalId: string): Promise<string | null>;
}

// Upload Types
export interface UploadResult {
  publicId: string;
  secureUrl: string;
  originalSize: number;
  optimizedSize: number;
  format: string;
  width: number;
  height: number;
}

export interface UploadParams {
  publicId?: string;
  folder?: string;
  transformation?: string;
  timestamp: number;
}

export interface SignatureData {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  context?: Record<string, string>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fileSize?: number;
  mimeType?: string;
}

// Optimization Types
export interface ImageVariant {
  width: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'scale';
  quality?: string;
  format?: string;
}

export interface ResponsiveImageSet {
  srcset: string;
  sizes: string;
  fallback: string;
  variants: {
    width: number;
    url: string;
  }[];
}

export interface OptimizationConfig {
  width?: number;
  height?: number;
  quality?: string;
  format?: string;
  crop?: string;
  flags?: string[];
}

// Delivery Types
export interface ResponsiveImageProps {
  src: string;
  srcSet: string;
  sizes: string;
  alt?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
}

// Data Model Types
export interface ImageMetadata {
  id: string;
  publicId: string;
  originalFilename: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  width: number;
  height: number;
  uploadedAt: Date;
  cloudinaryUrl: string;
  variants: ImageVariant[];
}

export interface CacheEntry {
  publicId: string;
  variant: string; // JSON stringified variant config
  optimizedUrl: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface UploadPresetConfig {
  name: string;
  unsigned: boolean;
  transformation: {
    width: number;
    crop: string;
    quality: string;
    format: string;
    flags: string[];
  };
  allowedFormats: string[];
  maxFileSize: number;
  folder: string;
  publicIdPrefix?: string;
}

// Metrics Types
export interface UsageMetrics {
  apiCalls: number;
  transformations: number;
  bandwidth: number;
  storage: number;
  timestamp: Date;
}

// Browser Support Types
export interface BrowserSupport {
  webp: boolean;
  avif: boolean;
  userAgent: string;
}