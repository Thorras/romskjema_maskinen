// Core types for Kiro Agent Hooks system
export interface KiroEvent {
  name: string;
  timestamp: number;
  correlationId?: string;
  context?: Record<string, any>;
  data?: Record<string, any>;
  metrics?: {
    durationMs?: number;
    items?: number;
    memoryMb?: number;
  };
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

export interface HookPlugin {
  name: string;
  handle: (event: KiroEvent) => Promise<void> | void;
  timeout?: number;
  enabled?: boolean;
}

export interface HookSubscription {
  name: string;
  pattern?: RegExp;
  plugins: string[];
  condition?: (event: KiroEvent) => boolean;
  priority?: number;
}

export interface HookConfig {
  enabled: boolean;
  subscriptions: HookSubscription[];
  timeoutsMs: Record<string, number>;
  plugins: Record<string, HookPlugin>;
}

// Event name patterns for type safety
export type KiroEventName = 
  // Agent lifecycle
  | 'kiro.agent.init.before'
  | 'kiro.agent.init.after'
  | 'kiro.agent.error'
  
  // Interactive planview specific
  | 'kiro.planview.load.before'
  | 'kiro.planview.load.after'
  | 'kiro.planview.load.error'
  | 'kiro.planview.render.start'
  | 'kiro.planview.render.complete'
  | 'kiro.planview.render.error'
  | 'kiro.planview.performance.slow'
  
  // User interactions
  | 'kiro.ui.element.selected'
  | 'kiro.ui.layer.toggled'
  | 'kiro.ui.zoom.changed'
  | 'kiro.ui.measurement.completed'
  | 'kiro.ui.export.requested'
  | 'kiro.ui.export.completed'
  | 'kiro.ui.export.error'
  
  // Performance and monitoring
  | 'kiro.perf.metrics'
  | 'kiro.perf.memory.threshold'
  
  // Generic patterns
  | string;

export interface EventMetrics {
  startTime: number;
  endTime?: number;
  durationMs?: number;
  memoryBefore?: number;
  memoryAfter?: number;
}