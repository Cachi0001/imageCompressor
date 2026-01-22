export async function optimizeImage(buffer, options) {
    let pipeline = sharp(buffer);
    if (options.width || options.height) {
        pipeline = pipeline.resize(options.width, options.height, {
            fit: 'cover',
            withoutEnlargement: true,
        });
    }
    const format = options.format || 'webp';
    const quality = options.quality || 80;
    switch (format) {
        case 'avif':
            pipeline = pipeline.avif({ quality, effort: 3 }); // Lower effort for speed
            break;
        case 'webp':
            pipeline = pipeline.webp({ quality, effort: 3 });
            break;
        case 'jpeg':
            pipeline = pipeline.jpeg({ quality, mozjpeg: true });
            break;
        case 'png':
            pipeline = pipeline.png({ quality, compressionLevel: 6 });
            break;
    }
    return pipeline.toBuffer({ resolveWithObject: true });
}
//# sourceMappingURL=optimizer.js.map