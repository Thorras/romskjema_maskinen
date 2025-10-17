import React, { useState, useRef } from 'react';
import { useConfigurationStore } from '@/store/configurationStore';

interface PresetAdministrationProps {
  className?: string;
}

export const PresetAdministration: React.FC<PresetAdministrationProps> = ({ className = '' }) => {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [importType, setImportType] = useState<'single' | 'multiple'>('single');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    presets,
    configurationError,
    exportPreset,
    exportAllPresets,
    importPreset,
    importPresets,
    createDefaultPreset,
    resetToDefaultConfiguration,
    clearAllPresets,
    clearConfigurationError,
  } = useConfigurationStore();

  const handleExportPreset = (presetId: string, presetName: string) => {
    const exportData = exportPreset(presetId);
    if (exportData) {
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `preset-${presetName.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportAllPresets = () => {
    const exportData = exportAllPresets();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all-presets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFromText = () => {
    if (!importData.trim()) return;

    const success = importType === 'single' 
      ? importPreset(importData)
      : importPresets(importData);

    if (success) {
      setImportData('');
      setShowImportDialog(false);
    }
  };

  const handleImportFromFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        // Try to determine if it's a single preset or multiple presets
        try {
          const parsed = JSON.parse(content);
          const isSingle = !Array.isArray(parsed) && parsed.id && parsed.name && parsed.config;
          
          const success = isSingle 
            ? importPreset(content)
            : importPresets(content);

          if (success) {
            setShowImportDialog(false);
          }
        } catch (error) {
          // Let the import functions handle the error
          importPreset(content);
        }
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const handleCreateDefault = () => {
    if (window.confirm('Create a default preset with current settings?')) {
      createDefaultPreset();
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset to default configuration? This will clear current view settings.')) {
      resetToDefaultConfiguration();
    }
  };

  const handleClearAllPresets = () => {
    if (window.confirm('Delete all saved presets? This action cannot be undone.')) {
      clearAllPresets();
    }
  };

  return (
    <div className={`preset-administration ${className}`}>
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

      <div className="space-y-6">
        {/* Export Section */}
        <div className="bg-white p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Export Presets</h3>
          
          <div className="space-y-3">
            <button
              onClick={handleExportAllPresets}
              disabled={presets.length === 0}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Export All Presets ({presets.length})
            </button>

            {presets.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Export Individual Presets:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {presets.map((preset) => (
                    <div key={preset.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-900">{preset.name}</span>
                      <button
                        onClick={() => handleExportPreset(preset.id, preset.name)}
                        className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                      >
                        Export
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Import Presets</h3>
          
          <div className="space-y-3">
            <button
              onClick={() => setShowImportDialog(true)}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Import from Text/JSON
            </button>
            
            <button
              onClick={handleImportFromFile}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              Import from File
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Administration Section */}
        <div className="bg-white p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Administration</h3>
          
          <div className="space-y-3">
            <button
              onClick={handleCreateDefault}
              className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
            >
              Create Default Preset
            </button>
            
            <button
              onClick={handleResetToDefault}
              className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              Reset to Default Configuration
            </button>
            
            <button
              onClick={handleClearAllPresets}
              disabled={presets.length === 0}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Clear All Presets
            </button>
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Import Presets</h3>
            
            {/* Import Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import Type:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="single"
                    checked={importType === 'single'}
                    onChange={(e) => setImportType(e.target.value as 'single' | 'multiple')}
                    className="mr-2"
                  />
                  Single Preset
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="multiple"
                    checked={importType === 'multiple'}
                    onChange={(e) => setImportType(e.target.value as 'single' | 'multiple')}
                    className="mr-2"
                  />
                  Multiple Presets
                </label>
              </div>
            </div>

            {/* Import Data Textarea */}
            <div className="flex-1 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste JSON Data:
              </label>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder={importType === 'single' 
                  ? 'Paste single preset JSON data here...'
                  : 'Paste array of presets JSON data here...'
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportData('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportFromText}
                disabled={!importData.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};