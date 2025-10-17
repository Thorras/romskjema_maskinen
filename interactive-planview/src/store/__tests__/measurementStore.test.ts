import { describe, it, expect, beforeEach } from 'vitest';
import { useMeasurementStore } from '../measurementStore';
import type { Point } from '@/types';

describe('MeasurementStore', () => {
  beforeEach(() => {
    useMeasurementStore.getState().resetMeasurementState();
  });

  describe('Measurement Mode', () => {
    it('should enable measurement mode', () => {
      const { enableMeasurementMode } = useMeasurementStore.getState();
      
      expect(useMeasurementStore.getState().measurementMode).toBe(false);
      enableMeasurementMode();
      expect(useMeasurementStore.getState().measurementMode).toBe(true);
    });

    it('should set next measurement type', () => {
      const { setNextMeasurementType } = useMeasurementStore.getState();
      
      expect(useMeasurementStore.getState().nextMeasurementType).toBe('distance');
      setNextMeasurementType('area');
      expect(useMeasurementStore.getState().nextMeasurementType).toBe('area');
    });
  });

  describe('Distance Measurements', () => {
    it('should start distance measurement', () => {
      const { startMeasurement } = useMeasurementStore.getState();
      const point: Point = { x: 10, y: 20 };
      
      startMeasurement('distance', point);
      
      const { activeMeasurement } = useMeasurementStore.getState();
      expect(activeMeasurement).toBeTruthy();
      expect(activeMeasurement?.type).toBe('distance');
      expect(activeMeasurement?.points).toHaveLength(1);
      expect(activeMeasurement?.points[0]).toEqual(point);
    });

    it('should calculate distance correctly', () => {
      const { calculateDistance } = useMeasurementStore.getState();
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 3, y: 4 }
      ];
      
      const distance = calculateDistance(points);
      expect(distance).toBe(5);
    });
  });

  describe('Area Measurements', () => {
    it('should calculate area correctly', () => {
      const { calculateArea } = useMeasurementStore.getState();
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 3 }
      ];
      
      const area = calculateArea(points);
      expect(area).toBe(6);
    });
  });
});