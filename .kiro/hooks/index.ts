// Main entry point for Kiro Agent Hooks system
export { KiroEventBus } from './core/event-bus.js';
export { LoggerPlugin } from './plugins/logger.js';
export { MetricsPlugin } from './plugins/metrics.js';
export { UINotifyPlugin } from './plugins/ui-notify.js';
export { defaultHookConfig, loggerPlugin, metricsPlugin, uiNotifyPlugin } from './config/default-config.js';
export type { 
  KiroEvent, 
  HookPlugin, 
  HookConfig, 
  HookSubscription,
  KiroEventName,
  EventMetrics 
} from './core/types.js';

// Convenience function to create and configure the event bus
export function createKiroEventBus(config = defaultHookConfig) {
  return new KiroEventBus(config);
}

// Helper functions for common operations
export function createTimedOperation(eventBus: KiroEventBus, operationName: string) {
  return {
    start(context?: Record<string, any>) {
      const correlationId = `${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      eventBus.startTiming(correlationId);
      eventBus.emitEvent(`kiro.${operationName}.before`, undefined, { ...context, correlationId });
      return correlationId;
    },
    
    complete(correlationId: string, data?: Record<string, any>, context?: Record<string, any>) {
      eventBus.endTiming(correlationId, `kiro.${operationName}.after`, data, context);
    },
    
    error(correlationId: string, error: Error, context?: Record<string, any>) {
      eventBus.emitError(`kiro.${operationName}.error`, error, correlationId, context);
    }
  };
}

// Export a singleton instance for simple usage
let globalEventBus: KiroEventBus | null = null;

export function getGlobalEventBus(): KiroEventBus {
  if (!globalEventBus) {
    globalEventBus = createKiroEventBus();
  }
  return globalEventBus;
}

export function setGlobalEventBus(eventBus: KiroEventBus): void {
  globalEventBus = eventBus;
}