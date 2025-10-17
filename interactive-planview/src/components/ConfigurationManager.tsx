import React, { useState } from 'react';
import { PresetManager } from './PresetManager';
import { PresetAdministration } from './PresetAdministration';
import { PresetPanel } from './PresetPanel';

interface ConfigurationManagerProps {
  className?: string;
  mode?: 'full' | 'panel' | 'admin';
}

export const ConfigurationManager: React.FC<ConfigurationManagerProps> = ({ 
  className = '',
  mode = 'full'
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'admin'>('manage');

  if (mode === 'panel') {
    return <PresetPanel className={className} />;
  }

  if (mode === 'admin') {
    return <PresetAdministration className={className} />;
  }

  return (
    <div className={`configuration-manager ${className}`}>
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'manage'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Manage Presets
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'admin'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Administration
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'manage' && <PresetManager />}
        {activeTab === 'admin' && <PresetAdministration />}
      </div>
    </div>
  );
};