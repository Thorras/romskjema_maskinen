import { describe, it, expect, beforeEach } from 'vitest';
import { createSpatialIndex } from '../spatialIndex';
import type { IFCElement, Point, BoundingBox } from '@/types';

describe('Hit Testing Accuracy and Performance', () => {
  let testElements: IFCElement[];
  let spatialIndex: ReturnType<typeof createSpatialIndex>;

  beforeEach(() => {
    testElements = [
      // Wall element
      {
        guid: 'wall-1',
        ifcClass: 'IfcWall',
        geometry: {
          type: 'rect',
          data: { x: 10, y: 10, width: 100, height: 10 },
          bounds: { minX: 10, minY: 10, maxX: 110, maxY: 20 }
        },
        properties: { Name: 'Wall 1' },
        bounds: { minX: 10, minY: 10, maxX: 110, maxY: 20 },
        visible: true,
        style: { fill: '#cccccc', stroke: '#000000', strokeWidth: 1 }
      },
      // Door element (overlapping with wall)
      {
        guid: 'door-1',
        ifcClass: 'IfcDoor',
        geometry: {
          type: 'rect',
          data: { x: 50, y: 10, width: 10, height: 10 },
          bounds: { minX: 50, minY: 10, maxX: 60, maxY: 20 }
        },
        properties: { Name: 'Door 1' },
        bounds: { minX: 50, minY: 10, maxX: 60, maxY: 20 },
        visible: true,
        style: { fill: '#8B4513', stroke: '#000000', strokeWidth: 1 }
      },
      // Window element
      {
        guid: 'window-1',
        ifcClass: 'IfcWindow',
        geometry: {
          type: 'rect',
          data: { x: 80, y: 10, width: 10, height: 10 },
          bounds: { minX: 80, minY: 10, maxX: 90, maxY: 20 }
        },
        properties: { Name: 'Window 1' },
        bounds: { minX: 80, minY: 10, maxX: 90, maxY: 20 },
        visible: true,
        style: { fill: '#87CEEB', stroke: '#000000', strokeWidth: 1 }
      },
      // Column element (circular)
      {
        guid: 'column-1',
        ifcClass: 'IfcColumn',
        geometry: {
          type: 'circle',
          data: { cx: 150, cy: 50, r: 15 },
          bounds: { minX: 135, minY: 35, maxX: 165, maxY: 65 }
        },
        properties: { Name: 'Column 1' },
        bounds: { minX: 135, minY: 35, maxX: 165, maxY: 65 },
        visible: true,
        style: { fill: '#666666', stroke: '#000000', strokeWidth: 2 }
      },
      // Beam element (line)
      {
        guid: 'beam-1',
        ifcClass: 'IfcBeam',
        geometry: {
          type: 'line',
          data: { x1: 200, y1: 30, x2: 300, y2: 30 },
          bounds: { minX: 200, minY: 30, maxX: 300, maxY: 30 }
        },
        properties: { Name: 'Beam 1' },
        bounds: { minX: 200, minY: 30, maxX: 300, maxY: 30 },
        visible: true,
        style: { stroke: '#000000', strokeWidth: 3 }
      }
    ];

    spatialIndex = createSpatialIndex(testElements);
  });

  describe('Hit Testing Accuracy', () => {
    describe('Rectangle Hit Testing', () => {
      it('should accurately detect hits inside rectangles', () => {
        const insideWall: Point = { x: 55, y: 15 };
        const insideDoor: Point = { x: 55, y: 15 };
        const insideWindow: Point = { x: 85, y: 15 };

        const wallHits = spatialIndex.queryPoint(insideWall);
        const doorHits = spatialIndex.queryPoint(insideDoor);
        const windowHits = spatialIndex.queryPoint(insideWindow);

        expect(wallHits.some(e => e.guid === 'wall-1')).toBe(true);
        expect(doorHits.some(e => e.guid === 'door-1')).toBe(true);
        expect(windowHits.some(e => e.guid === 'window-1')).toBe(true);
      });

      it('should accurately detect overlapping elements', () => {
        // Point that should hit both wall and door
        const overlapPoint: Point = { x: 55, y: 15 };
        const hits = spatialIndex.queryPoint(overlapPoint);

        expect(hits).toHaveLength(2);
        expect(hits.some(e => e.guid === 'wall-1')).toBe(true);
        expect(hits.some(e => e.guid === 'door-1')).toBe(true);
      });

      it('should accurately miss points outside rectangles', () => {
        const outsidePoints: Point[] = [
          { x: 5, y: 15 },    // Left of wall
          { x: 115, y: 15 },  // Right of wall
          { x: 55, y: 5 },    // Above wall
          { x: 55, y: 25 }    // Below wall
        ];

        outsidePoints.forEach(point => {
          const hits = spatialIndex.queryPoint(point);
          expect(hits.some(e => e.guid === 'wall-1')).toBe(false);
        });
      });

      it('should handle edge cases accurately', () => {
        // Test exact corners and edges
        const edgePoints: Point[] = [
          { x: 10, y: 10 },   // Top-left corner
          { x: 110, y: 10 },  // Top-right corner
          { x: 10, y: 20 },   // Bottom-left corner
          { x: 110, y: 20 },  // Bottom-right corner
          { x: 60, y: 10 },   // Top edge
          { x: 60, y: 20 },   // Bottom edge
          { x: 10, y: 15 },   // Left edge
          { x: 110, y: 15 }   // Right edge
        ];

        edgePoints.forEach(point => {
          const hits = spatialIndex.queryPoint(point);
          expect(hits.some(e => e.guid === 'wall-1')).toBe(true);
        });
      });
    });

    describe('Circle Hit Testing', () => {
      it('should accurately detect hits inside circles', () => {
        const insidePoints: Point[] = [
          { x: 150, y: 50 },  // Center
          { x: 155, y: 50 },  // Right of center
          { x: 145, y: 50 },  // Left of center
          { x: 150, y: 55 },  // Below center
          { x: 150, y: 45 }   // Above center
        ];

        insidePoints.forEach(point => {
          const hits = spatialIndex.queryPoint(point);
          expect(hits.some(e => e.guid === 'column-1')).toBe(true);
        });
      });

      it('should accurately detect hits on circle edge', () => {
        const edgePoints: Point[] = [
          { x: 165, y: 50 },  // Right edge
          { x: 135, y: 50 },  // Left edge
          { x: 150, y: 65 },  // Bottom edge
          { x: 150, y: 35 }   // Top edge
        ];

        edgePoints.forEach(point => {
          const hits = spatialIndex.queryPoint(point);
          expect(hits.some(e => e.guid === 'column-1')).toBe(true);
        });
      });

      it('should accurately miss points outside circles', () => {
        const outsidePoints: Point[] = [
          { x: 170, y: 50 },  // Right of circle
          { x: 130, y: 50 },  // Left of circle
          { x: 150, y: 70 },  // Below circle
          { x: 150, y: 30 },  // Above circle
          { x: 170, y: 70 }   // Diagonal outside
        ];

        outsidePoints.forEach(point => {
          const hits = spatialIndex.queryPoint(point);
          expect(hits.some(e => e.guid === 'column-1')).toBe(false);
        });
      });
    });

    describe('Line Hit Testing with Tolerance', () => {
      it('should accurately detect hits on lines with tolerance', () => {
        const onLinePoints: Point[] = [
          { x: 200, y: 30 },  // Start point
          { x: 250, y: 30 },  // Middle point
          { x: 300, y: 30 }   // End point
        ];

        onLinePoints.forEach(point => {
          const hits = spatialIndex.queryPoint(point, 1);
          expect(hits.some(e => e.guid === 'beam-1')).toBe(true);
        });
      });

      it('should detect hits near lines within tolerance', () => {
        const nearLinePoints: Point[] = [
          { x: 250, y: 32 },  // 2 units below line
          { x: 250, y: 28 },  // 2 units above line
          { x: 250, y: 33 },  // 3 units below line
          { x: 250, y: 27 }   // 3 units above line
        ];

        nearLinePoints.forEach(point => {
          const hitsWithTolerance = spatialIndex.queryPoint(point, 5);
          const hitsWithoutTolerance = spatialIndex.queryPoint(point, 0);
          
          expect(hitsWithTolerance.some(e => e.guid === 'beam-1')).toBe(true);
          expect(hitsWithoutTolerance.some(e => e.guid === 'beam-1')).toBe(false);
        });
      });

      it('should miss points far from lines even with tolerance', () => {
        const farPoints: Point[] = [
          { x: 250, y: 40 },  // 10 units below
          { x: 250, y: 20 },  // 10 units above
          { x: 180, y: 30 },  // Before start
          { x: 320, y: 30 }   // After end
        ];

        farPoints.forEach(point => {
          const hits = spatialIndex.queryPoint(point, 5);
          expect(hits.some(e => e.guid === 'beam-1')).toBe(false);
        });
      });
    });

    describe('Precision Testing', () => {
      it('should handle sub-pixel precision accurately', () => {
        const precisePoints: Point[] = [
          { x: 55.1, y: 15.1 },
          { x: 55.9, y: 15.9 },
          { x: 54.99, y: 14.99 },
          { x: 55.01, y: 15.01 }
        ];

        precisePoints.forEach(point => {
          const hits = spatialIndex.queryPoint(point);
          expect(hits.some(e => e.guid === 'door-1')).toBe(true);
        });
      });

      it('should distinguish between very close elements', () => {
        // Add two very close elements
        const closeElement1: IFCElement = {
          guid: 'close-1',
          ifcClass: 'IfcWall',
          geometry: {
            type: 'rect',
            data: { x: 400, y: 100, width: 5, height: 5 },
            bounds: { minX: 400, minY: 100, maxX: 405, maxY: 105 }
          },
          properties: {},
          bounds: { minX: 400, minY: 100, maxX: 405, maxY: 105 },
          visible: true,
          style: {}
        };

        const closeElement2: IFCElement = {
          guid: 'close-2',
          ifcClass: 'IfcWall',
          geometry: {
            type: 'rect',
            data: { x: 406, y: 100, width: 5, height: 5 },
            bounds: { minX: 406, minY: 100, maxX: 411, maxY: 105 }
          },
          properties: {},
          bounds: { minX: 406, minY: 100, maxX: 411, maxY: 105 },
          visible: true,
          style: {}
        };

        const extendedElements = [...testElements, closeElement1, closeElement2];
        const extendedIndex = createSpatialIndex(extendedElements);

        // Test points that should hit only one element
        const point1: Point = { x: 402, y: 102 };
        const point2: Point = { x: 408, y: 102 };

        const hits1 = extendedIndex.queryPoint(point1);
        const hits2 = extendedIndex.queryPoint(point2);

        expect(hits1.some(e => e.guid === 'close-1')).toBe(true);
        expect(hits1.some(e => e.guid === 'close-2')).toBe(false);
        
        expect(hits2.some(e => e.guid === 'close-1')).toBe(false);
        expect(hits2.some(e => e.guid === 'close-2')).toBe(true);
      });
    });
  });

  describe('Hit Testing Performance', () => {
    it('should perform single point queries efficiently', () => {
      const testPoint: Point = { x: 55, y: 15 };
      
      const startTime = performance.now();
      
      // Perform 1000 point queries
      for (let i = 0; i < 1000; i++) {
        spatialIndex.queryPoint(testPoint);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 queries in less than 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should handle batch point queries efficiently', () => {
      const testPoints: Point[] = [];
      
      // Generate 100 random test points
      for (let i = 0; i < 100; i++) {
        testPoints.push({
          x: Math.random() * 400,
          y: Math.random() * 100
        });
      }
      
      const startTime = performance.now();
      
      // Query all points
      const results = testPoints.map(point => spatialIndex.queryPoint(point));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100 queries in less than 10ms
      expect(duration).toBeLessThan(10);
      expect(results).toHaveLength(100);
    });

    it('should scale well with large datasets', () => {
      // Create a large dataset with 1000 elements
      const largeDataset: IFCElement[] = [];
      
      for (let i = 0; i < 1000; i++) {
        const x = (i % 100) * 10;
        const y = Math.floor(i / 100) * 10;
        
        largeDataset.push({
          guid: `element-${i}`,
          ifcClass: 'IfcWall',
          geometry: {
            type: 'rect',
            data: { x, y, width: 5, height: 5 },
            bounds: { minX: x, minY: y, maxX: x + 5, maxY: y + 5 }
          },
          properties: {},
          bounds: { minX: x, minY: y, maxX: x + 5, maxY: y + 5 },
          visible: true,
          style: {}
        });
      }
      
      const largeIndex = createSpatialIndex(largeDataset);
      
      const startTime = performance.now();
      
      // Perform 100 queries on large dataset
      for (let i = 0; i < 100; i++) {
        const point: Point = {
          x: Math.random() * 1000,
          y: Math.random() * 100
        };
        largeIndex.queryPoint(point);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should still be fast even with large dataset
      expect(duration).toBeLessThan(20);
    });

    it('should handle tolerance queries efficiently', () => {
      const testPoint: Point = { x: 250, y: 35 };
      
      const startTime = performance.now();
      
      // Perform 1000 tolerance queries
      for (let i = 0; i < 1000; i++) {
        spatialIndex.queryPoint(testPoint, 5);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Tolerance queries should still be fast
      expect(duration).toBeLessThan(100);
    });

    it('should maintain performance with overlapping elements', () => {
      // Create many overlapping elements
      const overlappingElements: IFCElement[] = [];
      
      for (let i = 0; i < 50; i++) {
        overlappingElements.push({
          guid: `overlap-${i}`,
          ifcClass: 'IfcWall',
          geometry: {
            type: 'rect',
            data: { x: 500 + i, y: 200 + i, width: 100, height: 100 },
            bounds: { minX: 500 + i, minY: 200 + i, maxX: 600 + i, maxY: 300 + i }
          },
          properties: {},
          bounds: { minX: 500 + i, minY: 200 + i, maxX: 600 + i, maxY: 300 + i },
          visible: true,
          style: {}
        });
      }
      
      const overlappingIndex = createSpatialIndex([...testElements, ...overlappingElements]);
      
      // Point that hits many overlapping elements
      const overlapPoint: Point = { x: 550, y: 250 };
      
      const startTime = performance.now();
      
      // Perform queries on overlapping area
      for (let i = 0; i < 100; i++) {
        const results = overlappingIndex.queryPoint(overlapPoint);
        expect(results.length).toBeGreaterThan(10); // Should hit many elements
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle overlapping elements efficiently
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Hit Testing Edge Cases', () => {
    it('should handle zero-area elements', () => {
      const pointElement: IFCElement = {
        guid: 'point-1',
        ifcClass: 'IfcNode',
        geometry: {
          type: 'circle',
          data: { cx: 600, cy: 300, r: 0 },
          bounds: { minX: 600, minY: 300, maxX: 600, maxY: 300 }
        },
        properties: {},
        bounds: { minX: 600, minY: 300, maxX: 600, maxY: 300 },
        visible: true,
        style: {}
      };
      
      const extendedIndex = createSpatialIndex([...testElements, pointElement]);
      
      const exactHit = extendedIndex.queryPoint({ x: 600, y: 300 });
      const nearHit = extendedIndex.queryPoint({ x: 601, y: 301 }, 2);
      const missHit = extendedIndex.queryPoint({ x: 605, y: 305 }, 2);
      
      expect(exactHit.some(e => e.guid === 'point-1')).toBe(true);
      expect(nearHit.some(e => e.guid === 'point-1')).toBe(true);
      expect(missHit.some(e => e.guid === 'point-1')).toBe(false);
    });

    it('should handle elements at coordinate system boundaries', () => {
      const boundaryElement: IFCElement = {
        guid: 'boundary-1',
        ifcClass: 'IfcWall',
        geometry: {
          type: 'rect',
          data: { x: 0, y: 0, width: 10, height: 10 },
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 }
        },
        properties: {},
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        visible: true,
        style: {}
      };
      
      const boundaryIndex = createSpatialIndex([...testElements, boundaryElement]);
      
      const originHit = boundaryIndex.queryPoint({ x: 0, y: 0 });
      const cornerHit = boundaryIndex.queryPoint({ x: 10, y: 10 });
      
      expect(originHit.some(e => e.guid === 'boundary-1')).toBe(true);
      expect(cornerHit.some(e => e.guid === 'boundary-1')).toBe(true);
    });

    it('should handle negative coordinates', () => {
      const negativeElement: IFCElement = {
        guid: 'negative-1',
        ifcClass: 'IfcWall',
        geometry: {
          type: 'rect',
          data: { x: -50, y: -50, width: 20, height: 20 },
          bounds: { minX: -50, minY: -50, maxX: -30, maxY: -30 }
        },
        properties: {},
        bounds: { minX: -50, minY: -50, maxX: -30, maxY: -30 },
        visible: true,
        style: {}
      };
      
      const negativeIndex = createSpatialIndex([...testElements, negativeElement]);
      
      const negativeHit = negativeIndex.queryPoint({ x: -40, y: -40 });
      const negativeMiss = negativeIndex.queryPoint({ x: -60, y: -60 });
      
      expect(negativeHit.some(e => e.guid === 'negative-1')).toBe(true);
      expect(negativeMiss.some(e => e.guid === 'negative-1')).toBe(false);
    });
  });
});