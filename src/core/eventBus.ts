// AH Studio Core — Event Bus
// Lightweight pub/sub system for decoupled module communication

export type EventHandler<T = unknown> = (payload: T) => void;

export interface EventMap {
  beforeProjectLoad: { projectId: string };
  afterProjectLoad: { projectId: string; project: unknown };
  beforeExport: { projectId: string; config: unknown };
  afterExport: { projectId: string; outputUrl: string };
  beforeRender: { projectId: string; config: unknown };
  afterRender: { jobId: string; status: string };
  onTimelineChange: { timeline: unknown };
  onSelectionChange: { selectedIds: string[] };
  onAssetImport: { assetId: string; type: string };
  onTemplateApply: { templateId: string; projectId: string };
  onPluginInstall: { pluginId: string; slug: string };
  onPluginActivate: { pluginId: string; slug: string };
  onPluginDeactivate: { pluginId: string; slug: string };
  onCommandExecute: { commandId: string; type: string };
  onCommandUndo: { commandId: string };
  onCommandRedo: { commandId: string };
  onNotification: { type: string; title: string; message: string };
  [key: string]: unknown;
}

type EventName = keyof EventMap;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  on<T extends EventName>(event: T, handler: EventHandler<EventMap[T]>): () => void {
    const key = event as string;
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    this.handlers.get(key)!.add(handler as EventHandler);
    return () => this.off(event, handler);
  }

  off<T extends EventName>(event: T, handler: EventHandler<EventMap[T]>): void {
    const key = event as string;
    this.handlers.get(key)?.delete(handler as EventHandler);
  }

  emit<T extends EventName>(event: T, payload: EventMap[T]): void {
    const key = event as string;
    this.handlers.get(key)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Handler error for "${key}":`, err);
      }
    });
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
