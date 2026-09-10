// AH Studio Core — Feature Registry
// Central registry for all features, tools, and capabilities

import type { FeatureRegistration } from './types';

export class FeatureRegistry {
  private features: Map<string, FeatureRegistration> = new Map();

  register(feature: FeatureRegistration): void {
    this.features.set(feature.id, { ...feature, status: 'active' });
  }

  unregister(id: string): void {
    this.features.delete(id);
  }

  get(id: string): FeatureRegistration | undefined {
    return this.features.get(id);
  }

  getAll(): FeatureRegistration[] {
    return Array.from(this.features.values());
  }

  getByCategory(category: string): FeatureRegistration[] {
    return this.getAll().filter((f) => f.category === category);
  }

  getActive(): FeatureRegistration[] {
    return this.getAll().filter((f) => f.status === 'active');
  }

  setStatus(id: string, status: 'active' | 'inactive'): void {
    const feature = this.features.get(id);
    if (feature) {
      this.features.set(id, { ...feature, status });
    }
  }

  has(id: string): boolean {
    return this.features.has(id);
  }
}

export const featureRegistry = new FeatureRegistry();
