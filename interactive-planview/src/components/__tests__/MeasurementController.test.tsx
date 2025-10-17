import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MeasurementController } from '../MeasurementController';
import { useMeasurementStore } from '@/store/measurementStore';
import { useViewerStore } from '@/store/viewerStore';

// Mock the stores
vi.mock('@/store/measurementStore');
vi.mock('@/store/viewerStore');

describe('MeasurementController', () => {
  const mockSvgRef = { current: null } as React.RefObject<SVGSVGElement>;
  const mockOnMeasurementComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock measurement store
    (useMeasurementStore as any).mockReturnValue({
      measurementMode: false,
      activeMeasurement: null,
      measurements: [],
      nextMeasurementType: 'distance',
      startMeasurement: vi.fn(),
      addPointToMeasurement: vi.fn(),
      finishMeasurement: vi.fn(),
      cancelActiveMeasurement: vi.fn(),
    });

    // Mock viewer store
    (useViewerStore as any).mockReturnValue({
      transform: { x: 0, y: 0, scale: 1 },
    });
  });

  it('should render without crashing', () => {
    render(
      <MeasurementController
        svgRef={mockSvgRef}
        onMeasurementComplete={mockOnMeasurementComplete}
      />
    );
    
    // Component renders nothing visible, so just check it doesn't crash
    expect(true).toBe(true);
  });

  it('should not attach event listeners when measurement mode is disabled', () => {
    const mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const addEventListenerSpy = vi.spyOn(mockSvg, 'addEventListener');
    
    mockSvgRef.current = mockSvg;
    
    render(
      <MeasurementController
        svgRef={mockSvgRef}
        onMeasurementComplete={mockOnMeasurementComplete}
      />
    );
    
    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });
});