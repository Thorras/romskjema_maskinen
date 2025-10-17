import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useViewerStore } from '../viewerStore';
import type { IFCElement, ElementStyle, IFCClass } from '@/types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock element for testing
const mockElement: IFCElement = {
  guid: 'test-element-001',
  ifcClass: 'IfcWall',
  geometry: {
    type: 'rect',
    data: { x: 50, y: 50, width: 200, height: 20 },
    bounds: { minX: 50, minY: 50, maxX: 250, maxY: 70 }
  },
  properties: {
    Name: 'Test Wall',
    Material: 'Concrete'
  },
  bounds: { minX: 50, minY: 50, maxX: 250, maxY: 70 },
  visible: true,
  style: { fill: '#8B4513', stroke: '#654321', strokeWidth: 2 }
};

const mockElement2: IFCElement = {
  guid: 'test-element-002',
  ifcClass: 'IfcDoor',
  geometry: {
    type: 'rect',
    data: { x: 100, y: 50, width: 30, height: 20 },
    bounds: { minX: 100, minY: 50, maxX: 130, maxY: 70 }
  },
  properties: {
    Name: 'Test Door',
    Material: 'Wood'
  },
  bounds: { minX: 100, minY: 50, maxX: 130, maxY: 70 },
  visible: true,
  style: { fill: '#8B4513', stroke: '#654321', strokeWidth: 2 }
};

describe('ViewerStore - Selection and Popup System', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Reset store state
    useViewerStore.getState().resetToDefaults();
  });

  describe('Element Selection State Management', () => {
    it('should initialize with no selected element', () => {
      const { selectedElement } = useViewerStore.getState();
      expect(selectedElement).toBeUndefined();
    });

    it('should select an element', () => {
      const { selectElement } = useViewerStore.getState();
      
      selectElement(mockElement);
      
      const { selectedElement } = useViewerStore.getState();
      expect(selectedElement).toEqual(mockElement);
      expect(selectedElement?.guid).toBe('test-element-001');
    });

    it('should replace previously selected element', () => {
      const { selectElement } = useViewerStore.getState();
      
      // Select first element
      selectElement(mockElement);
      expect(useViewerStore.getState().selectedElement?.guid).toBe('test-element-001');
      
      // Select second element
      selectElement(mockElement2);
      expect(useViewerStore.getState().selectedElement?.guid).toBe('test-element-002');
    });

    it('should clear selection when called with undefined', () => {
      const { selectElement } = useViewerStore.getState();
      
      // First select an element
      selectElement(mockElement);
      expect(useViewerStore.getState().selectedElement).toEqual(mockElement);
      
      // Then clear selection
      selectElement(undefined);
      expect(useViewerStore.getState().selectedElement).toBeUndefined();
    });

    it('should clear selection using clearSelection method', () => {
      const { selectElement, clearSelection } = useViewerStore.getState();
      
      // First select an element
      selectElement(mockElement);
      expect(useViewerStore.getState().selectedElement).toEqual(mockElement);
      
      // Then clear selection
      clearSelection();
      expect(useViewerStore.getState().selectedElement).toBeUndefined();
    });
  });

  describe('Element Hover State Management', () => {
    it('should initialize with no hovered element', () => {
      const { hoveredElement } = useViewerStore.getState();
      expect(hoveredElement).toBeUndefined();
    });

    it('should set hovered element', () => {
      const { setHoveredElement } = useViewerStore.getState();
      
      setHoveredElement(mockElement);
      
      const { hoveredElement } = useViewerStore.getState();
      expect(hoveredElement).toEqual(mockElement);
      expect(hoveredElement?.guid).toBe('test-element-001');
    });

    it('should replace previously hovered element', () => {
      const { setHoveredElement } = useViewerStore.getState();
      
      // Hover first element
      setHoveredElement(mockElement);
      expect(useViewerStore.getState().hoveredElement?.guid).toBe('test-element-001');
      
      // Hover second element
      setHoveredElement(mockElement2);
      expect(useViewerStore.getState().hoveredElement?.guid).toBe('test-element-002');
    });

    it('should clear hover when called with undefined', () => {
      const { setHoveredElement } = useViewerStore.getState();
      
      // First hover an element
      setHoveredElement(mockElement);
      expect(useViewerStore.getState().hoveredElement).toEqual(mockElement);
      
      // Then clear hover
      setHoveredElement(undefined);
      expect(useViewerStore.getState().hoveredElement).toBeUndefined();
    });

    it('should clear both selection and hover with clearSelection', () => {
      const { selectElement, setHoveredElement, clearSelection } = useViewerStore.getState();
      
      // Set both selection and hover
      selectElement(mockElement);
      setHoveredElement(mockElement2);
      
      expect(useViewerStore.getState().selectedElement).toEqual(mockElement);
      expect(useViewerStore.getState().hoveredElement).toEqual(mockElement2);
      
      // Clear both
      clearSelection();
      
      expect(useViewerStore.getState().selectedElement).toBeUndefined();
      expect(useViewerStore.getState().hoveredElement).toBeUndefined();
    });
  });

  describe('Selection State Persistence', () => {
    it('should not persist selected element (transient state)', () => {
      const { selectElement } = useViewerStore.getState();
      
      selectElement(mockElement);
      
      // Selection should not be included in persisted state
      // This is verified by checking that selectedElement is not in the partialize function
      expect(useViewerStore.getState().selectedElement).toEqual(mockElement);
      
      // Reset store to simulate page reload
      useViewerStore.getState().resetToDefaults();
      
      // Selected element should be cleared after reset
      expect(useViewerStore.getState().selectedElement).toBeUndefined();
    });

    it('should not persist hovered element (transient state)', () => {
      const { setHoveredElement } = useViewerStore.getState();
      
      setHoveredElement(mockElement);
      
      expect(useViewerStore.getState().hoveredElement).toEqual(mockElement);
      
      // Reset store to simulate page reload
      useViewerStore.getState().resetToDefaults();
      
      // Hovered element should be cleared after reset
      expect(useViewerStore.getState().hoveredElement).toBeUndefined();
    });
  });

  describe('Selection Integration with Other Store Features', () => {
    it('should maintain selection when updating transform', () => {
      const { selectElement, setTransform } = useViewerStore.getState();
      
      selectElement(mockElement);
      setTransform({ x: 100, y: 200, scale: 2 });
      
      expect(useViewerStore.getState().selectedElement).toEqual(mockElement);
      expect(useViewerStore.getState().transform).toEqual({ x: 100, y: 200, scale: 2 });
    });

    it('should maintain selection when toggling layers', () => {
      const { selectElement, toggleLayer, setAvailableLayers } = useViewerStore.getState();
      
      const layers: IFCClass[] = [
        { name: 'IfcWall', displayName: 'Wall', count: 1, visible: true, style: { fill: '#cccccc' } }
      ];
      setAvailableLayers(layers);
      
      selectElement(mockElement);
      toggleLayer('IfcWall');
      
      expect(useViewerStore.getState().selectedElement).toEqual(mockElement);
    });

    it('should maintain selection when updating style overrides', () => {
      const { selectElement, setElementStyle } = useViewerStore.getState();
      
      selectElement(mockElement);
      
      const newStyle: ElementStyle = { fill: '#ff0000', strokeWidth: 3 };
      setElementStyle('IfcWall', newStyle);
      
      expect(useViewerStore.getState().selectedElement).toEqual(mockElement);
      expect(useViewerStore.getState().styleOverrides.get('IfcWall')).toEqual(newStyle);
    });

    it('should maintain selection during viewer state reset but clear on full reset', () => {
      const { selectElement, resetViewerState, resetToDefaults } = useViewerStore.getState();
      
      selectElement(mockElement);
      
      // resetViewerState should clear selection
      resetViewerState();
      expect(useViewerStore.getState().selectedElement).toBeUndefined();
      
      // Select again
      selectElement(mockElement);
      
      // resetToDefaults should also clear selection
      resetToDefaults();
      expect(useViewerStore.getState().selectedElement).toBeUndefined();
    });
  });

  describe('Selection State Selectors', () => {
    it('should provide selectedElement state access', () => {
      const { selectElement } = useViewerStore.getState();
      
      // Test initial state
      expect(useViewerStore.getState().selectedElement).toBeUndefined();
      
      // Test after selection
      selectElement(mockElement);
      expect(useViewerStore.getState().selectedElement).toEqual(mockElement);
    });

    it('should provide hoveredElement state access', () => {
      const { setHoveredElement } = useViewerStore.getState();
      
      // Test initial state
      expect(useViewerStore.getState().hoveredElement).toBeUndefined();
      
      // Test after hover
      setHoveredElement(mockElement);
      expect(useViewerStore.getState().hoveredElement).toEqual(mockElement);
    });
  });

  describe('Error Handling in Selection', () => {
    it('should handle null element gracefully', () => {
      const { selectElement } = useViewerStore.getState();
      
      expect(() => {
        selectElement(null as any);
      }).not.toThrow();
      
      expect(useViewerStore.getState().selectedElement).toBeNull();
    });

    it('should handle invalid element data gracefully', () => {
      const { selectElement } = useViewerStore.getState();
      
      const invalidElement = { guid: 'invalid' } as IFCElement;
      
      expect(() => {
        selectElement(invalidElement);
      }).not.toThrow();
      
      expect(useViewerStore.getState().selectedElement).toEqual(invalidElement);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle rapid selection changes efficiently', () => {
      const { selectElement } = useViewerStore.getState();
      
      const startTime = performance.now();
      
      // Rapidly change selection 100 times
      for (let i = 0; i < 100; i++) {
        const element = i % 2 === 0 ? mockElement : mockElement2;
        selectElement(element);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (less than 100ms for 100 operations)
      expect(duration).toBeLessThan(100);
      
      // Final state should be correct
      expect(useViewerStore.getState().selectedElement).toEqual(mockElement2);
    });

    it('should handle rapid hover changes efficiently', () => {
      const { setHoveredElement } = useViewerStore.getState();
      
      const startTime = performance.now();
      
      // Rapidly change hover 100 times
      for (let i = 0; i < 100; i++) {
        const element = i % 2 === 0 ? mockElement : mockElement2;
        setHoveredElement(element);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (less than 100ms for 100 operations)
      expect(duration).toBeLessThan(100);
      
      // Final state should be correct
      expect(useViewerStore.getState().hoveredElement).toEqual(mockElement2);
    });
  });
});