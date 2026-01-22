/**
 * File validation utilities
 */

import { ValidationResult } from '../types';

const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/bmp',
  'image/tiff',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates an image file for upload
 */
export function validateImageFile(file: File | Buffer, maxSize = MAX_FILE_SIZE): ValidationResult {
  const errors: string[] = [];
  let fileSize: number;
  let mimeType: string | undefined;

  // Handle File object (browser)
  if (file instanceof File) {
    fileSize = file.size;
    mimeType = file.type;
    
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
      errors.push(`Unsupported file type: ${mimeType}. Supported types: ${SUPPORTED_MIME_TYPES.join(', ')}`);
    }
  }
  // Handle Buffer (Node.js)
  else if (Buffer.isBuffer(file)) {
    fileSize = file.length;
    // For Buffer, we'll need to detect MIME type from file signature
    mimeType = detectMimeTypeFromBuffer(file);
    
    if (mimeType && !SUPPORTED_MIME_TYPES.includes(mimeType)) {
      errors.push(`Unsupported file type: ${mimeType}. Supported types: ${SUPPORTED_MIME_TYPES.join(', ')}`);
    }
  }
  else {
    errors.push('Invalid file type. Expected File or Buffer.');
    return { isValid: false, errors };
  }

  // Check file size
  if (fileSize > maxSize) {
    errors.push(`File size ${fileSize} bytes exceeds maximum allowed size of ${maxSize} bytes`);
  }

  if (fileSize === 0) {
    errors.push('File is empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
    fileSize,
    mimeType,
  };
}

/**
 * Detects MIME type from buffer file signature
 */
function detectMimeTypeFromBuffer(buffer: Buffer): string | undefined {
  if (buffer.length < 4) return undefined;

  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  // WebP
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  // GIF
  if (buffer.toString('ascii', 0, 3) === 'GIF') {
    return 'image/gif';
  }

  // BMP
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return 'image/bmp';
  }

  return undefined;
}