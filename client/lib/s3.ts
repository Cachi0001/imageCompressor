import { S3Client } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  region: process.env.S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true, 
});

export const BUCKET = process.env.S3_BUCKET || 'musefactory-images';
export const PUBLIC_URL = process.env.S3_PUBLIC_URL;
