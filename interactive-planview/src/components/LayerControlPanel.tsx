import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import { useLayerControlIntegration } from '@/hooks/useLayerControlIntegration';
import { searchIFCClasses, sortIFCClasses } from '@/utils/ifcClasses';
import type { IFCClass } from '@/types';

interface LayerControlPanelProps {
  className?: string;
}

export const LayerControlPanel: React.FC<LayerControlPanelProps> = ({
  className = '',
}) => {
  // Get elements from store for integration
  const elements = useViewerStore((state) => Array.from(state.elements.values()));
  const isLoading = useViewerStore((state) => state.isLoading);
  const error = useViewerStore((state) => state.error);
  
  // Use layer control integration for enhanced functionality
  const layerIntegration = useLayerControlIntegration(elements);
  
  // Extract needed values from integration
  const {
    availableLayers,
    visibleLayers,
    toggleLayer,
    showAllLayers,
    hideAllLayers,
    setLayerVisibility,
    getRenderingStats,
    getIntegrationHealth,
  } = layerIntegration;

  // Local state for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'displayName' | 'count'>('displayName');
  const [sortAscending, setSortAscending] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Filter and sort layers based on search term and sort options
  const filteredAndSortedLayers = useMemo(() => {
    let filtered = searchIFCClasses(availableLayers, searchTerm);
    return sortIFCClasses(filtered, sortBy, sortAscending);
  }, [availableLayers, searchTerm, sortBy, sortAscending]);

  // Get enhanced visibility statistics from integration
  const visibilityStats = useMemo(() => {
    const stats = getRenderingStats();
    return {
      total: stats.layers.total,
      visible: stats.layers.visible,
      hidden: stats.layers.hidden,
      elements: stats.elements,
      rendering: stats.rendering,
    };
  }, [getRenderingStats]);

  // Handle individual layer toggle with visual feedback
  const handleLayerToggle = useCallback(async (className: string) => {
    try {
      await toggleLayer(className);
      const layer = availableLayers.find(l => l.name === className);
      const isNowVisible = visibleLayers.has(className);
      
      setFeedbackMessage(
        `${layer?.displayName || className} ${isNowVisible ? 'shown' : 'hidden'}`
      );
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    } catch (err) {
      setFeedbackMessage('Failed to toggle layer');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
    }
  }, [toggleLayer, availableLayers, visibleLayers]);

  // Handle show all layers with feedback
  const handleShowAll = useCallback(async () => {
    try {
      await showAllLayers();
      setFeedbackMessage(`All ${availableLayers.length} layers shown`);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    } catch (err) {
      setFeedbackMessage('Failed to show all layers');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
    }
  }, [showAllLayers, availableLayers.length]);

  // Handle hide all layers with feedback
  const handleHideAll = useCallback(async () => {
    try {
      await hideAllLayers();
      setFeedbackMessage(`All ${availableLayers.length} layers hidden`);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    } catch (err) {
      setFeedbackMessage('Failed to hide all layers');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
    }
  }, [hideAllLayers, availableLayers.length]);

  // Handle search input change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: 'displayName' | 'count') => {
    if (newSortBy === sortBy) {
      setSortAscending(!sortAscending);
    } else {
      setSortBy(newSortBy);
      setSortAscending(true);
    }
  }, [sortBy, sortAscending]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // Listen for custom layer events for additional feedback
  useEffect(() => {
    const handleLayerToggled = (event: CustomEvent) => {
      const { className, visible } = event.detail;
      const layer = availableLayers.find(l => l.name === className);
      setFeedbackMessage(
        `${layer?.displayName || className} ${visible ? 'shown' : 'hidden'}`
      );
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    };

    const handleAllLayersShown = (event: CustomEvent) => {
      const { count } = event.detail;
      setFeedbackMessage(`All ${count} layers shown`);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    };

    const handleAllLayersHidden = (event: CustomEvent) => {
      const { count } = event.detail;
      setFeedbackMessage(`All ${count} layers hidden`);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('layerToggled', handleLayerToggled as EventListener);
      window.addEventListener('allLayersShown', handleAllLayersShown as EventListener);
      window.addEventListener('allLayersHidden', handleAllLayersHidden as EventListener);

      return () => {
        window.removeEventListener('layerToggled', handleLayerToggled as EventListener);
        window.removeEventListener('allLayersShown', handleAllLayersShown as EventListener);
        window.removeEventListener('allLayersHidden', handleAllLayersHidden as EventListener);
      };
    }
  }, [availableLayers]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`layer-control-panel bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="p-4 text-gray-500 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <div className="text-sm">Loading layers...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`layer-control-panel bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="p-4 text-red-500 text-center">
          <div className="text-sm font-medium">Error loading layers</div>
          <div className="text-xs text-red-400 mt-1">{error.message}</div>
        </div>
      </div>
    );
  }

  if (availableLayers.length === 0) {
    return (
      <div className={`layer-control-panel bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="p-4 text-gray-500 text-center">
          <div className="text-sm">No layers available</div>
          <div className="text-xs text-gray-400 mt-1">
            Load a planview to see available IFC classes
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`layer-control-panel bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Feedback Toast */}
      {showFeedback && (
        <div className="absolute top-2 right-2 z-50 bg-blue-500 text-white px-3 py-2 rounded-md text-sm shadow-lg transition-all duration-300 ease-in-out">
          {feedbackMessage}
        </div>
      )}
      
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Layer Control
          </h3>
          <div className="text-sm text-gray-500">
            {visibilityStats.visible}/{visibilityStats.total}
          </div>
        </div>
        
        {/* Enhanced Statistics */}
        <div className="text-sm text-gray-600 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                {visibilityStats.visible} visible
              </span>
              <span className="inline-flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                {visibilityStats.hidden} hidden
              </span>
            </div>
            {visibilityStats.rendering && (
              <div className="text-xs text-gray-500">
                {visibilityStats.elements.visible}/{visibilityStats.elements.total} elements
              </div>
            )}
          </div>
          {visibilityStats.rendering && (
            <div className="mt-1 text-xs text-gray-500">
              Rendering: {visibilityStats.rendering.renderingEfficiency.toFixed(1)}% efficiency
            </div>
          )}
        </div>
        
        {/* Bulk Actions */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleShowAll}
            disabled={visibilityStats.visible === visibilityStats.total}
            className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Show All
          </button>
          <button
            onClick={handleHideAll}
            disabled={visibilityStats.visible === 0}
            className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Hide All
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search layers..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Sort Controls */}
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Sort by:</span>
          <button
            onClick={() => handleSortChange('displayName')}
            className={`px-2 py-1 rounded ${
              sortBy === 'displayName' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Name {sortBy === 'displayName' && (sortAscending ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSortChange('count')}
            className={`px-2 py-1 rounded ${
              sortBy === 'count' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Count {sortBy === 'count' && (sortAscending ? '↑' : '↓')}
          </button>
        </div>
      </div>
      
      {/* Layer List */}
      <div className="max-h-80 overflow-y-auto">
        {filteredAndSortedLayers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-sm">No layers match your search</div>
            <button
              onClick={handleClearSearch}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAndSortedLayers.map((layer) => {
              const isVisible = visibleLayers.has(layer.name);
              
              return (
                <div
                  key={layer.name}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => handleLayerToggle(layer.name)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      aria-label={`Toggle visibility for ${layer.displayName}`}
                    />
                    
                    {/* Color indicator */}
                    <div
                      className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
                      style={{
                        backgroundColor: layer.style.fill || layer.style.stroke || '#666',
                        opacity: isVisible ? 1 : 0.3,
                      }}
                      title={`Color: ${layer.style.fill || layer.style.stroke || '#666'}`}
                    />
                    
                    {/* Layer info */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${
                        isVisible ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {layer.displayName}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{layer.count} elements</span>
                        <span className="text-gray-300">•</span>
                        <span className="font-mono text-xs">{layer.name}</span>
                      </div>
                    </div>
                    
                    {/* Visibility indicator */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isVisible ? 'bg-green-400' : 'bg-gray-300'
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer */}
      {searchTerm && (
        <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500 bg-gray-50">
          Showing {filteredAndSortedLayers.length} of {availableLayers.length} layers
        </div>
      )}
    </div>
  );
};

export default LayerControlPanel;