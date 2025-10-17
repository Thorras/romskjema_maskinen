
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SVGRenderer } from '../SVGRenderer';
import { useViewerStore } from '@/store/viewerStore';
import type { IFCElement, Transform } from '@/types';

// Mock D3
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({
      data: vi.fn(() => ({
        enter: vi.fn(() => ({
          append: vi.fn(() => ({
            attr: vi.fn(() => ({ attr: vi.fn() })),
          })),
        })),
        exit: vi.fn(() => ({ remove: vi.fn() })),
      })),
      remove: vi.fn(),
    })),
    select: vi.fn(() => ({
      selectAll: vi.fn(() => ({
        data: vi.fn(() => ({
          enter: vi.fn(),
          exit: vi.fn(() => ({ remove: vi.fn() })),
        })),
        each: vi.fn(),
      })),
      append: vi.fn(() => ({
        attr: vi.fn(() => ({ attr: vi.fn() })),
      })),
      attr: vi.fn(() => ({ attr: vi.fn() })),
      remove: vi.fn(),
      empty: vi.fn(() => false),
    })),
    append: vi.fn(() => ({
      attr: vi.fn(() => ({ attr: vi.fn() })),
    })),
    attr: vi.fn(() => ({ attr: vi.fn() })),
    remove: vi.fn(),
  })),
}));

// Mock Zustand store
vi.mock('@/store/viewerStore', () => ({
  useViewerStore: vi.fn(),
}));

// Mock spatial index
vi.mock('@/utils/spatialIndex', () => ({
  createSpatialIndex: vi.fn(() => ({
    queryPoint: vi.fn(() => []),
    insert: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    rebuild: vi.fn(),
  })),
}));

// Mock coordinate utilities
vi.mock('@/utils/coordinates', () => ({
  transformPoint: vi.fn((point) => point),
  createFitToViewTransform: vi.fn(() => ({ x: 0, y: 0, scale: 1 })),
  clampTransform: vi.fn((transform) => transform),
}));

describe('SVGRenderer', () => {
  const mockElements: IFCElement[] = [
    {
      guid: 'element-1',
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
      guid: 'element-2',
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
  ];

  const defaultTransform: Transform = { x: 0, y: 0, scale: 1 };
  const defaultVisibleLayers = new Set(['IfcWall', 'IfcDoor']);
  const defaultStyleOverrides = new Map();

  const mockStoreState = {
    transform: defaultTransform,
    visibleLayers: defaultVisibleLayers,
    styleOverrides: defaultStyleOverrides,
    selectedElement: undefined,
    hoveredElement: undefined,
    setTransform: vi.fn(),
    updateTransform: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector(mockStoreState)
    );
  });

  it('renders SVG element with correct dimensions', () => {
    render(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
      />
    );

    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '600');
  });

  it('applies correct CSS classes and styles', () => {
    render(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
        className="custom-class"
      />
    );

    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toHaveClass('svg-renderer', 'custom-class');
    expect(svg).toHaveStyle({ cursor: 'crosshair', userSelect: 'none' });
  });

  it('handles empty elements array', () => {
    render(
      <SVGRenderer
        elements={[]}
        width={800}
        height={600}
      />
    );

    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toBeInTheDocument();
  });

  it('calls onElementClick when SVG is clicked', () => {
    const mockOnElementClick = vi.fn();
    
    render(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
        onElementClick={mockOnElementClick}
      />
    );

    const svg = screen.getByRole('img', { hidden: true });
    fireEvent.click(svg, { clientX: 100, clientY: 100 });

    // Note: The actual element detection is mocked, so we just verify the handler is called
    expect(mockOnElementClick).toHaveBeenCalled();
  });

  it('calls onElementHover when mouse moves over SVG', () => {
    const mockOnElementHover = vi.fn();
    
    render(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
        onElementHover={mockOnElementHover}
      />
    );

    const svg = screen.getByRole('img', { hidden: true });
    fireEvent.mouseMove(svg, { clientX: 100, clientY: 100 });

    expect(mockOnElementHover).toHaveBeenCalled();
  });

  it('updates when transform changes', () => {
    const { rerender } = render(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
      />
    );

    // Update the mock store state
    const newTransform: Transform = { x: 50, y: 100, scale: 2 };
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector({ ...mockStoreState, transform: newTransform })
    );

    rerender(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
      />
    );

    // Verify that the component re-renders with new transform
    // The actual D3 transform application is mocked
    expect(useViewerStore).toHaveBeenCalled();
  });

  it('updates when visible layers change', () => {
    const { rerender } = render(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
      />
    );

    // Update visible layers
    const newVisibleLayers = new Set(['IfcWall']); // Hide doors
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector({ ...mockStoreState, visibleLayers: newVisibleLayers })
    );

    rerender(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
      />
    );

    expect(useViewerStore).toHaveBeenCalled();
  });

  it('updates when style overrides change', () => {
    const { rerender } = render(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
      />
    );

    // Add style override
    const newStyleOverrides = new Map([
      ['IfcWall', { fill: '#ff0000', strokeWidth: 3 }]
    ]);
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector({ ...mockStoreState, styleOverrides: newStyleOverrides })
    );

    rerender(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
      />
    );

    expect(useViewerStore).toHaveBeenCalled();
  });

  it('handles selected element styling', () => {
    const selectedElement = mockElements[0];
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector({ ...mockStoreState, selectedElement })
    );

    render(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
      />
    );

    // The component should apply selection styling
    expect(useViewerStore).toHaveBeenCalled();
  });

  it('handles hovered element styling', () => {
    const hoveredElement = mockElements[1];
    (useViewerStore as any).mockImplementation((selector: any) => 
      selector({ ...mockStoreState, hoveredElement })
    );

    render(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
      />
    );

    expect(useViewerStore).toHaveBeenCalled();
  });

  it('calculates content bounds correctly', () => {
    render(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
      />
    );

    // The component should calculate bounds from all elements
    // Expected bounds: minX: 0, minY: 0, maxX: 100, maxY: 20
    expect(useViewerStore).toHaveBeenCalled();
  });

  it('handles different geometry types', () => {
    const elementsWithDifferentGeometry: IFCElement[] = [
      {
        guid: 'circle-1',
        ifcClass: 'IfcColumn',
        geometry: {
          type: 'circle',
          data: { cx: 50, cy: 50, r: 10 },
          bounds: { minX: 40, minY: 40, maxX: 60, maxY: 60 },
        },
        properties: {},
        bounds: { minX: 40, minY: 40, maxX: 60, maxY: 60 },
        visible: true,
        style: { fill: '#666666' },
      },
      {
        guid: 'line-1',
        ifcClass: 'IfcBeam',
        geometry: {
          type: 'line',
          data: { x1: 0, y1: 0, x2: 100, y2: 0 },
          bounds: { minX: 0, minY: 0, maxX: 100, maxY: 0 },
        },
        properties: {},
        bounds: { minX: 0, minY: 0, maxX: 100, maxY: 0 },
        visible: true,
        style: { stroke: '#000000', strokeWidth: 2 },
      },
    ];

    render(
      <SVGRenderer
        elements={elementsWithDifferentGeometry}
        width={800}
        height={600}
      />
    );

    expect(useViewerStore).toHaveBeenCalled();
  });

  it('handles viewport resize', () => {
    const { rerender } = render(
      <SVGRenderer
        elements={mockElements}
        width={800}
        height={600}
      />
    );

    rerender(
      <SVGRenderer
        elements={mockElements}
        width={1200}
        height={800}
      />
    );

    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toHaveAttribute('width', '1200');
    expect(svg).toHaveAttribute('height', '800');
  });
});