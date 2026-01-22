/**
 * Public ID generation utilities
 */

import { randomBytes } from 'crypto';

/**
 * Generates a unique public ID for Cloudinary uploads
 */
export function generatePublicId(prefix?: string, includeTimestamp = true): string {
  const timestamp = includeTimestamp ? Date.now().toString(36) : '';
  const randomPart = randomBytes(8).toString('hex');
  
  const parts = [prefix, timestamp, randomPart].filter(Boolean);
  return parts.join('_');
}

/**
 * Generates a deterministic public ID based on content hash
 */
export function generateDeterministicPublicId(content: string | Buffer, prefix?: string): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  
  if (typeof content === 'string') {
    hash.update(content);
  } else {
    hash.update(content);
  }
  
  const contentHash = hash.digest('hex').substring(0, 16);
  const parts = [prefix, contentHash].filter(Boolean);
  
  return parts.join('_');
}

/**
 * Validates a public ID format
 */
export function validatePublicId(publicId: string): boolean {
  // Cloudinary public ID rules:
  // - Can contain letters, digits, hyphens, underscores, periods, and forward slashes
  // - Cannot start or end with a forward slash
  // - Maximum length is 255 characters
  
  if (!publicId || publicId.length === 0 || publicId.length > 255) {
    return false;
  }
  
  if (publicId.startsWith('/') || publicId.endsWith('/')) {
    return false;
  }
  
  // Check for valid characters
  const validPattern = /^[a-zA-Z0-9\-_./]+$/;
  return validPattern.test(publicId);
}