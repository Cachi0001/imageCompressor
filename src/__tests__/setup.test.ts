/**
 * Basic setup test to ensure the project structure is working
 */

import { createImagePipeline } from '../utils/factory';
import { ImagePipelineConfig } from '../types';

describe('Project Setup', () => {
  const mockConfig: ImagePipelineConfig = {
    cloudinary: {
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      uploadPreset: 'test-preset',
    },
    optimization: {
      maxWidth: 1200,
      quality: 'auto:eco',
      formats: ['webp', 'avif', 'auto'],
      maxFileSize: 10485760,
    },
    delivery: {
      enableLazyLoading: true,
      responsiveBreakpoints: [300, 600, 1200],
      cacheUrls: true,
    },
  };

  test('should create ImagePipeline instance', () => {
    const pipeline = createImagePipeline(mockConfig);
    expect(pipeline).toBeDefined();
    expect(pipeline.getUploadHandler()).toBeDefined();
    expect(pipeline.getOptimizationEngine()).toBeDefined();
    expect(pipeline.getDeliverySystem()).toBeDefined();
  });

  test('should validate configuration on initialization', async () => {
    const pipeline = createImagePipeline(mockConfig);
    await expect(pipeline.initialize()).resolves.not.toThrow();
  });

  test('should throw error for invalid configuration', () => {
    const invalidConfig = { ...mockConfig };
    invalidConfig.cloudinary.cloudName = '';
    
    const pipeline = createImagePipeline(invalidConfig);
    expect(pipeline.initialize()).rejects.toThrow('Cloudinary cloud name is required');
  });
});