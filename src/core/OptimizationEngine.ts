/**
 * Optimization Engine - applies transformation presets and format optimization
 */

import { ConfigurationManager } from './ConfigurationManager';
import { ImageVariant, ResponsiveImageSet, OptimizationConfig } from '../types';
import sharp from 'sharp';

export class OptimizationEngine {
  private config: ConfigurationManager;

  constructor(config: ConfigurationManager) {
    this.config = config;
  }

  /**
   * Optimizes an image buffer using Sharp
   */
  public async optimize(
    buffer: Buffer, 
    options: OptimizationConfig
  ): Promise<{ buffer: Buffer; format: string; info: sharp.OutputInfo }> {
    let pipeline = sharp(buffer);

    // Resize
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: options.crop === 'contain' ? 'contain' : 'cover',
        withoutEnlargement: true,
      });
    }

    // Format and Quality
    let format = options.format || 'webp';
    if (format === 'auto') {
      format = 'webp'; 
    }

    // Parse quality
    let quality = 80;
    let lossless = false;

    if (options.quality === 'lossless') {
      lossless = true;
      quality = 100;
    } else if (typeof options.quality === 'number') {
      quality = options.quality;
    } else if (typeof options.quality === 'string') {
      if (options.quality === 'auto:best') quality = 90;
      else if (options.quality === 'auto:good') quality = 80;
      else if (options.quality === 'auto:eco') quality = 60;
    }

    // Apply format-specific options
    switch (format) {
      case 'avif':
        pipeline = pipeline.avif({ 
          quality, 
          lossless,
          effort: 4,
          chromaSubsampling: lossless ? '4:4:4' : '4:2:0'
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({ 
          quality, 
          lossless,
          effort: 4 
        });
        break;
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({ 
          quality, 
          mozjpeg: true 
        });
        break;
      case 'png':
        pipeline = pipeline.png({ 
          quality, 
          compressionLevel: 9, // Max compression for PNG
          palette: !lossless // Use palette if not strictly lossless for better size
        });
        break;
      default:
        pipeline = pipeline.webp({ quality });
    }

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return { buffer: data, format: format as string, info };
  }

  public createPreset(config: OptimizationConfig): string {
    // Returns a query string representation of the config for URL generation
    const params: string[] = [];
    if (config.width) params.push(`w=${config.width}`);
    if (config.height) params.push(`h=${config.height}`);
    if (config.quality) params.push(`q=${config.quality}`);
    if (config.format) params.push(`f=${config.format}`);
    return params.join('&');
  }

  public getOptimizedUrl(publicId: string, variant?: ImageVariant): string {
    // Assuming a Vercel function endpoint /api/optimize
    // In a real app, this base URL should be configurable
    const baseUrl = '/api/optimize';
    const params = new URLSearchParams();
    
    params.append('url', publicId); // publicId in this case might be the S3 URL or just the key
    
    if (variant) {
      if (variant.width) params.append('w', variant.width.toString());
      if (variant.height) params.append('h', variant.height.toString());
      if (variant.quality) params.append('q', variant.quality);
      if (variant.format) params.append('f', variant.format);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  public generateResponsiveUrls(publicId: string): ResponsiveImageSet {
    const breakpoints = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
    const variants = breakpoints.map(width => ({
      width,
      url: this.getOptimizedUrl(publicId, { width })
    }));

    const srcset = variants.map(v => `${v.url} ${v.width}w`).join(', ');
    
    return {
      srcset,
      sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
      fallback: this.getOptimizedUrl(publicId),
      variants
    };
  }
}
