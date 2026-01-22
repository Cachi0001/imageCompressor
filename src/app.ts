import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { ConfigurationManager } from './core/ConfigurationManager';
import { StorageManager } from './core/StorageManager';
import { OptimizationEngine } from './core/OptimizationEngine';
import { NotificationService } from './core/NotificationService';
import { ImagePipelineConfig } from './types';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


const configData: ImagePipelineConfig = {
  cloudinary: process.env.CLOUDINARY_NAME ? {
    cloudName: process.env.CLOUDINARY_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    apiSecret: process.env.CLOUDINARY_SECERET_KEY!, // Typo in env var
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET!
  } : undefined,
  s3: process.env.S3_BUCKET ? {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION!,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    endpoint: process.env.S3_ENDPOINT,
    publicUrl: process.env.S3_PUBLIC_URL
  } : undefined,
  local: process.env.LOCAL_STORAGE_PATH ? {
    rootPath: process.env.LOCAL_STORAGE_PATH,
    publicUrl: process.env.LOCAL_PUBLIC_URL
  } : undefined,
  email: {
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
    from: process.env.EMAIL_USER!,
    adminEmail: process.env.EMAIL_USER!
  },
  optimization: {
    maxWidth: 1920,
    quality: 'auto:good',
    formats: ['auto'],
    maxFileSize: 100 * 1024 * 1024 // 100MB
  },
  delivery: {
    enableLazyLoading: true,
    responsiveBreakpoints: [640, 768, 1024, 1280],
    cacheUrls: true
  }
};

const configManager = new ConfigurationManager(configData);
const notificationService = new NotificationService(configManager);
const storageManager = new StorageManager(configManager, notificationService);
const optimizationEngine = new OptimizationEngine(configManager);

// Upload Middleware
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: configData.optimization.maxFileSize }
});

// Routes

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Root route
app.get('/', (req, res) => {
  res.send('Image Optimization Service is Running');
});

// Upload and Optimize Endpoint
app.post('/upload', upload.single('image'), async (req, res): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const startTime = Date.now();
    
    // 1. Optimize
    const optimizationOptions = {
        quality: req.body.quality ? (req.body.quality === 'lossless' ? 'lossless' : parseInt(req.body.quality)) : 'auto:good',
        width: req.body.width ? parseInt(req.body.width) : undefined,
        height: req.body.height ? parseInt(req.body.height) : undefined,
        format: req.body.format || 'auto'
    };

    const { buffer: optimizedBuffer, format, info } = await optimizationEngine.optimize(req.file.buffer, optimizationOptions as any);

    // 2. Upload
    const provider = req.body.provider || undefined; // Let manager decide if undefined
    const result = await storageManager.upload(optimizedBuffer, {
        provider,
        publicId: req.body.publicId,
        folder: req.body.folder,
        context: { contentType: `image/${format}` }
    });

    const duration = Date.now() - startTime;
    console.log(`Processed image in ${duration}ms. Original: ${req.file.size}, Optimized: ${info.size}`);

    res.json({
      success: true,
      data: result,
      metrics: {
        processingTimeMs: duration,
        compressionRatio: (1 - (info.size / req.file.size)).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    await notificationService.sendAlert('Upload/Optimization Error', error as Error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

export default app;
