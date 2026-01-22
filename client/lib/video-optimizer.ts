import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Set the ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

export interface VideoOptimizationOptions {
    width?: number;
    quality?: number; // 1-100 (will be mapped to CRF)
    format?: 'mp4' | 'webm';
}

export interface OptimizedVideo {
    data: Buffer;
    info: {
        format: string;
        width: number;
        height: number;
        size: number;
    };
}

export async function optimizeVideo(input: Buffer | string, options: VideoOptimizationOptions): Promise<OptimizedVideo> {
    const tempDir = os.tmpdir();
    let inputPath = '';
    const outputPath = path.join(tempDir, `output-${Date.now()}.${options.format || 'mp4'}`);
    let cleanupInput = false;

    try {
        if (Buffer.isBuffer(input)) {
            // Write buffer to temp file
            inputPath = path.join(tempDir, `input-${Date.now()}.mp4`);
            await fs.promises.writeFile(inputPath, input);
            cleanupInput = true;
        } else {
            // Use existing file path
            inputPath = input;
        }

        return new Promise((resolve, reject) => {
            let command = ffmpeg(inputPath);

            // Set Size
            if (options.width) {
                // Scale width, keep aspect ratio
                command.size(`${options.width}x?`);
            }

            // Set Format and Codec
            if (options.format === 'webm') {
                command
                    .format('webm')
                    .videoCodec('libvpx-vp9')
                    .audioCodec('libopus');
            } else {
                command
                    .format('mp4')
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    // Fast preset for speed over max compression
                    .addOption('-preset', 'ultrafast'); 
            }

            // Set Quality (CRF)
            // Map 1-100 quality to 0-51 CRF (lower is better)
            // Quality 100 -> CRF 18 (visually lossless)
            // Quality 0 -> CRF 51 (worst)
            // Default 80 -> CRF 23 (standard)
            const quality = options.quality || 80;
            const crf = Math.floor(51 - (quality / 100) * 33); // Rough mapping
            
            command.addOption('-crf', crf.toString());

            // Limit duration or file size if needed? 
            // For now, just process.

            command
                .on('end', async () => {
                    try {
                        const data = await fs.promises.readFile(outputPath);
                        const stat = await fs.promises.stat(outputPath);
                        
                        resolve({
                            data,
                            info: {
                                format: options.format || 'mp4',
                                width: options.width || 0, // ffmpeg doesn't easily return this without probe
                                height: 0,
                                size: stat.size
                            }
                        });
                    } catch (err) {
                        reject(err);
                    }
                })
                .on('error', (err) => {
                    reject(err);
                })
                .run(); // Start processing output
                
                // We need to specify output path for run() or save()
                command.save(outputPath);
        });

    } finally {
        // Cleanup temp files
        try {
            if (cleanupInput && inputPath && fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
            if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath);
        } catch (e) {
            console.error('Temp file cleanup failed', e);
        }
    }
}
