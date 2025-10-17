// Example of how to integrate Kiro Agent Hooks with the interactive planview application
import { getGlobalEventBus, createTimedOperation } from '../index.js';

// Example: SVG loading with hooks
export class PlanviewLoader {
  private eventBus = getGlobalEventBus();
  private loadOperation = createTimedOperation(this.eventBus, 'planview.load');

  async loadSVG(svgData: string, fileName?: string): Promise<SVGElement> {
    const correlationId = this.loadOperation.start({
      fileName,
      fileSize: svgData.length
    });

    try {
      // Simulate SVG parsing
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
      
      if (svgDoc.documentElement.tagName === 'parsererror') {
        throw new Error('Invalid SVG format');
      }

      const svgElement = svgDoc.documentElement;
      
      // Emit success with metrics
      this.loadOperation.complete(correlationId, {
        elementCount: svgElement.querySelectorAll('*').length,
        viewBox: svgElement.getAttribute('viewBox'),
        fileName
      });

      return svgElement;
    } catch (error) {
      this.loadOperation.error(correlationId, error as Error, { fileName });
      throw error;
    }
  }
}

// Example: Rendering performance monitoring
export class PlanviewRenderer {
  private eventBus = getGlobalEventBus();

  render(svgElement: SVGElement, container: HTMLElement): void {
    const correlationId = `render-${Date.now()}`;
    const startTime = performance.now();

    this.eventBus.emitEvent('kiro.planview.render.start', {
      elementCount: svgElement.querySelectorAll('*').length
    }, { correlationId });

    try {
      // Simulate rendering
      container.appendChild(svgElement);
      
      const duration = performance.now() - startTime;
      
      this.eventBus.emitEvent('kiro.planview.render.complete', {
        elementCount: svgElement.querySelectorAll('*').length
      }, {
        correlationId,
        metrics: { durationMs: duration }
      });

      // Check for slow performance
      if (duration > 2000) {
        this.eventBus.emitEvent('kiro.planview.performance.slow', {
          operation: 'render',
          threshold: 2000,
          actual: duration
        }, { correlationId });
      }
    } catch (error) {
      this.eventBus.emitError('kiro.planview.render.error', error as Error, correlationId);
      throw error;
    }
  }
}

// Example: User interaction tracking
export class PlanviewInteractionTracker {
  private eventBus = getGlobalEventBus();

  onElementSelected(elementId: string, elementType: string): void {
    this.eventBus.emitEvent('kiro.ui.element.selected', {
      elementId,
      elementType,
      timestamp: Date.now()
    });
  }

  onLayerToggled(layerName: string, visible: boolean): void {
    this.eventBus.emitEvent('kiro.ui.layer.toggled', {
      layerName,
      visible,
      timestamp: Date.now()
    });
  }

  onZoomChanged(zoomLevel: number, center: { x: number; y: number }): void {
    this.eventBus.emitEvent('kiro.ui.zoom.changed', {
      zoomLevel,
      center,
      timestamp: Date.now()
    });
  }

  onMeasurementCompleted(measurement: { type: 'distance' | 'area'; value: number; unit: string }): void {
    this.eventBus.emitEvent('kiro.ui.measurement.completed', {
      ...measurement,
      timestamp: Date.now()
    });
  }
}

// Example: Export functionality with hooks
export class PlanviewExporter {
  private eventBus = getGlobalEventBus();
  private exportOperation = createTimedOperation(this.eventBus, 'ui.export');

  async exportToPNG(svgElement: SVGElement, options: { width: number; height: number }): Promise<Blob> {
    const correlationId = this.exportOperation.start({
      format: 'PNG',
      width: options.width,
      height: options.height
    });

    try {
      // Simulate PNG export
      const canvas = document.createElement('canvas');
      canvas.width = options.width;
      canvas.height = options.height;
      
      // ... actual export logic would go here ...
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      this.exportOperation.complete(correlationId, {
        format: 'PNG',
        fileSize: blob.size,
        width: options.width,
        height: options.height
      });

      return blob;
    } catch (error) {
      this.exportOperation.error(correlationId, error as Error, {
        format: 'PNG',
        options
      });
      throw error;
    }
  }
}

// Example usage in a React component
export function usePlanviewHooks() {
  const eventBus = getGlobalEventBus();
  
  return {
    loader: new PlanviewLoader(),
    renderer: new PlanviewRenderer(),
    tracker: new PlanviewInteractionTracker(),
    exporter: new PlanviewExporter(),
    
    // Direct access to event bus for custom events
    emitCustomEvent: (name: string, data?: any, context?: any) => {
      eventBus.emitEvent(name, data, context);
    },
    
    // Get current metrics
    getMetrics: () => eventBus.getMetrics()
  };
}