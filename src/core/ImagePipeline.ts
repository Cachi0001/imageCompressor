/**
 * Main ImagePipeline class - orchestrates all components
 */

import { ImagePipelineConfig } from '../types';
import { ConfigurationManager } from './ConfigurationManager';
import { UploadHandler } from './UploadHandler';
import { OptimizationEngine } from './OptimizationEngine';
import { DeliverySystem } from './DeliverySystem';

export class ImagePipeline {
  private config: ConfigurationManager;
  private uploadHandler: UploadHandler;
  private optimizationEngine: OptimizationEngine;
  private deliverySystem: DeliverySystem;

  constructor(config: ImagePipelineConfig) {
    this.config = new ConfigurationManager(config);
    this.uploadHandler = new UploadHandler(this.config);
    this.optimizationEngine = new OptimizationEngine(this.config);
    this.deliverySystem = new DeliverySystem(this.config);
  }

  // Main API methods will be implemented in later tasks
  public async initialize(): Promise<void> {
    // Initialize all components
    await this.config.validate();
  }

  public getUploadHandler(): UploadHandler {
    return this.uploadHandler;
  }

  public getOptimizationEngine(): OptimizationEngine {
    return this.optimizationEngine;
  }

  public getDeliverySystem(): DeliverySystem {
    return this.deliverySystem;
  }
}