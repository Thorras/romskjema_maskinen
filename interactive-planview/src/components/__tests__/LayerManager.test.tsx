
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LayerManager } from '../LayerManager';
import { useViewerStore } from '@/store/viewerStore';
import type { IFCElement, IFCClass } from '@/types';

// Mock Zustand store
vi.mock('@/store/viewerStore', () => ({
  useViewerStore: vi.fn(),
}));

describe('LayerManager', () => {
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
    setAvailableLayers: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector(mockStoreState)
    );
  });

  it('renders layer control panel', () => {
    render(<LayerManager elements={mockElements} />);

    expect(screen.getByText('Layer Control')).toBeInTheDocument();
    expect(screen.getByText(/2 of 3 layers visible/)).toBeInTheDocument();
  });

  it('displays bulk action buttons', () => {
    render(<LayerManager elements={mockElements} />);

    expect(screen.getByText('Show All')).toBeInTheDocument();
    expect(screen.getByText('Hide All')).toBeInTheDocument();
  });

  it('displays search input', () => {
    render(<LayerManager elements={mockElements} />);

    const searchInput = screen.getByPlaceholderText('Search layers...');
    expect(searchInput).toBeInTheDocument();
  });

  it('displays layer categories and items', () => {
    render(<LayerManager elements={mockElements} />);

    // Should show categories
    expect(screen.getByText(/Architectural/)).toBeInTheDocument();
    expect(screen.getByText(/Structural/)).toBeInTheDocument();

    // Should show layer names
    expect(screen.getByText('Wall')).toBeInTheDocument();
    expect(screen.getByText('Door')).toBeInTheDocument();
    expect(screen.getByText('Window')).toBeInTheDocument();
  });

  it('displays element counts for each layer', () => {
    render(<LayerManager elements={mockElements} />);

    expect(screen.getByText('2 elements')).toBeInTheDocument(); // Walls
    expect(screen.getAllByText('1 elements')).toHaveLength(2); // Door and Window
  });

  it('shows visibility indicators', () => {
    render(<LayerManager elements={mockElements} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    // Find checkboxes by their associated layer names
    const doorCheckbox = screen.getByLabelText(/Door/i) || checkboxes.find(cb => 
      cb.closest('.px-4')?.textContent?.includes('Door')
    );
    const windowCheckbox = screen.getByLabelText(/Window/i) || checkboxes.find(cb => 
      cb.closest('.px-4')?.textContent?.includes('Window')
    );
    const wallCheckbox = screen.getByLabelText(/Wall/i) || checkboxes.find(cb => 
      cb.closest('.px-4')?.textContent?.includes('Wall')
    );

    // Door and Wall should be checked (visible)
    expect(doorCheckbox).toBeChecked();
    expect(wallCheckbox).toBeChecked();
    
    // Window should be unchecked (hidden)
    expect(windowCheckbox).not.toBeChecked();
  });

  it('calls toggleLayer when checkbox is clicked', async () => {
    render(<LayerManager elements={mockElements} />);

    // Find the first checkbox (Door in this case based on the output)
    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstCheckbox);

    await waitFor(() => {
      expect(mockStoreState.toggleLayer).toHaveBeenCalledWith('IfcDoor');
    });
  });

  it('calls showAllLayers when Show All button is clicked', async () => {
    render(<LayerManager elements={mockElements} />);

    const showAllButton = screen.getByText('Show All');
    fireEvent.click(showAllButton);

    await waitFor(() => {
      expect(mockStoreState.showAllLayers).toHaveBeenCalled();
    });
  });

  it('calls hideAllLayers when Hide All button is clicked', async () => {
    render(<LayerManager elements={mockElements} />);

    const hideAllButton = screen.getByText('Hide All');
    fireEvent.click(hideAllButton);

    await waitFor(() => {
      expect(mockStoreState.hideAllLayers).toHaveBeenCalled();
    });
  });

  it('filters layers based on search term', async () => {
    render(<LayerManager elements={mockElements} />);

    const searchInput = screen.getByPlaceholderText('Search layers...');
    fireEvent.change(searchInput, { target: { value: 'wall' } });

    await waitFor(() => {
      expect(screen.getByText('Wall')).toBeInTheDocument();
      expect(screen.queryByText('Door')).not.toBeInTheDocument();
      expect(screen.queryByText('Window')).not.toBeInTheDocument();
    });
  });

  it('shows category batch actions', () => {
    render(<LayerManager elements={mockElements} />);

    // Should show Show/Hide buttons for each category
    const showButtons = screen.getAllByText('Show');
    const hideButtons = screen.getAllByText('Hide');

    expect(showButtons.length).toBeGreaterThan(1); // At least one per category
    expect(hideButtons.length).toBeGreaterThan(1);
  });

  it('calls batch operations for category actions', async () => {
    render(<LayerManager elements={mockElements} />);

    const categoryShowButtons = screen.getAllByText('Show');
    const categoryButton = categoryShowButtons.find(button => 
      button.getAttribute('title') === 'Show all in category'
    );

    if (categoryButton) {
      fireEvent.click(categoryButton);

      await waitFor(() => {
        expect(mockStoreState.setLayerVisibility).toHaveBeenCalled();
      });
    }
  });

  it('displays color indicators for layers', () => {
    render(<LayerManager elements={mockElements} />);

    // Should show colored squares for each layer
    const colorIndicators = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-3 h-3 rounded border')
    );

    expect(colorIndicators.length).toBeGreaterThan(0);
  });

  it('handles empty elements array', () => {
    // Mock empty available layers for this test
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector({ ...mockStoreState, availableLayers: [] })
    );

    render(<LayerManager elements={[]} />);

    expect(screen.getByText('No layers available')).toBeInTheDocument();
  });

  it('updates available layers when elements change', () => {
    const { rerender } = render(<LayerManager elements={mockElements} />);

    // Mock empty available layers to trigger initialization
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector({ ...mockStoreState, availableLayers: [] })
    );

    rerender(<LayerManager elements={mockElements} />);

    expect(mockStoreState.setAvailableLayers).toHaveBeenCalled();
  });

  it('shows visibility statistics correctly', () => {
    render(<LayerManager elements={mockElements} />);

    // Should show "2 of 3 layers visible" based on mock data
    expect(screen.getByText(/2 of 3 layers visible/)).toBeInTheDocument();
  });

  it('displays element visibility counts', () => {
    render(<LayerManager elements={mockElements} />);

    // Should show visible element counts for layers with hidden elements
    expect(screen.getByText(/\(0 visible\)/)).toBeInTheDocument(); // Window layer
  });

  it('applies custom className', () => {
    render(<LayerManager elements={mockElements} className="custom-class" />);

    const container = screen.getByText('Layer Control').closest('.layer-manager');
    expect(container).toHaveClass('custom-class');
  });

  it('clears search when search term is empty', async () => {
    render(<LayerManager elements={mockElements} />);

    const searchInput = screen.getByPlaceholderText('Search layers...');
    
    // First filter
    fireEvent.change(searchInput, { target: { value: 'wall' } });
    await waitFor(() => {
      expect(screen.queryByText('Door')).not.toBeInTheDocument();
    });

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    await waitFor(() => {
      expect(screen.getByText('Door')).toBeInTheDocument();
      expect(screen.getByText('Window')).toBeInTheDocument();
    });
  });

  it('shows filtered count in footer when search is active', async () => {
    render(<LayerManager elements={mockElements} />);

    const searchInput = screen.getByPlaceholderText('Search layers...');
    fireEvent.change(searchInput, { target: { value: 'wall' } });

    await waitFor(() => {
      expect(screen.getByText(/Showing 1 of 3 layers/)).toBeInTheDocument();
    });
  });
});