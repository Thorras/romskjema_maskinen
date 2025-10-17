import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useInteractionController } from '../useInteractionController';
import type { BoundingBox } from '@/types';

// Mock all dependencies
vi.mock('@/store/viewerStore', () => ({
  useViewerStore: vi.fn(() => ({
    transform: { x: 0, y: 0, scale: 1 },
    setTransform: vi.fn(),
  })),
}));

vi.mock('../useTouchGestures', () => ({
  useTouchGestures: vi.fn(() => ({
    attachToElement: vi.fn(() => vi.fn()),
  })),
}));

vi.mock('d3', () => ({
  select: vi.fn(() => ({
    call: vi.fn(),
    transition: vi.fn(() => ({
      duration: vi.fn(() => ({
        call: vi.fn(),
      })),
    })),
    on: vi.fn(),
  })),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn(() => ({
      filter: vi.fn(() => ({
        touchable: vi.fn(() => ({
          on: vi.fn(() => ({
            on: vi.fn(() => ({
              on: vi.fn(),
            })),
          })),
        })),
      })),
    })),
  })),
  zoomIdentity: {
    translate: vi.fn(() => ({
      scale: vi.fn(),
    })),
  },
  zoomTransform: vi.fn(() => ({ x: 0, y: 0, k: 1 })),
}));

vi.mock('@/utils/coordinates', () => ({
  clampTransform: vi.fn((transform) => transform),
  createFitToViewTransform: vi.fn(() => ({ x: 0, y: 0, scale: 1 })),
  inverseTransformPoint: vi.fn((point) => point),
}));

describe('useInteractionController', () => {
  const mockContentBounds: BoundingBox = {
    minX: 0,
    minY: 0,
    maxX: 1000,
    maxY: 800,
  };

  const mockViewportBounds: BoundingBox = {
    minX: 0,
    minY: 0,
    maxX: 800,
    maxY: 600,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct interface', () => {
    const { result } = renderHook(() =>
      useInteractionController({
        contentBounds: mockContentBounds,
        viewportBounds: mockViewportBounds,
      })
    );

    expect(result.current).toHaveProperty('attachToElement');
    expect(result.current).toHaveProperty('detachFromElement');
    expect(result.current).toHaveProperty('fitToView');
    expect(result.current).toHaveProperty('resetView');
    expect(result.current).toHaveProperty('zoomIn');
    expect(result.current).toHaveProperty('zoomOut');
    expect(result.current).toHaveProperty('panTo');
    expect(result.current).toHaveProperty('setZoom');
  });

  it('handles basic operations without errors', () => {
    const { result } = renderHook(() =>
      useInteractionController({
        contentBounds: mockContentBounds,
        viewportBounds: mockViewportBounds,
      })
    );

    expect(() => {
      act(() => {
        result.current.fitToView();
        result.current.resetView();
        result.current.zoomIn();
        result.current.zoomOut();
        result.current.panTo({ x: 100, y: 100 });
        result.current.setZoom(2.0);
      });
    }).not.toThrow();
  });

  it('handles element attachment and detachment', () => {
    const { result } = renderHook(() =>
      useInteractionController({
        contentBounds: mockContentBounds,
        viewportBounds: mockViewportBounds,
      })
    );

    const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;

    expect(() => {
      act(() => {
        result.current.attachToElement(mockSvgElement);
        result.current.detachFromElement();
        result.current.attachToElement(null);
      });
    }).not.toThrow();
  });

  it('respects configuration options', () => {
    const { result } = renderHook(() =>
      useInteractionController({
        contentBounds: mockContentBounds,
        viewportBounds: mockViewportBounds,
        enablePan: false,
        enableZoom: false,
        minZoom: 0.5,
        maxZoom: 5.0,
        zoomStep: 1.5,
      })
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current.attachToElement).toBe('function');
  });
});