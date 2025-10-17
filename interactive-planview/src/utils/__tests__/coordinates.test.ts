import { describe, it, expect } from 'vitest';
import {
  transformPoint,
  inverseTransformPoint,
  transformBoundingBox,
  calculateDistance,
  calculatePolygonArea,
  getBoundingBoxCenter,
  isPointInBoundingBox,
  expandBoundingBox,
  combineBoundingBoxes,
  geoJsonToSvgCoordinates,
  svgToGeoJsonCoordinates,
  createFitToViewTransform,
  clampTransform,
} from '../coordinates';
import type { Point, BoundingBox, Transform } from '@/types';

describe('Coordinate Utilities', () => {
  describe('transformPoint', () => {
    it('should transform point with scale and translation', () => {
      const point: Point = { x: 10, y: 20 };
      const transform: Transform = { x: 5, y: 10, scale: 2 };

      const result = transformPoint(point, transform);

      expect(result).toEqual({ x: 25, y: 50 });
    });

    it('should handle identity transform', () => {
      const point: Point = { x: 10, y: 20 };
      const transform: Transform = { x: 0, y: 0, scale: 1 };

      const result = transformPoint(point, transform);

      expect(result).toEqual(point);
    });

    it('should handle negative scale', () => {
      const point: Point = { x: 10, y: 20 };
      const transform: Transform = { x: 0, y: 0, scale: -1 };

      const result = transformPoint(point, transform);

      expect(result).toEqual({ x: -10, y: -20 });
    });
  });

  describe('inverseTransformPoint', () => {
    it('should inverse transform point correctly', () => {
      const screenPoint: Point = { x: 25, y: 50 };
      const transform: Transform = { x: 5, y: 10, scale: 2 };

      const result = inverseTransformPoint(screenPoint, transform);

      expect(result).toEqual({ x: 10, y: 20 });
    });

    it('should be inverse of transformPoint', () => {
      const originalPoint: Point = { x: 15, y: 25 };
      const transform: Transform = { x: 3, y: 7, scale: 1.5 };

      const transformed = transformPoint(originalPoint, transform);
      const restored = inverseTransformPoint(transformed, transform);

      expect(restored.x).toBeCloseTo(originalPoint.x);
      expect(restored.y).toBeCloseTo(originalPoint.y);
    });
  });

  describe('transformBoundingBox', () => {
    it('should transform bounding box correctly', () => {
      const bounds: BoundingBox = { minX: 0, minY: 0, maxX: 10, maxY: 20 };
      const transform: Transform = { x: 5, y: 10, scale: 2 };

      const result = transformBoundingBox(bounds, transform);

      expect(result).toEqual({
        minX: 5,
        minY: 10,
        maxX: 25,
        maxY: 50,
      });
    });

    it('should handle negative scale correctly', () => {
      const bounds: BoundingBox = { minX: 0, minY: 0, maxX: 10, maxY: 20 };
      const transform: Transform = { x: 0, y: 0, scale: -1 };

      const result = transformBoundingBox(bounds, transform);

      expect(result).toEqual({
        minX: -10,
        minY: -20,
        maxX: 0,
        maxY: 0,
      });
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const point1: Point = { x: 0, y: 0 };
      const point2: Point = { x: 3, y: 4 };

      const distance = calculateDistance(point1, point2);

      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should return 0 for same points', () => {
      const point: Point = { x: 10, y: 20 };

      const distance = calculateDistance(point, point);

      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const point1: Point = { x: -3, y: -4 };
      const point2: Point = { x: 0, y: 0 };

      const distance = calculateDistance(point1, point2);

      expect(distance).toBe(5);
    });
  });

  describe('calculatePolygonArea', () => {
    it('should calculate area of triangle', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ];

      const area = calculatePolygonArea(points);

      expect(area).toBe(50); // base * height / 2 = 10 * 10 / 2
    });

    it('should calculate area of rectangle', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
        { x: 0, y: 5 },
      ];

      const area = calculatePolygonArea(points);

      expect(area).toBe(50); // width * height = 10 * 5
    });

    it('should return 0 for less than 3 points', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];

      const area = calculatePolygonArea(points);

      expect(area).toBe(0);
    });

    it('should handle clockwise and counter-clockwise orientation', () => {
      const clockwise: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];

      const counterClockwise: Point[] = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 },
      ];

      const area1 = calculatePolygonArea(clockwise);
      const area2 = calculatePolygonArea(counterClockwise);

      expect(area1).toBe(100);
      expect(area2).toBe(100); // Should be positive regardless of orientation
    });
  });

  describe('getBoundingBoxCenter', () => {
    it('should calculate center of bounding box', () => {
      const bounds: BoundingBox = { minX: 0, minY: 0, maxX: 20, maxY: 10 };

      const center = getBoundingBoxCenter(bounds);

      expect(center).toEqual({ x: 10, y: 5 });
    });

    it('should handle negative coordinates', () => {
      const bounds: BoundingBox = { minX: -10, minY: -5, maxX: 10, maxY: 5 };

      const center = getBoundingBoxCenter(bounds);

      expect(center).toEqual({ x: 0, y: 0 });
    });
  });

  describe('isPointInBoundingBox', () => {
    const bounds: BoundingBox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

    it('should return true for point inside bounds', () => {
      const point: Point = { x: 5, y: 5 };

      const result = isPointInBoundingBox(point, bounds);

      expect(result).toBe(true);
    });

    it('should return true for point on boundary', () => {
      const point: Point = { x: 0, y: 0 };

      const result = isPointInBoundingBox(point, bounds);

      expect(result).toBe(true);
    });

    it('should return false for point outside bounds', () => {
      const point: Point = { x: 15, y: 5 };

      const result = isPointInBoundingBox(point, bounds);

      expect(result).toBe(false);
    });
  });

  describe('expandBoundingBox', () => {
    it('should expand bounding box by margin', () => {
      const bounds: BoundingBox = { minX: 10, minY: 20, maxX: 30, maxY: 40 };
      const margin = 5;

      const result = expandBoundingBox(bounds, margin);

      expect(result).toEqual({
        minX: 5,
        minY: 15,
        maxX: 35,
        maxY: 45,
      });
    });

    it('should handle zero margin', () => {
      const bounds: BoundingBox = { minX: 10, minY: 20, maxX: 30, maxY: 40 };

      const result = expandBoundingBox(bounds, 0);

      expect(result).toEqual(bounds);
    });

    it('should handle negative margin', () => {
      const bounds: BoundingBox = { minX: 10, minY: 20, maxX: 30, maxY: 40 };
      const margin = -2;

      const result = expandBoundingBox(bounds, margin);

      expect(result).toEqual({
        minX: 12,
        minY: 22,
        maxX: 28,
        maxY: 38,
      });
    });
  });

  describe('combineBoundingBoxes', () => {
    it('should combine multiple bounding boxes', () => {
      const boxes: BoundingBox[] = [
        { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 5, minY: 5, maxX: 15, maxY: 15 },
        { minX: -5, minY: -5, maxX: 5, maxY: 5 },
      ];

      const result = combineBoundingBoxes(boxes);

      expect(result).toEqual({
        minX: -5,
        minY: -5,
        maxX: 15,
        maxY: 15,
      });
    });

    it('should return null for empty array', () => {
      const result = combineBoundingBoxes([]);

      expect(result).toBeNull();
    });

    it('should handle single bounding box', () => {
      const boxes: BoundingBox[] = [
        { minX: 10, minY: 20, maxX: 30, maxY: 40 },
      ];

      const result = combineBoundingBoxes(boxes);

      expect(result).toEqual(boxes[0]);
    });
  });

  describe('geoJsonToSvgCoordinates', () => {
    it('should convert GeoJSON coordinates to SVG coordinates', () => {
      const geoCoords = [10, 20]; // [longitude, latitude]
      const geoBounds: BoundingBox = { minX: 0, minY: 0, maxX: 20, maxY: 40 };
      const svgBounds: BoundingBox = { minX: 0, minY: 0, maxX: 200, maxY: 400 };

      const result = geoJsonToSvgCoordinates(geoCoords, geoBounds, svgBounds);

      expect(result).toEqual({ x: 100, y: 200 }); // Note: Y is inverted
    });

    it('should handle edge coordinates', () => {
      const geoCoords = [0, 0];
      const geoBounds: BoundingBox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const svgBounds: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

      const result = geoJsonToSvgCoordinates(geoCoords, geoBounds, svgBounds);

      expect(result).toEqual({ x: 0, y: 100 }); // Bottom-left in SVG
    });
  });

  describe('svgToGeoJsonCoordinates', () => {
    it('should convert SVG coordinates to GeoJSON coordinates', () => {
      const svgPoint: Point = { x: 100, y: 200 };
      const geoBounds: BoundingBox = { minX: 0, minY: 0, maxX: 20, maxY: 40 };
      const svgBounds: BoundingBox = { minX: 0, minY: 0, maxX: 200, maxY: 400 };

      const result = svgToGeoJsonCoordinates(svgPoint, geoBounds, svgBounds);

      expect(result).toEqual([10, 20]); // [longitude, latitude]
    });

    it('should be inverse of geoJsonToSvgCoordinates', () => {
      const originalGeoCoords = [15, 25];
      const geoBounds: BoundingBox = { minX: 0, minY: 0, maxX: 30, maxY: 50 };
      const svgBounds: BoundingBox = { minX: 0, minY: 0, maxX: 300, maxY: 500 };

      const svgPoint = geoJsonToSvgCoordinates(originalGeoCoords, geoBounds, svgBounds);
      const restoredGeoCoords = svgToGeoJsonCoordinates(svgPoint, geoBounds, svgBounds);

      expect(restoredGeoCoords[0]).toBeCloseTo(originalGeoCoords[0]);
      expect(restoredGeoCoords[1]).toBeCloseTo(originalGeoCoords[1]);
    });
  });

  describe('createFitToViewTransform', () => {
    it('should create transform to fit content in viewport', () => {
      const contentBounds: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 50 };
      const viewportBounds: BoundingBox = { minX: 0, minY: 0, maxX: 200, maxY: 200 };

      const transform = createFitToViewTransform(contentBounds, viewportBounds, 20);

      // Content should be scaled to fit with padding
      expect(transform.scale).toBeCloseTo(1.6); // (200-40)/100 = 1.6
      expect(transform.x).toBeCloseTo(20); // Left padding
      expect(transform.y).toBeCloseTo(60); // Centered vertically: (160-80)/2 + 20 = 60
    });

    it('should handle content larger than viewport', () => {
      const contentBounds: BoundingBox = { minX: 0, minY: 0, maxX: 300, maxY: 200 };
      const viewportBounds: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

      const transform = createFitToViewTransform(contentBounds, viewportBounds, 10);

      // Content should be scaled down to fit
      expect(transform.scale).toBeLessThan(1);
    });

    it('should handle square content and viewport', () => {
      const contentBounds: BoundingBox = { minX: 0, minY: 0, maxX: 50, maxY: 50 };
      const viewportBounds: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

      const transform = createFitToViewTransform(contentBounds, viewportBounds, 10);

      expect(transform.scale).toBeCloseTo(1.6); // (100-20)/50 = 1.6
      expect(transform.x).toBeCloseTo(10);
      expect(transform.y).toBeCloseTo(10);
    });
  });

  describe('clampTransform', () => {
    const contentBounds: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const viewportBounds: BoundingBox = { minX: 0, minY: 0, maxX: 200, maxY: 200 };

    it('should clamp scale to min/max values', () => {
      const transform: Transform = { x: 0, y: 0, scale: 20 };

      const result = clampTransform(transform, contentBounds, viewportBounds, 0.1, 10);

      expect(result.scale).toBe(10);
    });

    it('should clamp scale to minimum', () => {
      const transform: Transform = { x: 0, y: 0, scale: 0.05 };

      const result = clampTransform(transform, contentBounds, viewportBounds, 0.1, 10);

      expect(result.scale).toBe(0.1);
    });

    it('should preserve valid scale', () => {
      const transform: Transform = { x: 0, y: 0, scale: 2 };

      const result = clampTransform(transform, contentBounds, viewportBounds, 0.1, 10);

      expect(result.scale).toBe(2);
    });

    it('should clamp translation to keep content visible', () => {
      const transform: Transform = { x: -1000, y: -1000, scale: 1 };

      const result = clampTransform(transform, contentBounds, viewportBounds, 0.1, 10);

      // Translation should be adjusted to keep content somewhat visible
      expect(result.x).toBeGreaterThan(-1000);
      expect(result.y).toBeGreaterThan(-1000);
    });

    it('should preserve valid translation', () => {
      const transform: Transform = { x: 50, y: 50, scale: 1 };

      const result = clampTransform(transform, contentBounds, viewportBounds, 0.1, 10);

      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });
  });
});