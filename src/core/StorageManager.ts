import { ConfigurationManager } from './ConfigurationManager';
import { UploadResult, UploadOptions } from '../types';
import { generatePublicId } from '../utils/id-generation';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import { NotificationService } from './NotificationService';

export type StorageProviderType = 'cloudinary' | 's3' | 'local';

export class StorageManager {
  private config: ConfigurationManager;
  private s3Client: S3Client | undefined;
  private notificationService?: NotificationService;

  constructor(config: ConfigurationManager, notificationService?: NotificationService) {
    this.config = config;
    this.notificationService = notificationService;
    
    // Initialize S3
    const s3Config = this.config.getS3Config();
    if (s3Config) {
      this.s3Client = new S3Client({
        region: s3Config.region,
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey
        },
        endpoint: s3Config.endpoint,
        forcePathStyle: !!s3Config.endpoint
      });
    }

    // Initialize Cloudinary
    const cloudinaryConfig = this.config.getCloudinaryConfig();
    if (cloudinaryConfig) {
      cloudinary.config({
        cloud_name: cloudinaryConfig.cloudName,
        api_key: cloudinaryConfig.apiKey,
        api_secret: cloudinaryConfig.apiSecret
      });
    }
  }

  public async upload(file: Buffer, options?: UploadOptions & { provider?: StorageProviderType }): Promise<UploadResult> {
    const provider = options?.provider || this.determineBestProvider(file.length);
    
    // Generate Unique ID
    let publicId = options?.publicId;
    if (!publicId) {
        publicId = generatePublicId();
        if (options?.folder) {
            publicId = `${options.folder}/${publicId}`;
        }
    }

    try {
      let result: UploadResult;
      switch (provider) {
        case 's3':
          result = await this.uploadToS3(file, publicId, options);
          break;
        case 'cloudinary':
          result = await this.uploadToCloudinary(file, publicId, options);
          break;
        case 'local':
          result = await this.uploadToLocal(file, publicId, options);
          break;
        default:
          throw new Error(`Unknown storage provider: ${provider}`);
      }
      return result;
    } catch (error) {
      // Notify admin on storage failure
      if (this.notificationService) {
        await this.notificationService.sendAlert(
          `Upload Failed (${provider})`, 
          error as Error, 
          { publicId, provider }
        );
      }
      throw error;
    }
  }

  private determineBestProvider(fileSize: number): StorageProviderType {
    // Priority: S3 > Local > Cloudinary
    // This ensures we avoid Cloudinary limits unless explicitly requested or it's the only option.
    
    if (this.config.getS3Config()) {
      return 's3';
    }

    if (this.config.getLocalConfig()) {
      return 'local';
    }

    if (this.config.getCloudinaryConfig()) {
      return 'cloudinary';
    }

    throw new Error('No suitable storage provider configured');
  }

  private async uploadToS3(buffer: Buffer, publicId: string, options?: UploadOptions): Promise<UploadResult> {
    if (!this.s3Client) throw new Error('S3 not configured');
    const s3Config = this.config.getS3Config()!;
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: publicId,
      Body: buffer,
      ContentType: options?.context?.contentType || 'application/octet-stream',
      ACL: 'public-read' // or private based on requirement
    }));

    let secureUrl = '';
    if (s3Config.publicUrl) {
        secureUrl = `${s3Config.publicUrl}/${publicId}`;
    } else if (s3Config.endpoint) {
        secureUrl = `${s3Config.endpoint}/${s3Config.bucket}/${publicId}`;
    } else {
        secureUrl = `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${publicId}`;
    }

    return {
      publicId,
      secureUrl,
      originalSize: buffer.length,
      optimizedSize: buffer.length,
      format: path.extname(publicId).replace('.', '') || 'unknown',
      width: 0, 
      height: 0
    };
  }

  private async uploadToCloudinary(buffer: Buffer, publicId: string, options?: UploadOptions): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: options?.folder,
          resource_type: 'auto',
          ...options?.context // Pass context/tags
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('No result from Cloudinary'));
          
          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            originalSize: result.bytes, // approximate
            optimizedSize: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height
          });
        }
      );
      
      // Write buffer to stream
      uploadStream.end(buffer);
    });
  }

  private async uploadToLocal(buffer: Buffer, publicId: string, _options?: UploadOptions): Promise<UploadResult> {
    const localConfig = this.config.getLocalConfig();
    if (!localConfig) throw new Error('Local storage not configured');

    const fullPath = path.join(localConfig.rootPath, publicId);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    const secureUrl = localConfig.publicUrl 
      ? `${localConfig.publicUrl}/${publicId}` 
      : `file://${fullPath}`;

    return {
      publicId,
      secureUrl,
      originalSize: buffer.length,
      optimizedSize: buffer.length,
      format: path.extname(publicId).replace('.', '') || 'unknown',
      width: 0,
      height: 0
    };
  }
}
