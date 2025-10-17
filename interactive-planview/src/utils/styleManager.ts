import * as d3 from 'd3';
import type { ElementStyle } from '@/types';

export interface StyleUpdateOptions {
  enableTransitions?: boolean;
  transitionDuration?: number;
  batchUpdates?: boolean;
}

export class StyleManager {
  private svgContainer: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private updateQueue: Map<string, ElementStyle> = new Map();
  private updateTimeoutId: NodeJS.Timeout | null = null;
  private readonly batchDelay = 16; // ~60fps

  private options: StyleUpdateOptions;
  
  constructor(options: StyleUpdateOptions = {}) {
    this.options = {
      enableTransitions: true,
      transitionDuration: 150,
      batchUpdates: true,
      ...options,
    };
  }

  /**
   * Initialize the style manager with SVG container
   */
  initialize(svgContainer: d3.Selection<SVGGElement, unknown, null, undefined>) {
    this.svgContainer = svgContainer;
  }

  /**
   * Apply style to elements of a specific IFC class
   */
  applyClassStyle(ifcClass: string, style: ElementStyle, immediate = false) {
    if (!this.svgContainer) {
      console.warn('StyleManager not initialized');
      return;
    }

    if (this.options.batchUpdates && !immediate) {
      // Queue the update
      this.updateQueue.set(ifcClass, { ...this.updateQueue.get(ifcClass), ...style });
      this.scheduleBatchUpdate();
    } else {
      // Apply immediately
      this.applyStyleToElements(ifcClass, style);
    }
  }

  /**
   * Apply styles to multiple classes at once
   */
  applyMultipleStyles(styles: Record<string, ElementStyle>, immediate = false) {
    Object.entries(styles).forEach(([ifcClass, style]) => {
      this.applyClassStyle(ifcClass, style, immediate);
    });
  }

  /**
   * Reset style for a specific IFC class
   */
  resetClassStyle(ifcClass: string, defaultStyle: ElementStyle) {
    this.applyClassStyle(ifcClass, defaultStyle, true);
  }

  /**
   * Clear all style overrides
   */
  clearAllStyles() {
    if (!this.svgContainer) return;

    // Clear update queue
    this.updateQueue.clear();
    if (this.updateTimeoutId) {
      clearTimeout(this.updateTimeoutId);
      this.updateTimeoutId = null;
    }

    // Reset all elements to their default styles
    this.svgContainer.selectAll('.ifc-element')
      .each(function() {
        const element = d3.select(this);
        // Remove all style attributes to revert to defaults
        element
          .attr('fill', null)
          .attr('stroke', null)
          .attr('stroke-width', null)
          .attr('opacity', null)
          .attr('fill-opacity', null)
          .attr('stroke-opacity', null)
          .attr('stroke-dasharray', null);
      });
  }

  /**
   * Schedule a batched update
   */
  private scheduleBatchUpdate() {
    if (this.updateTimeoutId) {
      clearTimeout(this.updateTimeoutId);
    }

    this.updateTimeoutId = setTimeout(() => {
      this.flushUpdates();
    }, this.batchDelay);
  }

  /**
   * Flush all queued updates
   */
  private flushUpdates() {
    if (this.updateQueue.size === 0) return;

    this.updateQueue.forEach((style, ifcClass) => {
      this.applyStyleToElements(ifcClass, style);
    });

    this.updateQueue.clear();
    this.updateTimeoutId = null;
  }

  /**
   * Apply style to DOM elements
   */
  private applyStyleToElements(ifcClass: string, style: ElementStyle) {
    if (!this.svgContainer) return;

    const elements = this.svgContainer.selectAll(`[data-ifc-class="${ifcClass}"]`);
    
    if (elements.empty()) return;

    // Apply transitions if enabled
    const selection = this.options.enableTransitions
      ? elements.transition().duration(this.options.transitionDuration || 150)
      : elements;

    // Apply each style property
    this.applyStyleProperties(selection, style);
  }

  /**
   * Apply individual style properties to selection
   */
  private applyStyleProperties(
    selection: any,
    style: ElementStyle
  ) {
    if (style.fill !== undefined) {
      selection.attr('fill', style.fill);
    }
    if (style.stroke !== undefined) {
      selection.attr('stroke', style.stroke);
    }
    if (style.strokeWidth !== undefined) {
      selection.attr('stroke-width', style.strokeWidth);
    }
    if (style.opacity !== undefined) {
      selection.attr('opacity', style.opacity);
    }
    if (style.fillOpacity !== undefined) {
      selection.attr('fill-opacity', style.fillOpacity);
    }
    if (style.strokeOpacity !== undefined) {
      selection.attr('stroke-opacity', style.strokeOpacity);
    }
    if (style.strokeDasharray !== undefined) {
      selection.attr('stroke-dasharray', style.strokeDasharray);
    }
    if (style.visibility !== undefined) {
      selection.attr('visibility', style.visibility);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      queuedUpdates: this.updateQueue.size,
      hasPendingBatch: this.updateTimeoutId !== null,
      isInitialized: this.svgContainer !== null,
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.updateTimeoutId) {
      clearTimeout(this.updateTimeoutId);
      this.updateTimeoutId = null;
    }
    this.updateQueue.clear();
    this.svgContainer = null;
  }
}

// Singleton instance for global use
export const globalStyleManager = new StyleManager();

export default StyleManager;