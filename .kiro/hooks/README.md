# Kiro Agent Hooks System

A lightweight, extensible event-driven system for monitoring, logging, and reacting to events in the Kiro application ecosystem.

## Overview

The Kiro Agent Hooks system provides:
- **Observability**: Track all important operations with automatic metrics
- **Extensibility**: Plugin-based architecture for custom behaviors
- **Performance**: Lightweight event bus with timeout protection
- **User Experience**: Built-in UI notifications and error handling

## Quick Start

```typescript
import { getGlobalEventBus, createTimedOperation } from '.kiro/hooks';

// Get the global event bus
const eventBus = getGlobalEventBus();

// Emit a simple event
eventBus.emitEvent('kiro.planview.load.after', {
  fileName: 'example.svg',
  elementCount: 150
});

// Use timed operations for performance tracking
const operation = createTimedOperation(eventBus, 'planview.render');
const correlationId = operation.start({ elementCount: 150 });

// ... do work ...

operation.complete(correlationId, { success: true });
```

## Architecture

### Core Components

- **KiroEventBus**: Central event emitter with plugin management
- **HookPlugin**: Interface for creating custom event handlers
- **Event Types**: Strongly typed event names and payloads

### Built-in Plugins

- **LoggerPlugin**: Structured logging with configurable levels
- **MetricsPlugin**: Performance metrics and error rate tracking
- **UINotifyPlugin**: User-facing notifications in Norwegian

## Event Naming Convention

Events follow the pattern: `kiro.<domain>.<action>.<phase>`

**Domains:**
- `agent` - Application lifecycle
- `planview` - 2D planview operations
- `ui` - User interactions
- `perf` - Performance monitoring

**Phases:**
- `before` / `after` - Operation lifecycle
- `error` - Error conditions
- `empty` / `missing` - Warning conditions

## Configuration

The system uses a declarative configuration approach:

```typescript
const config: HookConfig = {
  enabled: true,
  subscriptions: [
    {
      name: 'kiro.planview.load.error',
      plugins: ['logger', 'ui-notify'],
      priority: 90
    },
    {
      name: 'performance-monitoring',
      pattern: /^kiro\..*\.performance\.slow$/,
      plugins: ['metrics', 'logger'],
      priority: 85
    }
  ],
  timeoutsMs: {
    default: 2000,
    'ui-notify': 1500
  },
  plugins: {
    logger: new LoggerPlugin(),
    metrics: new MetricsPlugin(),
    'ui-notify': new UINotifyPlugin()
  }
};
```

## Interactive Planview Integration

The system is designed specifically for the interactive planview application:

### Loading Events
- `kiro.planview.load.before/after/error`
- `kiro.planview.render.start/complete/error`

### User Interaction Events
- `kiro.ui.element.selected`
- `kiro.ui.layer.toggled`
- `kiro.ui.zoom.changed`
- `kiro.ui.measurement.completed`

### Performance Events
- `kiro.planview.performance.slow`
- `kiro.perf.metrics`

## Creating Custom Plugins

```typescript
import { HookPlugin, KiroEvent } from '.kiro/hooks';

export class CustomPlugin implements HookPlugin {
  name = 'custom';
  enabled = true;

  handle(event: KiroEvent): void {
    // Your custom logic here
    console.log(`Handling event: ${event.name}`);
  }
}
```

## Error Handling

The system includes comprehensive error handling:
- Plugin timeouts with configurable limits
- Error isolation (failed plugins don't break the system)
- Automatic error event emission
- User-friendly error notifications

## Performance Considerations

- Lightweight event emitter with minimal overhead
- Plugin execution in parallel with timeout protection
- Configurable event filtering to reduce noise
- Memory-efficient metrics with rolling averages

## Best Practices

1. **Use correlation IDs** for tracking related events
2. **Include context** in events for better debugging
3. **Set appropriate timeouts** for plugins
4. **Filter high-frequency events** to avoid spam
5. **Sanitize sensitive data** before logging

## Examples

See `examples/planview-integration.ts` for complete integration examples with:
- SVG loading with performance tracking
- Rendering with automatic slow operation detection
- User interaction tracking
- Export functionality with progress monitoring

## Extending the System

The system is designed to grow with your needs:
- Add new domains by extending the event naming convention
- Create domain-specific plugins for specialized behavior
- Use pattern-based subscriptions for broad monitoring
- Implement custom notification strategies

This foundation provides observability and extensibility while maintaining simplicity and performance.