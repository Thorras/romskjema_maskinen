import { HookConfig } from '../core/types.js';
import { LoggerPlugin } from '../plugins/logger.js';
import { MetricsPlugin } from '../plugins/metrics.js';
import { UINotifyPlugin } from '../plugins/ui-notify.js';

// Create plugin instances
const loggerPlugin = new LoggerPlugin({
  level: 'info',
  format: 'text',
  includeContext: true,
  includeMetrics: true
});

const metricsPlugin = new MetricsPlugin();

const uiNotifyPlugin = new UINotifyPlugin({
  showSuccess: true,
  showWarnings: true,
  showErrors: true,
  autoHideMs: 5000,
  maxNotifications: 10
});

export const defaultHookConfig: HookConfig = {
  enabled: true,
  
  subscriptions: [
    // High priority: Error handling and logging
    {
      name: 'kiro.agent.error',
      plugins: ['logger', 'ui-notify'],
      priority: 100
    },
    
    // Interactive planview events
    {
      name: 'kiro.planview.load.after',
      plugins: ['logger', 'metrics', 'ui-notify'],
      priority: 80
    },
    {
      name: 'kiro.planview.load.error',
      plugins: ['logger', 'metrics', 'ui-notify'],
      priority: 90
    },
    {
      name: 'kiro.planview.render.complete',
      plugins: ['logger', 'metrics'],
      priority: 70
    },
    {
      name: 'kiro.planview.performance.slow',
      plugins: ['logger', 'metrics', 'ui-notify'],
      priority: 85
    },
    
    // User interaction events
    {
      name: 'kiro.ui.element.selected',
      plugins: ['metrics'],
      priority: 50
    },
    {
      name: 'kiro.ui.export.completed',
      plugins: ['logger', 'ui-notify'],
      priority: 75
    },
    {
      name: 'kiro.ui.export.error',
      plugins: ['logger', 'ui-notify'],
      priority: 90
    },
    
    // Pattern-based subscriptions for domain-wide monitoring
    {
      name: 'planview-errors',
      pattern: /^kiro\.planview\..*\.error$/,
      plugins: ['logger', 'metrics'],
      priority: 95
    },
    {
      name: 'ui-interactions',
      pattern: /^kiro\.ui\./,
      plugins: ['metrics'],
      priority: 40
    },
    
    // Performance monitoring
    {
      name: 'kiro.perf.metrics',
      plugins: ['logger'],
      priority: 30,
      condition: (event) => {
        // Only log performance metrics every 10th event to reduce noise
        return (event.data?.eventCount || 0) % 10 === 0;
      }
    }
  ],
  
  timeoutsMs: {
    default: 2000,
    logger: 1000,
    metrics: 500,
    'ui-notify': 1500
  },
  
  plugins: {
    logger: loggerPlugin,
    metrics: metricsPlugin,
    'ui-notify': uiNotifyPlugin
  }
};

// Export plugin instances for direct access
export { loggerPlugin, metricsPlugin, uiNotifyPlugin };