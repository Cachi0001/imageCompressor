import sharp = require('sharp');
export interface OptimizationOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
}
export declare function optimizeImage(buffer: Buffer, options: OptimizationOptions): Promise<{
    data: Buffer;
    info: sharp.OutputInfo;
}>;
//# sourceMappingURL=optimizer.d.ts.map