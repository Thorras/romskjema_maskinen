import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LayerControlPanel } from '../LayerControlPanel';
import { useViewerStore } from '@/store/viewerStore';
import { useLayerControlIntegration } from '@/hooks/useLayerControlIntegration';
import type { IFCElement, IFCClass } from '@/types';

// Mock Zustand store
vi.mock('@/store/viewerStore', () => ({
  useViewerStore: vi.fn(),
}));

// Mock layer control integration hook
vi.mock('@/hooks/useLayerControlIntegration', () => ({
  useLayerControlIntegration: vi.fn(),
}));

// Mock IFC utilities
vi.mock('@/utils/ifcClasses', () => ({
  searchIFCClasses: vi.fn((classes: IFCClass[], term: string) => 
    term ? classes.filter((c: IFCClass) => 
      c.displayName.toLowerCase().includes(term.toLowerCase())
    ) : classes
  ),
  sortIFCClasses: vi.fn((classes: IFCClass[]) => [...classes]),
}));

describe('LayerControlPanel', () => {
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
      visible: false,
      style: { fill: '#87CEEB', stroke: '#000000', strokeWidth: 1 },
    },
  ];

  const mockAvailableLayers: IFCClass[] = [
    {
      name: 'IfcWall',
      displayName: 'Walls',
      count: 1,
      visible: true,
      style: { fill: '#cccccc', stroke: '#000000', strokeWidth: 1 },
    },
    {
      name: 'IfcDoor',
      displayName: 'Doors',
      count: 1,
      visible: true,
      style: { fill: '#8B4513', stroke: '#000000', strokeWidth: 1 },
    },
    {
      name: 'IfcWindow',
      displayName: 'Windows',
      count: 1,
      visible: false,
      style: { fill: '#87CEEB', stroke: '#000000', strokeWidth: 1 },
    },
  ];

  const mockVisibleLayers = new Set(['IfcWall', 'IfcDoor']);

  const mockStoreState = {
    elements: new Map(mockElements.map(el => [el.guid, el])),
    isLoading: false,
    error: null,
  };

  const mockLayerIntegration = {
    availableLayers: mockAvailableLayers,
    visibleLayers: mockVisibleLayers,
    toggleLayer: vi.fn(),
    showAllLayers: vi.fn(),
    hideAllLayers: vi.fn(),
    setLayerVisibility: vi.fn(),
    getRenderingStats: vi.fn(() => ({
      layers: { total: 3, visible: 2, hidden: 1 },
      elements: { total: 3, visible: 2, hidden: 1 },
      rendering: { renderingEfficiency: 66.7 },
    })),
    getIntegrationHealth: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector(mockStoreState)
    );
    
    (useLayerControlIntegration as any).mockReturnValue(mockLayerIntegration);
  });

  it('renders layer control panel with correct title', () => {
    render(<LayerControlPanel />);
    expect(screen.getByText('Layer Control')).toBeInTheDocument();
  });

  it('displays layer statistics correctly', () => {
    render(<LayerControlPanel />);
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('2 visible')).toBeInTheDocument();
    expect(screen.getByText('1 hidden')).toBeInTheDocument();
  });

  it('renders all available layers with checkboxes', () => {
    render(<LayerControlPanel />);
    expect(screen.getByText('Walls')).toBeInTheDocument();
    expect(screen.getByText('Doors')).toBeInTheDocument();
    expect(screen.getByText('Windows')).toBeInTheDocument();
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
  });

  it('shows correct checkbox states based on layer visibility', () => {
    render(<LayerControlPanel />);
    
    const wallCheckbox = screen.getByLabelText('Toggle visibility for Walls');
    const doorCheckbox = screen.getByLabelText('Toggle visibility for Doors');
    const windowCheckbox = screen.getByLabelText('Toggle visibility for Windows');
    
    expect(wallCheckbox).toBeChecked();
    expect(doorCheckbox).toBeChecked();
    expect(windowCheckbox).not.toBeChecked();
  });

  it('calls toggleLayer when checkbox is clicked', () => {
    render(<LayerControlPanel />);
    
    const wallCheckbox = screen.getByLabelText('Toggle visibility for Walls');
    act(() => {
      fireEvent.click(wallCheckbox);
    });
    
    expect(mockLayerIntegration.toggleLayer).toHaveBeenCalledWith('IfcWall');
  });

  it('calls showAllLayers when Show All button is clicked', () => {
    render(<LayerControlPanel />);
    
    const showAllButton = screen.getByText('Show All');
    act(() => {
      fireEvent.click(showAllButton);
    });
    
    expect(mockLayerIntegration.showAllLayers).toHaveBeenCalled();
  });

  it('calls hideAllLayers when Hide All button is clicked', () => {
    render(<LayerControlPanel />);
    
    const hideAllButton = screen.getByText('Hide All');
    act(() => {
      fireEvent.click(hideAllButton);
    });
    
    expect(mockLayerIntegration.hideAllLayers).toHaveBeenCalled();
  });

  it('filters layers based on search input', async () => {
    render(<LayerControlPanel />);
    
    const searchInput = screen.getByPlaceholderText('Search layers...');
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'wall' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Walls')).toBeInTheDocument();
    });
  });

  it('shows clear search button when search term is entered', () => {
    render(<LayerControlPanel />);
    
    const searchInput = screen.getByPlaceholderText('Search layers...');
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'wall' } });
    });
    
    const clearButton = searchInput.parentElement?.querySelector('button');
    expect(clearButton).toBeInTheDocument();
  });

  it('clears search when clear button is clicked', () => {
    render(<LayerControlPanel />);
    
    const searchInput = screen.getByPlaceholderText('Search layers...');
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'wall' } });
    });
    
    const clearButton = searchInput.parentElement?.querySelector('button');
    act(() => {
      fireEvent.click(clearButton!);
    });
    
    expect(searchInput).toHaveValue('');
  });

  it('displays loading state correctly', () => {
    const loadingStoreState = {
      ...mockStoreState,
      isLoading: true,
    };
    
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector(loadingStoreState)
    );
    
    render(<LayerControlPanel />);
    
    expect(screen.getByText('Loading layers...')).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    const errorStoreState = {
      ...mockStoreState,
      error: {
        type: 'loading' as const,
        message: 'Failed to load layers',
        timestamp: new Date(),
      },
    };
    
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector(errorStoreState)
    );
    
    render(<LayerControlPanel />);
    
    expect(screen.getByText('Error loading layers')).toBeInTheDocument();
    expect(screen.getByText('Failed to load layers')).toBeInTheDocument();
  });

  it('displays empty state when no layers are available', () => {
    const emptyLayerIntegration = {
      ...mockLayerIntegration,
      availableLayers: [],
    };
    
    (useLayerControlIntegration as any).mockReturnValue(emptyLayerIntegration);
    
    render(<LayerControlPanel />);
    
    expect(screen.getByText('No layers available')).toBeInTheDocument();
    expect(screen.getByText('Load a planview to see available IFC classes')).toBeInTheDocument();
  });

  it('shows layer element counts correctly', () => {
    render(<LayerControlPanel />);
    
    // There are multiple layers with "1 elements", so use getAllByText
    const elementCounts = screen.getAllByText('1 elements');
    expect(elementCounts).toHaveLength(3); // One for each layer
  });

  it('applies custom className prop', () => {
    const { container } = render(<LayerControlPanel className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows rendering efficiency when available', () => {
    render(<LayerControlPanel />);
    
    expect(screen.getByText(/66.7% efficiency/)).toBeInTheDocument();
  });
});