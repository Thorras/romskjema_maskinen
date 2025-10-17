import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PresetManager } from '../PresetManager';
import { useConfigurationStore } from '@/store/configurationStore';
import { useViewerStore } from '@/store/viewerStore';

// Mock the stores
vi.mock('@/store/configurationStore');
vi.mock('@/store/viewerStore');

const mockConfigurationStore = {
  presets: [],
  activePresetId: null,
  configurationError: null,
  savePreset: vi.fn(),
  loadPreset: vi.fn(),
  deletePreset: vi.fn(),
  renamePreset: vi.fn(),
  duplicatePreset: vi.fn(),
  applyPreset: vi.fn(),
  searchPresets: vi.fn(),
  clearConfigurationError: vi.fn(),
};

const mockViewerStore = {
  visibleLayers: new Set(['Wall', 'Door']),
  styleOverrides: new Map([['Wall', { fill: '#ff0000' }]]),
  transform: { x: 10, y: 20, scale: 1.5 },
};

describe('PresetManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useConfigurationStore as any).mockReturnValue(mockConfigurationStore);
    (useViewerStore as any).mockReturnValue(mockViewerStore);
    
    // Reset mock store state
    mockConfigurationStore.presets = [];
    mockConfigurationStore.activePresetId = null;
    mockConfigurationStore.configurationError = null;
  });

  it('should render save and load buttons', () => {
    render(<PresetManager />);
    
    expect(screen.getByText('Save Preset')).toBeInTheDocument();
    expect(screen.getByText('Load Preset')).toBeInTheDocument();
  });

  it('should show save dialog when save button is clicked', () => {
    render(<PresetManager />);
    
    fireEvent.click(screen.getByText('Save Preset'));
    
    expect(screen.getByText('Save Configuration Preset')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter preset name')).toBeInTheDocument();
  });

  it('should save preset with name and description', async () => {
    render(<PresetManager />);
    
    // Open save dialog
    fireEvent.click(screen.getByText('Save Preset'));
    
    // Fill in form
    fireEvent.change(screen.getByPlaceholderText('Enter preset name'), {
      target: { value: 'Test Preset' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter preset description'), {
      target: { value: 'Test description' }
    });
    
    // Save
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    
    expect(mockConfigurationStore.savePreset).toHaveBeenCalledWith(
      'Test Preset',
      'Test description',
      {
        visibleLayers: ['Wall', 'Door'],
        styleOverrides: { Wall: { fill: '#ff0000' } },
        transform: { x: 10, y: 20, scale: 1.5 },
      }
    );
  });

  it('should disable save button when name is empty', () => {
    render(<PresetManager />);
    
    fireEvent.click(screen.getByText('Save Preset'));
    
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();
  });

  it('should show load dialog with presets', () => {
    mockConfigurationStore.presets = [
      {
        id: 'preset-1',
        name: 'Test Preset',
        description: 'Test description',
        config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockConfigurationStore.searchPresets.mockReturnValue(mockConfigurationStore.presets);
    
    render(<PresetManager />);
    
    fireEvent.click(screen.getByText('Load Preset'));
    
    expect(screen.getByText('Load Configuration Preset')).toBeInTheDocument();
    expect(screen.getByText('Test Preset')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should load preset when load button is clicked', () => {
    const mockPreset = {
      id: 'preset-1',
      name: 'Test Preset',
      config: {
        visibleLayers: ['Wall'],
        styleOverrides: { Wall: { fill: '#blue' } },
        transform: { x: 5, y: 10, scale: 2 },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockConfigurationStore.presets = [mockPreset];
    mockConfigurationStore.searchPresets.mockReturnValue([mockPreset]);
    mockConfigurationStore.applyPreset.mockReturnValue(mockPreset);
    
    // Mock viewer store methods
    const mockSetVisibleLayers = vi.fn();
    const mockClearAllStyleOverrides = vi.fn();
    const mockSetElementStyle = vi.fn();
    const mockSetTransform = vi.fn();
    
    (useViewerStore as any).getState = vi.fn().mockReturnValue({
      setVisibleLayers: mockSetVisibleLayers,
      clearAllStyleOverrides: mockClearAllStyleOverrides,
      setElementStyle: mockSetElementStyle,
      setTransform: mockSetTransform,
    });
    
    render(<PresetManager />);
    
    fireEvent.click(screen.getByText('Load Preset'));
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    
    expect(mockConfigurationStore.applyPreset).toHaveBeenCalledWith('preset-1');
    expect(mockSetVisibleLayers).toHaveBeenCalledWith(new Set(['Wall']));
    expect(mockClearAllStyleOverrides).toHaveBeenCalled();
    expect(mockSetElementStyle).toHaveBeenCalledWith('Wall', { fill: '#blue' });
    expect(mockSetTransform).toHaveBeenCalledWith({ x: 5, y: 10, scale: 2 });
  });

  it('should search presets', () => {
    const presets = [
      {
        id: 'preset-1',
        name: 'Wall Configuration',
        config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'preset-2',
        name: 'Door Settings',
        config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    mockConfigurationStore.presets = presets;
    mockConfigurationStore.searchPresets.mockImplementation((query) => 
      query ? presets.filter(p => p.name.toLowerCase().includes(query.toLowerCase())) : presets
    );
    
    render(<PresetManager />);
    
    fireEvent.click(screen.getByText('Load Preset'));
    
    const searchInput = screen.getByPlaceholderText('Search presets...');
    fireEvent.change(searchInput, { target: { value: 'Wall' } });
    
    expect(mockConfigurationStore.searchPresets).toHaveBeenCalledWith('Wall');
  });

  it('should delete preset with confirmation', () => {
    const mockPreset = {
      id: 'preset-1',
      name: 'Test Preset',
      config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockConfigurationStore.presets = [mockPreset];
    mockConfigurationStore.searchPresets.mockReturnValue([mockPreset]);
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    
    render(<PresetManager />);
    
    fireEvent.click(screen.getByText('Load Preset'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this preset?');
    expect(mockConfigurationStore.deletePreset).toHaveBeenCalledWith('preset-1');
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should rename preset', () => {
    const mockPreset = {
      id: 'preset-1',
      name: 'Old Name',
      config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockConfigurationStore.presets = [mockPreset];
    mockConfigurationStore.searchPresets.mockReturnValue([mockPreset]);
    
    // Mock window.prompt
    const originalPrompt = window.prompt;
    window.prompt = vi.fn().mockReturnValue('New Name');
    
    render(<PresetManager />);
    
    fireEvent.click(screen.getByText('Load Preset'));
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    
    expect(window.prompt).toHaveBeenCalledWith('Enter new preset name:', 'Old Name');
    expect(mockConfigurationStore.renamePreset).toHaveBeenCalledWith('preset-1', 'New Name');
    
    // Restore original prompt
    window.prompt = originalPrompt;
  });

  it('should duplicate preset', () => {
    const mockPreset = {
      id: 'preset-1',
      name: 'Original',
      config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockConfigurationStore.presets = [mockPreset];
    mockConfigurationStore.searchPresets.mockReturnValue([mockPreset]);
    
    // Mock window.prompt
    const originalPrompt = window.prompt;
    window.prompt = vi.fn().mockReturnValue('Copy of Original');
    
    render(<PresetManager />);
    
    fireEvent.click(screen.getByText('Load Preset'));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    
    expect(window.prompt).toHaveBeenCalledWith('Enter name for duplicated preset:', 'Original (Copy)');
    expect(mockConfigurationStore.duplicatePreset).toHaveBeenCalledWith('preset-1', 'Copy of Original');
    
    // Restore original prompt
    window.prompt = originalPrompt;
  });

  it('should display active preset', () => {
    mockConfigurationStore.activePresetId = 'preset-1';
    mockConfigurationStore.presets = [
      {
        id: 'preset-1',
        name: 'Active Preset',
        config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    render(<PresetManager />);
    
    expect(screen.getByText('Active Preset: Active Preset')).toBeInTheDocument();
  });

  it('should display configuration error', () => {
    mockConfigurationStore.configurationError = {
      type: 'configuration',
      message: 'Test error message',
      timestamp: new Date(),
    };
    
    render(<PresetManager />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    
    // Test error dismissal
    fireEvent.click(screen.getByText('×'));
    expect(mockConfigurationStore.clearConfigurationError).toHaveBeenCalled();
  });

  it('should show empty state when no presets exist', () => {
    mockConfigurationStore.presets = [];
    mockConfigurationStore.searchPresets.mockReturnValue([]);
    
    render(<PresetManager />);
    
    fireEvent.click(screen.getByText('Load Preset'));
    
    expect(screen.getByText('No presets saved yet.')).toBeInTheDocument();
  });

  it('should show no results message when search returns empty', () => {
    mockConfigurationStore.presets = [
      {
        id: 'preset-1',
        name: 'Test Preset',
        config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockConfigurationStore.searchPresets.mockReturnValue([]);
    
    render(<PresetManager />);
    
    fireEvent.click(screen.getByText('Load Preset'));
    fireEvent.change(screen.getByPlaceholderText('Search presets...'), {
      target: { value: 'nonexistent' }
    });
    
    expect(screen.getByText('No presets match your search.')).toBeInTheDocument();
  });
});