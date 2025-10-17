import { EventEmitter } from 'events';
import { KiroEvent, HookConfig, HookSubscription, EventMetrics } from './types.js';

export class KiroEventBus extends EventEmitter {
  private config: HookConfig;
  private metrics: Map<string, EventMetrics> = new Map();

  constructor(config: HookConfig) {
    super();
    this.config = config;
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    if (!this.config.enabled) return;

    // Sort subscriptions by priority (higher first)
    const sortedSubs = [...this.config.subscriptions].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    for (const subscription of sortedSubs) {
      if (subscription.pattern) {
        // Pattern-based subscription for domain-wide listeners
        this.onPattern(subscription.pattern, subscription);
      } else {
        // Exact event name subscription
        this.on(subscription.name, (event: KiroEvent) => {
          this.handleSubscription(subscription, event);
        });
      }
    }
  }

  private onPattern(pattern: RegExp, subscription: HookSubscription) {
    this.on('*', (eventName: string, event: KiroEvent) => {
      if (pattern.test(eventName)) {
        this.handleSubscription(subscription, event);
      }
    });
  }

  private async handleSubscription(subscription: HookSubscription, event: KiroEvent) {
    // Check condition if specified
    if (subscription.condition && !subscription.condition(event)) {
      return;
    }

    // Execute plugins in parallel with timeout protection
    const pluginPromises = subscription.plugins.map(pluginName => 
      this.executePlugin(pluginName, event)
    );

    try {
      await Promise.allSettled(pluginPromises);
    } catch (error) {
      // Emit error event for failed plugin execution
      this.emit('kiro.agent.error', {
        name: 'kiro.agent.error',
        timestamp: Date.now(),
        correlationId: event.correlationId,
        error: {
          code: 'PLUGIN_EXECUTION_FAILED',
          message: `Failed to execute plugins for ${event.name}`,
          stack: error instanceof Error ? error.stack : undefined
        },
        context: { originalEvent: event.name, subscription: subscription.name }
      });
    }
  }

  private async executePlugin(pluginName: string, event: KiroEvent): Promise<void> {
    const plugin = this.config.plugins[pluginName];
    if (!plugin || !plugin.enabled) return;

    const timeout = plugin.timeout || this.config.timeoutsMs[pluginName] || this.config.timeoutsMs.default || 2000;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Plugin ${pluginName} timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = plugin.handle(event);
        
        if (result instanceof Promise) {
          result
            .then(() => {
              clearTimeout(timer);
              resolve();
            })
            .catch(error => {
              clearTimeout(timer);
              reject(error);
            });
        } else {
          clearTimeout(timer);
          resolve();
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  // Emit event with automatic metrics tracking
  emitEvent(name: string, data?: Record<string, any>, context?: Record<string, any>): void {
    const event: KiroEvent = {
      name,
      timestamp: Date.now(),
      correlationId: context?.correlationId || this.generateCorrelationId(),
      context,
      data
    };

    // Emit to specific listeners
    this.emit(name, event);
    
    // Emit to pattern listeners
    this.emit('*', name, event);
  }

  // Start timing for an operation
  startTiming(correlationId: string): void {
    this.metrics.set(correlationId, {
      startTime: Date.now(),
      memoryBefore: this.getMemoryUsage()
    });
  }

  // End timing and emit completion event
  endTiming(correlationId: string, eventName: string, data?: Record<string, any>, context?: Record<string, any>): void {
    const metrics = this.metrics.get(correlationId);
    if (!metrics) return;

    const endTime = Date.now();
    const durationMs = endTime - metrics.startTime;
    const memoryAfter = this.getMemoryUsage();

    this.metrics.delete(correlationId);

    this.emitEvent(eventName, data, {
      ...context,
      correlationId,
      metrics: {
        durationMs,
        memoryBefore: metrics.memoryBefore,
        memoryAfter,
        memoryDelta: memoryAfter - (metrics.memoryBefore || 0)
      }
    });
  }

  // Emit error event with context
  emitError(eventName: string, error: Error, correlationId?: string, context?: Record<string, any>): void {
    this.emitEvent(eventName, undefined, {
      ...context,
      correlationId,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        stack: error.stack
      }
    });
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    }
    return 0;
  }

  // Update configuration at runtime
  updateConfig(newConfig: Partial<HookConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.removeAllListeners();
    this.setupSubscriptions();
  }

  // Get current metrics
  getMetrics(): Record<string, any> {
    return {
      activeTimings: this.metrics.size,
      memoryUsage: this.getMemoryUsage(),
      listenerCount: this.eventNames().length
    };
  }
}