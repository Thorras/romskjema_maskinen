import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MeasurementToolbar } from '../MeasurementToolbar';
import { useMeasurementStore } from '@/store/measurementStore';

// Mock the measurement store
vi.mock('@/store/measurementStore');

describe('MeasurementToolbar', () => {
  const mockEnableMeasurementMode = vi.fn();
  const mockDisableMeasurementMode = vi.fn();
  const mockSetNextMeasurementType = vi.fn();
  const mockFinishMeasurement = vi.fn();
  const mockCancelActiveMeasurement = vi.fn();
  const mockDeleteMeasurement = vi.fn();
  const mockClearAllMeasurements = vi.fn();
  const mockToggleMeasurementVisibility = vi.fn();

  const defaultMockState = {
    measurementMode: false,
    activeMeasurement: null,
    measurements: [],
    nextMeasurementType: 'distance',
    enableMeasurementMode: mockEnableMeasurementMode,
    disableMeasurementMode: mockDisableMeasurementMode,
    setNextMeasurementType: mockSetNextMeasurementType,
    finishMeasurement: mockFinishMeasurement,
    cancelActiveMeasurement: mockCancelActiveMeasurement,
    deleteMeasurement: mockDeleteMeasurement,
    clearAllMeasurements: mockClearAllMeasurements,
    toggleMeasurementVisibility: mockToggleMeasurementVisibility,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useMeasurementStore as any).mockReturnValue(defaultMockState);
  });

  it('should render measurement toolbar', () => {
    render(<MeasurementToolbar />);
    
    expect(screen.getByText('Measurement Tools')).toBeInTheDocument();
    expect(screen.getByText('Enter Measurement Mode')).toBeInTheDocument();
  });

  it('should enable measurement mode when button is clicked', () => {
    render(<MeasurementToolbar />);
    
    const enableButton = screen.getByText('Enter Measurement Mode');
    fireEvent.click(enableButton);
    
    expect(mockEnableMeasurementMode).toHaveBeenCalled();
  });

  it('should show measurement type buttons when in measurement mode', () => {
    (useMeasurementStore as any).mockReturnValue({
      ...defaultMockState,
      measurementMode: true,
    });

    render(<MeasurementToolbar />);
    
    expect(screen.getByText('Distance')).toBeInTheDocument();
    expect(screen.getByText('Area')).toBeInTheDocument();
  });

  it('should set measurement type when distance button is clicked', () => {
    (useMeasurementStore as any).mockReturnValue({
      ...defaultMockState,
      measurementMode: true,
    });

    render(<MeasurementToolbar />);
    
    const distanceButton = screen.getByText('Distance');
    fireEvent.click(distanceButton);
    
    expect(mockSetNextMeasurementType).toHaveBeenCalledWith('distance');
  });
});