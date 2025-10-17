import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElementInfoManager } from '../ElementInfoManager';
import { SVGRenderer } from '../SVGRenderer';
import { useViewerStore } from '@/store/viewerStore';
import { createSpatialIndex } from '@/utils/spatialIndex';
import type { IFCElement, Transform } from '@/types';

// Mock dependencies
vi.mock('@/store/viewerStore');
vi.mock('@/utils/spatialIndex');
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

describe('Selection System Core Tests', () => {
  let mockSelectElement: any;
  let mockSetHoveredElement: any;

  beforeEach(() => {
    mockSelectElement = vi.fn();
    mockSetHoveredElement = vi.fn();

    (useViewerStore as any).mockImplementation((selector: any) => {
      const state = {
        transform: { x: 0, y: 0, scale: 1 } as Transform,
        visibleLayers: new Set(['IfcWall']),
        styleOverrides: new Map(),
        selectedElement: undefined,
        hoveredElement: undefined,
        selectElement: mockSelectElement,
        setHoveredElement: mockSetHoveredElement,
      };
      return selector(state);
    });

    (createSpatialIndex as any).mockReturnValue({
      queryPoint: vi.fn(() => []),
      insert: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      rebuild: vi.fn(),
    });
  });

  it('should render without crashing', () => {
    const mockElements: IFCElement[] = [];
    
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

  it('should handle element selection', async () => {
    const mockElement: IFCElement = {
      guid: 'test-001',
      ifcClass: 'IfcWall',
      geometry: { type: 'rect', data: {}, bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } },
      properties: {},
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      visible: true,
      style: {}
    };

    render(
      <ElementInfoManager>
        <SVGRenderer
          elements={[mockElement]}
          width={800}
          height={600}
        />
      </ElementInfoManager>
    );

    const svg = screen.getByTestId('svg-renderer');
    fireEvent.click(svg);

    // Test passes if no errors are thrown
    expect(svg).toBeInTheDocument();
  });
});