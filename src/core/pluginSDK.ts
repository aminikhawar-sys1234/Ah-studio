// AH Studio Plugin SDK
// Public API for plugin developers to extend AH Studio

import { eventBus } from './eventBus';
import { featureRegistry } from './featureRegistry';
import type { PluginManifest, FeatureRegistration } from './types';

export interface PluginContext {
  pluginId: string;
  manifest: PluginManifest;
  eventBus: typeof eventBus;
  featureRegistry: typeof featureRegistry;
}

export type PluginRegisterFn = (ctx: PluginContext) => void;
export type PluginCleanupFn = (ctx: PluginContext) => void;

interface PluginEntry {
  manifest: PluginManifest;
  register: PluginRegisterFn;
  cleanup?: PluginCleanupFn;
  context?: PluginContext;
}

class PluginSDK {
  private registry: Map<string, PluginEntry> = new Map();
  private activePlugins: Set<string> = new Set();

  // Register a plugin module (called by plugin source code)
  define(
    manifest: PluginManifest,
    register: PluginRegisterFn,
    cleanup?: PluginCleanupFn
  ): void {
    this.registry.set(manifest.slug, { manifest, register, cleanup });
  }

  // Install: registers the plugin in the SDK (does NOT activate)
  install(manifest: PluginManifest): boolean {
    if (this.registry.has(manifest.slug)) return true;
    // A plugin with no register fn just exists as metadata
    this.registry.set(manifest.slug, {
      manifest,
      register: () => {},
    });
    eventBus.emit('onPluginInstall', { pluginId: manifest.slug, slug: manifest.slug });
    return true;
  }

  activate(slug: string): boolean {
    const entry = this.registry.get(slug);
    if (!entry) return false;
    if (this.activePlugins.has(slug)) return true;

    const ctx: PluginContext = {
      pluginId: slug,
      manifest: entry.manifest,
      eventBus,
      featureRegistry,
    };
    entry.context = ctx;
    entry.register(ctx);
    this.activePlugins.add(slug);

    // Register as a feature
    featureRegistry.register({
      id: `plugin.${slug}`,
      name: entry.manifest.name,
      category: 'plugin',
      version: entry.manifest.version,
      status: 'active',
      permissions: entry.manifest.permissions,
      dependencies: entry.manifest.dependencies,
      configuration: entry.manifest.configuration,
    });

    eventBus.emit('onPluginActivate', { pluginId: slug, slug });
    return true;
  }

  deactivate(slug: string): boolean {
    const entry = this.registry.get(slug);
    if (!entry || !this.activePlugins.has(slug)) return false;

    if (entry.cleanup && entry.context) {
      entry.cleanup(entry.context);
    }

    this.activePlugins.delete(slug);
    featureRegistry.setStatus(`plugin.${slug}`, 'inactive');

    eventBus.emit('onPluginDeactivate', { pluginId: slug, slug });
    return true;
  }

  uninstall(slug: string): boolean {
    this.deactivate(slug);
    this.registry.delete(slug);
    featureRegistry.unregister(`plugin.${slug}`);
    return true;
  }

  isInstalled(slug: string): boolean {
    return this.registry.has(slug);
  }

  isActive(slug: string): boolean {
    return this.activePlugins.has(slug);
  }

  getManifest(slug: string): PluginManifest | undefined {
    return this.registry.get(slug)?.manifest;
  }

  getInstalled(): PluginManifest[] {
    return Array.from(this.registry.values()).map((e) => e.manifest);
  }

  getActiveSlugs(): string[] {
    return Array.from(this.activePlugins);
  }
}

export const pluginSDK = new PluginSDK();

// Helper APIs for plugin developers
export const registerTool = (ctx: PluginContext, tool: FeatureRegistration) => {
  featureRegistry.register({ ...tool, category: 'editor_tool' });
};

export const registerWidget = (ctx: PluginContext, widget: FeatureRegistration) => {
  featureRegistry.register({ ...widget, category: 'widget' });
};

export const registerEffect = (ctx: PluginContext, effect: FeatureRegistration) => {
  featureRegistry.register({ ...effect, category: 'effect' });
};

export const registerTransition = (ctx: PluginContext, transition: FeatureRegistration) => {
  featureRegistry.register({ ...transition, category: 'transition' });
};

export const registerTemplate = (ctx: PluginContext, template: FeatureRegistration) => {
  featureRegistry.register({ ...template, category: 'template' });
};

export const registerPanel = (ctx: PluginContext, panel: FeatureRegistration) => {
  featureRegistry.register({ ...panel, category: 'panel' });
};

export const registerCommand = (ctx: PluginContext, command: FeatureRegistration) => {
  featureRegistry.register({ ...command, category: 'command' });
};

export const registerAssetProvider = (ctx: PluginContext, provider: FeatureRegistration) => {
  featureRegistry.register({ ...provider, category: 'asset_provider' });
};

export const registerAIProvider = (ctx: PluginContext, provider: FeatureRegistration) => {
  featureRegistry.register({ ...provider, category: 'ai_provider' });
};

export const registerExportProvider = (ctx: PluginContext, provider: FeatureRegistration) => {
  featureRegistry.register({ ...provider, category: 'export_provider' });
};
