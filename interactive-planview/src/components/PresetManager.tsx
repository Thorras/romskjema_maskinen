import React, { useState } from 'react';
import { useConfigurationStore } from '@/store/configurationStore';
import { useViewerStore } from '@/store/viewerStore';

interface PresetManagerProps {
  className?: string;
}

export const PresetManager: React.FC<PresetManagerProps> = ({ className = '' }) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    presets,
    activePresetId,
    configurationError,
    savePreset,
    deletePreset,
    renamePreset,
    duplicatePreset,
    applyPreset,
    searchPresets,
    clearConfigurationError,
  } = useConfigurationStore();

  const { 
    visibleLayers, 
    styleOverrides, 
    transform 
  } = useViewerStore();

  const filteredPresets = searchQuery ? searchPresets(searchQuery) : presets;

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;

    // Get current viewer configuration
    const currentConfig = {
      visibleLayers: Array.from(visibleLayers),
      styleOverrides: Object.fromEntries(styleOverrides),
      transform,
    };

    savePreset(newPresetName, newPresetDescription, currentConfig);
    setNewPresetName('');
    setNewPresetDescription('');
    setShowSaveDialog(false);
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = applyPreset(presetId);
    if (preset) {
      // Apply the preset configuration to the viewer
      const { visibleLayers: layers, styleOverrides: styles, transform: presetTransform } = preset.config;
      
      // Update viewer store with preset configuration
      const viewerStore = useViewerStore.getState();
      viewerStore.setVisibleLayers(new Set(layers));
      
      // Apply style overrides
      viewerStore.clearAllStyleOverrides();
      Object.entries(styles).forEach(([className, style]) => {
        viewerStore.setElementStyle(className, style);
      });
      
      viewerStore.setTransform(presetTransform);
    }
    setShowLoadDialog(false);
  };

  const handleDeletePreset = (presetId: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      deletePreset(presetId);
    }
  };

  const handleRenamePreset = (presetId: string, currentName: string) => {
    const newName = window.prompt('Enter new preset name:', currentName);
    if (newName && newName.trim() && newName !== currentName) {
      renamePreset(presetId, newName);
    }
  };

  const handleDuplicatePreset = (presetId: string, currentName: string) => {
    const newName = window.prompt('Enter name for duplicated preset:', `${currentName} (Copy)`);
    if (newName && newName.trim()) {
      duplicatePreset(presetId, newName);
    }
  };

  return (
    <div className={`preset-manager ${className}`}>
      {/* Error Display */}
      {configurationError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <div className="flex justify-between items-center">
            <span>{configurationError.message}</span>
            <button
              onClick={clearConfigurationError}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowSaveDialog(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Save Preset
        </button>
        <button
          onClick={() => setShowLoadDialog(true)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Load Preset
        </button>
      </div>

      {/* Active Preset Display */}
      {activePresetId && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm text-blue-700">
            Active Preset: {presets.find(p => p.id === activePresetId)?.name || 'Unknown'}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Configuration Preset</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preset Name *
                </label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter preset name"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter preset description"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewPresetName('');
                  setNewPresetDescription('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Load Configuration Preset</h3>
            
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search presets..."
              />
            </div>

            {/* Preset List */}
            <div className="flex-1 overflow-y-auto">
              {filteredPresets.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {searchQuery ? 'No presets match your search.' : 'No presets saved yet.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className={`p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                        preset.id === activePresetId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{preset.name}</h4>
                          {preset.description && (
                            <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            Created: {preset.createdAt.toLocaleDateString()}
                            {preset.updatedAt.getTime() !== preset.createdAt.getTime() && (
                              <span> • Updated: {preset.updatedAt.toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-1 ml-4">
                          <button
                            onClick={() => handleLoadPreset(preset.id)}
                            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleRenamePreset(preset.id, preset.name)}
                            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDuplicatePreset(preset.id, preset.name)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => handleDeletePreset(preset.id)}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowLoadDialog(false);
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};