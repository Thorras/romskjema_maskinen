import { useCallback, useMemo } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import type { IFCElement, IFCClass } from '@/types';

/**
 * Hook for managing layer visibility with efficient batch operations
 */
export function useLayerVisibility(elements: IFCElement[]) {
  // Zustand store selectors
  const visibleLayers = useViewerStore((state) => state.visibleLayers);
  const availableLayers = useViewerStore((state) => state.availableLayers);
  
  // Store actions
  const toggleLayer = useViewerStore((state) => state.toggleLayer);
  const showAllLayers = useViewerStore((state) => state.showAllLayers);
  const hideAllLayers = useViewerStore((state) => state.hideAllLayers);
  const setLayerVisibility = useViewerStore((state) => state.setLayerVisibility);
  const setVisibleLayers = useViewerStore((state) => state.setVisibleLayers);
  const setAvailableLayers = useViewerStore((state) => state.setAvailableLayers);

  // Calculate layer statistics
  const layerStats = useMemo(() => {
    const stats = new Map<string, {
      total: number;
      visible: number;
      hidden: number;
      elements: IFCElement[];
    }>();
    
    elements.forEach(element => {
      const className = element.ifcClass;
      const current = stats.get(className) || {
        total: 0,
        visible: 0,
        hidden: 0,
        elements: [],
      };
      
      stats.set(className, {
        total: current.total + 1,
        visible: current.visible + (element.visible ? 1 : 0),
        hidden: current.hidden + (element.visible ? 0 : 1),
        elements: [...current.elements, element],
      });
    });
    
    return stats;
  }, [elements]);

  // Get visible elements based on layer visibility
  const visibleElements = useMemo(() => {
    return elements.filter(element => 
      visibleLayers.has(element.ifcClass) && element.visible
    );
  }, [elements, visibleLayers]);

  // Get hidden elements
  const hiddenElements = useMemo(() => {
    return elements.filter(element => 
      !visibleLayers.has(element.ifcClass) || !element.visible
    );
  }, [elements, visibleLayers]);

  // Batch operations for better performance
  const batchToggleLayers = useCallback((classNames: string[]) => {
    const newVisibleLayers = new Set(visibleLayers);
    
    classNames.forEach(className => {
      if (newVisibleLayers.has(className)) {
        newVisibleLayers.delete(className);
      } else {
        newVisibleLayers.add(className);
      }
    });
    
    setVisibleLayers(newVisibleLayers);
  }, [visibleLayers, setVisibleLayers]);

  const batchShowLayers = useCallback((classNames: string[]) => {
    const newVisibleLayers = new Set(visibleLayers);
    classNames.forEach(className => newVisibleLayers.add(className));
    setVisibleLayers(newVisibleLayers);
  }, [visibleLayers, setVisibleLayers]);

  const batchHideLayers = useCallback((classNames: string[]) => {
    const newVisibleLayers = new Set(visibleLayers);
    classNames.forEach(className => newVisibleLayers.delete(className));
    setVisibleLayers(newVisibleLayers);
  }, [visibleLayers, setVisibleLayers]);

  // Show only specific layers (hide all others)
  const showOnlyLayers = useCallback((classNames: string[]) => {
    setVisibleLayers(new Set(classNames));
  }, [setVisibleLayers]);

  // Toggle layer group (e.g., all structural elements)
  const toggleLayerGroup = useCallback((predicate: (layer: IFCClass) => boolean) => {
    const groupLayers = availableLayers.filter(predicate);
    const groupClassNames = groupLayers.map(layer => layer.name);
    
    // Check if all layers in group are visible
    const allVisible = groupClassNames.every(className => visibleLayers.has(className));
    
    if (allVisible) {
      batchHideLayers(groupClassNames);
    } else {
      batchShowLayers(groupClassNames);
    }
  }, [availableLayers, visibleLayers, batchHideLayers, batchShowLayers]);

  // Get layers by category
  const getLayersByCategory = useCallback((category: string): IFCClass[] => {
    return availableLayers.filter(layer => {
      const lowerName = layer.name.toLowerCase();
      const lowerCategory = category.toLowerCase();
      
      switch (lowerCategory) {
        case 'structural':
          return lowerName.includes('wall') || lowerName.includes('column') || 
                 lowerName.includes('beam') || lowerName.includes('slab') ||
                 lowerName.includes('foundation');
        case 'architectural':
          return lowerName.includes('door') || lowerName.includes('window') ||
                 lowerName.includes('stair') || lowerName.includes('railing') ||
                 lowerName.includes('roof');
        case 'mep':
          return lowerName.includes('pipe') || lowerName.includes('duct') ||
                 lowerName.includes('cable') || lowerName.includes('equipment') ||
                 lowerName.includes('fixture');
        case 'spaces':
          return lowerName.includes('space') || lowerName.includes('zone') ||
                 lowerName.includes('room');
        default:
          return false;
      }
    });
  }, [availableLayers]);

  // Toggle category visibility
  const toggleCategory = useCallback((category: string) => {
    const categoryLayers = getLayersByCategory(category);
    toggleLayerGroup(() => categoryLayers.some(layer => layer.name === categoryLayers[0].name));
  }, [getLayersByCategory, toggleLayerGroup]);

  // Filter layers by search term
  const filterLayers = useCallback((searchTerm: string): IFCClass[] => {
    if (!searchTerm.trim()) {
      return availableLayers;
    }
    
    const term = searchTerm.toLowerCase();
    return availableLayers.filter(layer => 
      layer.displayName.toLowerCase().includes(term) ||
      layer.name.toLowerCase().includes(term)
    );
  }, [availableLayers]);

  // Get layer visibility status
  const getLayerStatus = useCallback((className: string) => {
    const isVisible = visibleLayers.has(className);
    const stats = layerStats.get(className);
    
    return {
      isVisible,
      elementCount: stats?.total || 0,
      visibleElementCount: stats?.visible || 0,
      hiddenElementCount: stats?.hidden || 0,
    };
  }, [visibleLayers, layerStats]);

  // Get overall visibility statistics
  const getVisibilityStats = useCallback(() => {
    const totalLayers = availableLayers.length;
    const visibleLayerCount = availableLayers.filter(layer => 
      visibleLayers.has(layer.name)
    ).length;
    const hiddenLayerCount = totalLayers - visibleLayerCount;
    
    const totalElements = elements.length;
    const visibleElementCount = visibleElements.length;
    const hiddenElementCount = totalElements - visibleElementCount;
    
    return {
      layers: {
        total: totalLayers,
        visible: visibleLayerCount,
        hidden: hiddenLayerCount,
      },
      elements: {
        total: totalElements,
        visible: visibleElementCount,
        hidden: hiddenElementCount,
      },
    };
  }, [availableLayers, visibleLayers, elements, visibleElements]);

  // Initialize available layers if not set
  const initializeLayers = useCallback(() => {
    if (availableLayers.length === 0 && elements.length > 0) {
      const layersMap = new Map<string, IFCClass>();
      
      elements.forEach(element => {
        const className = element.ifcClass;
        if (!layersMap.has(className)) {
          const stats = layerStats.get(className);
          
          layersMap.set(className, {
            name: className,
            displayName: formatDisplayName(className),
            count: stats?.total || 0,
            visible: visibleLayers.has(className),
            style: element.style,
          });
        }
      });
      
      const layers = Array.from(layersMap.values()).sort((a, b) => 
        a.displayName.localeCompare(b.displayName)
      );
      
      setAvailableLayers(layers);
      
      // If no layers are visible, show all by default
      if (visibleLayers.size === 0) {
        showAllLayers();
      }
    }
  }, [availableLayers, elements, layerStats, visibleLayers, setAvailableLayers, showAllLayers]);

  return {
    // State
    visibleLayers,
    availableLayers,
    visibleElements,
    hiddenElements,
    layerStats,
    
    // Single layer operations
    toggleLayer,
    setLayerVisibility,
    
    // Batch operations
    showAllLayers,
    hideAllLayers,
    batchToggleLayers,
    batchShowLayers,
    batchHideLayers,
    showOnlyLayers,
    
    // Group operations
    toggleLayerGroup,
    toggleCategory,
    getLayersByCategory,
    
    // Utility functions
    filterLayers,
    getLayerStatus,
    getVisibilityStats,
    initializeLayers,
  };
}

// Helper function to format display names
function formatDisplayName(className: string): string {
  // Convert IFC class names to readable format
  if (className.startsWith('Ifc') || className.startsWith('ifc')) {
    return className.substring(3)
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^\w/, c => c.toUpperCase());
  }
  
  return className
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^\w/, c => c.toUpperCase());
}

export default useLayerVisibility;