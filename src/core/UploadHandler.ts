/**
 * Upload Handler - manages secure uploads to Cloudinary or S3
 */

import { ConfigurationManager } from './ConfigurationManager';
import { UploadResult, UploadParams, SignatureData, UploadOptions, ValidationResult } from '../types';
import { generatePublicId } from '../utils/id-generation';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class UploadHandler {
  private config: ConfigurationManager;
  private s3Client: S3Client | undefined;

  constructor(config: ConfigurationManager) {
    this.config = config;
    const s3Config = this.config.getS3Config();
    if (s3Config) {
      this.s3Client = new S3Client({
        region: s3Config.region,
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey
        },
        endpoint: s3Config.endpoint,
        forcePathStyle: !!s3Config.endpoint // Often needed for non-AWS S3 compatible services
      });
    }
  }

  public async generateSignature(_params: UploadParams): Promise<SignatureData> {
    // This is specific to Cloudinary. For S3, we might use Presigned URLs but that's different.
    throw new Error('generateSignature is only supported for Cloudinary configuration');
  }

  public async uploadImage(file: File | Buffer, options?: UploadOptions): Promise<UploadResult> {
    if (this.s3Client) {
      let buffer: Buffer;
      if (Buffer.isBuffer(file)) {
        buffer = file;
      } else {
        // Assume File object API
        const arrBuffer = await (file as any).arrayBuffer();
        buffer = Buffer.from(arrBuffer);
      }

      const s3Config = this.config.getS3Config()!;
      // Use provided publicId or generate one
      let finalKey = options?.publicId;
      
      if (!finalKey) {
          const id = generatePublicId();
          finalKey = options?.folder ? `${options.folder}/${id}` : id;
      } else if (options?.folder && !finalKey.startsWith(options.folder)) {
          finalKey = `${options.folder}/${finalKey}`;
      }

      // Upload to S3
      await this.s3Client.send(new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: finalKey,
        Body: buffer,
        // We could try to detect ContentType, but for now let's rely on what consumes it or metadata
        ContentType: options?.context?.contentType || 'application/octet-stream' 
      }));

      // Construct URL
      let secureUrl = '';
      if (s3Config.publicUrl) {
          secureUrl = `${s3Config.publicUrl}/${finalKey}`;
      } else if (s3Config.endpoint) {
          // Path style for some S3 compatible
          secureUrl = `${s3Config.endpoint}/${s3Config.bucket}/${finalKey}`;
      } else {
          // Standard AWS S3
          secureUrl = `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${finalKey}`;
      }

      return {
        publicId: finalKey,
        secureUrl,
        originalSize: buffer.length,
        optimizedSize: buffer.length, // Assumes pre-optimized or caller handles logic
        format: 'unknown', // Metadata not extracted here
        width: 0,
        height: 0
      };
    }

    // Cloudinary implementation would go here
    throw new Error('Cloudinary upload not implemented yet');
  }

  public validateFile(file: File | Buffer): ValidationResult {
    const maxSize = this.config.getOptimizationConfig().maxFileSize;
    let size = 0;
    
    if (Buffer.isBuffer(file)) {
      size = file.length;
    } else {
      size = (file as any).size;
    }

    if (size > maxSize) {
      return {
        isValid: false,
        errors: [`File size ${size} exceeds limit of ${maxSize}`],
        fileSize: size
      };
    }

    return {
      isValid: true,
      errors: [],
      fileSize: size
    };
  }
}
