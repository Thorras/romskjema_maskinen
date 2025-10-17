import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealTimeStyles } from '../useRealTimeStyles';
import { useViewerStore } from '@/store/viewerStore';
import type { ElementStyle } from '@/types';

// Mock the store
vi.mock('@/store/viewerStore');
const mockUseViewerStore = vi.mocked(useViewerStore);

describe('useRealTimeStyles', () => {
  const mockSetElementStyle = vi.fn();
  const mockStyleOverrides = new Map<string, ElementStyle>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockUseViewerStore.mockImplementation((selector: any) => {
      const state = {
        styleOverrides: mockStyleOverrides,
        setElementStyle: mockSetElementStyle,
      };
      return selector(state);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Color and Line Width Modifications', () => {
    it('should update element style immediately when batching is disabled', () => {
      const { result } = renderHook(() => 
        useRealTimeStyles({ enableBatching: false })
      );

      const style: Partial<ElementStyle> = {
        fill: '#ff0000',
        strokeWidth: 2,
      };

      act(() => {
        result.current.updateElementStyle('Wall', style);
      });

      expect(mockSetElementStyle).toHaveBeenCalledWith('Wall', style);
      expect(mockSetElementStyle).toHaveBeenCalledTimes(1);
    });

    it('should batch multiple rapid style updates', () => {
      const { result } = renderHook(() => 
        useRealTimeStyles({ enableBatching: true, batchDelay: 50 })
      );

      act(() => {
        result.current.updateElementStyle('Wall', { fill: '#ff0000' });
        result.current.updateElementStyle('Wall', { strokeWidth: 2 });
        result.current.updateElementStyle('Wall', { stroke: '#00ff00' });
      });

      // Should not call setElementStyle immediately
      expect(mockSetElementStyle).not.toHaveBeenCalled();

      // Fast-forward time to trigger batch
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Should merge all updates into one call
      expect(mockSetElementStyle).toHaveBeenCalledWith('Wall', {
        fill: '#ff0000',
        strokeWidth: 2,
        stroke: '#00ff00',
      });
      expect(mockSetElementStyle).toHaveBeenCalledTimes(1);
    });

    it('should handle color transitions with updateElementStyleWithTransition', () => {
      const { result } = renderHook(() => 
        useRealTimeStyles({ enableTransitions: true, transitionDuration: 200, enableBatching: false })
      );

      const style: Partial<ElementStyle> = {
        fill: '#0000ff',
        stroke: '#ff00ff',
      };

      act(() => {
        result.current.updateElementStyleWithTransition('Door', style);
      });

      expect(mockSetElementStyle).toHaveBeenCalledWith('Door', style);
    });

    it('should update multiple classes with bulk operation', () => {
      const { result } = renderHook(() => 
        useRealTimeStyles({ enableBatching: false })
      );

      const updates = {
        Wall: { fill: '#cccccc', strokeWidth: 1 },
        Door: { fill: '#8b4513', strokeWidth: 2 },
        Window: { fill: '#87ceeb', strokeWidth: 1.5 },
      };

      act(() => {
        result.current.updateMultipleStyles(updates);
      });

      expect(mockSetElementStyle).toHaveBeenCalledTimes(3);
      expect(mockSetElementStyle).toHaveBeenCalledWith('Wall', updates.Wall);
      expect(mockSetElementStyle).toHaveBeenCalledWith('Door', updates.Door);
      expect(mockSetElementStyle).toHaveBeenCalledWith('Window', updates.Window);
    });
  });

  describe('Style Persistence and Loading', () => {
    it('should get effective style combining overrides and pending changes', () => {
      mockStyleOverrides.set('Wall', { fill: '#cccccc', stroke: '#000000' });
      
      const { result } = renderHook(() => 
        useRealTimeStyles({ enableBatching: true })
      );

      // Add pending update
      act(() => {
        result.current.updateElementStyle('Wall', { strokeWidth: 3 });
      });

      const effectiveStyle = result.current.getEffectiveStyle('Wall');
      
      expect(effectiveStyle).toEqual({
        fill: '#cccccc',
        stroke: '#000000',
        strokeWidth: 3,
      });
    });

    it('should flush pending updates manually', () => {
      const { result } = renderHook(() => 
        useRealTimeStyles({ enableBatching: true, batchDelay: 100 })
      );

      act(() => {
        result.current.updateElementStyle('Wall', { fill: '#ff0000' });
        result.current.updateElementStyle('Door', { fill: '#00ff00' });
      });

      // Should not have called setElementStyle yet
      expect(mockSetElementStyle).not.toHaveBeenCalled();

      act(() => {
        result.current.flushPendingUpdates();
      });

      // Should apply all pending updates immediately
      expect(mockSetElementStyle).toHaveBeenCalledTimes(2);
      expect(mockSetElementStyle).toHaveBeenCalledWith('Wall', { fill: '#ff0000' });
      expect(mockSetElementStyle).toHaveBeenCalledWith('Door', { fill: '#00ff00' });
    });
  });

  describe('Real-time Update Performance', () => {
    it('should provide performance metrics', () => {
      const { result } = renderHook(() => 
        useRealTimeStyles({ enableBatching: true })
      );

      // Add some pending updates
      act(() => {
        result.current.updateElementStyle('Wall', { fill: '#ff0000' });
        result.current.updateElementStyle('Door', { fill: '#00ff00' });
      });

      const metrics = result.current.getPerformanceMetrics();
      
      expect(metrics.pendingUpdates).toBe(2);
      expect(metrics.hasPendingBatch).toBe(true);
      expect(typeof metrics.lastUpdateTime).toBe('number');
    });

    it('should respect batch delay for performance optimization', () => {
      const { result } = renderHook(() => 
        useRealTimeStyles({ enableBatching: true, batchDelay: 16 })
      );

      const startTime = performance.now();

      act(() => {
        result.current.updateElementStyle('Wall', { fill: '#ff0000' });
      });

      // Should not apply immediately
      expect(mockSetElementStyle).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(16);
      });

      expect(mockSetElementStyle).toHaveBeenCalledTimes(1);
      
      const metrics = result.current.getPerformanceMetrics();
      expect(metrics.lastUpdateTime).toBeGreaterThanOrEqual(startTime);
    });

    it('should handle rapid successive updates efficiently', () => {
      const { result } = renderHook(() => 
        useRealTimeStyles({ enableBatching: true, batchDelay: 50 })
      );

      // Simulate rapid updates (like dragging a color slider)
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.updateElementStyle('Wall', { 
            fill: `hsl(${i * 36}, 50%, 50%)` 
          });
        }
      });

      // Should only have one pending update (the last one)
      const metrics = result.current.getPerformanceMetrics();
      expect(metrics.pendingUpdates).toBe(1);

      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Should only call setElementStyle once with the final color
      expect(mockSetElementStyle).toHaveBeenCalledTimes(1);
      expect(mockSetElementStyle).toHaveBeenCalledWith('Wall', { 
        fill: 'hsl(324, 50%, 50%)' 
      });
    });

    it('should clear timeout on unmount', () => {
      const { result, unmount } = renderHook(() => 
        useRealTimeStyles({ enableBatching: true })
      );

      act(() => {
        result.current.updateElementStyle('Wall', { fill: '#ff0000' });
      });

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Transition Handling', () => {
    it('should apply styles immediately when transitions are disabled', () => {
      const { result } = renderHook(() => 
        useRealTimeStyles({ enableTransitions: false, enableBatching: false })
      );

      act(() => {
        result.current.updateElementStyleWithTransition('Wall', { fill: '#ff0000' });
      });

      expect(mockSetElementStyle).toHaveBeenCalledWith('Wall', { fill: '#ff0000' });
    });

    it('should handle custom transition duration', () => {
      const { result } = renderHook(() => 
        useRealTimeStyles({ enableTransitions: true, transitionDuration: 300, enableBatching: false })
      );

      act(() => {
        result.current.updateElementStyleWithTransition('Wall', { fill: '#ff0000' }, 500);
      });

      expect(mockSetElementStyle).toHaveBeenCalledWith('Wall', { fill: '#ff0000' });
    });
  });
});