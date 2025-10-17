import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLayerVisibility } from '../useLayerVisibility';
import { useViewerStore } from '@/store/viewerStore';
import type { IFCElement, IFCClass } from '@/types';

// Mock Zustand store
vi.mock('@/store/viewerStore', () => ({
  useViewerStore: vi.fn(),
}));

describe('useLayerVisibility', () => {
  const mockElements: IFCElement[] = [
    {
      guid: 'wall-1',
      ifcClass: 'IfcWall',
      geometry: {
        type: 'rect',
        data: { x: 0, y: 0, width: 100, height: 20 },
        bounds: { minX: 0, minY: 0, maxX: 100, maxY: 20 },
      },
      properties: { name: 'Wall 1' },
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 20 },
      visible: true,
      style: { fill: '#cccccc', stroke: '#000000', strokeWidth: 1 },
    },
    {
      guid: 'wall-2',
      ifcClass: 'IfcWall',
      geometry: {
        type: 'rect',
        data: { x: 0, y: 100, width: 100, height: 20 },
        bounds: { minX: 0, minY: 100, maxX: 100, maxY: 120 },
      },
      properties: { name: 'Wall 2' },
      bounds: { minX: 0, minY: 100, maxX: 100, maxY: 120 },
      visible: true,
      style: { fill: '#cccccc', stroke: '#000000', strokeWidth: 1 },
    },
    {
      guid: 'door-1',
      ifcClass: 'IfcDoor',
      geometry: {
        type: 'path',
        data: { d: 'M 10 10 L 20 10 L 20 20 L 10 20 Z' },
        bounds: { minX: 10, minY: 10, maxX: 20, maxY: 20 },
      },
      properties: { name: 'Door 1' },
      bounds: { minX: 10, minY: 10, maxX: 20, maxY: 20 },
      visible: true,
      style: { fill: '#8B4513', stroke: '#000000', strokeWidth: 1 },
    },
    {
      guid: 'window-1',
      ifcClass: 'IfcWindow',
      geometry: {
        type: 'rect',
        data: { x: 50, y: 0, width: 30, height: 5 },
        bounds: { minX: 50, minY: 0, maxX: 80, maxY: 5 },
      },
      properties: { name: 'Window 1' },
      bounds: { minX: 50, minY: 0, maxX: 80, maxY: 5 },
      visible: false, // Hidden element
      style: { fill: '#87CEEB', stroke: '#000000', strokeWidth: 1 },
    },
  ];

  const mockAvailableLayers: IFCClass[] = [
    {
      name: 'IfcWall',
      displayName: 'Wall',
      count: 2,
      visible: true,
      style: { fill: '#cccccc', stroke: '#000000', strokeWidth: 1 },
    },
    {
      name: 'IfcDoor',
      displayName: 'Door',
      count: 1,
      visible: true,
      style: { fill: '#8B4513', stroke: '#000000', strokeWidth: 1 },
    },
    {
      name: 'IfcWindow',
      displayName: 'Window',
      count: 1,
      visible: false,
      style: { fill: '#87CEEB', stroke: '#000000', strokeWidth: 1 },
    },
  ];

  const defaultVisibleLayers = new Set(['IfcWall', 'IfcDoor']);

  const mockStoreState = {
    visibleLayers: defaultVisibleLayers,
    availableLayers: mockAvailableLayers,
    toggleLayer: vi.fn(),
    showAllLayers: vi.fn(),
    hideAllLayers: vi.fn(),
    setLayerVisibility: vi.fn(),
    setVisibleLayers: vi.fn(),
    setAvailableLayers: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector(mockStoreState)
    );
  });

  it('calculates layer statistics correctly', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    expect(result.current.layerStats.get('IfcWall')).toEqual({
      total: 2,
      visible: 2,
      hidden: 0,
      elements: expect.arrayContaining([
        expect.objectContaining({ guid: 'wall-1' }),
        expect.objectContaining({ guid: 'wall-2' }),
      ]),
    });

    expect(result.current.layerStats.get('IfcDoor')).toEqual({
      total: 1,
      visible: 1,
      hidden: 0,
      elements: expect.arrayContaining([
        expect.objectContaining({ guid: 'door-1' }),
      ]),
    });

    expect(result.current.layerStats.get('IfcWindow')).toEqual({
      total: 1,
      visible: 0,
      hidden: 1,
      elements: expect.arrayContaining([
        expect.objectContaining({ guid: 'window-1' }),
      ]),
    });
  });

  it('filters visible elements correctly', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    expect(result.current.visibleElements).toHaveLength(3);
    expect(result.current.visibleElements.map(el => el.guid)).toEqual([
      'wall-1', 'wall-2', 'door-1'
    ]);
  });

  it('filters hidden elements correctly', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    expect(result.current.hiddenElements).toHaveLength(1);
    expect(result.current.hiddenElements[0].guid).toBe('window-1');
  });

  it('calls toggleLayer function', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    act(() => {
      result.current.toggleLayer('IfcWall');
    });

    expect(mockStoreState.toggleLayer).toHaveBeenCalledWith('IfcWall');
  });

  it('calls showAllLayers function', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    act(() => {
      result.current.showAllLayers();
    });

    expect(mockStoreState.showAllLayers).toHaveBeenCalled();
  });

  it('calls hideAllLayers function', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    act(() => {
      result.current.hideAllLayers();
    });

    expect(mockStoreState.hideAllLayers).toHaveBeenCalled();
  });

  it('performs batch toggle operations', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    act(() => {
      result.current.batchToggleLayers(['IfcWall', 'IfcDoor']);
    });

    expect(mockStoreState.setVisibleLayers).toHaveBeenCalledWith(
      new Set() // Should toggle off Wall and Door (both were visible), leaving empty set
    );
  });

  it('performs batch show operations', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    act(() => {
      result.current.batchShowLayers(['IfcWindow']);
    });

    expect(mockStoreState.setVisibleLayers).toHaveBeenCalledWith(
      new Set(['IfcWall', 'IfcDoor', 'IfcWindow'])
    );
  });

  it('performs batch hide operations', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    act(() => {
      result.current.batchHideLayers(['IfcWall', 'IfcDoor']);
    });

    expect(mockStoreState.setVisibleLayers).toHaveBeenCalledWith(
      new Set() // Should hide Wall and Door
    );
  });

  it('shows only specified layers', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    act(() => {
      result.current.showOnlyLayers(['IfcWindow']);
    });

    expect(mockStoreState.setVisibleLayers).toHaveBeenCalledWith(
      new Set(['IfcWindow'])
    );
  });

  it('gets layers by category', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    const structuralLayers = result.current.getLayersByCategory('structural');
    const architecturalLayers = result.current.getLayersByCategory('architectural');

    expect(structuralLayers.map(l => l.name)).toContain('IfcWall');
    expect(architecturalLayers.map(l => l.name)).toEqual(
      expect.arrayContaining(['IfcDoor', 'IfcWindow'])
    );
  });

  it('toggles category visibility', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    act(() => {
      result.current.toggleCategory('architectural');
    });

    // Should call setVisibleLayers to toggle architectural elements
    expect(mockStoreState.setVisibleLayers).toHaveBeenCalled();
  });

  it('filters layers by search term', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    const filteredLayers = result.current.filterLayers('wall');
    expect(filteredLayers.map(l => l.name)).toEqual(['IfcWall']);

    const allLayers = result.current.filterLayers('');
    expect(allLayers).toEqual(mockAvailableLayers);
  });

  it('gets layer status correctly', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    const wallStatus = result.current.getLayerStatus('IfcWall');
    expect(wallStatus).toEqual({
      isVisible: true,
      elementCount: 2,
      visibleElementCount: 2,
      hiddenElementCount: 0,
    });

    const windowStatus = result.current.getLayerStatus('IfcWindow');
    expect(windowStatus).toEqual({
      isVisible: false,
      elementCount: 1,
      visibleElementCount: 0,
      hiddenElementCount: 1,
    });
  });

  it('gets visibility statistics', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    const stats = result.current.getVisibilityStats();
    expect(stats).toEqual({
      layers: {
        total: 3,
        visible: 2, // Wall and Door
        hidden: 1,  // Window
      },
      elements: {
        total: 4,
        visible: 3, // 2 walls + 1 door
        hidden: 1,  // 1 window
      },
    });
  });

  it('initializes layers when available layers is empty', () => {
    // Mock empty available layers
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector({ ...mockStoreState, availableLayers: [], visibleLayers: new Set() })
    );

    const { result } = renderHook(() => useLayerVisibility(mockElements));

    act(() => {
      result.current.initializeLayers();
    });

    expect(mockStoreState.setAvailableLayers).toHaveBeenCalled();
    expect(mockStoreState.showAllLayers).toHaveBeenCalled();
  });

  it('does not initialize layers when already available', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    act(() => {
      result.current.initializeLayers();
    });

    // Should not call setAvailableLayers since layers are already available
    expect(mockStoreState.setAvailableLayers).not.toHaveBeenCalled();
  });

  it('handles empty elements array', () => {
    const { result } = renderHook(() => useLayerVisibility([]));

    expect(result.current.visibleElements).toHaveLength(0);
    expect(result.current.hiddenElements).toHaveLength(0);
    expect(result.current.layerStats.size).toBe(0);
  });

  it('updates when elements change', () => {
    const { result, rerender } = renderHook(
      ({ elements }) => useLayerVisibility(elements),
      { initialProps: { elements: mockElements } }
    );

    expect(result.current.layerStats.size).toBe(3);

    // Update with fewer elements (only walls)
    const newElements = mockElements.filter(el => el.ifcClass === 'IfcWall');
    rerender({ elements: newElements });

    expect(result.current.layerStats.size).toBe(1);
  });

  it('handles layer group toggle correctly', () => {
    const { result } = renderHook(() => useLayerVisibility(mockElements));

    // Create a predicate that matches doors and windows (architectural)
    const architecturalPredicate = (layer: IFCClass) => 
      layer.name === 'IfcDoor' || layer.name === 'IfcWindow';

    act(() => {
      result.current.toggleLayerGroup(architecturalPredicate);
    });

    expect(mockStoreState.setVisibleLayers).toHaveBeenCalled();
  });
});