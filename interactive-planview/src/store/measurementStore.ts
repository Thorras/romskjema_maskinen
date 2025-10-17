import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Measurement, Point, ViewerError } from '@/types';

interface MeasurementStore {
  // State
  measurements: Measurement[];
  measurementMode: boolean;
  activeMeasurement: Measurement | null;
  measurementError: ViewerError | null;
  
  // Measurement mode actions
  enableMeasurementMode: () => void;
  disableMeasurementMode: () => void;
  toggleMeasurementMode: () => void;
  setMeasurementMode: (enabled: boolean) => void;
  
  // Measurement creation actions
  startMeasurement: (type: 'distance' | 'area', firstPoint: Point) => void;
  addPointToMeasurement: (point: Point) => void;
  finishMeasurement: () => void;
  cancelActiveMeasurement: () => void;
  
  // Measurement management actions
  addMeasurement: (measurement: Measurement) => void;
  updateMeasurement: (id: string, updates: Partial<Measurement>) => void;
  deleteMeasurement: (id: string) => void;
  clearAllMeasurements: () => void;
  toggleMeasurementVisibility: (id: string) => void;
  setMeasurementLabel: (id: string, label: string) => void;
  
  // Utility actions
  getMeasurementById: (id: string) => Measurement | undefined;
  getVisibleMeasurements: () => Measurement[];
  calculateDistance: (points: Point[]) => number;
  calculateArea: (points: Point[]) => number;
  
  // Error handling
  setMeasurementError: (error: ViewerError | null) => void;
  clearMeasurementError: () => void;
  
  // Reset actions
  resetMeasurementState: () => void;
}

// Utility functions for calculations
const calculateDistance = (points: Point[]): number => {
  if (points.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }
  
  return totalDistance;
};

const calculateArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  // Use the shoelace formula for polygon area
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area) / 2;
};

// Generate unique measurement ID
const generateMeasurementId = (): string => {
  return `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useMeasurementStore = create<MeasurementStore>()(
  persist(
    (set, get) => ({
      // Initial state
      measurements: [],
      measurementMode: false,
      activeMeasurement: null,
      measurementError: null,
      
      // Measurement mode actions
      enableMeasurementMode: () =>
        set(() => ({
          measurementMode: true,
        })),
      
      disableMeasurementMode: () =>
        set(() => ({
          measurementMode: false,
          activeMeasurement: null,
        })),
      
      toggleMeasurementMode: () =>
        set((state) => ({
          measurementMode: !state.measurementMode,
          activeMeasurement: state.measurementMode ? null : state.activeMeasurement,
        })),
      
      setMeasurementMode: (enabled) =>
        set(() => ({
          measurementMode: enabled,
          activeMeasurement: enabled ? get().activeMeasurement : null,
        })),
      
      // Measurement creation actions
      startMeasurement: (type, firstPoint) =>
        set(() => {
          const newMeasurement: Measurement = {
            id: generateMeasurementId(),
            type,
            points: [firstPoint],
            value: 0,
            unit: 'px', // Will be converted to actual units by the rendering engine
            visible: true,
          };
          
          return {
            activeMeasurement: newMeasurement,
            measurementError: null,
          };
        }),
      
      addPointToMeasurement: (point) =>
        set((state) => {
          if (!state.activeMeasurement) {
            return {
              measurementError: {
                type: 'interaction',
                message: 'No active measurement to add point to',
                timestamp: new Date(),
              },
            };
          }
          
          const updatedMeasurement: Measurement = {
            ...state.activeMeasurement,
            points: [...state.activeMeasurement.points, point],
          };
          
          // Update the value based on current points
          if (updatedMeasurement.type === 'distance') {
            updatedMeasurement.value = calculateDistance(updatedMeasurement.points);
          } else if (updatedMeasurement.type === 'area' && updatedMeasurement.points.length >= 3) {
            updatedMeasurement.value = calculateArea(updatedMeasurement.points);
          }
          
          return {
            activeMeasurement: updatedMeasurement,
            measurementError: null,
          };
        }),
      
      finishMeasurement: () =>
        set((state) => {
          if (!state.activeMeasurement) {
            return {
              measurementError: {
                type: 'interaction',
                message: 'No active measurement to finish',
                timestamp: new Date(),
              },
            };
          }
          
          // Validate measurement before finishing
          const { activeMeasurement } = state;
          const minPoints = activeMeasurement.type === 'distance' ? 2 : 3;
          
          if (activeMeasurement.points.length < minPoints) {
            return {
              measurementError: {
                type: 'interaction',
                message: `${activeMeasurement.type} measurement requires at least ${minPoints} points`,
                timestamp: new Date(),
              },
            };
          }
          
          // Calculate final value
          const finalValue = activeMeasurement.type === 'distance'
            ? calculateDistance(activeMeasurement.points)
            : calculateArea(activeMeasurement.points);
          
          const finishedMeasurement: Measurement = {
            ...activeMeasurement,
            value: finalValue,
          };
          
          return {
            measurements: [...state.measurements, finishedMeasurement],
            activeMeasurement: null,
            measurementError: null,
          };
        }),
      
      cancelActiveMeasurement: () =>
        set(() => ({
          activeMeasurement: null,
          measurementError: null,
        })),
      
      // Measurement management actions
      addMeasurement: (measurement) =>
        set((state) => ({
          measurements: [...state.measurements, measurement],
        })),
      
      updateMeasurement: (id, updates) =>
        set((state) => ({
          measurements: state.measurements.map(measurement =>
            measurement.id === id ? { ...measurement, ...updates } : measurement
          ),
        })),
      
      deleteMeasurement: (id) =>
        set((state) => ({
          measurements: state.measurements.filter(measurement => measurement.id !== id),
        })),
      
      clearAllMeasurements: () =>
        set(() => ({
          measurements: [],
          activeMeasurement: null,
        })),
      
      toggleMeasurementVisibility: (id) =>
        set((state) => ({
          measurements: state.measurements.map(measurement =>
            measurement.id === id
              ? { ...measurement, visible: !measurement.visible }
              : measurement
          ),
        })),
      
      setMeasurementLabel: (id, label) =>
        set((state) => ({
          measurements: state.measurements.map(measurement =>
            measurement.id === id ? { ...measurement, label } : measurement
          ),
        })),
      
      // Utility actions
      getMeasurementById: (id) => {
        const state = get();
        return state.measurements.find(measurement => measurement.id === id);
      },
      
      getVisibleMeasurements: () => {
        const state = get();
        return state.measurements.filter(measurement => measurement.visible);
      },
      
      calculateDistance,
      calculateArea,
      
      // Error handling
      setMeasurementError: (error) =>
        set(() => ({
          measurementError: error,
        })),
      
      clearMeasurementError: () =>
        set(() => ({
          measurementError: null,
        })),
      
      // Reset actions
      resetMeasurementState: () =>
        set(() => ({
          measurements: [],
          measurementMode: false,
          activeMeasurement: null,
          measurementError: null,
        })),
    }),
    {
      name: 'interactive-planview-measurements',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        measurements: state.measurements,
        // Don't persist measurement mode or active measurement
      }),
    }
  )
);

// Selector hooks for better performance
export const useMeasurements = () => useMeasurementStore((state) => state.measurements);
export const useMeasurementMode = () => useMeasurementStore((state) => state.measurementMode);
export const useActiveMeasurement = () => useMeasurementStore((state) => state.activeMeasurement);
export const useMeasurementError = () => useMeasurementStore((state) => state.measurementError);
export const useVisibleMeasurements = () => useMeasurementStore((state) => state.getVisibleMeasurements());