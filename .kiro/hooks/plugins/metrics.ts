import { HookPlugin, KiroEvent } from '../core/types.js';

export interface MetricsData {
  eventCounts: Record<string, number>;
  averageDurations: Record<string, number>;
  errorCounts: Record<string, number>;
  lastUpdated: number;
}

export class MetricsPlugin implements HookPlugin {
  name = 'metrics';
  enabled = true;
  
  private metrics: MetricsData = {
    eventCounts: {},
    averageDurations: {},
    errorCounts: {},
    lastUpdated: Date.now()
  };

  private durations: Record<string, number[]> = {};

  handle(event: KiroEvent): void {
    // Count events
    this.metrics.eventCounts[event.name] = (this.metrics.eventCounts[event.name] || 0) + 1;

    // Track errors
    if (event.error || event.name.includes('.error')) {
      this.metrics.errorCounts[event.name] = (this.metrics.errorCounts[event.name] || 0) + 1;
    }

    // Track durations
    if (event.metrics?.durationMs) {
      if (!this.durations[event.name]) {
        this.durations[event.name] = [];
      }
      this.durations[event.name].push(event.metrics.durationMs);
      
      // Keep only last 100 measurements for rolling average
      if (this.durations[event.name].length > 100) {
        this.durations[event.name] = this.durations[event.name].slice(-100);
      }
      
      // Calculate average
      const durations = this.durations[event.name];
      this.metrics.averageDurations[event.name] = 
        durations.reduce((sum, d) => sum + d, 0) / durations.length;
    }

    this.metrics.lastUpdated = Date.now();

    // Emit performance warnings for slow operations
    if (event.metrics?.durationMs && event.metrics.durationMs > 2000) {
      // This would be handled by the event bus, but we can track it here too
      this.metrics.eventCounts['kiro.planview.performance.slow'] = 
        (this.metrics.eventCounts['kiro.planview.performance.slow'] || 0) + 1;
    }
  }

  getMetrics(): MetricsData {
    return { ...this.metrics };
  }

  getTopSlowEvents(limit = 5): Array<{ name: string; avgDuration: number; count: number }> {
    return Object.entries(this.metrics.averageDurations)
      .map(([name, avgDuration]) => ({
        name,
        avgDuration,
        count: this.metrics.eventCounts[name] || 0
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  getErrorRate(eventName?: string): number {
    if (eventName) {
      const total = this.metrics.eventCounts[eventName] || 0;
      const errors = this.metrics.errorCounts[eventName] || 0;
      return total > 0 ? errors / total : 0;
    }

    const totalEvents = Object.values(this.metrics.eventCounts).reduce((sum, count) => sum + count, 0);
    const totalErrors = Object.values(this.metrics.errorCounts).reduce((sum, count) => sum + count, 0);
    return totalEvents > 0 ? totalErrors / totalEvents : 0;
  }

  reset(): void {
    this.metrics = {
      eventCounts: {},
      averageDurations: {},
      errorCounts: {},
      lastUpdated: Date.now()
    };
    this.durations = {};
  }
}