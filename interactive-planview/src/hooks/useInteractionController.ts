import { useCallback, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useViewerStore } from '@/store/viewerStore';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { clampTransform, createFitToViewTransform, inverseTransformPoint } from '@/utils/coordinates';
import type { Point, BoundingBox, Transform } from '@/types';

interface InteractionControllerOptions {
  contentBounds: BoundingBox;
  viewportBounds: BoundingBox;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  panSensitivity?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
}

interface InteractionController {
  attachToElement: (element: SVGSVGElement | null) => void;
  detachFromElement: () => void;
  fitToView: () => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  panTo: (point: Point) => void;
  setZoom: (scale: number, center?: Point) => void;
}

export function useInteractionController(options: InteractionControllerOptions): InteractionController {
  const {
    contentBounds,
    viewportBounds,
    minZoom = 0.1,
    maxZoom = 10,
    zoomStep = 1.2,

    enablePan = true,
    enableZoom = true,
  } = options;

  // Store references
  const elementRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const isInitializedRef = useRef(false);
  const touchCleanupRef = useRef<(() => void) | null>(null);

  // Zustand store
  const transform = useViewerStore((state) => state.transform);
  const setTransform = useViewerStore((state) => state.setTransform);

  // Touch gesture handlers
  const handleTouchPan = useCallback((delta: Point) => {
    if (!enablePan) return;

    const newTransform: Transform = {
      x: transform.x + delta.x,
      y: transform.y + delta.y,
      scale: transform.scale,
    };

    const clampedTransform = clampTransform(
      newTransform,
      contentBounds,
      viewportBounds,
      minZoom,
      maxZoom
    );

    setTransform(clampedTransform);

    // Update D3 zoom behavior to match
    if (elementRef.current && zoomBehaviorRef.current) {
      const d3Transform = d3.zoomIdentity
        .translate(clampedTransform.x, clampedTransform.y)
        .scale(clampedTransform.scale);
      
      d3.select(elementRef.current).call(zoomBehaviorRef.current.transform, d3Transform);
    }
  }, [enablePan, transform, contentBounds, viewportBounds, minZoom, maxZoom, setTransform]);

  const handleTouchZoom = useCallback((scale: number, center: Point) => {
    if (!enableZoom) return;

    // Convert screen coordinates to world coordinates
    const worldCenter = inverseTransformPoint(center, transform);
    
    // Calculate new scale
    const newScale = Math.max(minZoom, Math.min(maxZoom, transform.scale * scale));
    
    // Calculate new translation to keep the center point fixed
    const newTransform: Transform = {
      x: center.x - worldCenter.x * newScale,
      y: center.y - worldCenter.y * newScale,
      scale: newScale,
    };

    const clampedTransform = clampTransform(
      newTransform,
      contentBounds,
      viewportBounds,
      minZoom,
      maxZoom
    );

    setTransform(clampedTransform);

    // Update D3 zoom behavior to match
    if (elementRef.current && zoomBehaviorRef.current) {
      const d3Transform = d3.zoomIdentity
        .translate(clampedTransform.x, clampedTransform.y)
        .scale(clampedTransform.scale);
      
      d3.select(elementRef.current).call(zoomBehaviorRef.current.transform, d3Transform);
    }
  }, [enableZoom, transform, contentBounds, viewportBounds, minZoom, maxZoom, setTransform]);

  // Initialize touch gestures
  const touchGestures = useTouchGestures({
    onPan: handleTouchPan,
    onZoom: handleTouchZoom,
    minZoomDistance: 30,
    maxTapDistance: 15,
    doubleTapDelay: 300,
    panThreshold: 10,
  });

  // Create D3 zoom behavior with touch support
  const createZoomBehavior = useCallback(() => {
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([minZoom, maxZoom])
      .filter((event) => {
        // Allow all mouse events and touch events
        return !event.ctrlKey && !event.button;
      })
      .touchable(() => true) // Enable touch events
      .on('zoom', (event) => {
        if (!enablePan && !enableZoom) return;

        const { transform: d3Transform } = event;
        
        // Create new transform object
        const newTransform: Transform = {
          x: enablePan ? d3Transform.x : transform.x,
          y: enablePan ? d3Transform.y : transform.y,
          scale: enableZoom ? d3Transform.k : transform.scale,
        };

        // Clamp the transform to prevent excessive zoom/pan
        const clampedTransform = clampTransform(
          newTransform,
          contentBounds,
          viewportBounds,
          minZoom,
          maxZoom
        );

        // Update store
        setTransform(clampedTransform);
      })
      .on('start', (event) => {
        // Add visual feedback for touch interactions
        if (event.sourceEvent && event.sourceEvent.type.startsWith('touch')) {
          if (elementRef.current) {
            elementRef.current.style.cursor = 'grabbing';
          }
        }
      })
      .on('end', (event) => {
        // Reset cursor after touch interaction
        if (event.sourceEvent && event.sourceEvent.type.startsWith('touch')) {
          if (elementRef.current) {
            elementRef.current.style.cursor = enablePan ? 'grab' : 'crosshair';
          }
        }
      });

    return zoom;
  }, [
    minZoom,
    maxZoom,
    enablePan,
    enableZoom,
    contentBounds,
    viewportBounds,
    transform.x,
    transform.y,
    transform.scale,
    setTransform,
  ]);

  // Attach zoom behavior and touch gestures to element
  const attachToElement = useCallback((element: SVGSVGElement | null) => {
    // Cleanup previous attachments
    if (elementRef.current && zoomBehaviorRef.current) {
      d3.select(elementRef.current).on('.zoom', null);
    }
    if (touchCleanupRef.current) {
      touchCleanupRef.current();
      touchCleanupRef.current = null;
    }

    elementRef.current = element;

    if (element) {
      const zoom = createZoomBehavior();
      zoomBehaviorRef.current = zoom;

      // Attach zoom behavior (handles mouse events)
      const selection = d3.select(element);
      selection.call(zoom);

      // Attach touch gestures (handles touch events)
      touchCleanupRef.current = touchGestures.attachToElement(element) || null;

      // Sync initial transform with store
      if (!isInitializedRef.current) {
        const d3Transform = d3.zoomIdentity
          .translate(transform.x, transform.y)
          .scale(transform.scale);
        
        selection.call(zoom.transform, d3Transform);
        isInitializedRef.current = true;
      }
    }
  }, [createZoomBehavior, touchGestures, transform.x, transform.y, transform.scale]);

  // Detach from element
  const detachFromElement = useCallback(() => {
    if (elementRef.current && zoomBehaviorRef.current) {
      d3.select(elementRef.current).on('.zoom', null);
    }
    if (touchCleanupRef.current) {
      touchCleanupRef.current();
      touchCleanupRef.current = null;
    }
    elementRef.current = null;
    zoomBehaviorRef.current = null;
    isInitializedRef.current = false;
  }, []);

  // Fit content to view
  const fitToView = useCallback(() => {
    const fitTransform = createFitToViewTransform(contentBounds, viewportBounds, 20);
    
    setTransform(fitTransform);

    // Update D3 zoom behavior to match
    if (elementRef.current && zoomBehaviorRef.current) {
      const d3Transform = d3.zoomIdentity
        .translate(fitTransform.x, fitTransform.y)
        .scale(fitTransform.scale);
      
      d3.select(elementRef.current)
        .transition()
        .duration(500)
        .call(zoomBehaviorRef.current.transform, d3Transform);
    }
  }, [contentBounds, viewportBounds, setTransform]);

  // Reset view to default
  const resetView = useCallback(() => {
    const resetTransform: Transform = { x: 0, y: 0, scale: 1 };
    
    setTransform(resetTransform);

    // Update D3 zoom behavior to match
    if (elementRef.current && zoomBehaviorRef.current) {
      const d3Transform = d3.zoomIdentity;
      
      d3.select(elementRef.current)
        .transition()
        .duration(500)
        .call(zoomBehaviorRef.current.transform, d3Transform);
    }
  }, [setTransform]);

  // Zoom in
  const zoomIn = useCallback(() => {
    if (!enableZoom || !elementRef.current || !zoomBehaviorRef.current) return;

    d3.select(elementRef.current)
      .transition()
      .duration(200)
      .call(zoomBehaviorRef.current.scaleBy, zoomStep);
  }, [enableZoom, zoomStep]);

  // Zoom out
  const zoomOut = useCallback(() => {
    if (!enableZoom || !elementRef.current || !zoomBehaviorRef.current) return;

    d3.select(elementRef.current)
      .transition()
      .duration(200)
      .call(zoomBehaviorRef.current.scaleBy, 1 / zoomStep);
  }, [enableZoom, zoomStep]);

  // Pan to specific point
  const panTo = useCallback((point: Point) => {
    if (!enablePan || !elementRef.current || !zoomBehaviorRef.current) return;

    // Calculate the translation needed to center the point
    const centerX = viewportBounds.minX + (viewportBounds.maxX - viewportBounds.minX) / 2;
    const centerY = viewportBounds.minY + (viewportBounds.maxY - viewportBounds.minY) / 2;
    
    const newTransform: Transform = {
      x: centerX - point.x * transform.scale,
      y: centerY - point.y * transform.scale,
      scale: transform.scale,
    };

    const clampedTransform = clampTransform(
      newTransform,
      contentBounds,
      viewportBounds,
      minZoom,
      maxZoom
    );

    setTransform(clampedTransform);

    // Update D3 zoom behavior to match
    const d3Transform = d3.zoomIdentity
      .translate(clampedTransform.x, clampedTransform.y)
      .scale(clampedTransform.scale);
    
    d3.select(elementRef.current)
      .transition()
      .duration(500)
      .call(zoomBehaviorRef.current.transform, d3Transform);
  }, [
    enablePan,
    viewportBounds,
    transform.scale,
    contentBounds,
    minZoom,
    maxZoom,
    setTransform,
  ]);

  // Set specific zoom level
  const setZoom = useCallback((scale: number, center?: Point) => {
    if (!enableZoom || !elementRef.current || !zoomBehaviorRef.current) return;

    const clampedScale = Math.max(minZoom, Math.min(maxZoom, scale));
    
    if (center) {
      // Zoom to specific point
      const d3Transform = d3.zoomIdentity
        .translate(transform.x, transform.y)
        .scale(transform.scale);
      
      const newTransform = d3Transform
        .translate(center.x, center.y)
        .scale(clampedScale / transform.scale)
        .translate(-center.x, -center.y);

      const finalTransform: Transform = {
        x: newTransform.x,
        y: newTransform.y,
        scale: newTransform.k,
      };

      const clampedTransform = clampTransform(
        finalTransform,
        contentBounds,
        viewportBounds,
        minZoom,
        maxZoom
      );

      setTransform(clampedTransform);

      d3.select(elementRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity
          .translate(clampedTransform.x, clampedTransform.y)
          .scale(clampedTransform.scale));
    } else {
      // Simple zoom at current center
      const newTransform: Transform = {
        ...transform,
        scale: clampedScale,
      };

      setTransform(newTransform);

      d3.select(elementRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleTo, clampedScale);
    }
  }, [
    enableZoom,
    minZoom,
    maxZoom,
    transform,
    contentBounds,
    viewportBounds,
    setTransform,
  ]);

  // Sync store transform with D3 when transform changes externally
  useEffect(() => {
    if (elementRef.current && zoomBehaviorRef.current && isInitializedRef.current) {
      const currentD3Transform = d3.zoomTransform(elementRef.current);
      
      // Only update if there's a significant difference to avoid infinite loops
      const threshold = 0.001;
      if (
        Math.abs(currentD3Transform.x - transform.x) > threshold ||
        Math.abs(currentD3Transform.y - transform.y) > threshold ||
        Math.abs(currentD3Transform.k - transform.scale) > threshold
      ) {
        const d3Transform = d3.zoomIdentity
          .translate(transform.x, transform.y)
          .scale(transform.scale);
        
        d3.select(elementRef.current).call(zoomBehaviorRef.current.transform, d3Transform);
      }
    }
  }, [transform.x, transform.y, transform.scale]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      detachFromElement();
    };
  }, [detachFromElement]);

  return {
    attachToElement,
    detachFromElement,
    fitToView,
    resetView,
    zoomIn,
    zoomOut,
    panTo,
    setZoom,
  };
}