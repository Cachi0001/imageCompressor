import { OptimizationEngine } from '../OptimizationEngine';
import { ConfigurationManager } from '../ConfigurationManager';
import { ImagePipelineConfig } from '../../types';
import sharp from 'sharp';

// Mock sharp
jest.mock('sharp', () => {
  const mSharp = {
    resize: jest.fn().mockReturnThis(),
    avif: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue({
      data: Buffer.from('optimized'),
      info: { size: 100, format: 'webp' }
    })
  };
  return jest.fn(() => mSharp);
});

describe('OptimizationEngine', () => {
  let engine: OptimizationEngine;
  let configManager: ConfigurationManager;

  const mockConfig: ImagePipelineConfig = {
    cloudinary: {
      cloudName: 'test',
      apiKey: 'test',
      apiSecret: 'test',
      uploadPreset: 'test',
    },
    optimization: {
      maxWidth: 1000,
      quality: 'auto:good',
      formats: ['auto'],
      maxFileSize: 1000
    },
    delivery: {
      enableLazyLoading: true,
      responsiveBreakpoints: [],
      cacheUrls: true
    }
  };

  beforeEach(() => {
    configManager = new ConfigurationManager(mockConfig);
    engine = new OptimizationEngine(configManager);
    (sharp as unknown as jest.Mock).mockClear();
  });

  it('should handle lossless quality option', async () => {
    const buffer = Buffer.from('test');
    await engine.optimize(buffer, {
      quality: 'lossless',
      format: 'webp'
    });

    const mSharpInstance = (sharp as unknown as jest.Mock).mock.results[0].value;
    expect(mSharpInstance.webp).toHaveBeenCalledWith(expect.objectContaining({
      quality: 100,
      lossless: true
    }));
  });

  it('should handle auto format', async () => {
    const buffer = Buffer.from('test');
    await engine.optimize(buffer, {
      format: 'auto'
    });

    const mSharpInstance = (sharp as unknown as jest.Mock).mock.results[0].value;
    // Defaults to webp
    expect(mSharpInstance.webp).toHaveBeenCalled();
  });
});
