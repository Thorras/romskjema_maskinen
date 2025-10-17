import { useCallback, useRef, useEffect } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import type { ElementStyle } from '@/types';

interface RealTimeStyleOptions {
  enableBatching?: boolean;
  batchDelay?: number;
  enableTransitions?: boolean;
  transitionDuration?: number;
}

export const useRealTimeStyles = (options: RealTimeStyleOptions = {}) => {
  const {
    enableBatching = true,
    batchDelay = 16, // ~60fps
    enableTransitions = true,
    transitionDuration = 150,
  } = options;

  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, ElementStyle>>(new Map());
  const lastUpdateTimeRef = useRef<number>(0);

  // Store selectors and actions
  const styleOverrides = useViewerStore((state) => state.styleOverrides);
  const setElementStyle = useViewerStore((state) => state.setElementStyle);

  // Apply style update immediately or batch it
  const updateElementStyle = useCallback((className: string, style: Partial<ElementStyle>) => {
    const now = performance.now();
    
    if (enableBatching && (now - lastUpdateTimeRef.current) < batchDelay) {
      // Batch the update
      const currentPending = pendingUpdatesRef.current.get(className) || {};
      pendingUpdatesRef.current.set(className, { ...currentPending, ...style });
      
      // Clear existing timeout and set new one
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      
      batchTimeoutRef.current = setTimeout(() => {
        flushPendingUpdates();
      }, batchDelay);
    } else {
      // Apply immediately
      setElementStyle(className, style);
      lastUpdateTimeRef.current = now;
    }
  }, [enableBatching, batchDelay, setElementStyle]);

  // Flush all pending updates
  const flushPendingUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.size === 0) return;

    // Apply all pending updates
    pendingUpdatesRef.current.forEach((style, className) => {
      setElementStyle(className, style);
    });

    // Clear pending updates
    pendingUpdatesRef.current.clear();
    lastUpdateTimeRef.current = performance.now();

    // Clear timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
  }, [setElementStyle]);

  // Apply style with transition effect
  const updateElementStyleWithTransition = useCallback((
    className: string, 
    style: Partial<ElementStyle>,
    _customDuration?: number
  ) => {
    if (!enableTransitions) {
      updateElementStyle(className, style);
      return;
    }

    // const duration = _customDuration || transitionDuration;
    
    // For color transitions, we need to handle them specially
    if (style.fill || style.stroke) {
      // Apply the style immediately for now
      // TODO: Implement smooth color transitions using CSS transitions or animations
      updateElementStyle(className, style);
    } else {
      // For other properties, apply immediately
      updateElementStyle(className, style);
    }
  }, [updateElementStyle, enableTransitions, transitionDuration]);

  // Bulk update multiple classes
  const updateMultipleStyles = useCallback((updates: Record<string, Partial<ElementStyle>>) => {
    Object.entries(updates).forEach(([className, style]) => {
      updateElementStyle(className, style);
    });
  }, [updateElementStyle]);

  // Get current effective style for a class
  const getEffectiveStyle = useCallback((className: string): ElementStyle => {
    const override = styleOverrides.get(className);
    const pending = pendingUpdatesRef.current.get(className);
    
    return {
      ...override,
      ...pending,
    };
  }, [styleOverrides]);

  // Performance monitoring
  const getPerformanceMetrics = useCallback(() => {
    return {
      pendingUpdates: pendingUpdatesRef.current.size,
      lastUpdateTime: lastUpdateTimeRef.current,
      hasPendingBatch: batchTimeoutRef.current !== null,
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return {
    updateElementStyle,
    updateElementStyleWithTransition,
    updateMultipleStyles,
    flushPendingUpdates,
    getEffectiveStyle,
    getPerformanceMetrics,
  };
};

export default useRealTimeStyles;