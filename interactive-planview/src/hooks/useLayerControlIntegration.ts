import { useCallback, useEffect, useMemo } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import { useLayerVisibility } from './useLayerVisibility';
import { extractIFCClasses, updateElementVisibility } from '@/utils/ifcClasses';
import type { IFCElement, IFCClass } from '@/types';

/**
 * Hook that integrates layer controls with the rendering engine
 * Provides real-time updates and visual feedback for layer operations
 */
export function useLayerControlIntegration(elements: IFCElement[]) {
  // Get layer visibility functionality
  const layerVisibility = useLayerVisibility(elements);
  
  // Zustand store selectors
  const visibleLayers = useViewerStore((state) => state.visibleLayers);
  const availableLayers = useViewerStore((state) => state.availableLayers);
  const isLoading = useViewerStore((state) => state.isLoading);
  const error = useViewerStore((state) => state.error);
  
  // Store actions
  const setAvailableLayers = useViewerStore((state) => state.setAvailableLayers);
  const setVisibleLayers = useViewerStore((state) => state.setVisibleLayers);
  const setLoading = useViewerStore((state) => state.setLoading);
  const setError = useViewerStore((state) => state.setError);
  const loadElements = useViewerStore((state) => state.loadElements);

  // Initialize layers when elements change
  useEffect(() => {
    if (elements.length > 0 && availableLayers.length === 0) {
      try {
        setLoading(true);
        
        // Extract IFC classes from elements
        const extractedLayers = extractIFCClasses(elements);
        setAvailableLayers(extractedLayers);
        
        // If no layers are visible, show all by default
        if (visibleLayers.size === 0) {
          const allLayerNames = extractedLayers.map(layer => layer.name);
          setVisibleLayers(new Set(allLayerNames));
        }
        
        setError(null);
      } catch (err) {
        setError({
          type: 'loading',
          message: 'Failed to extract IFC classes from elements',
          details: err,
          timestamp: new Date(),
        });
      } finally {
        setLoading(false);
      }
    }
  }, [elements, availableLayers.length, visibleLayers.size, setAvailableLayers, setVisibleLayers, setLoading, setError]);

  // Update element visibility when layer visibility changes
  const updatedElements = useMemo(() => {
    if (elements.length === 0) return elements;
    
    try {
      return updateElementVisibility(elements, visibleLayers);
    } catch (err) {
      setError({
        type: 'rendering',
        message: 'Failed to update element visibility',
        details: err,
        timestamp: new Date(),
      });
      return elements;
    }
  }, [elements, visibleLayers, setError]);

  // Update elements in store when visibility changes
  useEffect(() => {
    if (updatedElements.length > 0) {
      loadElements(updatedElements);
    }
  }, [updatedElements, loadElements]);

  // Enhanced layer toggle with visual feedback
  const toggleLayerWithFeedback = useCallback(async (className: string) => {
    try {
      setLoading(true);
      
      // Perform the toggle
      layerVisibility.toggleLayer(className);
      
      // Provide visual feedback (could trigger animations, notifications, etc.)
      const isNowVisible = !visibleLayers.has(className);
      
      // Optional: Trigger custom events for UI feedback
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('layerToggled', {
          detail: { className, visible: isNowVisible }
        }));
      }
      
      setError(null);
    } catch (err) {
      setError({
        type: 'interaction',
        message: `Failed to toggle layer: ${className}`,
        details: err,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  }, [layerVisibility, visibleLayers, setLoading, setError]);

  // Enhanced show all with progress feedback
  const showAllLayersWithFeedback = useCallback(async () => {
    try {
      setLoading(true);
      
      layerVisibility.showAllLayers();
      
      // Trigger custom event for UI feedback
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('allLayersShown', {
          detail: { count: availableLayers.length }
        }));
      }
      
      setError(null);
    } catch (err) {
      setError({
        type: 'interaction',
        message: 'Failed to show all layers',
        details: err,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  }, [layerVisibility, availableLayers.length, setLoading, setError]);

  // Enhanced hide all with progress feedback
  const hideAllLayersWithFeedback = useCallback(async () => {
    try {
      setLoading(true);
      
      layerVisibility.hideAllLayers();
      
      // Trigger custom event for UI feedback
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('allLayersHidden', {
          detail: { count: availableLayers.length }
        }));
      }
      
      setError(null);
    } catch (err) {
      setError({
        type: 'interaction',
        message: 'Failed to hide all layers',
        details: err,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  }, [layerVisibility, availableLayers.length, setLoading, setError]);

  // Batch layer operations with progress tracking
  const batchToggleLayersWithFeedback = useCallback(async (classNames: string[]) => {
    try {
      setLoading(true);
      
      layerVisibility.batchToggleLayers(classNames);
      
      // Trigger custom event for UI feedback
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('layersBatchToggled', {
          detail: { classNames, count: classNames.length }
        }));
      }
      
      setError(null);
    } catch (err) {
      setError({
        type: 'interaction',
        message: `Failed to toggle ${classNames.length} layers`,
        details: err,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  }, [layerVisibility, setLoading, setError]);

  // Get rendering statistics for performance monitoring
  const getRenderingStats = useCallback(() => {
    const stats = layerVisibility.getVisibilityStats();
    const visibleElementsCount = updatedElements.filter(el => el.visible).length;
    const hiddenElementsCount = updatedElements.length - visibleElementsCount;
    
    return {
      ...stats,
      rendering: {
        totalElements: updatedElements.length,
        visibleElements: visibleElementsCount,
        hiddenElements: hiddenElementsCount,
        renderingEfficiency: updatedElements.length > 0 ? 
          (visibleElementsCount / updatedElements.length) * 100 : 0,
      },
    };
  }, [layerVisibility, updatedElements]);

  // Performance optimization: debounced layer updates
  const debouncedLayerUpdate = useCallback(
    debounce((callback: () => void) => {
      callback();
    }, 100),
    []
  );

  // Optimized layer visibility setter with debouncing
  const setLayerVisibilityOptimized = useCallback((className: string, visible: boolean) => {
    debouncedLayerUpdate(() => {
      layerVisibility.setLayerVisibility(className, visible);
    });
  }, [layerVisibility, debouncedLayerUpdate]);

  // Real-time layer status monitoring
  const getLayerStatusWithMetrics = useCallback((className: string) => {
    const baseStatus = layerVisibility.getLayerStatus(className);
    const layer = availableLayers.find(l => l.name === className);
    
    return {
      ...baseStatus,
      layer,
      renderingImpact: baseStatus.elementCount > 0 ? 
        (baseStatus.visibleElementCount / baseStatus.elementCount) * 100 : 0,
      lastUpdated: new Date(),
    };
  }, [layerVisibility, availableLayers]);

  // Integration health check
  const getIntegrationHealth = useCallback(() => {
    const stats = getRenderingStats();
    const hasErrors = error !== null;
    const isHealthy = !hasErrors && !isLoading && stats.elements.total > 0;
    
    return {
      isHealthy,
      hasErrors,
      isLoading,
      stats,
      lastCheck: new Date(),
    };
  }, [getRenderingStats, error, isLoading]);

  return {
    // Enhanced layer operations with feedback
    toggleLayer: toggleLayerWithFeedback,
    showAllLayers: showAllLayersWithFeedback,
    hideAllLayers: hideAllLayersWithFeedback,
    batchToggleLayers: batchToggleLayersWithFeedback,
    setLayerVisibility: setLayerVisibilityOptimized,
    
    // Original layer visibility functionality
    ...layerVisibility,
    
    // Updated elements with visibility applied
    elements: updatedElements,
    
    // Enhanced status and monitoring
    getLayerStatus: getLayerStatusWithMetrics,
    getRenderingStats,
    getIntegrationHealth,
    
    // State
    isLoading,
    error,
  };
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default useLayerControlIntegration;