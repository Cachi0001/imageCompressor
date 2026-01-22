/**
 * Image Optimization Helper
 *
 * Utility to generate optimized URLs for the Global Image Service.
 */
export interface ImageOptimizationOptions {
    src: string;
    width?: number;
    quality?: number | 'lossless' | 'auto:good' | 'auto:best' | 'auto:eco';
    format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
    client?: string;
}
/**
 * Generates a fully qualified URL for the image optimization service.
 *
 * @param options Configuration options for the image
 * @returns The optimized URL string
 */
export declare function getOptimizedUrl(options: ImageOptimizationOptions): string;
/**
 * React Helper for responsive 'srcset' generation
 */
export declare function getResponsiveSrcSet(src: string, widths?: number[]): string;
//# sourceMappingURL=image-loader.d.ts.map