import optimizeHandler from './client/api/optimize';
import monitorHandler from './client/api/monitor';
import { optimizeImage } from './client/lib/optimizer';
import { s3, BUCKET, PUBLIC_URL } from './client/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });
// Enable CORS
app.use(cors({
    origin: '*', // Allow all origins (since we don't know the exact UGlobalHorizons domain)
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Explicit OPTIONS handler for preflight checks - Removed as it causes PathError in Express 5
// app.options('*', cors());
// Wrapper to adapt Vercel handler to Express
const vercelToExpress = (handler) => async (req, res) => {
    // Vercel types are compatible with Express types for the most part
    // but we need to cast or ensure compatibility if strict typing is needed.
    await handler(req, res);
};
app.get('/health', (req, res) => {
    res.send('OK');
});
app.get('/', (req, res) => {
    res.send('Image Compression Service is Running');
});
app.get('/api/debug-config', (req, res) => {
    res.json({
        status: 'ok',
        env: {
            S3_REGION: process.env.S3_REGION || 'not set',
            S3_BUCKET: process.env.S3_BUCKET || 'not set',
            S3_ENDPOINT: process.env.S3_ENDPOINT ? '(set)' : 'not set',
            S3_PUBLIC_URL: process.env.S3_PUBLIC_URL ? process.env.S3_PUBLIC_URL : 'MISSING (This is why your images are broken)',
            PORT: process.env.PORT,
            NODE_ENV: process.env.NODE_ENV
        }
    });
});
// Map routes
app.get('/monitor', vercelToExpress(monitorHandler));
app.get('/api/optimize', vercelToExpress(optimizeHandler));
// New: Upload Endpoint
app.get('/api/upload', (req, res) => {
    res.status(405).send('Method Not Allowed. Please use POST to upload images.');
});
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }
        const client = req.body.client || 'default';
        const width = req.body.w ? parseInt(req.body.w) : undefined;
        const quality = req.body.q ? parseInt(req.body.q) : 80;
        const format = req.body.f || 'webp';
        // Optimize
        const { data, info } = await optimizeImage(req.file.buffer, {
            width,
            quality,
            format: format
        });
        // Generate Key
        const hash = crypto.createHash('md5').update(data).digest('hex');
        const key = `${client}/${hash}.${format}`;
        console.log(`[Upload] Starting S3 upload for key: ${key}`);
        // Upload to S3
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: data,
            ContentType: `image/${format}`
        }));
        console.log(`[Upload] S3 upload complete for key: ${key}`);
        // Construct Public URL
        let finalUrl = '';
        if (PUBLIC_URL) {
            finalUrl = `${PUBLIC_URL}/${key}`;
        }
        else {
            // Fallback warning
            console.warn('[Warning] S3_PUBLIC_URL is not set. Returning a constructed URL that may not work for R2.');
            finalUrl = `https://${BUCKET}.s3.${process.env.S3_REGION || 'auto'}.amazonaws.com/${key}`;
        }
        res.json({
            url: finalUrl,
            size: info.size,
            format: info.format,
            width: info.width,
            height: info.height
        });
    }
    catch (error) {
        console.error('Upload Error:', error);
        res.status(500).send(`Error processing upload: ${error.message}`);
    }
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
//# sourceMappingURL=server.js.map