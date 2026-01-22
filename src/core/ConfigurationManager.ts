import { ImagePipelineConfig } from '../types';
import { ConfigurationError } from '../errors';

export class ConfigurationManager {
  private config: ImagePipelineConfig;

  constructor(config: ImagePipelineConfig) {
    this.config = config;
  }

  public async validate(): Promise<void> {
    if (!this.config.cloudinary && !this.config.s3 && !this.config.local) {
      throw new ConfigurationError('At least one storage provider (Cloudinary, S3, or Local) is required');
    }

    if (this.config.email) {
      if (!this.config.email.host) throw new ConfigurationError('Email host is required');
      if (!this.config.email.user) throw new ConfigurationError('Email user is required');
      if (!this.config.email.pass) throw new ConfigurationError('Email password is required');
    }

    if (this.config.cloudinary) {
        if (!this.config.cloudinary.cloudName) throw new ConfigurationError('Cloudinary cloud name is required');
        if (!this.config.cloudinary.apiKey) throw new ConfigurationError('Cloudinary API key is required');
        if (!this.config.cloudinary.apiSecret) throw new ConfigurationError('Cloudinary API secret is required');
    }

    if (this.config.s3) {
        if (!this.config.s3.bucket) throw new ConfigurationError('S3 bucket is required');
        if (!this.config.s3.region) throw new ConfigurationError('S3 region is required');
        if (!this.config.s3.accessKeyId) throw new ConfigurationError('S3 accessKeyId is required');
        if (!this.config.s3.secretAccessKey) throw new ConfigurationError('S3 secretAccessKey is required');
    }
  }

  public getConfig(): ImagePipelineConfig {
    return this.config;
  }

  public getEmailConfig(): ImagePipelineConfig['email'] {
    return this.config.email;
  }

  public getCloudinaryConfig(): ImagePipelineConfig['cloudinary'] {
    return this.config.cloudinary!;
  }

  public getS3Config(): ImagePipelineConfig['s3'] {
    return this.config.s3;
  }

  public getLocalConfig(): ImagePipelineConfig['local'] {
    return this.config.local;
  }

  public getOptimizationConfig(): ImagePipelineConfig['optimization'] {
    return this.config.optimization;
  }

  public getDeliveryConfig(): ImagePipelineConfig['delivery'] {
    return this.config.delivery;
  }
}
