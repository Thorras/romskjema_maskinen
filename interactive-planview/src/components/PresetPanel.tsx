import React, { useState } from 'react';
import { useConfigurationStore } from '@/store/configurationStore';
import { useViewerStore } from '@/store/viewerStore';

interface PresetPanelProps {
  className?: string;
}

export const PresetPanel: React.FC<PresetPanelProps> = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    presets,
    activePresetId,
    savePreset,
    applyPreset,
    deletePreset,
  } = useConfigurationStore();

  const { 
    visibleLayers, 
    styleOverrides, 
    transform 
  } = useViewerStore();

  const handleQuickSave = () => {
    const timestamp = new Date().toLocaleString();
    const currentConfig = {
      visibleLayers: Array.from(visibleLayers),
      styleOverrides: Object.fromEntries(styleOverrides),
      transform,
    };

    savePreset(`Quick Save ${timestamp}`, 'Auto-saved configuration', currentConfig);
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = applyPreset(presetId);
    if (preset) {
      const { visibleLayers: layers, styleOverrides: styles, transform: presetTransform } = preset.config;
      
      const viewerStore = useViewerStore.getState();
      viewerStore.setVisibleLayers(new Set(layers));
      
      viewerStore.clearAllStyleOverrides();
      Object.entries(styles).forEach(([className, style]) => {
        viewerStore.setElementStyle(className, style);
      });
      
      viewerStore.setTransform(presetTransform);
    }
  };

  return (
    <div className={`preset-panel bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-medium text-gray-900">Configuration Presets</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {presets.length} saved
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Quick Actions */}
          <div className="p-3 border-b border-gray-100">
            <button
              onClick={handleQuickSave}
              className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Quick Save Current State
            </button>
          </div>

          {/* Preset List */}
          <div className="max-h-64 overflow-y-auto">
            {presets.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No presets saved yet
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {presets.slice(0, 10).map((preset) => (
                  <div
                    key={preset.id}
                    className={`flex items-center justify-between p-2 rounded hover:bg-gray-50 ${
                      preset.id === activePresetId ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {preset.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {preset.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleLoadPreset(preset.id)}
                        className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        title="Load preset"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        title="Delete preset"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                
                {presets.length > 10 && (
                  <div className="p-2 text-center text-xs text-gray-500">
                    ... and {presets.length - 10} more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};