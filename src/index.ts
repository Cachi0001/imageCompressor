/**
 * Image Optimization Pipeline - Main Entry Point
 * 
 * A reusable, enterprise-level image optimization pipeline that automatically
 * compresses and optimizes images for ecommerce applications using Cloudinary.
 */

export { ImagePipeline } from './core/ImagePipeline';
export { ConfigurationManager } from './core/ConfigurationManager';
export { UploadHandler } from './core/UploadHandler';
export { OptimizationEngine } from './core/OptimizationEngine';
export { DeliverySystem } from './core/DeliverySystem';

// Type exports
export type {
  ImagePipelineConfig,
  DatabaseAdapter,
  UploadResult,
  UploadParams,
  SignatureData,
  ImageVariant,
  ResponsiveImageSet,
  ResponsiveImageProps,
  ImageMetadata,
  CacheEntry,
  UploadPresetConfig,
  ValidationResult,
  UploadOptions,
  OptimizationConfig,
} from './types';

// Error exports
export {
  ImagePipelineError,
  ConfigurationError,
  UploadError,
  OptimizationError,
  DeliveryError,
} from './errors';

// Utility exports
export { createImagePipeline } from './utils/factory';
export { validateImageFile } from './utils/validation';
export { generatePublicId } from './utils/id-generation';