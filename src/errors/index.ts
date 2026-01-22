/**
 * Custom error classes for the Image Optimization Pipeline
 */

export class ImagePipelineError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 500) {
    super(message);
    this.name = 'ImagePipelineError';
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigurationError extends ImagePipelineError {
  constructor(message: string, code = 'CONFIG_ERROR') {
    super(message, code, 400);
    this.name = 'ConfigurationError';
  }
}

export class UploadError extends ImagePipelineError {
  constructor(message: string, code = 'UPLOAD_ERROR') {
    super(message, code, 400);
    this.name = 'UploadError';
  }
}

export class OptimizationError extends ImagePipelineError {
  constructor(message: string, code = 'OPTIMIZATION_ERROR') {
    super(message, code, 500);
    this.name = 'OptimizationError';
  }
}

export class DeliveryError extends ImagePipelineError {
  constructor(message: string, code = 'DELIVERY_ERROR') {
    super(message, code, 500);
    this.name = 'DeliveryError';
  }
}

export class ValidationError extends ImagePipelineError{
  constructor(message: string, code = 'VALIDATION_ERROR'){
    super(message, code, 400);
    this.name = 'ValidationError';
  }
}