import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetPanel } from '../PresetPanel';
import { useConfigurationStore } from '@/store/configurationStore';
import { useViewerStore } from '@/store/viewerStore';

// Mock the stores
vi.mock('@/store/configurationStore');
vi.mock('@/store/viewerStore');

const mockConfigurationStore = {
  presets: [],
  activePresetId: null,
  savePreset: vi.fn(),
  applyPreset: vi.fn(),
  deletePreset: vi.fn(),
};

const mockViewerStore = {
  visibleLayers: new Set(['Wall', 'Door']),
  styleOverrides: new Map([['Wall', { fill: '#ff0000' }]]),
  transform: { x: 10, y: 20, scale: 1.5 },
};

describe('PresetPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useConfigurationStore as any).mockReturnValue(mockConfigurationStore);
    (useViewerStore as any).mockReturnValue(mockViewerStore);
    
    // Reset mock store state
    mockConfigurationStore.presets = [];
    mockConfigurationStore.activePresetId = null;
  });

  it('should render collapsed by default', () => {
    render(<PresetPanel />);
    
    expect(screen.getByText('Configuration Presets')).toBeInTheDocument();
    expect(screen.getByText('0 saved')).toBeInTheDocument();
    expect(screen.queryByText('Quick Save Current State')).not.toBeInTheDocument();
  });

  it('should expand when clicked', () => {
    render(<PresetPanel />);
    
    fireEvent.click(screen.getByText('Configuration Presets'));
    
    expect(screen.getByText('Quick Save Current State')).toBeInTheDocument();
  });

  it('should show preset count', () => {
    mockConfigurationStore.presets = [
      {
        id: 'preset-1',
        name: 'Test Preset 1',
        config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'preset-2',
        name: 'Test Preset 2',
        config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    render(<PresetPanel />);
    
    expect(screen.getByText('2 saved')).toBeInTheDocument();
  });

  it('should perform quick save', () => {
    render(<PresetPanel />);
    
    fireEvent.click(screen.getByText('Configuration Presets'));
    fireEvent.click(screen.getByText('Quick Save Current State'));
    
    // Check that savePreset was called with the right structure
    expect(mockConfigurationStore.savePreset).toHaveBeenCalledWith(
      expect.stringMatching(/^Quick Save .+/),
      'Auto-saved configuration',
      {
        visibleLayers: ['Wall', 'Door'],
        styleOverrides: { Wall: { fill: '#ff0000' } },
        transform: { x: 10, y: 20, scale: 1.5 },
      }
    );
  });

  it('should display presets when expanded', () => {
    mockConfigurationStore.presets = [
      {
        id: 'preset-1',
        name: 'Test Preset',
        config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      },
    ];
    
    render(<PresetPanel />);
    
    fireEvent.click(screen.getByText('Configuration Presets'));
    
    expect(screen.getByText('Test Preset')).toBeInTheDocument();
    // Use a more flexible date matcher since different locales format dates differently
    expect(screen.getByText(/2023/)).toBeInTheDocument();
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
    
    render(<PresetPanel />);
    
    fireEvent.click(screen.getByText('Configuration Presets'));
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    
    expect(mockConfigurationStore.applyPreset).toHaveBeenCalledWith('preset-1');
    expect(mockSetVisibleLayers).toHaveBeenCalledWith(new Set(['Wall']));
    expect(mockClearAllStyleOverrides).toHaveBeenCalled();
    expect(mockSetElementStyle).toHaveBeenCalledWith('Wall', { fill: '#blue' });
    expect(mockSetTransform).toHaveBeenCalledWith({ x: 5, y: 10, scale: 2 });
  });

  it('should delete preset when delete button is clicked', () => {
    mockConfigurationStore.presets = [
      {
        id: 'preset-1',
        name: 'Test Preset',
        config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    render(<PresetPanel />);
    
    fireEvent.click(screen.getByText('Configuration Presets'));
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    
    expect(mockConfigurationStore.deletePreset).toHaveBeenCalledWith('preset-1');
  });

  it('should highlight active preset', () => {
    mockConfigurationStore.activePresetId = 'preset-1';
    mockConfigurationStore.presets = [
      {
        id: 'preset-1',
        name: 'Active Preset',
        config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'preset-2',
        name: 'Inactive Preset',
        config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    render(<PresetPanel />);
    
    fireEvent.click(screen.getByText('Configuration Presets'));
    
    // Find the preset container divs (the ones with the styling classes)
    const activePresetContainer = screen.getByText('Active Preset').closest('.flex.items-center.justify-between');
    const inactivePresetContainer = screen.getByText('Inactive Preset').closest('.flex.items-center.justify-between');
    
    expect(activePresetContainer).toHaveClass('bg-blue-50', 'border-blue-200');
    expect(inactivePresetContainer).not.toHaveClass('bg-blue-50', 'border-blue-200');
  });

  it('should show empty state when no presets exist', () => {
    mockConfigurationStore.presets = [];
    
    render(<PresetPanel />);
    
    fireEvent.click(screen.getByText('Configuration Presets'));
    
    expect(screen.getByText('No presets saved yet')).toBeInTheDocument();
  });

  it('should limit displayed presets to 10', () => {
    // Create 15 presets
    const presets = Array.from({ length: 15 }, (_, i) => ({
      id: `preset-${i}`,
      name: `Preset ${i}`,
      config: { visibleLayers: [], styleOverrides: {}, transform: { x: 0, y: 0, scale: 1 } },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    mockConfigurationStore.presets = presets;
    
    render(<PresetPanel />);
    
    fireEvent.click(screen.getByText('Configuration Presets'));
    
    // Should show first 10 presets
    expect(screen.getByText('Preset 0')).toBeInTheDocument();
    expect(screen.getByText('Preset 9')).toBeInTheDocument();
    
    // Should show "and X more" message
    expect(screen.getByText('... and 5 more')).toBeInTheDocument();
    
    // Should not show preset 10 and beyond
    expect(screen.queryByText('Preset 10')).not.toBeInTheDocument();
  });

  it('should toggle expansion state', () => {
    render(<PresetPanel />);
    
    // Initially collapsed
    expect(screen.queryByText('Quick Save Current State')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(screen.getByText('Configuration Presets'));
    expect(screen.getByText('Quick Save Current State')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(screen.getByText('Configuration Presets'));
    expect(screen.queryByText('Quick Save Current State')).not.toBeInTheDocument();
  });

  it('should rotate chevron icon based on expansion state', () => {
    render(<PresetPanel />);
    
    // Find the SVG element by its class
    const chevron = document.querySelector('svg.w-4.h-4.text-gray-400.transition-transform');
    
    // Initially not rotated
    expect(chevron).not.toHaveClass('rotate-180');
    
    // Click to expand
    fireEvent.click(screen.getByText('Configuration Presets'));
    expect(chevron).toHaveClass('rotate-180');
    
    // Click to collapse
    fireEvent.click(screen.getByText('Configuration Presets'));
    expect(chevron).not.toHaveClass('rotate-180');
  });
});