import React, { useState, useCallback } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import { getDefaultStyleForClass } from '@/utils/ifcClasses';
import { useRealTimeStyles } from '@/hooks/useRealTimeStyles';
import { useStylePersistence } from '@/hooks/useStylePersistence';
import type { ElementStyle } from '@/types';

interface StylingPanelProps {
  className?: string;
}

export const StylingPanel: React.FC<StylingPanelProps> = ({ className = '' }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  // Store selectors
  const availableLayers = useViewerStore((state) => state.availableLayers);
  const styleOverrides = useViewerStore((state) => state.styleOverrides);
  
  // Store actions
  const resetElementStyle = useViewerStore((state) => state.resetElementStyle);
  const clearAllStyleOverrides = useViewerStore((state) => state.clearAllStyleOverrides);
  
  // Real-time styling hooks
  const { updateElementStyleWithTransition } = useRealTimeStyles({
    enableBatching: true,
    enableTransitions: true,
    transitionDuration: 200,
  });
  
  // Style persistence
  const { saveStyles, clearStoredStyles } = useStylePersistence();

  // Get current style for selected class
  const getCurrentStyle = useCallback((ifcClass: string): ElementStyle => {
    const override = styleOverrides.get(ifcClass);
    const defaultStyle = getDefaultStyleForClass(ifcClass);
    return { ...defaultStyle, ...override };
  }, [styleOverrides]);

  const currentStyle = selectedClass ? getCurrentStyle(selectedClass) : {};

  // Handle style changes with real-time updates
  const handleColorChange = useCallback((property: 'fill' | 'stroke', color: string) => {
    if (!selectedClass) return;
    updateElementStyleWithTransition(selectedClass, { [property]: color });
  }, [selectedClass, updateElementStyleWithTransition]);

  const handleStrokeWidthChange = useCallback((width: number) => {
    if (!selectedClass) return;
    updateElementStyleWithTransition(selectedClass, { strokeWidth: width });
  }, [selectedClass, updateElementStyleWithTransition]);

  const handleOpacityChange = useCallback((property: 'opacity' | 'fillOpacity' | 'strokeOpacity', value: number) => {
    if (!selectedClass) return;
    updateElementStyleWithTransition(selectedClass, { [property]: value });
  }, [selectedClass, updateElementStyleWithTransition]);

  const handleResetClass = useCallback(() => {
    if (!selectedClass) return;
    resetElementStyle(selectedClass);
  }, [selectedClass, resetElementStyle]);

  const handleResetAll = useCallback(() => {
    clearAllStyleOverrides();
    clearStoredStyles();
  }, [clearAllStyleOverrides, clearStoredStyles]);

  const handleSaveStyles = useCallback(() => {
    saveStyles();
  }, [saveStyles]);

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Element Styling</h3>
      
      {/* Class Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select IFC Class
        </label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a class...</option>
          {availableLayers.map((layer) => (
            <option key={layer.name} value={layer.name}>
              {layer.name} ({layer.count})
            </option>
          ))}
        </select>
      </div>

      {selectedClass && (
        <div className="space-y-4">
          {/* Fill Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fill Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={currentStyle.fill || '#ffffff'}
                onChange={(e) => handleColorChange('fill', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={currentStyle.fill || '#ffffff'}
                onChange={(e) => handleColorChange('fill', e.target.value)}
                className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="#ffffff"
              />
            </div>
          </div>

          {/* Stroke Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stroke Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={currentStyle.stroke || '#000000'}
                onChange={(e) => handleColorChange('stroke', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={currentStyle.stroke || '#000000'}
                onChange={(e) => handleColorChange('stroke', e.target.value)}
                className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stroke Width: {currentStyle.strokeWidth || 1}px
            </label>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={currentStyle.strokeWidth || 1}
              onChange={(e) => handleStrokeWidthChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Fill Opacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fill Opacity: {Math.round((currentStyle.fillOpacity || 1) * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentStyle.fillOpacity || 1}
              onChange={(e) => handleOpacityChange('fillOpacity', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Stroke Opacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stroke Opacity: {Math.round((currentStyle.strokeOpacity || 1) * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentStyle.strokeOpacity || 1}
              onChange={(e) => handleOpacityChange('strokeOpacity', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex space-x-2">
              <button
                onClick={handleResetClass}
                className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Reset Class
              </button>
              <button
                onClick={handleSaveStyles}
                className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Save Styles
              </button>
            </div>
            <button
              onClick={handleResetAll}
              className="w-full px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Reset All & Clear Storage
            </button>
          </div>
        </div>
      )}

      {!selectedClass && (
        <div className="text-center text-gray-500 py-8">
          Select an IFC class to customize its styling
        </div>
      )}
    </div>
  );
};

export default StylingPanel;