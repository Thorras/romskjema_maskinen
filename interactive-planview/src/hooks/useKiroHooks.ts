import { useEffect, useRef } from 'react';

// Simplified version for the React app - the full system would be in .kiro/hooks
interface KiroEvent {
  name: string;
  timestamp: number;
  data?: any;
  context?: any;
}

interface EventBus {
  emit: (name: string, data?: any, context?: any) => void;
  on: (name: string, handler: (event: KiroEvent) => void) => () => void;
}

// Simple event bus implementation for the React app
class SimpleEventBus implements EventBus {
  private listeners = new Map<string, Array<(event: KiroEvent) => void>>();

  emit(name: string, data?: any, context?: any): void {
    const event: KiroEvent = {
      name,
      timestamp: Date.now(),
      data,
      context
    };

    const handlers = this.listeners.get(name) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${name}:`, error);
      }
    });

    // Also emit to console for development
    console.log(`[Kiro Hook] ${name}`, event);
  }

  on(name: string, handler: (event: KiroEvent) => void): () => void {
    if (!this.listeners.has(name)) {
      this.listeners.set(name, []);
    }
    
    this.listeners.get(name)!.push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(name);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }
}

// Global event bus instance
const globalEventBus = new SimpleEventBus();

// React hook for using Kiro hooks in components
export function useKiroHooks() {
  const eventBus = useRef(globalEventBus);

  // Helper functions for common planview events
  const planviewHooks = {
    // Loading events
    onLoadStart: (fileName?: string) => {
      eventBus.current.emit('kiro.planview.load.before', { fileName });
    },
    
    onLoadComplete: (elementCount: number, fileName?: string) => {
      eventBus.current.emit('kiro.planview.load.after', { 
        elementCount, 
        fileName 
      });
    },
    
    onLoadError: (error: Error, fileName?: string) => {
      eventBus.current.emit('kiro.planview.load.error', { 
        error: error.message,
        fileName 
      });
    },

    // Rendering events
    onRenderStart: (elementCount: number) => {
      eventBus.current.emit('kiro.planview.render.start', { elementCount });
    },
    
    onRenderComplete: (elementCount: number, durationMs: number) => {
      eventBus.current.emit('kiro.planview.render.complete', { 
        elementCount,
        durationMs 
      });
      
      // Emit performance warning if slow
      if (durationMs > 2000) {
        eventBus.current.emit('kiro.planview.performance.slow', {
          operation: 'render',
          durationMs,
          threshold: 2000
        });
      }
    },

    // User interaction events
    onElementSelected: (elementId: string, elementType: string) => {
      eventBus.current.emit('kiro.ui.element.selected', {
        elementId,
        elementType
      });
    },
    
    onLayerToggled: (layerName: string, visible: boolean) => {
      eventBus.current.emit('kiro.ui.layer.toggled', {
        layerName,
        visible
      });
    },
    
    onZoomChanged: (zoomLevel: number) => {
      eventBus.current.emit('kiro.ui.zoom.changed', { zoomLevel });
    },
    
    onMeasurementCompleted: (type: 'distance' | 'area', value: number, unit: string) => {
      eventBus.current.emit('kiro.ui.measurement.completed', {
        type,
        value,
        unit
      });
    },

    // Export events
    onExportStart: (format: string) => {
      eventBus.current.emit('kiro.ui.export.before', { format });
    },
    
    onExportComplete: (format: string, fileSize: number) => {
      eventBus.current.emit('kiro.ui.export.completed', { 
        format, 
        fileSize 
      });
    },
    
    onExportError: (format: string, error: Error) => {
      eventBus.current.emit('kiro.ui.export.error', { 
        format,
        error: error.message 
      });
    }
  };

  // Subscribe to events
  const subscribe = (eventName: string, handler: (event: KiroEvent) => void) => {
    return eventBus.current.on(eventName, handler);
  };

  // Emit custom events
  const emit = (name: string, data?: any, context?: any) => {
    eventBus.current.emit(name, data, context);
  };

  return {
    ...planviewHooks,
    subscribe,
    emit
  };
}

// Hook for listening to specific events in components
export function useKiroEventListener(
  eventName: string, 
  handler: (event: KiroEvent) => void,
  deps: any[] = []
) {
  const { subscribe } = useKiroHooks();

  useEffect(() => {
    const unsubscribe = subscribe(eventName, handler);
    return unsubscribe;
  }, [eventName, ...deps]);
}

// Hook for performance timing
export function useKiroTiming(operationName: string) {
  const { emit } = useKiroHooks();
  const startTimeRef = useRef<number | null>(null);

  const start = (context?: any) => {
    startTimeRef.current = performance.now();
    emit(`kiro.${operationName}.before`, undefined, context);
  };

  const complete = (data?: any, context?: any) => {
    if (startTimeRef.current !== null) {
      const durationMs = performance.now() - startTimeRef.current;
      emit(`kiro.${operationName}.after`, { 
        ...data, 
        durationMs 
      }, context);
      startTimeRef.current = null;
    }
  };

  const error = (error: Error, context?: any) => {
    emit(`kiro.${operationName}.error`, { 
      error: error.message 
    }, context);
    startTimeRef.current = null;
  };

  return { start, complete, error };
}