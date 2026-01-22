import { v2 as cloudinary } from 'cloudinary';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { optimizeImage } from '../lib/optimizer';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Load from root .env if exists
// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    endpoint: process.env.S3_ENDPOINT,
});
const BUCKET = process.env.S3_BUCKET || 'musefactory-images';
async function migrate() {
    console.log('Starting migration...');
    let nextCursor = null;
    do {
        const result = await cloudinary.api.resources({
            max_results: 100,
            next_cursor: nextCursor,
            resource_type: 'image'
        });
        for (const resource of result.resources) {
            console.log(`Processing ${resource.public_id}...`);
            try {
                // Download original
                const imageUrl = resource.secure_url;
                const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);
                // Optimize (Standard WebP version)
                const { data, info } = await optimizeImage(buffer, {
                    format: 'webp',
                    quality: 80
                });
                // Upload to S3
                // We use the same public_id structure
                const key = `${resource.public_id}.webp`;
                await s3.send(new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: key,
                    Body: data,
                    ContentType: 'image/webp',
                    ACL: 'public-read'
                }));
                console.log(`Uploaded ${key} (${info.size} bytes)`);
            }
            catch (err) {
                console.error(`Failed to process ${resource.public_id}:`, err);
            }
        }
        nextCursor = result.next_cursor;
    } while (nextCursor);
    console.log('Migration complete!');
}
migrate().catch(console.error);
//# sourceMappingURL=migrate.js.map