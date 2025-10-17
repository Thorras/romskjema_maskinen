import { describe, it, expect, beforeEach } from 'vitest';
import { GridSpatialIndex, createSpatialIndex } from '../spatialIndex';
import type { IFCElement, BoundingBox, Point } from '@/types';

describe('Spatial Index', () => {
  let spatialIndex: GridSpatialIndex;
  let testElements: IFCElement[];

  beforeEach(() => {
    const bounds: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    spatialIndex = new GridSpatialIndex(bounds, 10);

    testElements = [
      {
        guid: 'wall-1',
        ifcClass: 'ifcwall',
        geometry: {
          type: 'rect',
          data: { x: 10, y: 10, width: 20, height: 5 },
          bounds: { minX: 10, minY: 10, maxX: 30, maxY: 15 },
        },
        properties: {},
        bounds: { minX: 10, minY: 10, maxX: 30, maxY: 15 },
        visible: true,
        style: {},
      },
      {
        guid: 'door-1',
        ifcClass: 'ifcdoor',
        geometry: {
          type: 'rect',
          data: { x: 20, y: 10, width: 3, height: 5 },
          bounds: { minX: 20, minY: 10, maxX: 23, maxY: 15 },
        },
        properties: {},
        bounds: { minX: 20, minY: 10, maxX: 23, maxY: 15 },
        visible: true,
        style: {},
      },
      {
        guid: 'window-1',
        ifcClass: 'ifcwindow',
        geometry: {
          type: 'rect',
          data: { x: 50, y: 50, width: 10, height: 3 },
          bounds: { minX: 50, minY: 50, maxX: 60, maxY: 53 },
        },
        properties: {},
        bounds: { minX: 50, minY: 50, maxX: 60, maxY: 53 },
        visible: true,
        style: {},
      },
      {
        guid: 'column-1',
        ifcClass: 'ifccolumn',
        geometry: {
          type: 'circle',
          data: { cx: 80, cy: 80, r: 5 },
          bounds: { minX: 75, minY: 75, maxX: 85, maxY: 85 },
        },
        properties: {},
        bounds: { minX: 75, minY: 75, maxX: 85, maxY: 85 },
        visible: true,
        style: {},
      },
    ];
  });

  describe('GridSpatialIndex', () => {
    describe('insert and query', () => {
      it('should insert and retrieve elements', () => {
        testElements.forEach(element => spatialIndex.insert(element));

        const queryBounds: BoundingBox = { minX: 0, minY: 0, maxX: 50, maxY: 50 };
        const results = spatialIndex.query(queryBounds);

        expect(results).toHaveLength(3); // wall, door, window
        expect(results.map(e => e.guid)).toContain('wall-1');
        expect(results.map(e => e.guid)).toContain('door-1');
        expect(results.map(e => e.guid)).toContain('window-1');
        expect(results.map(e => e.guid)).not.toContain('column-1');
      });

      it('should return empty array for non-intersecting query', () => {
        testElements.forEach(element => spatialIndex.insert(element));

        const queryBounds: BoundingBox = { minX: 90, minY: 90, maxX: 100, maxY: 100 };
        const results = spatialIndex.query(queryBounds);

        expect(results).toHaveLength(0);
      });

      it('should handle overlapping elements', () => {
        testElements.forEach(element => spatialIndex.insert(element));

        // Query area that overlaps wall and door
        const queryBounds: BoundingBox = { minX: 15, minY: 8, maxX: 25, maxY: 17 };
        const results = spatialIndex.query(queryBounds);

        expect(results).toHaveLength(2);
        expect(results.map(e => e.guid)).toContain('wall-1');
        expect(results.map(e => e.guid)).toContain('door-1');
      });

      it('should handle exact boundary matches', () => {
        testElements.forEach(element => spatialIndex.insert(element));

        // Query with exact bounds of wall element
        const queryBounds: BoundingBox = { minX: 10, minY: 10, maxX: 30, maxY: 15 };
        const results = spatialIndex.query(queryBounds);

        expect(results.map(e => e.guid)).toContain('wall-1');
      });
    });

    describe('queryPoint', () => {
      beforeEach(() => {
        testElements.forEach(element => spatialIndex.insert(element));
      });

      it('should find element at point', () => {
        const point: Point = { x: 20, y: 12 };
        const results = spatialIndex.queryPoint(point);

        expect(results).toHaveLength(2); // wall and door overlap at this point
        expect(results.map(e => e.guid)).toContain('wall-1');
        expect(results.map(e => e.guid)).toContain('door-1');
      });

      it('should return empty array for point with no elements', () => {
        const point: Point = { x: 5, y: 5 };
        const results = spatialIndex.queryPoint(point);

        expect(results).toHaveLength(0);
      });

      it('should use tolerance for point queries', () => {
        const point: Point = { x: 9, y: 12 }; // Just outside wall
        const resultsNoTolerance = spatialIndex.queryPoint(point, 0);
        const resultsWithTolerance = spatialIndex.queryPoint(point, 2);

        expect(resultsNoTolerance).toHaveLength(0);
        expect(resultsWithTolerance.map(e => e.guid)).toContain('wall-1');
      });

      it('should handle circle hit testing', () => {
        const point: Point = { x: 80, y: 80 }; // Center of column
        const results = spatialIndex.queryPoint(point);

        expect(results.map(e => e.guid)).toContain('column-1');
      });

      it('should handle circle edge hit testing', () => {
        const point: Point = { x: 85, y: 80 }; // Edge of column
        const results = spatialIndex.queryPoint(point);

        expect(results.map(e => e.guid)).toContain('column-1');
      });

      it('should miss circle with point outside radius', () => {
        const point: Point = { x: 90, y: 80 }; // Outside column
        const results = spatialIndex.queryPoint(point);

        expect(results.map(e => e.guid)).not.toContain('column-1');
      });
    });

    describe('remove', () => {
      it('should remove element from index', () => {
        testElements.forEach(element => spatialIndex.insert(element));

        const queryBounds: BoundingBox = { minX: 0, minY: 0, maxX: 50, maxY: 50 };
        let results = spatialIndex.query(queryBounds);
        expect(results).toHaveLength(3);

        spatialIndex.remove(testElements[0]); // Remove wall

        results = spatialIndex.query(queryBounds);
        expect(results).toHaveLength(2);
        expect(results.map(e => e.guid)).not.toContain('wall-1');
      });

      it('should handle removing non-existent element gracefully', () => {
        testElements.forEach(element => spatialIndex.insert(element));

        const nonExistentElement: IFCElement = {
          guid: 'non-existent',
          ifcClass: 'ifcwall',
          geometry: {
            type: 'rect',
            data: { x: 0, y: 0, width: 1, height: 1 },
            bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
          },
          properties: {},
          bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
          visible: true,
          style: {},
        };

        expect(() => spatialIndex.remove(nonExistentElement)).not.toThrow();
      });
    });

    describe('clear', () => {
      it('should clear all elements from index', () => {
        testElements.forEach(element => spatialIndex.insert(element));

        const queryBounds: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
        let results = spatialIndex.query(queryBounds);
        expect(results).toHaveLength(4);

        spatialIndex.clear();

        results = spatialIndex.query(queryBounds);
        expect(results).toHaveLength(0);
      });
    });

    describe('rebuild', () => {
      it('should rebuild index with new elements', () => {
        testElements.forEach(element => spatialIndex.insert(element));

        const newElements = testElements.slice(0, 2); // Only first two elements
        spatialIndex.rebuild(newElements);

        const queryBounds: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
        const results = spatialIndex.query(queryBounds);

        expect(results).toHaveLength(2);
        expect(results.map(e => e.guid)).toContain('wall-1');
        expect(results.map(e => e.guid)).toContain('door-1');
        expect(results.map(e => e.guid)).not.toContain('window-1');
        expect(results.map(e => e.guid)).not.toContain('column-1');
      });
    });

    describe('getStats', () => {
      it('should return correct statistics', () => {
        testElements.forEach(element => spatialIndex.insert(element));

        const stats = (spatialIndex as any).getStats();

        expect(stats.totalElements).toBe(4);
        expect(stats.totalCells).toBeGreaterThan(0);
        expect(stats.averageElementsPerCell).toBeGreaterThan(0);
      });

      it('should return zero stats for empty index', () => {
        const stats = (spatialIndex as any).getStats();

        expect(stats.totalElements).toBe(0);
        expect(stats.totalCells).toBe(0);
        expect(stats.averageElementsPerCell).toBe(0);
      });
    });
  });

  describe('Hit Testing', () => {
    beforeEach(() => {
      testElements.forEach(element => spatialIndex.insert(element));
    });

    describe('Rectangle hit testing', () => {
      it('should hit test rectangle correctly', () => {
        const insidePoint: Point = { x: 20, y: 12 };
        const outsidePoint: Point = { x: 5, y: 5 };
        const edgePoint: Point = { x: 10, y: 10 };

        const insideResults = spatialIndex.queryPoint(insidePoint);
        const outsideResults = spatialIndex.queryPoint(outsidePoint);
        const edgeResults = spatialIndex.queryPoint(edgePoint);

        expect(insideResults.map(e => e.guid)).toContain('wall-1');
        expect(outsideResults.map(e => e.guid)).not.toContain('wall-1');
        expect(edgeResults.map(e => e.guid)).toContain('wall-1');
      });
    });

    describe('Circle hit testing', () => {
      it('should hit test circle correctly', () => {
        const centerPoint: Point = { x: 80, y: 80 };
        const insidePoint: Point = { x: 82, y: 82 };
        const edgePoint: Point = { x: 85, y: 80 };
        const outsidePoint: Point = { x: 90, y: 80 };

        const centerResults = spatialIndex.queryPoint(centerPoint);
        const insideResults = spatialIndex.queryPoint(insidePoint);
        const edgeResults = spatialIndex.queryPoint(edgePoint);
        const outsideResults = spatialIndex.queryPoint(outsidePoint);

        expect(centerResults.map(e => e.guid)).toContain('column-1');
        expect(insideResults.map(e => e.guid)).toContain('column-1');
        expect(edgeResults.map(e => e.guid)).toContain('column-1');
        expect(outsideResults.map(e => e.guid)).not.toContain('column-1');
      });
    });

    describe('Line hit testing', () => {
      it('should hit test line with tolerance', () => {
        const lineElement: IFCElement = {
          guid: 'line-1',
          ifcClass: 'ifcbeam',
          geometry: {
            type: 'line',
            data: { x1: 0, y1: 0, x2: 10, y2: 10 },
            bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          },
          properties: {},
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          visible: true,
          style: {},
        };

        spatialIndex.insert(lineElement);

        const onLinePoint: Point = { x: 5, y: 5 };
        const nearLinePoint: Point = { x: 5, y: 6 };
        const farFromLinePoint: Point = { x: 5, y: 15 };

        const onLineResults = spatialIndex.queryPoint(onLinePoint, 0);
        const nearLineResults = spatialIndex.queryPoint(nearLinePoint, 2);
        const farResults = spatialIndex.queryPoint(farFromLinePoint, 2);

        expect(onLineResults.map(e => e.guid)).toContain('line-1');
        expect(nearLineResults.map(e => e.guid)).toContain('line-1');
        expect(farResults.map(e => e.guid)).not.toContain('line-1');
      });
    });

    describe('Polygon hit testing', () => {
      it('should hit test polygon correctly', () => {
        const triangleElement: IFCElement = {
          guid: 'triangle-1',
          ifcClass: 'ifcstair',
          geometry: {
            type: 'polygon',
            data: {
              points: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 5, y: 10 },
              ],
            },
            bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          },
          properties: {},
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          visible: true,
          style: {},
        };

        spatialIndex.insert(triangleElement);

        const insidePoint: Point = { x: 5, y: 3 };
        const outsidePoint: Point = { x: 5, y: 15 };
        const edgePoint: Point = { x: 5, y: 0 };

        const insideResults = spatialIndex.queryPoint(insidePoint);
        const outsideResults = spatialIndex.queryPoint(outsidePoint);
        const edgeResults = spatialIndex.queryPoint(edgePoint, 1);

        expect(insideResults.map(e => e.guid)).toContain('triangle-1');
        expect(outsideResults.map(e => e.guid)).not.toContain('triangle-1');
        expect(edgeResults.map(e => e.guid)).toContain('triangle-1');
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large number of elements efficiently', () => {
      const largeElementSet: IFCElement[] = [];
      
      // Create 1000 elements in a grid
      for (let i = 0; i < 1000; i++) {
        const x = (i % 100) * 10;
        const y = Math.floor(i / 100) * 10;
        
        largeElementSet.push({
          guid: `element-${i}`,
          ifcClass: 'ifcwall',
          geometry: {
            type: 'rect',
            data: { x, y, width: 5, height: 5 },
            bounds: { minX: x, minY: y, maxX: x + 5, maxY: y + 5 },
          },
          properties: {},
          bounds: { minX: x, minY: y, maxX: x + 5, maxY: y + 5 },
          visible: true,
          style: {},
        });
      }

      const largeBounds: BoundingBox = { minX: 0, minY: 0, maxX: 1000, maxY: 100 };
      const largeIndex = new GridSpatialIndex(largeBounds, 50);

      const startTime = performance.now();
      largeElementSet.forEach(element => largeIndex.insert(element));
      const insertTime = performance.now() - startTime;

      const queryStartTime = performance.now();
      const results = largeIndex.query({ minX: 100, minY: 10, maxX: 200, maxY: 30 });
      const queryTime = performance.now() - queryStartTime;

      expect(insertTime).toBeLessThan(100); // Should complete in reasonable time
      expect(queryTime).toBeLessThan(10); // Queries should be fast
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle elements with zero area', () => {
      const pointElement: IFCElement = {
        guid: 'point-1',
        ifcClass: 'ifcnode',
        geometry: {
          type: 'circle',
          data: { cx: 50, cy: 50, r: 0 },
          bounds: { minX: 50, minY: 50, maxX: 50, maxY: 50 },
        },
        properties: {},
        bounds: { minX: 50, minY: 50, maxX: 50, maxY: 50 },
        visible: true,
        style: {},
      };

      spatialIndex.insert(pointElement);

      const exactPoint: Point = { x: 50, y: 50 };
      const nearbyPoint: Point = { x: 51, y: 51 };

      const exactResults = spatialIndex.queryPoint(exactPoint);
      const nearbyResults = spatialIndex.queryPoint(nearbyPoint, 2);

      expect(exactResults.map(e => e.guid)).toContain('point-1');
      expect(nearbyResults.map(e => e.guid)).toContain('point-1');
    });

    it('should handle elements outside index bounds', () => {
      const outsideElement: IFCElement = {
        guid: 'outside-1',
        ifcClass: 'ifcwall',
        geometry: {
          type: 'rect',
          data: { x: 200, y: 200, width: 10, height: 10 },
          bounds: { minX: 200, minY: 200, maxX: 210, maxY: 210 },
        },
        properties: {},
        bounds: { minX: 200, minY: 200, maxX: 210, maxY: 210 },
        visible: true,
        style: {},
      };

      expect(() => spatialIndex.insert(outsideElement)).not.toThrow();

      const queryBounds: BoundingBox = { minX: 195, minY: 195, maxX: 215, maxY: 215 };
      const results = spatialIndex.query(queryBounds);

      expect(results.map(e => e.guid)).toContain('outside-1');
    });
  });

  describe('createSpatialIndex factory function', () => {
    it('should create spatial index with calculated bounds', () => {
      const index = createSpatialIndex(testElements);

      const queryBounds: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
      const results = index.query(queryBounds);

      expect(results).toHaveLength(4);
    });

    it('should create spatial index with provided bounds', () => {
      const customBounds: BoundingBox = { minX: -50, minY: -50, maxX: 150, maxY: 150 };
      const index = createSpatialIndex(testElements, customBounds);

      const queryBounds: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
      const results = index.query(queryBounds);

      expect(results).toHaveLength(4);
    });

    it('should handle empty element array', () => {
      const index = createSpatialIndex([]);

      const queryBounds: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
      const results = index.query(queryBounds);

      expect(results).toHaveLength(0);
    });

    it('should calculate appropriate cell size', () => {
      const smallElements = testElements.map(el => ({
        ...el,
        bounds: {
          minX: el.bounds.minX / 10,
          minY: el.bounds.minY / 10,
          maxX: el.bounds.maxX / 10,
          maxY: el.bounds.maxY / 10,
        },
      }));

      const index = createSpatialIndex(smallElements);
      const stats = (index as any).getStats();

      expect(stats.totalElements).toBe(4);
      expect(stats.totalCells).toBeGreaterThan(0);
    });
  });
});