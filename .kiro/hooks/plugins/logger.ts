import { HookPlugin, KiroEvent } from '../core/types.js';

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  includeContext: boolean;
  includeMetrics: boolean;
}

export class LoggerPlugin implements HookPlugin {
  name = 'logger';
  enabled = true;

  constructor(private config: LoggerConfig = {
    level: 'info',
    format: 'text',
    includeContext: true,
    includeMetrics: true
  }) {}

  handle(event: KiroEvent): void {
    const level = this.getLogLevel(event);
    if (!this.shouldLog(level)) return;

    const message = this.formatMessage(event);
    
    switch (level) {
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'debug':
        console.debug(message);
        break;
      default:
        console.log(message);
    }
  }

  private getLogLevel(event: KiroEvent): string {
    if (event.error) return 'error';
    if (event.name.includes('.error')) return 'error';
    if (event.name.includes('.empty') || event.name.includes('.missing')) return 'warn';
    if (event.name.includes('.before') || event.name.includes('.start')) return 'debug';
    return 'info';
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.level);
    const eventLevel = levels.indexOf(level);
    return eventLevel >= configLevel;
  }

  private formatMessage(event: KiroEvent): string {
    if (this.config.format === 'json') {
      return JSON.stringify(this.sanitizeEvent(event), null, 2);
    }

    let message = `[${new Date(event.timestamp).toISOString()}] ${event.name}`;
    
    if (event.correlationId) {
      message += ` (${event.correlationId.slice(-8)})`;
    }

    if (event.error) {
      message += ` ERROR: ${event.error.message}`;
    }

    if (this.config.includeMetrics && event.metrics?.durationMs) {
      message += ` [${event.metrics.durationMs}ms]`;
    }

    if (this.config.includeContext && event.context) {
      const contextStr = Object.entries(event.context)
        .filter(([key]) => !key.startsWith('_'))
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      if (contextStr) {
        message += ` {${contextStr}}`;
      }
    }

    return message;
  }

  private sanitizeEvent(event: KiroEvent): any {
    // Remove sensitive information
    const sanitized = { ...event };
    if (sanitized.context) {
      sanitized.context = Object.fromEntries(
        Object.entries(sanitized.context).filter(([key]) => 
          !key.toLowerCase().includes('password') && 
          !key.toLowerCase().includes('token') &&
          !key.toLowerCase().includes('secret')
        )
      );
    }
    return sanitized;
  }
}