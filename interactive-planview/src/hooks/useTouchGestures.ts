import { useCallback, useRef, useEffect } from 'react';
import type { Point, Transform } from '@/types';

interface TouchGestureOptions {
  onPan?: (delta: Point) => void;
  onZoom?: (scale: number, center: Point) => void;
  onTap?: (point: Point) => void;
  onDoubleTap?: (point: Point) => void;
  minZoomDistance?: number;
  maxTapDistance?: number;
  doubleTapDelay?: number;
  panThreshold?: number;
}

interface TouchState {
  touches: Touch[];
  initialDistance: number;
  initialCenter: Point;
  lastCenter: Point;
  startTime: number;
  lastTapTime: number;
  lastTapPoint: Point | null;
  isPanning: boolean;
  isZooming: boolean;
}

export function useTouchGestures(options: TouchGestureOptions = {}) {
  const {
    onPan,
    onZoom,
    onTap,
    onDoubleTap,
    minZoomDistance = 20,
    maxTapDistance = 10,
    doubleTapDelay = 300,
    panThreshold = 5,
  } = options;

  const touchStateRef = useRef<TouchState>({
    touches: [],
    initialDistance: 0,
    initialCenter: { x: 0, y: 0 },
    lastCenter: { x: 0, y: 0 },
    startTime: 0,
    lastTapTime: 0,
    lastTapPoint: null,
    isPanning: false,
    isZooming: false,
  });

  // Calculate distance between two touches
  const getTouchDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between touches
  const getTouchCenter = useCallback((touches: Touch[]): Point => {
    if (touches.length === 0) return { x: 0, y: 0 };
    
    const sum = touches.reduce(
      (acc, touch) => ({
        x: acc.x + touch.clientX,
        y: acc.y + touch.clientY,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / touches.length,
      y: sum.y / touches.length,
    };
  }, []);

  // Calculate distance between two points
  const getPointDistance = useCallback((point1: Point, point2: Point): number => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    const touches = Array.from(event.touches);
    const state = touchStateRef.current;
    
    state.touches = touches;
    state.startTime = Date.now();
    state.isPanning = false;
    state.isZooming = false;

    if (touches.length === 1) {
      // Single touch - potential pan or tap
      state.lastCenter = {
        x: touches[0].clientX,
        y: touches[0].clientY,
      };
      state.initialCenter = { ...state.lastCenter };
    } else if (touches.length === 2) {
      // Two touches - potential zoom
      state.initialDistance = getTouchDistance(touches[0], touches[1]);
      state.initialCenter = getTouchCenter(touches);
      state.lastCenter = { ...state.initialCenter };
      
      if (state.initialDistance > minZoomDistance) {
        state.isZooming = true;
      }
    }
  }, [getTouchDistance, getTouchCenter, minZoomDistance]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    const touches = Array.from(event.touches);
    const state = touchStateRef.current;
    
    if (touches.length !== state.touches.length) {
      // Number of touches changed, reset state
      return;
    }

    if (touches.length === 1 && !state.isZooming) {
      // Single touch pan
      const currentPoint = {
        x: touches[0].clientX,
        y: touches[0].clientY,
      };

      const delta = {
        x: currentPoint.x - state.lastCenter.x,
        y: currentPoint.y - state.lastCenter.y,
      };

      const totalDistance = getPointDistance(currentPoint, state.initialCenter);
      
      if (!state.isPanning && totalDistance > panThreshold) {
        state.isPanning = true;
      }

      if (state.isPanning && onPan) {
        onPan(delta);
      }

      state.lastCenter = currentPoint;
    } else if (touches.length === 2 && state.isZooming) {
      // Two touch zoom
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const currentCenter = getTouchCenter(touches);
      
      if (state.initialDistance > 0) {
        const scale = currentDistance / state.initialDistance;
        
        if (onZoom && Math.abs(scale - 1) > 0.01) {
          onZoom(scale, state.initialCenter);
        }
      }

      // Handle pan during zoom
      const panDelta = {
        x: currentCenter.x - state.lastCenter.x,
        y: currentCenter.y - state.lastCenter.y,
      };

      if (onPan && (Math.abs(panDelta.x) > 1 || Math.abs(panDelta.y) > 1)) {
        onPan(panDelta);
      }

      state.lastCenter = currentCenter;
    }
  }, [getTouchDistance, getTouchCenter, getPointDistance, panThreshold, onPan, onZoom]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    const state = touchStateRef.current;
    const endTime = Date.now();
    const duration = endTime - state.startTime;
    
    // Check for tap gestures
    if (
      state.touches.length === 1 &&
      !state.isPanning &&
      !state.isZooming &&
      duration < 300
    ) {
      const tapPoint = {
        x: state.touches[0].clientX,
        y: state.touches[0].clientY,
      };

      const tapDistance = state.lastTapPoint
        ? getPointDistance(tapPoint, state.lastTapPoint)
        : Infinity;

      // Check for double tap
      if (
        state.lastTapPoint &&
        tapDistance < maxTapDistance &&
        endTime - state.lastTapTime < doubleTapDelay &&
        onDoubleTap
      ) {
        onDoubleTap(tapPoint);
        state.lastTapTime = 0; // Reset to prevent triple tap
        state.lastTapPoint = null;
      } else {
        // Single tap
        if (onTap) {
          onTap(tapPoint);
        }
        state.lastTapTime = endTime;
        state.lastTapPoint = tapPoint;
      }
    }

    // Reset state
    state.touches = [];
    state.isPanning = false;
    state.isZooming = false;
    state.initialDistance = 0;
  }, [getPointDistance, maxTapDistance, doubleTapDelay, onTap, onDoubleTap]);

  // Attach event listeners to element
  const attachToElement = useCallback((element: HTMLElement | SVGElement | null) => {
    if (!element) return;

    // Add passive: false to prevent default scrolling behavior
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    attachToElement,
  };
}