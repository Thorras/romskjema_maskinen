import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as d3 from 'd3';
import { StyleManager } from '../styleManager';
import type { ElementStyle } from '@/types';

// Mock D3 selection
const mockSelection = {
  selectAll: vi.fn(),
  attr: vi.fn(),
  transition: vi.fn(),
  duration: vi.fn(),
  each: vi.fn(),
  empty: vi.fn(),
};

// Create a chainable mock for D3 operations
const createChainableMock = () => {
  const mock = {
    selectAll: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    transition: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
    each: vi.fn().mockReturnThis(),
    empty: vi.fn().mockReturnValue(false),
  };
  return mock;
};

// Mock D3 module
vi.mock('d3', () => ({
  select: vi.fn(() => createChainableMock()),
}));

describe('StyleManager', () => {
  let styleManager: StyleManager;
  let mockSvgContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    styleManager = new StyleManager({
      enableTransitions: true,
      transitionDuration: 150,
      batchUpdates: true,
    });

    mockSvgContainer = createChainableMock();
    styleManager.initialize(mockSvgContainer);
  });

  afterEach(() => {
    vi.useRealTimers();
    styleManager.destroy();
  });

  describe('Color and Line Width Modifications', () => {
    it('should apply style changes immediately when batching is disabled', () => {
      const immediateStyleManager = new StyleManager({ batchUpdates: false });
      immediateStyleManager.initialize(mockSvgContainer);

      const style: ElementStyle = {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
      };

      immediateStyleManager.applyClassStyle('Wall', style);

      expect(mockSvgContainer.selectAll).toHaveBeenCalledWith('[data-ifc-class="Wall"]');
    });

    it('should batch multiple rapid style updates', () => {
      const style1: ElementStyle = { fill: '#ff0000' };
      const style2: ElementStyle = { strokeWidth: 2 };
      const style3: ElementStyle = { stroke: '#00ff00' };

      styleManager.applyClassStyle('Wall', style1);
      styleManager.applyClassStyle('Wall', style2);
      styleManager.applyClassStyle('Wall', style3);

      // Should not apply immediately due to batching
      expect(mockSvgContainer.selectAll).not.toHaveBeenCalled();

      // Fast-forward time to trigger batch
      vi.advanceTimersByTime(16);

      // Should apply merged styles
      expect(mockSvgContainer.selectAll).toHaveBeenCalledWith('[data-ifc-class="Wall"]');
    });

    it('should apply multiple class styles efficiently', () => {
      const styles = {
        Wall: { fill: '#cccccc', strokeWidth: 1 },
        Door: { fill: '#8b4513', strokeWidth: 2 },
        Window: { fill: '#87ceeb', strokeWidth: 1.5 },
      };

      styleManager.applyMultipleStyles(styles);

      vi.advanceTimersByTime(16);

      expect(mockSvgContainer.selectAll).toHaveBeenCalledTimes(3);
      expect(mockSvgContainer.selectAll).toHaveBeenCalledWith('[data-ifc-class="Wall"]');
      expect(mockSvgContainer.selectAll).toHaveBeenCalledWith('[data-ifc-class="Door"]');
      expect(mockSvgContainer.selectAll).toHaveBeenCalledWith('[data-ifc-class="Window"]');
    });

    it('should handle stroke width changes correctly', () => {
      const style: ElementStyle = { strokeWidth: 3.5 };

      styleManager.applyClassStyle('Wall', style, true);

      expect(mockSvgContainer.selectAll).toHaveBeenCalledWith('[data-ifc-class="Wall"]');
    });

    it('should handle opacity changes for fill and stroke', () => {
      const style: ElementStyle = {
        fillOpacity: 0.7,
        strokeOpacity: 0.9,
        opacity: 0.8,
      };

      styleManager.applyClassStyle('Door', style, true);

      expect(mockSvgContainer.selectAll).toHaveBeenCalledWith('[data-ifc-class="Door"]');
    });
  });

  describe('Style Persistence and Loading', () => {
    it('should reset class style to default values', () => {
      const defaultStyle: ElementStyle = {
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 1,
      };

      styleManager.resetClassStyle('Wall', defaultStyle);

      expect(mockSvgContainer.selectAll).toHaveBeenCalledWith('[data-ifc-class="Wall"]');
    });

    it('should clear all style overrides', () => {
      // Mock the each function to simulate element iteration
      mockSvgContainer.each.mockImplementation((callback: any) => {
        const mockElement = createChainableMock();
        callback.call(mockElement);
      });

      styleManager.clearAllStyles();

      expect(mockSvgContainer.selectAll).toHaveBeenCalledWith('.ifc-element');
      expect(mockSvgContainer.each).toHaveBeenCalled();
    });

    it('should handle empty element selections gracefully', () => {
      mockSvgContainer.empty.mockReturnValue(true);

      const style: ElementStyle = { fill: '#ff0000' };
      styleManager.applyClassStyle('NonExistentClass', style, true);

      // Should not throw error and handle empty selection
      expect(mockSvgContainer.selectAll).toHaveBeenCalledWith('[data-ifc-class="NonExistentClass"]');
    });
  });

  describe('Real-time Update Performance', () => {
    it('should provide accurate performance metrics', () => {
      const style1: ElementStyle = { fill: '#ff0000' };
      const style2: ElementStyle = { fill: '#00ff00' };

      styleManager.applyClassStyle('Wall', style1);
      styleManager.applyClassStyle('Door', style2);

      const metrics = styleManager.getMetrics();

      expect(metrics.queuedUpdates).toBe(2);
      expect(metrics.hasPendingBatch).toBe(true);
      expect(metrics.isInitialized).toBe(true);
    });

    it('should batch updates for performance optimization', () => {
      const startTime = performance.now();

      // Apply multiple rapid updates
      for (let i = 0; i < 5; i++) {
        styleManager.applyClassStyle('Wall', { fill: `hsl(${i * 72}, 50%, 50%)` });
      }

      // Should not apply immediately
      expect(mockSvgContainer.selectAll).not.toHaveBeenCalled();

      // Fast-forward to trigger batch
      vi.advanceTimersByTime(16);

      // Should only apply once with final merged style
      expect(mockSvgContainer.selectAll).toHaveBeenCalledTimes(1);
    });

    it('should handle transitions when enabled', () => {
      const transitionMock = createChainableMock();
      mockSvgContainer.transition.mockReturnValue(transitionMock);

      const style: ElementStyle = { fill: '#ff0000' };
      styleManager.applyClassStyle('Wall', style, true);

      expect(mockSvgContainer.selectAll).toHaveBeenCalled();
      expect(mockSvgContainer.transition).toHaveBeenCalled();
      expect(transitionMock.duration).toHaveBeenCalledWith(150);
    });

    it('should skip transitions when disabled', () => {
      const noTransitionManager = new StyleManager({ enableTransitions: false });
      noTransitionManager.initialize(mockSvgContainer);

      const style: ElementStyle = { fill: '#ff0000' };
      noTransitionManager.applyClassStyle('Wall', style, true);

      expect(mockSvgContainer.selectAll).toHaveBeenCalled();
      expect(mockSvgContainer.transition).not.toHaveBeenCalled();
    });

    it('should cleanup resources on destroy', () => {
      const style: ElementStyle = { fill: '#ff0000' };
      styleManager.applyClassStyle('Wall', style);

      const metricsBeforeDestroy = styleManager.getMetrics();
      expect(metricsBeforeDestroy.queuedUpdates).toBe(1);
      expect(metricsBeforeDestroy.hasPendingBatch).toBe(true);

      styleManager.destroy();

      const metricsAfterDestroy = styleManager.getMetrics();
      expect(metricsAfterDestroy.queuedUpdates).toBe(0);
      expect(metricsAfterDestroy.hasPendingBatch).toBe(false);
      expect(metricsAfterDestroy.isInitialized).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle uninitialized style manager gracefully', () => {
      const uninitializedManager = new StyleManager();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const style: ElementStyle = { fill: '#ff0000' };
      uninitializedManager.applyClassStyle('Wall', style);

      expect(consoleSpy).toHaveBeenCalledWith('StyleManager not initialized');
      consoleSpy.mockRestore();
    });

    it('should handle complex style objects with all properties', () => {
      const complexStyle: ElementStyle = {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2.5,
        opacity: 0.8,
        fillOpacity: 0.9,
        strokeOpacity: 0.7,
        strokeDasharray: '5,5',
        visibility: 'visible',
      };

      styleManager.applyClassStyle('ComplexElement', complexStyle, true);

      expect(mockSvgContainer.selectAll).toHaveBeenCalledWith('[data-ifc-class="ComplexElement"]');
    });
  });
});