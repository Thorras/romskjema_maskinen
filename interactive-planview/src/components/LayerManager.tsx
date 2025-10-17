import React, { useCallback, useMemo } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import type { IFCClass, IFCElement } from '@/types';

interface LayerManagerProps {
  elements: IFCElement[];
  className?: string;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  elements,
  className = '',
}) => {
  // Zustand store selectors
  const visibleLayers = useViewerStore((state) => state.visibleLayers);
  const availableLayers = useViewerStore((state) => state.availableLayers);
  
  // Store actions
  const toggleLayer = useViewerStore((state) => state.toggleLayer);
  const showAllLayers = useViewerStore((state) => state.showAllLayers);
  const hideAllLayers = useViewerStore((state) => state.hideAllLayers);
  const setLayerVisibility = useViewerStore((state) => state.setLayerVisibility);
  const setAvailableLayers = useViewerStore((state) => state.setAvailableLayers);

  // Calculate layer statistics from elements
  const layerStats = useMemo(() => {
    const stats = new Map<string, { count: number; visible: number }>();
    
    elements.forEach(element => {
      const className = element.ifcClass;
      const current = stats.get(className) || { count: 0, visible: 0 };
      
      stats.set(className, {
        count: current.count + 1,
        visible: current.visible + (element.visible ? 1 : 0),
      });
    });
    
    return stats;
  }, [elements]);

  // Generate available layers from elements if not already set
  const computedLayers = useMemo(() => {
    if (availableLayers.length > 0) {
      return availableLayers;
    }

    if (elements.length === 0) {
      return [];
    }

    const layersMap = new Map<string, IFCClass>();
    
    elements.forEach(element => {
      const className = element.ifcClass;
      if (!layersMap.has(className)) {
        const stats = layerStats.get(className) || { count: 0, visible: 0 };
        
        layersMap.set(className, {
          name: className,
          displayName: formatDisplayName(className),
          count: stats.count,
          visible: visibleLayers.has(className),
          style: element.style,
        });
      }
    });
    
    return Array.from(layersMap.values()).sort((a, b) => 
      a.displayName.localeCompare(b.displayName)
    );
  }, [elements, availableLayers, layerStats, visibleLayers]);

  // Update available layers in store when computed layers change
  React.useEffect(() => {
    if (availableLayers.length === 0 && computedLayers.length > 0) {
      setAvailableLayers(computedLayers);
    }
  }, [computedLayers, availableLayers.length, setAvailableLayers]);

  // Handle individual layer toggle
  const handleLayerToggle = useCallback((className: string) => {
    toggleLayer(className);
  }, [toggleLayer]);

  // Handle show all layers
  const handleShowAll = useCallback(() => {
    showAllLayers();
  }, [showAllLayers]);

  // Handle hide all layers
  const handleHideAll = useCallback(() => {
    hideAllLayers();
  }, [hideAllLayers]);

  // Handle batch layer operations
  const handleBatchToggle = useCallback((classNames: string[], visible: boolean) => {
    classNames.forEach(className => {
      setLayerVisibility(className, visible);
    });
  }, [setLayerVisibility]);

  // Filter layers based on search term
  const [searchTerm, setSearchTerm] = React.useState('');
  const filteredLayers = useMemo(() => {
    if (!searchTerm.trim()) {
      return computedLayers;
    }
    
    const term = searchTerm.toLowerCase();
    return computedLayers.filter(layer => 
      layer.displayName.toLowerCase().includes(term) ||
      layer.name.toLowerCase().includes(term)
    );
  }, [computedLayers, searchTerm]);

  // Calculate visibility statistics
  const visibilityStats = useMemo(() => {
    const total = computedLayers.length;
    const visible = computedLayers.filter(layer => visibleLayers.has(layer.name)).length;
    const hidden = total - visible;
    
    return { total, visible, hidden };
  }, [computedLayers, visibleLayers]);

  // Group layers by category (if IFC classes follow naming conventions)
  const groupedLayers = useMemo(() => {
    const groups = new Map<string, IFCClass[]>();
    
    filteredLayers.forEach(layer => {
      const category = getIFCCategory(layer.name);
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(layer);
    });
    
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredLayers]);

  if (computedLayers.length === 0) {
    return (
      <div className={`layer-manager ${className}`}>
        <div className="p-4 text-gray-500 text-center">
          No layers available
        </div>
      </div>
    );
  }

  return (
    <div className={`layer-manager bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Layer Control
        </h3>
        
        {/* Statistics */}
        <div className="text-sm text-gray-600 mb-3">
          {visibilityStats.visible} of {visibilityStats.total} layers visible
        </div>
        
        {/* Bulk Actions */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleShowAll}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          >
            Show All
          </button>
          <button
            onClick={handleHideAll}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Hide All
          </button>
        </div>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search layers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      {/* Layer List */}
      <div className="max-h-96 overflow-y-auto">
        {groupedLayers.map(([category, layers]) => (
          <div key={category} className="border-b border-gray-100 last:border-b-0">
            {/* Category Header */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">
                  {category} ({layers.length})
                </h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleBatchToggle(layers.map(l => l.name), true)}
                    className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
                    title="Show all in category"
                  >
                    Show
                  </button>
                  <button
                    onClick={() => handleBatchToggle(layers.map(l => l.name), false)}
                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                    title="Hide all in category"
                  >
                    Hide
                  </button>
                </div>
              </div>
            </div>
            
            {/* Layer Items */}
            <div className="divide-y divide-gray-100">
              {layers.map(layer => {
                const isVisible = visibleLayers.has(layer.name);
                const stats = layerStats.get(layer.name);
                
                return (
                  <div
                    key={layer.name}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleLayerToggle(layer.name)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        
                        {/* Layer Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {/* Color indicator */}
                            <div
                              className="w-3 h-3 rounded border border-gray-300"
                              style={{
                                backgroundColor: layer.style.fill || layer.style.stroke || '#666',
                              }}
                            />
                            
                            {/* Layer name */}
                            <span className={`text-sm font-medium truncate ${
                              isVisible ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {layer.displayName}
                            </span>
                          </div>
                          
                          {/* Element count */}
                          <div className="text-xs text-gray-500 mt-1">
                            {stats?.count || 0} elements
                            {stats && stats.visible !== stats.count && (
                              <span className="ml-1">
                                ({stats.visible} visible)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Visibility indicator */}
                      <div className={`w-2 h-2 rounded-full ${
                        isVisible ? 'bg-green-400' : 'bg-gray-300'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      {filteredLayers.length !== computedLayers.length && (
        <div className="p-3 border-t border-gray-200 text-xs text-gray-500 text-center">
          Showing {filteredLayers.length} of {computedLayers.length} layers
        </div>
      )}
    </div>
  );
};

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

// Helper function to categorize IFC classes
function getIFCCategory(className: string): string {
  const lowerName = className.toLowerCase();
  
  // Structural elements
  if (lowerName.includes('wall') || lowerName.includes('column') || 
      lowerName.includes('beam') || lowerName.includes('slab') ||
      lowerName.includes('foundation')) {
    return 'Structural';
  }
  
  // Architectural elements
  if (lowerName.includes('door') || lowerName.includes('window') ||
      lowerName.includes('stair') || lowerName.includes('railing') ||
      lowerName.includes('roof')) {
    return 'Architectural';
  }
  
  // MEP (Mechanical, Electrical, Plumbing)
  if (lowerName.includes('pipe') || lowerName.includes('duct') ||
      lowerName.includes('cable') || lowerName.includes('equipment') ||
      lowerName.includes('fixture')) {
    return 'MEP';
  }
  
  // Spaces and zones
  if (lowerName.includes('space') || lowerName.includes('zone') ||
      lowerName.includes('room')) {
    return 'Spaces';
  }
  
  // Default category
  return 'Other';
}

export default LayerManager;