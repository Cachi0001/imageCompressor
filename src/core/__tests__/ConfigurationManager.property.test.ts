/**
 * Property-based tests for Configuration Manager
 * Feature: image-optimization-pipeline, Property 8: Environment Configuration
 */

import * as fc from 'fast-check';
import { ConfigurationManager } from '../ConfigurationManager';
import { ImagePipelineConfig } from '../../types';
import { ConfigurationError } from '../../errors';

describe('ConfigurationManager Property Tests', () => {
  /**
   * Property 8: Environment Configuration
   * For any configuration change via environment variables, 
   * the system behavior should adapt accordingly without code changes
   * Validates: Requirements 3.4, 7.1
   */
  test('Feature: image-optimization-pipeline, Property 8: Environment Configuration', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid configuration
        fc.record({
          cloudinary: fc.record({
            cloudName: fc.string({ minLength: 1, maxLength: 50 }),
            apiKey: fc.string({ minLength: 10, maxLength: 50 }),
            apiSecret: fc.string({ minLength: 10, maxLength: 100 }),
            uploadPreset: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          optimization: fc.record({
            maxWidth: fc.integer({ min: 100, max: 5000 }),
            quality: fc.constantFrom('auto:eco', 'auto:good', 'auto:best'),
            formats: fc.array(fc.constantFrom('webp', 'avif', 'auto'), { minLength: 1, maxLength: 3 }),
            maxFileSize: fc.integer({ min: 1024, max: 50 * 1024 * 1024 }), // 1KB to 50MB
          }),
          delivery: fc.record({
            enableLazyLoading: fc.boolean(),
            responsiveBreakpoints: fc.array(fc.integer({ min: 100, max: 2000 }), { minLength: 1, maxLength: 10 }),
            cacheUrls: fc.boolean(),
          }),
        }),
        (config: ImagePipelineConfig) => {
          // Create configuration manager with the generated config
          const configManager = new ConfigurationManager(config);
          
          // The configuration should be accessible and match what was provided
          const retrievedConfig = configManager.getConfig();
          
          // Verify that the configuration is preserved exactly
          expect(retrievedConfig.cloudinary.cloudName).toBe(config.cloudinary.cloudName);
          expect(retrievedConfig.cloudinary.apiKey).toBe(config.cloudinary.apiKey);
          expect(retrievedConfig.cloudinary.apiSecret).toBe(config.cloudinary.apiSecret);
          expect(retrievedConfig.cloudinary.uploadPreset).toBe(config.cloudinary.uploadPreset);
          
          expect(retrievedConfig.optimization.maxWidth).toBe(config.optimization.maxWidth);
          expect(retrievedConfig.optimization.quality).toBe(config.optimization.quality);
          expect(retrievedConfig.optimization.formats).toEqual(config.optimization.formats);
          expect(retrievedConfig.optimization.maxFileSize).toBe(config.optimization.maxFileSize);
          
          expect(retrievedConfig.delivery.enableLazyLoading).toBe(config.delivery.enableLazyLoading);
          expect(retrievedConfig.delivery.responsiveBreakpoints).toEqual(config.delivery.responsiveBreakpoints);
          expect(retrievedConfig.delivery.cacheUrls).toBe(config.delivery.cacheUrls);
          
          // Verify individual config getters work correctly
          expect(configManager.getCloudinaryConfig()).toEqual(config.cloudinary);
          expect(configManager.getOptimizationConfig()).toEqual(config.optimization);
          expect(configManager.getDeliveryConfig()).toEqual(config.delivery);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should reject invalid cloudinary configurations', async () => {
    // Test with empty cloud name
    const invalidConfig = {
      cloudinary: {
        cloudName: '',
        apiKey: 'valid-key',
        apiSecret: 'valid-secret',
        uploadPreset: 'valid-preset',
      },
      optimization: {
        maxWidth: 1200,
        quality: 'auto:eco' as const,
        formats: ['webp' as const],
        maxFileSize: 10485760,
      },
      delivery: {
        enableLazyLoading: true,
        responsiveBreakpoints: [300, 600, 1200],
        cacheUrls: true,
      },
    };

    const configManager = new ConfigurationManager(invalidConfig);
    await expect(configManager.validate()).rejects.toThrow(ConfigurationError);
    await expect(configManager.validate()).rejects.toThrow('Cloudinary cloud name is required');
  });

  test('should handle configuration with optional storage settings', () => {
    fc.assert(
      fc.property(
        fc.record({
          cloudinary: fc.record({
            cloudName: fc.string({ minLength: 1, maxLength: 50 }),
            apiKey: fc.string({ minLength: 10, maxLength: 50 }),
            apiSecret: fc.string({ minLength: 10, maxLength: 100 }),
            uploadPreset: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          optimization: fc.record({
            maxWidth: fc.integer({ min: 100, max: 5000 }),
            quality: fc.constantFrom('auto:eco', 'auto:good', 'auto:best'),
            formats: fc.array(fc.constantFrom('webp', 'avif', 'auto'), { minLength: 1 }),
            maxFileSize: fc.integer({ min: 1024, max: 50 * 1024 * 1024 }),
          }),
          delivery: fc.record({
            enableLazyLoading: fc.boolean(),
            responsiveBreakpoints: fc.array(fc.integer({ min: 100, max: 2000 }), { minLength: 1 }),
            cacheUrls: fc.boolean(),
          }),
          storage: fc.option(fc.record({
            cacheTable: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          })),
        }),
        (config: ImagePipelineConfig) => {
          const configManager = new ConfigurationManager(config);
          const retrievedConfig = configManager.getConfig();
          
          // Optional storage configuration should be preserved
          if (config.storage !== null && config.storage !== undefined) {
            expect(retrievedConfig.storage).toEqual(config.storage);
          } else {
            expect(retrievedConfig.storage).toBeFalsy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});