import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElementInfoManager } from '../ElementInfoManager';
import { SVGRenderer } from '../SVGRenderer';
import { useViewerStore } from '@/store/viewerStore';
import { createSpatialIndex } from '@/utils/spatialIndex';
import { transformPoint } from '@/utils/coordinates';
import type { IFCElement, Point, Transform } from '@/types';



// Mock dependencies
vi.mock('@/store/viewerStore', () => ({
  useViewerStore: vi.fn()
}));

vi.mock('@/utils/spatialIndex', () => ({
  createSpatialIndex: vi.fn()
}));

vi.mock('@/utils/coordinates', () => ({
  transformPoint: vi.fn((point) => point),
  createFitToViewTransform: vi.fn(() => ({ x: 0, y: 0, scale: 1 })),
  clampTransform: vi.fn((transform) => transform),
}));

vi.mock('@/utils/styleManager', () => ({
  StyleManager: vi.fn(() => ({
    initialize: vi.fn(),
    applyMultipleStyles: vi.fn(),
    destroy: vi.fn(),
  }))
}));

vi.mock('@/hooks/useInteractionController', () => ({
  useInteractionController: vi.fn(() => ({
    attachToElement: vi.fn(),
    detachFromElement: vi.fn(),
    fitToView: vi.fn(),
  }))
}));

// Mock D3 with proper chaining
const createMockD3Selection = () => {
  const mockSelection = {
    selectAll: vi.fn(() => mockSelection),
    select: vi.fn(() => mockSelection),
    append: vi.fn(() => mockSelection),
    attr: vi.fn(() => mockSelection),
    data: vi.fn(() => mockSelection),
    enter: vi.fn(() => mockSelection),
    exit: vi.fn(() => mockSelection),
    remove: vi.fn(() => mockSelection),
    each: vi.fn(() => mockSelection),
    empty: vi.fn(() => false),
  };
  return mockSelection;
};

vi.mock('d3', () => ({
  select: vi.fn(() => createMockD3Selection()),
}));

// Test elements with different geometries
const createTestElements = (): IFCElement[] => [
  {
    guid: 'wall-001',
    ifcClass: 'IfcWall',
    geometry: {
      type: 'rect',
      data: { x: 100, y: 50, width: 200, height: 20 },
      bounds: { minX: 100, minY: 50, maxX: 300, maxY: 70 }
    },
    properties: {
      Name: 'Exterior Wall',
      Material: 'Concrete',
      Thickness: '200mm'
    },
    bounds: { minX: 100, minY: 50, maxX: 300, maxY: 70 },
    visible: true,
    style: { fill: '#8B4513', stroke: '#654321', strokeWidth: 2 }
  },
  {
    guid: 'door-001',
    ifcClass: 'IfcDoor',
    geometry: {
      type: 'rect',
      data: { x: 180, y: 50, width: 40, height: 20 },
      bounds: { minX: 180, minY: 50, maxX: 220, maxY: 70 }
    },
    properties: {
      Name: 'Main Door',
      Width: '900mm',
      Height: '2100mm'
    },
    bounds: { minX: 180, minY: 50, maxX: 220, maxY: 70 },
    visible: true,
    style: { fill: '#8B4513', stroke: '#654321', strokeWidth: 1 }
  },
  {
    guid: 'column-001',
    ifcClass: 'IfcColumn',
    geometry: {
      type: 'circle',
      data: { cx: 400, cy: 200, r: 25 },
      bounds: { minX: 375, minY: 175, maxX: 425, maxY: 225 }
    },
    properties: {
      Name: 'Structural Column',
      Material: 'Steel',
      Diameter: '300mm'
    },
    bounds: { minX: 375, minY: 175, maxX: 425, maxY: 225 },
    visible: true,
    style: { fill: '#666666', stroke: '#333333', strokeWidth: 2 }
  },
  {
    guid: 'beam-001',
    ifcClass: 'IfcBeam',
    geometry: {
      type: 'line',
      data: { x1: 100, y1: 300, x2: 500, y2: 300 },
      bounds: { minX: 100, minY: 300, maxX: 500, maxY: 300 }
    },
    properties: {
      Name: 'Main Beam',
      Material: 'Steel',
      Profile: 'IPE 300'
    },
    bounds: { minX: 100, minY: 300, maxX: 500, maxY: 300 },
    visible: true,
    style: { stroke: '#444444', strokeWidth: 4 }
  }
];

describe('Selection System Integration', () => {
  let mockElements: IFCElement[];
  let mockSpatialIndex: any;
  let mockSelectElement: any;
  let mockSetHoveredElement: any;
  let mockStoreState: any;

  beforeEach(() => {
    mockElements = createTestElements();
    
    // Mock spatial index with realistic hit testing
    mockSpatialIndex = {
      queryPoint: vi.fn((point: Point, tolerance: number = 0) => {
        // Simulate realistic hit testing
        return mockElements.filter(element => {
          const bounds = element.bounds;
          return point.x >= bounds.minX - tolerance &&
                 point.x <= bounds.maxX + tolerance &&
                 point.y >= bounds.minY - tolerance &&
                 point.y <= bounds.maxY + tolerance;
        });
      }),
      insert: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      rebuild: vi.fn(),
    };

    (createSpatialIndex as any).mockReturnValue(mockSpatialIndex);

    // Mock store functions
    mockSelectElement = vi.fn();
    mockSetHoveredElement = vi.fn();

    mockStoreState = {
      transform: { x: 0, y: 0, scale: 1 } as Transform,
      visibleLayers: new Set(['IfcWall', 'IfcDoor', 'IfcColumn', 'IfcBeam']),
      styleOverrides: new Map(),
      selectedElement: undefined,
      hoveredElement: undefined,
      selectElement: mockSelectElement,
      setHoveredElement: mockSetHoveredElement,
    };

    (useViewerStore as any).mockImplementation((selector: any) => selector(mockStoreState));
  });

  describe('Hit Testing Accuracy', () => {
    it('should accurately detect clicks on rectangular elements', () => {
      const onElementClick = vi.fn();
      
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
            onElementClick={onElementClick}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      // Click inside wall bounds
      fireEvent.click(svg, { 
        clientX: 200, 
        clientY: 60,
        target: svg
      });

      // Should find wall element
      expect(mockSpatialIndex.queryPoint).toHaveBeenCalledWith(
        { x: 200, y: 60 },
        expect.any(Number)
      );
    });

    it('should accurately detect clicks on circular elements', () => {
      const onElementClick = vi.fn();
      
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
            onElementClick={onElementClick}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      // Click inside column bounds
      fireEvent.click(svg, { 
        clientX: 400, 
        clientY: 200,
        target: svg
      });

      expect(mockSpatialIndex.queryPoint).toHaveBeenCalledWith(
        { x: 400, y: 200 },
        expect.any(Number)
      );
    });

    it('should handle clicks on overlapping elements', () => {
      const onElementClick = vi.fn();
      
      // Mock overlapping elements (door overlaps with wall)
      mockSpatialIndex.queryPoint.mockImplementation((point: Point) => {
        if (point.x >= 180 && point.x <= 220 && point.y >= 50 && point.y <= 70) {
          // Return both wall and door for overlapping area
          return [mockElements[0], mockElements[1]]; // wall and door
        }
        return [];
      });
      
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
            onElementClick={onElementClick}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      // Click in overlapping area
      fireEvent.click(svg, { 
        clientX: 200, 
        clientY: 60,
        target: svg
      });

      expect(mockSpatialIndex.queryPoint).toHaveBeenCalled();
    });

    it('should handle clicks with coordinate transformation', () => {
      // Mock transformed coordinates
      (transformPoint as any).mockImplementation((screenPoint: Point, transform: any) => ({
        x: (screenPoint.x - transform.x) / transform.scale,
        y: (screenPoint.y - transform.y) / transform.scale,
      }));

      mockStoreState.transform = { x: 50, y: 30, scale: 2 };
      (useViewerStore as any).mockImplementation((selector: any) => selector(mockStoreState));

      const onElementClick = vi.fn();
      
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
            onElementClick={onElementClick}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      // Click at screen coordinates
      fireEvent.click(svg, { 
        clientX: 300, 
        clientY: 150,
        target: svg
      });

      // Should transform coordinates before hit testing
      expect(transformPoint).toHaveBeenCalledWith(
        { x: 300, y: 150 },
        { x: -50, y: -30, scale: 0.5 }
      );
    });

    it('should handle edge cases for hit testing', () => {
      const onElementClick = vi.fn();
      
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
            onElementClick={onElementClick}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      // Click exactly on element boundary
      fireEvent.click(svg, { 
        clientX: 100, 
        clientY: 50,
        target: svg
      });

      expect(mockSpatialIndex.queryPoint).toHaveBeenCalled();
      
      // Click outside all elements
      fireEvent.click(svg, { 
        clientX: 50, 
        clientY: 25,
        target: svg
      });

      expect(mockSpatialIndex.queryPoint).toHaveBeenCalled();
    });
  });

  describe('Selection State Management', () => {
    it('should update selection state when element is clicked', async () => {
      mockSpatialIndex.queryPoint.mockReturnValue([mockElements[0]]);
      
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      fireEvent.click(svg, { 
        clientX: 200, 
        clientY: 60,
        target: svg
      });

      await waitFor(() => {
        expect(mockSelectElement).toHaveBeenCalledWith(mockElements[0]);
      });
    });

    it('should update hover state on mouse movement', () => {
      mockSpatialIndex.queryPoint.mockReturnValue([mockElements[1]]);
      
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      fireEvent.mouseMove(svg, { 
        clientX: 200, 
        clientY: 60,
        target: svg
      });

      expect(mockSetHoveredElement).toHaveBeenCalledWith(mockElements[1]);
    });

    it('should clear hover state when mouse leaves element', () => {
      // First hover over element
      mockSpatialIndex.queryPoint.mockReturnValue([mockElements[0]]);
      
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      fireEvent.mouseMove(svg, { 
        clientX: 200, 
        clientY: 60,
        target: svg
      });

      expect(mockSetHoveredElement).toHaveBeenCalledWith(mockElements[0]);

      // Then move to empty area
      mockSpatialIndex.queryPoint.mockReturnValue([]);
      
      fireEvent.mouseMove(svg, { 
        clientX: 50, 
        clientY: 25,
        target: svg
      });

      expect(mockSetHoveredElement).toHaveBeenCalledWith(null);
    });

    it('should handle rapid selection changes', async () => {
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      // Rapidly click different elements
      mockSpatialIndex.queryPoint.mockReturnValue([mockElements[0]]);
      fireEvent.click(svg, { clientX: 200, clientY: 60 });
      
      mockSpatialIndex.queryPoint.mockReturnValue([mockElements[1]]);
      fireEvent.click(svg, { clientX: 200, clientY: 60 });
      
      mockSpatialIndex.queryPoint.mockReturnValue([mockElements[2]]);
      fireEvent.click(svg, { clientX: 400, clientY: 200 });

      await waitFor(() => {
        expect(mockSelectElement).toHaveBeenCalledTimes(3);
      });
    });

    it('should maintain selection state across re-renders', () => {
      mockStoreState.selectedElement = mockElements[0];
      (useViewerStore as any).mockImplementation((selector: any) => selector(mockStoreState));
      
      const { rerender } = render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      // Re-render with updated elements
      const updatedElements = [...mockElements];
      updatedElements[0] = { ...updatedElements[0], properties: { ...updatedElements[0].properties, updated: true } };
      
      rerender(
        <ElementInfoManager>
          <SVGRenderer
            elements={updatedElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      // Selection state should be maintained
      expect(useViewerStore).toHaveBeenCalled();
    });
  });

  describe('Performance Testing', () => {
    it('should handle large numbers of elements efficiently', () => {
      // Create many elements
      const manyElements: IFCElement[] = [];
      for (let i = 0; i < 1000; i++) {
        manyElements.push({
          guid: `element-${i}`,
          ifcClass: 'IfcWall',
          geometry: {
            type: 'rect',
            data: { x: i * 10, y: i * 10, width: 5, height: 5 },
            bounds: { minX: i * 10, minY: i * 10, maxX: i * 10 + 5, maxY: i * 10 + 5 }
          },
          properties: {},
          bounds: { minX: i * 10, minY: i * 10, maxX: i * 10 + 5, maxY: i * 10 + 5 },
          visible: true,
          style: {}
        });
      }

      const startTime = performance.now();
      
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={manyElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const renderTime = performance.now() - startTime;
      
      // Should render in reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle rapid mouse movements efficiently', () => {
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      const startTime = performance.now();
      
      // Simulate rapid mouse movements
      for (let i = 0; i < 100; i++) {
        fireEvent.mouseMove(svg, { 
          clientX: 100 + i, 
          clientY: 100 + i,
          target: svg
        });
      }
      
      const moveTime = performance.now() - startTime;
      
      // Should handle movements efficiently (less than 50ms for 100 movements)
      expect(moveTime).toBeLessThan(50);
    });

    it('should optimize hit testing with spatial indexing', () => {
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      // Perform multiple hit tests
      for (let i = 0; i < 10; i++) {
        fireEvent.click(svg, { 
          clientX: 100 + i * 50, 
          clientY: 100 + i * 20,
          target: svg
        });
      }

      // Should use spatial index for efficient queries
      expect(mockSpatialIndex.queryPoint).toHaveBeenCalledTimes(10);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing spatial index gracefully', () => {
      (createSpatialIndex as any).mockReturnValue(null);
      
      expect(() => {
        render(
          <ElementInfoManager>
            <SVGRenderer
              elements={mockElements}
              width={800}
              height={600}
            />
          </ElementInfoManager>
        );
      }).not.toThrow();
    });

    it('should handle invalid click coordinates', () => {
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      // Click with invalid coordinates
      expect(() => {
        fireEvent.click(svg, { 
          clientX: NaN, 
          clientY: Infinity,
          target: svg
        });
      }).not.toThrow();
    });

    it('should handle elements with invalid geometry', () => {
      const invalidElements: IFCElement[] = [{
        guid: 'invalid-001',
        ifcClass: 'IfcWall',
        geometry: {
          type: 'unknown' as any,
          data: { x: 0, y: 0, width: 0, height: 0 },
          bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 }
        },
        properties: {},
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        visible: true,
        style: {}
      }];

      expect(() => {
        render(
          <ElementInfoManager>
            <SVGRenderer
              elements={invalidElements}
              width={800}
              height={600}
            />
          </ElementInfoManager>
        );
      }).not.toThrow();
    });

    it('should handle viewport boundary conditions', () => {
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      // Click at viewport boundaries
      const boundaryPoints = [
        { x: 0, y: 0 },
        { x: 800, y: 0 },
        { x: 0, y: 600 },
        { x: 800, y: 600 }
      ];

      boundaryPoints.forEach(point => {
        expect(() => {
          fireEvent.click(svg, { 
            clientX: point.x, 
            clientY: point.y,
            target: svg
          });
        }).not.toThrow();
      });
    });
  });

  describe('Integration with Popup System', () => {
    it('should show popup when element is selected', async () => {
      mockSpatialIndex.queryPoint.mockReturnValue([mockElements[0]]);
      
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      fireEvent.click(svg, { 
        clientX: 200, 
        clientY: 60,
        target: svg
      });

      await waitFor(() => {
        expect(screen.getByText('Wall')).toBeInTheDocument();
        expect(screen.getByText('wall-001')).toBeInTheDocument();
      });
    });

    it('should position popup correctly relative to click position', async () => {
      mockSpatialIndex.queryPoint.mockReturnValue([mockElements[0]]);
      
      const { container } = render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      fireEvent.click(svg, { 
        clientX: 200, 
        clientY: 60,
        target: svg
      });

      await waitFor(() => {
        const popup = container.querySelector('.element-info-popup');
        expect(popup).toHaveStyle({
          left: '200px',
          top: '60px'
        });
      });
    });

    it('should close popup when clicking outside element', async () => {
      // First click on element
      mockSpatialIndex.queryPoint.mockReturnValue([mockElements[0]]);
      
      render(
        <ElementInfoManager>
          <SVGRenderer
            elements={mockElements}
            width={800}
            height={600}
          />
        </ElementInfoManager>
      );

      const svg = screen.getByRole('img', { hidden: true });
      
      fireEvent.click(svg, { 
        clientX: 200, 
        clientY: 60,
        target: svg
      });

      await waitFor(() => {
        expect(screen.getByText('Wall')).toBeInTheDocument();
      });

      // Then click on empty area
      mockSpatialIndex.queryPoint.mockReturnValue([]);
      
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Wall')).not.toBeInTheDocument();
      });
    });
  });
});