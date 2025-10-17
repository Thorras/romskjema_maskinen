import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ConfigurationPreset, ViewerError } from '@/types';

interface ConfigurationStore {
  // State
  presets: ConfigurationPreset[];
  activePresetId: string | null;
  configurationError: ViewerError | null;
  
  // Preset management actions
  savePreset: (name: string, description?: string, config?: Partial<ConfigurationPreset['config']>) => void;
  loadPreset: (id: string) => ConfigurationPreset | null;
  deletePreset: (id: string) => void;
  updatePreset: (id: string, updates: Partial<ConfigurationPreset>) => void;
  duplicatePreset: (id: string, newName: string) => void;
  renamePreset: (id: string, newName: string) => void;
  
  // Preset operations
  applyPreset: (id: string) => ConfigurationPreset | null;
  setActivePreset: (id: string | null) => void;
  getPresetById: (id: string) => ConfigurationPreset | undefined;
  getAllPresets: () => ConfigurationPreset[];
  
  // Import/Export functionality
  exportPreset: (id: string) => string | null;
  exportAllPresets: () => string;
  importPreset: (presetData: string) => boolean;
  importPresets: (presetsData: string) => boolean;
  
  // Default configuration management
  createDefaultPreset: () => void;
  resetToDefaultConfiguration: () => ConfigurationPreset | null;
  
  // Validation
  validatePreset: (preset: Partial<ConfigurationPreset>) => boolean;
  validatePresetConfig: (config: any) => boolean;
  
  // Error handling
  setConfigurationError: (error: ViewerError | null) => void;
  clearConfigurationError: () => void;
  
  // Utility actions
  clearAllPresets: () => void;
  getPresetCount: () => number;
  searchPresets: (query: string) => ConfigurationPreset[];
}

// Generate unique preset ID
const generatePresetId = (): string => {
  return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Default configuration
const createDefaultConfiguration = (): ConfigurationPreset['config'] => ({
  visibleLayers: [],
  styleOverrides: {},
  transform: { x: 0, y: 0, scale: 1 },
});

// Validation functions
const validatePresetConfig = (config: any): boolean => {
  if (!config || typeof config !== 'object') return false;
  
  // Check required properties
  if (!Array.isArray(config.visibleLayers)) return false;
  if (!config.styleOverrides || typeof config.styleOverrides !== 'object') return false;
  if (!config.transform || typeof config.transform !== 'object') return false;
  
  // Validate transform
  const { transform } = config;
  if (typeof transform.x !== 'number' || typeof transform.y !== 'number' || typeof transform.scale !== 'number') {
    return false;
  }
  
  return true;
};

const validatePreset = (preset: Partial<ConfigurationPreset>): boolean => {
  if (!preset.name || typeof preset.name !== 'string' || preset.name.trim().length === 0) {
    return false;
  }
  
  if (!preset.config || !validatePresetConfig(preset.config)) {
    return false;
  }
  
  return true;
};

export const useConfigurationStore = create<ConfigurationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      presets: [],
      activePresetId: null,
      configurationError: null,
      
      // Preset management actions
      savePreset: (name, description, config) => {
        try {
          // Get current configuration from viewer store if not provided
          const currentConfig = config ? { ...createDefaultConfiguration(), ...config } : createDefaultConfiguration();
          
          const newPreset: ConfigurationPreset = {
            id: generatePresetId(),
            name: name.trim(),
            description: description?.trim(),
            config: currentConfig,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          if (!validatePreset(newPreset)) {
            set(() => ({
              configurationError: {
                type: 'configuration',
                message: 'Invalid preset configuration',
                timestamp: new Date(),
              },
            }));
            return;
          }
          
          set((state) => ({
            presets: [...state.presets, newPreset],
            activePresetId: newPreset.id,
            configurationError: null,
          }));
        } catch (error) {
          set(() => ({
            configurationError: {
              type: 'configuration',
              message: `Failed to save preset: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
            },
          }));
        }
      },
      
      loadPreset: (id) => {
        const state = get();
        const preset = state.presets.find(p => p.id === id);
        
        if (!preset) {
          set(() => ({
            configurationError: {
              type: 'configuration',
              message: `Preset with ID ${id} not found`,
              timestamp: new Date(),
            },
          }));
          return null;
        }
        
        set(() => ({
          activePresetId: id,
          configurationError: null,
        }));
        
        return preset;
      },
      
      deletePreset: (id) =>
        set((state) => {
          const presetExists = state.presets.some(p => p.id === id);
          
          if (!presetExists) {
            return {
              configurationError: {
                type: 'configuration',
                message: `Preset with ID ${id} not found`,
                timestamp: new Date(),
              },
            };
          }
          
          return {
            presets: state.presets.filter(p => p.id !== id),
            activePresetId: state.activePresetId === id ? null : state.activePresetId,
            configurationError: null,
          };
        }),
      
      updatePreset: (id, updates) =>
        set((state) => {
          const presetIndex = state.presets.findIndex(p => p.id === id);
          
          if (presetIndex === -1) {
            return {
              configurationError: {
                type: 'configuration',
                message: `Preset with ID ${id} not found`,
                timestamp: new Date(),
              },
            };
          }
          
          const updatedPreset = {
            ...state.presets[presetIndex],
            ...updates,
            updatedAt: new Date(),
          };
          
          if (!validatePreset(updatedPreset)) {
            return {
              configurationError: {
                type: 'configuration',
                message: 'Invalid preset configuration',
                timestamp: new Date(),
              },
            };
          }
          
          const newPresets = [...state.presets];
          newPresets[presetIndex] = updatedPreset;
          
          return {
            presets: newPresets,
            configurationError: null,
          };
        }),
      
      duplicatePreset: (id, newName) =>
        set((state) => {
          const originalPreset = state.presets.find(p => p.id === id);
          
          if (!originalPreset) {
            return {
              configurationError: {
                type: 'configuration',
                message: `Preset with ID ${id} not found`,
                timestamp: new Date(),
              },
            };
          }
          
          const duplicatedPreset: ConfigurationPreset = {
            ...originalPreset,
            id: generatePresetId(),
            name: newName.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          return {
            presets: [...state.presets, duplicatedPreset],
            configurationError: null,
          };
        }),
      
      renamePreset: (id, newName) =>
        set((state) => {
          const presetIndex = state.presets.findIndex(p => p.id === id);
          
          if (presetIndex === -1) {
            return {
              configurationError: {
                type: 'configuration',
                message: `Preset with ID ${id} not found`,
                timestamp: new Date(),
              },
            };
          }
          
          if (!newName.trim()) {
            return {
              configurationError: {
                type: 'configuration',
                message: 'Preset name cannot be empty',
                timestamp: new Date(),
              },
            };
          }
          
          const newPresets = [...state.presets];
          newPresets[presetIndex] = {
            ...newPresets[presetIndex],
            name: newName.trim(),
            updatedAt: new Date(),
          };
          
          return {
            presets: newPresets,
            configurationError: null,
          };
        }),
      
      // Preset operations
      applyPreset: (id) => {
        const preset = get().loadPreset(id);
        return preset;
      },
      
      setActivePreset: (id) =>
        set(() => ({
          activePresetId: id,
        })),
      
      getPresetById: (id) => {
        const state = get();
        return state.presets.find(p => p.id === id);
      },
      
      getAllPresets: () => {
        const state = get();
        return [...state.presets].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      },
      
      // Import/Export functionality
      exportPreset: (id) => {
        try {
          const state = get();
          const preset = state.presets.find(p => p.id === id);
          
          if (!preset) {
            set(() => ({
              configurationError: {
                type: 'configuration',
                message: `Preset with ID ${id} not found`,
                timestamp: new Date(),
              },
            }));
            return null;
          }
          
          return JSON.stringify(preset, null, 2);
        } catch (error) {
          set(() => ({
            configurationError: {
              type: 'configuration',
              message: `Failed to export preset: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
            },
          }));
          return null;
        }
      },
      
      exportAllPresets: () => {
        try {
          const state = get();
          return JSON.stringify(state.presets, null, 2);
        } catch (error) {
          set(() => ({
            configurationError: {
              type: 'configuration',
              message: `Failed to export presets: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
            },
          }));
          return '[]';
        }
      },
      
      importPreset: (presetData) => {
        try {
          const preset = JSON.parse(presetData) as ConfigurationPreset;
          
          // Convert date strings back to Date objects
          preset.createdAt = new Date(preset.createdAt);
          preset.updatedAt = new Date(preset.updatedAt);
          
          if (!validatePreset(preset)) {
            set(() => ({
              configurationError: {
                type: 'configuration',
                message: 'Invalid preset data format',
                timestamp: new Date(),
              },
            }));
            return false;
          }
          
          // Generate new ID to avoid conflicts
          preset.id = generatePresetId();
          
          set((state) => ({
            presets: [...state.presets, preset],
            configurationError: null,
          }));
          
          return true;
        } catch (error) {
          set(() => ({
            configurationError: {
              type: 'configuration',
              message: `Failed to import preset: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
              timestamp: new Date(),
            },
          }));
          return false;
        }
      },
      
      importPresets: (presetsData) => {
        try {
          const presets = JSON.parse(presetsData) as ConfigurationPreset[];
          
          if (!Array.isArray(presets)) {
            set(() => ({
              configurationError: {
                type: 'configuration',
                message: 'Invalid presets data format - expected array',
                timestamp: new Date(),
              },
            }));
            return false;
          }
          
          const validPresets: ConfigurationPreset[] = [];
          
          for (const preset of presets) {
            // Convert date strings back to Date objects
            preset.createdAt = new Date(preset.createdAt);
            preset.updatedAt = new Date(preset.updatedAt);
            
            if (validatePreset(preset)) {
              // Generate new ID to avoid conflicts
              preset.id = generatePresetId();
              validPresets.push(preset);
            }
          }
          
          if (validPresets.length === 0) {
            set(() => ({
              configurationError: {
                type: 'configuration',
                message: 'No valid presets found in import data',
                timestamp: new Date(),
              },
            }));
            return false;
          }
          
          set((state) => ({
            presets: [...state.presets, ...validPresets],
            configurationError: null,
          }));
          
          return true;
        } catch (error) {
          set(() => ({
            configurationError: {
              type: 'configuration',
              message: `Failed to import presets: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
              timestamp: new Date(),
            },
          }));
          return false;
        }
      },
      
      // Default configuration management
      createDefaultPreset: () => {
        const defaultPreset: ConfigurationPreset = {
          id: generatePresetId(),
          name: 'Default Configuration',
          description: 'Default viewer configuration',
          config: createDefaultConfiguration(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          presets: [...state.presets, defaultPreset],
          activePresetId: defaultPreset.id,
        }));
      },
      
      resetToDefaultConfiguration: () => {
        const defaultConfig = createDefaultConfiguration();
        const defaultPreset: ConfigurationPreset = {
          id: 'default',
          name: 'Default',
          description: 'Reset to default configuration',
          config: defaultConfig,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set(() => ({
          activePresetId: null,
          configurationError: null,
        }));
        
        return defaultPreset;
      },
      
      // Validation
      validatePreset,
      validatePresetConfig,
      
      // Error handling
      setConfigurationError: (error) =>
        set(() => ({
          configurationError: error,
        })),
      
      clearConfigurationError: () =>
        set(() => ({
          configurationError: null,
        })),
      
      // Utility actions
      clearAllPresets: () =>
        set(() => ({
          presets: [],
          activePresetId: null,
          configurationError: null,
        })),
      
      getPresetCount: () => {
        const state = get();
        return state.presets.length;
      },
      
      searchPresets: (query) => {
        const state = get();
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) return state.presets;
        
        return state.presets.filter(preset =>
          preset.name.toLowerCase().includes(searchTerm) ||
          (preset.description && preset.description.toLowerCase().includes(searchTerm))
        );
      },
    }),
    {
      name: 'interactive-planview-configuration',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        presets: state.presets,
        activePresetId: state.activePresetId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert date strings back to Date objects
          state.presets = state.presets.map(preset => ({
            ...preset,
            createdAt: new Date(preset.createdAt),
            updatedAt: new Date(preset.updatedAt),
          }));
        }
      },
    }
  )
);

// Selector hooks for better performance
export const usePresets = () => useConfigurationStore((state) => state.presets);
export const useActivePresetId = () => useConfigurationStore((state) => state.activePresetId);
export const useConfigurationError = () => useConfigurationStore((state) => state.configurationError);
export const usePresetCount = () => useConfigurationStore((state) => state.getPresetCount());