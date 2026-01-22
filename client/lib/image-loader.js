/**
 * Image Optimization Helper
 *
 * Utility to generate optimized URLs for the Global Image Service.
 */
// Configuration - Replace with your actual service URL or set via Env Var
const SERVICE_URL = import.meta.env?.VITE_IMAGE_SERVICE_URL || 'https://your-image-service.vercel.app/api/optimize';
const DEFAULT_CLIENT_ID = import.meta.env?.VITE_APP_CLIENT_ID || 'default';
/**
 * Generates a fully qualified URL for the image optimization service.
 *
 * @param options Configuration options for the image
 * @returns The optimized URL string
 */
export function getOptimizedUrl(options) {
    const { src, width, quality, format, client } = options;
    if (!src)
        return '';
    if (src.startsWith('data:'))
        return src; // Don't optimize data URIs
    try {
        const url = new URL(SERVICE_URL);
        url.searchParams.set('url', src);
        if (width) {
            url.searchParams.set('w', width.toString());
        }
        if (quality) {
            url.searchParams.set('q', quality.toString());
        }
        if (format) {
            url.searchParams.set('f', format);
        }
        url.searchParams.set('client', client || DEFAULT_CLIENT_ID);
        return url.toString();
    }
    catch (e) {
        console.error('Failed to generate optimized URL:', e);
        return src; // Fallback to original
    }
}
/**
 * React Helper for responsive 'srcset' generation
 */
export function getResponsiveSrcSet(src, widths = [640, 768, 1024, 1280, 1536]) {
    return widths
        .map(w => `${getOptimizedUrl({ src, width: w })} ${w}w`)
        .join(', ');
}
//# sourceMappingURL=image-loader.js.map