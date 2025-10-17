import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConfigurationStore } from '../configurationStore';
import type { ConfigurationPreset } from '@/types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ConfigurationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useConfigurationStore.getState().clearAllPresets();
    useConfigurationStore.getState().clearConfigurationError();
    useConfigurationStore.getState().setActivePreset(null);
    vi.clearAllMocks();
  });

  describe('Preset Management', () => {
    it('should save a new preset', () => {
      const store = useConfigurationStore.getState();
      
      store.savePreset('Test Preset', 'Test description', {
        visibleLayers: ['Wall', 'Door'],
        styleOverrides: { Wall: { fill: '#ff0000' } },
        transform: { x: 10, y: 20, scale: 1.5 },
      });

      const presets = store.getAllPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe('Test Preset');
      expect(presets[0].description).toBe('Test description');
      expect(presets[0].config.visibleLayers).toEqual(['Wall', 'Door']);
    });

    it('should load an existing preset', () => {
      const store = useConfigurationStore.getState();
      
      // Save a preset first
      store.savePreset('Test Preset', undefined, {
        visibleLayers: ['Wall'],
        styleOverrides: {},
        transform: { x: 0, y: 0, scale: 1 },
      });

      const presets = store.getAllPresets();
      const presetId = presets[0].id;

      // Load the preset
      const loadedPreset = store.loadPreset(presetId);
      
      expect(loadedPreset).toBeTruthy();
      expect(loadedPreset?.name).toBe('Test Preset');
      
      // Get fresh state after the operation
      const updatedStore = useConfigurationStore.getState();
      expect(updatedStore.activePresetId).toBe(presetId);
    });

    it('should delete a preset', () => {
      const store = useConfigurationStore.getState();
      
      // Save a preset first
      store.savePreset('Test Preset');
      const presets = store.getAllPresets();
      const presetId = presets[0].id;

      // Delete the preset
      store.deletePreset(presetId);
      
      expect(store.getAllPresets()).toHaveLength(0);
      expect(store.activePresetId).toBeNull();
    });

    it('should update a preset', () => {
      const store = useConfigurationStore.getState();
      
      // Save a preset first
      store.savePreset('Original Name');
      const presets = store.getAllPresets();
      const presetId = presets[0].id;

      // Update the preset
      store.updatePreset(presetId, { name: 'Updated Name', description: 'New description' });
      
      const updatedPreset = store.getPresetById(presetId);
      expect(updatedPreset?.name).toBe('Updated Name');
      expect(updatedPreset?.description).toBe('New description');
    });

    it('should rename a preset', () => {
      const store = useConfigurationStore.getState();
      
      // Save a preset first
      store.savePreset('Original Name');
      const presets = store.getAllPresets();
      const presetId = presets[0].id;

      // Rename the preset
      store.renamePreset(presetId, 'New Name');
      
      const renamedPreset = store.getPresetById(presetId);
      expect(renamedPreset?.name).toBe('New Name');
    });

    it('should duplicate a preset', () => {
      const store = useConfigurationStore.getState();
      
      // Save a preset first
      store.savePreset('Original Preset', 'Original description', {
        visibleLayers: ['Wall'],
        styleOverrides: { Wall: { fill: '#ff0000' } },
        transform: { x: 10, y: 20, scale: 1.5 },
      });
      
      const presets = store.getAllPresets();
      const originalId = presets[0].id;

      // Duplicate the preset
      store.duplicatePreset(originalId, 'Duplicated Preset');
      
      const allPresets = store.getAllPresets();
      expect(allPresets).toHaveLength(2);
      
      const duplicated = allPresets.find(p => p.name === 'Duplicated Preset');
      expect(duplicated).toBeTruthy();
      expect(duplicated?.config).toEqual(presets[0].config);
      expect(duplicated?.id).not.toBe(originalId);
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(() => {
      const store = useConfigurationStore.getState();
      store.savePreset('Wall Configuration', 'Configuration for walls');
      store.savePreset('Door Settings', 'Settings for doors');
      store.savePreset('Window Setup', 'Setup for windows');
    });

    it('should search presets by name', () => {
      const store = useConfigurationStore.getState();
      
      const results = store.searchPresets('Wall');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Wall Configuration');
    });

    it('should search presets by description', () => {
      const store = useConfigurationStore.getState();
      
      const results = store.searchPresets('doors');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Door Settings');
    });

    it('should return all presets for empty search', () => {
      const store = useConfigurationStore.getState();
      
      const results = store.searchPresets('');
      expect(results).toHaveLength(3);
    });

    it('should return empty array for no matches', () => {
      const store = useConfigurationStore.getState();
      
      const results = store.searchPresets('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('Import/Export Functionality', () => {
    it('should export a single preset', () => {
      const store = useConfigurationStore.getState();
      
      store.savePreset('Test Preset', 'Test description', {
        visibleLayers: ['Wall'],
        styleOverrides: { Wall: { fill: '#ff0000' } },
        transform: { x: 10, y: 20, scale: 1.5 },
      });

      const presets = store.getAllPresets();
      const presetId = presets[0].id;
      
      const exportData = store.exportPreset(presetId);
      expect(exportData).toBeTruthy();
      
      const parsed = JSON.parse(exportData!);
      expect(parsed.name).toBe('Test Preset');
      expect(parsed.description).toBe('Test description');
    });

    it('should export all presets', () => {
      const store = useConfigurationStore.getState();
      
      store.savePreset('Preset 1');
      store.savePreset('Preset 2');
      
      const exportData = store.exportAllPresets();
      const parsed = JSON.parse(exportData);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('should import a single preset', () => {
      const store = useConfigurationStore.getState();
      
      const presetData: ConfigurationPreset = {
        id: 'test-id',
        name: 'Imported Preset',
        description: 'Imported description',
        config: {
          visibleLayers: ['Wall'],
          styleOverrides: {},
          transform: { x: 0, y: 0, scale: 1 },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const success = store.importPreset(JSON.stringify(presetData));
      expect(success).toBe(true);
      
      const presets = store.getAllPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe('Imported Preset');
      expect(presets[0].id).not.toBe('test-id'); // Should generate new ID
    });

    it('should import multiple presets', () => {
      const store = useConfigurationStore.getState();
      
      const presetsData: ConfigurationPreset[] = [
        {
          id: 'test-id-1',
          name: 'Preset 1',
          config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'test-id-2',
          name: 'Preset 2',
          config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const success = store.importPresets(JSON.stringify(presetsData));
      expect(success).toBe(true);
      
      const presets = store.getAllPresets();
      expect(presets).toHaveLength(2);
    });

    it('should handle invalid import data', () => {
      const store = useConfigurationStore.getState();
      
      const success = store.importPreset('invalid json');
      expect(success).toBe(false);
      
      const updatedStore = useConfigurationStore.getState();
      expect(updatedStore.configurationError).toBeTruthy();
    });
  });

  describe('Default Configuration Management', () => {
    it('should create a default preset', () => {
      const store = useConfigurationStore.getState();
      
      store.createDefaultPreset();
      
      const updatedStore = useConfigurationStore.getState();
      const presets = updatedStore.getAllPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe('Default Configuration');
      expect(updatedStore.activePresetId).toBe(presets[0].id);
    });

    it('should reset to default configuration', () => {
      const store = useConfigurationStore.getState();
      
      // Set some active preset
      store.savePreset('Test Preset');
      const presets = store.getAllPresets();
      store.setActivePreset(presets[0].id);

      // Reset to default
      const defaultPreset = store.resetToDefaultConfiguration();
      
      expect(defaultPreset).toBeTruthy();
      expect(defaultPreset?.name).toBe('Default');
      expect(store.activePresetId).toBeNull();
    });

    it('should clear all presets', () => {
      const store = useConfigurationStore.getState();
      
      // Add some presets
      store.savePreset('Preset 1');
      store.savePreset('Preset 2');
      
      // Clear all
      store.clearAllPresets();
      
      expect(store.getAllPresets()).toHaveLength(0);
      expect(store.activePresetId).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should validate preset configuration', () => {
      const store = useConfigurationStore.getState();
      
      const validConfig = {
        visibleLayers: ['Wall'],
        styleOverrides: { Wall: { fill: '#ff0000' } },
        transform: { x: 10, y: 20, scale: 1.5 },
      };
      
      expect(store.validatePresetConfig(validConfig)).toBe(true);
    });

    it('should reject invalid preset configuration', () => {
      const store = useConfigurationStore.getState();
      
      const invalidConfig = {
        visibleLayers: 'not an array', // Should be array
        styleOverrides: {},
        transform: { x: 10, y: 20, scale: 1.5 },
      };
      
      expect(store.validatePresetConfig(invalidConfig)).toBe(false);
    });

    it('should validate complete preset', () => {
      const store = useConfigurationStore.getState();
      
      const validPreset: Partial<ConfigurationPreset> = {
        name: 'Valid Preset',
        config: {
          visibleLayers: ['Wall'],
          styleOverrides: {},
          transform: { x: 0, y: 0, scale: 1 },
        },
      };
      
      expect(store.validatePreset(validPreset)).toBe(true);
    });

    it('should reject preset with empty name', () => {
      const store = useConfigurationStore.getState();
      
      const invalidPreset: Partial<ConfigurationPreset> = {
        name: '',
        config: {
          visibleLayers: [],
          styleOverrides: {},
          transform: { x: 0, y: 0, scale: 1 },
        },
      };
      
      expect(store.validatePreset(invalidPreset)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should set and clear configuration errors', () => {
      const store = useConfigurationStore.getState();
      
      const error = {
        type: 'configuration' as const,
        message: 'Test error',
        timestamp: new Date(),
      };
      
      store.setConfigurationError(error);
      
      const updatedStore = useConfigurationStore.getState();
      expect(updatedStore.configurationError).toEqual(error);
      
      updatedStore.clearConfigurationError();
      
      const finalStore = useConfigurationStore.getState();
      expect(finalStore.configurationError).toBeNull();
    });

    it('should handle errors when loading non-existent preset', () => {
      const store = useConfigurationStore.getState();
      
      const result = store.loadPreset('non-existent-id');
      expect(result).toBeNull();
      
      const updatedStore = useConfigurationStore.getState();
      expect(updatedStore.configurationError).toBeTruthy();
    });

    it('should handle errors when deleting non-existent preset', () => {
      const store = useConfigurationStore.getState();
      
      store.deletePreset('non-existent-id');
      
      const updatedStore = useConfigurationStore.getState();
      expect(updatedStore.configurationError).toBeTruthy();
    });
  });

  describe('Utility Functions', () => {
    it('should get preset count', () => {
      const store = useConfigurationStore.getState();
      
      expect(store.getPresetCount()).toBe(0);
      
      store.savePreset('Preset 1');
      store.savePreset('Preset 2');
      
      expect(store.getPresetCount()).toBe(2);
    });

    it('should get preset by ID', () => {
      const store = useConfigurationStore.getState();
      
      store.savePreset('Test Preset');
      const presets = store.getAllPresets();
      const presetId = presets[0].id;
      
      const foundPreset = store.getPresetById(presetId);
      expect(foundPreset).toBeTruthy();
      expect(foundPreset?.name).toBe('Test Preset');
      
      const notFound = store.getPresetById('non-existent');
      expect(notFound).toBeUndefined();
    });

    it('should sort presets by update date', () => {
      const store = useConfigurationStore.getState();
      
      // Add presets with slight delay to ensure different timestamps
      store.savePreset('First Preset');
      
      // Simulate time passing
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);
      
      store.savePreset('Second Preset');
      
      vi.useRealTimers();
      
      const presets = store.getAllPresets();
      expect(presets[0].name).toBe('Second Preset'); // Most recent first
      expect(presets[1].name).toBe('First Preset');
    });
  });
});