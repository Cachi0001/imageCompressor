/**
 * Tests for file validation utilities
 */

import { validateImageFile } from '../validation';

describe('File Validation', () => {
  test('should validate JPEG file', () => {
    // Create a mock JPEG buffer with proper file signature
    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, ...Array(100).fill(0)]);
    const result = validateImageFile(jpegBuffer);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.mimeType).toBe('image/jpeg');
  });

  test('should validate PNG file', () => {
    // Create a mock PNG buffer with proper file signature
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, ...Array(100).fill(0)]);
    const result = validateImageFile(pngBuffer);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.mimeType).toBe('image/png');
  });

  test('should reject file that is too large', () => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    largeBuffer[0] = 0xFF;
    largeBuffer[1] = 0xD8;
    largeBuffer[2] = 0xFF;
    
    const result = validateImageFile(largeBuffer);
    
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('exceeds maximum allowed size');
  });

  test('should reject empty file', () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = validateImageFile(emptyBuffer);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('File is empty');
  });

  test('should handle File object (browser)', () => {
    const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(mockFile);
    
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('image/jpeg');
  });
});