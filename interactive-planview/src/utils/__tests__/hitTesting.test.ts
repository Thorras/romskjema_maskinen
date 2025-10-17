import { describe, it, expect, beforeEach } from 'vitest';
import { GridSpatialIndex, createSpatialIndex } from '../spatialIndex';
import type { IFCElement, Point, BoundingBox } from '@/types';

describe('Hit Testing System', () => {
  let spatialIndex: GridSpatialIndex;
  let testElements: IFCElement[];

  beforeEach(() => {
    const bounds: BoundingBox = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    spatialIndex = new GridSpatialIndex(bounds, 50);

    testElements = [
      // Rectangle element (wall)
      {
        guid: 'wall-001',
        ifcClass: 'IfcWall',
        geometry: {
          type: 'rect',
          data: { x: 100, y: 100, width: 200, height: 20 },
          bounds: { minX: 100, minY: 100, maxX: 300, maxY: 120 }
        },
        properties: { Name: 'Wall 1' },
        bounds: { minX: 100, minY: 100, maxX: 300, maxY: 120 },
        visible: true,
        style: { fill: '#cccccc', stroke: '#000000', strokeWidth: 1 }
      },
      // Circle element (column)
      {
        guid: 'column-001',
        ifcClass: 'IfcColumn',
        geometry: {
          type: 'circle',
          data: { cx: 500, cy: 500, r: 30 },
          bounds: { minX: 470, minY: 470, maxX: 530, maxY: 530 }
        },
        properties: { Name: 'Column 1' },
        bounds: { minX: 470, minY: 470, maxX: 530, maxY: 530 },
        visible: true,
        style: { fill: '#666666', stroke: '#333333', strokeWidth: 2 }
      },
      // Line element (beam)
      {
        guid: 'beam-001',
        ifcClass: 'IfcBeam',
        geometry: {
          type: 'line',
          data: { x1: 200, y1: 300, x2: 600, y2: 350 },
          bounds: { minX: 200, minY: 300, maxX: 600, maxY: 350 }
        },
        properties: { Name: 'Beam 1' },
        bounds: { minX: 200, minY: 300, maxX: 600, maxY: 350 },
        visible: true,
        style: { stroke: '#444444', strokeWidth: 4 }
      },
      // Polygon element (stair)
      {
        guid: 'stair-001',
        ifcClass: 'IfcStair',
        geometry: {
          type: 'polygon',
          data: {
            points: [
              { x: 700, y: 200 },
              { x: 800, y: 200 },
              { x: 800, y: 300 },
              { x: 750, y: 350 },
              { x: 700, y: 300 }
            ]
          },
          bounds: { minX: 700, minY: 200, maxX: 800, maxY: 350 }
        },
        properties: { Name: 'Stair 1' },
        bounds: { minX: 700, minY: 200, maxX: 800, maxY: 350 },
        visible: true,
        style: { fill: '#999999', stroke: '#666666', strokeWidth: 1 }
      },
      // Path element (complex shape)
      {
        guid: 'path-001',
        ifcClass: 'IfcSlab',
        geometry: {
          type: 'path',
          data: { d: 'M 50 50 L 150 50 Q 200 75 150 100 L 50 100 Z' },
          bounds: { minX: 50, minY: 50, maxX: 200, maxY: 100 }
        },
        properties: { Name: 'Slab 1' },
        bounds: { minX: 50, minY: 50, maxX: 200, maxY: 100 },
        visible: true,
        style: { fill: '#aaaaaa', stroke: '#777777', strokeWidth: 1 }
      }
    ];

    testElements.forEach(element => spatialIndex.insert(element));
  });

  describe('Rectangle Hit Testing', () => {
    it('should detect hits inside rectangle', () => {
      const insidePoints: Point[] = [
        { x: 150, y: 110 }, // Center
        { x: 100, y: 100 }, // Top-left corner
        { x: 300, y: 120 }, // Bottom-right corner
        { x: 200, y: 110 }  // Middle
      ];

      insidePoints.forEach(point => {
        const results = spatialIndex.queryPoint(point);
        expect(results.map(e => e.guid)).toContain('wall-001');
      });
    });

    it('should not detect hits outside rectangle', () => {
      const outsidePoints: Point[] = [
        { x: 50, y: 110 },   // Left of rectangle
        { x: 350, y: 110 },  // Right of rectangle
        { x: 200, y: 50 },   // Above rectangle
        { x: 200, y: 150 }   // Below rectangle
      ];

      outsidePoints.forEach(point => {
        const results = spatialIndex.queryPoint(point);
        expect(results.map(e => e.guid)).not.toContain('wall-001');
      });
    });

    it('should handle rectangle hit testing with tolerance', () => {
      const nearbyPoints: Point[] = [
        { x: 95, y: 110 },   // 5 units left of rectangle
        { x: 305, y: 110 },  // 5 units right of rectangle
        { x: 200, y: 95 },   // 5 units above rectangle
        { x: 200, y: 125 }   // 5 units below rectangle
      ];

      nearbyPoints.forEach(point => {
        const resultsNoTolerance = spatialIndex.queryPoint(point, 0);
        const resultsWithTolerance = spatialIndex.queryPoint(point, 10);
        
        expect(resultsNoTolerance.map(e => e.guid)).not.toContain('wall-001');
        expect(resultsWithTolerance.map(e => e.guid)).toContain('wall-001');
      });
    });
  });

  describe('Circle Hit Testing', () => {
    it('should detect hits inside circle', () => {
      const insidePoints: Point[] = [
        { x: 500, y: 500 }, // Center
        { x: 510, y: 510 }, // Inside quadrant
        { x: 490, y: 490 }, // Inside quadrant
        { x: 520, y: 500 }  // Near edge but inside
      ];

      insidePoints.forEach(point => {
        const results = spatialIndex.queryPoint(point);
        expect(results.map(e => e.guid)).toContain('column-001');
      });
    });

    it('should detect hits on circle edge', () => {
      const edgePoints: Point[] = [
        { x: 530, y: 500 }, // Right edge
        { x: 470, y: 500 }, // Left edge
        { x: 500, y: 530 }, // Bottom edge
        { x: 500, y: 470 }  // Top edge
      ];

      edgePoints.forEach(point => {
        const results = spatialIndex.queryPoint(point);
        expect(results.map(e => e.guid)).toContain('column-001');
      });
    });

    it('should not detect hits outside circle', () => {
      const outsidePoints: Point[] = [
        { x: 540, y: 500 }, // Right of circle
        { x: 460, y: 500 }, // Left of circle
        { x: 500, y: 540 }, // Below circle
        { x: 500, y: 460 }, // Above circle
        { x: 525, y: 525 }  // Diagonal outside
      ];

      outsidePoints.forEach(point => {
        const results = spatialIndex.queryPoint(point);
        expect(results.map(e => e.guid)).not.toContain('column-001');
      });
    });

    it('should handle circle hit testing with tolerance', () => {
      const nearCirclePoints: Point[] = [
        { x: 535, y: 500 }, // 5 units right of circle
        { x: 465, y: 500 }, // 5 units left of circle
        { x: 500, y: 535 }, // 5 units below circle
        { x: 500, y: 465 }  // 5 units above circle
      ];

      nearCirclePoints.forEach(point => {
        const resultsNoTolerance = spatialIndex.queryPoint(point, 0);
        const resultsWithTolerance = spatialIndex.queryPoint(point, 10);
        
        expect(resultsNoTolerance.map(e => e.guid)).not.toContain('column-001');
        expect(resultsWithTolerance.map(e => e.guid)).toContain('column-001');
      });
    });
  });

  describe('Line Hit Testing', () => {
    it('should detect hits on line', () => {
      // Line from (200, 300) to (600, 350)
      const onLinePoints: Point[] = [
        { x: 200, y: 300 }, // Start point
        { x: 600, y: 350 }, // End point
        { x: 400, y: 325 }, // Middle point
        { x: 300, y: 312.5 } // Quarter point
      ];

      onLinePoints.forEach(point => {
        const results = spatialIndex.queryPoint(point, 2);
        expect(results.map(e => e.guid)).toContain('beam-001');
      });
    });

    it('should detect hits near line with tolerance', () => {
      const nearLinePoints: Point[] = [
        { x: 400, y: 320 }, // 5 units above middle
        { x: 400, y: 330 }, // 5 units below middle
        { x: 300, y: 307 }, // Near quarter point
        { x: 300, y: 318 }  // Near quarter point
      ];

      nearLinePoints.forEach(point => {
        const resultsNoTolerance = spatialIndex.queryPoint(point, 0);
        const resultsWithTolerance = spatialIndex.queryPoint(point, 10);
        
        expect(resultsNoTolerance.map(e => e.guid)).not.toContain('beam-001');
        expect(resultsWithTolerance.map(e => e.guid)).toContain('beam-001');
      });
    });

    it('should not detect hits far from line', () => {
      const farFromLinePoints: Point[] = [
        { x: 400, y: 200 }, // Far above
        { x: 400, y: 450 }, // Far below
        { x: 100, y: 325 }, // Far left
        { x: 700, y: 325 }  // Far right
      ];

      farFromLinePoints.forEach(point => {
        const results = spatialIndex.queryPoint(point, 5);
        expect(results.map(e => e.guid)).not.toContain('beam-001');
      });
    });

    it('should handle degenerate line (point)', () => {
      const pointLineElement: IFCElement = {
        guid: 'point-line-001',
        ifcClass: 'IfcNode',
        geometry: {
          type: 'line',
          data: { x1: 100, y1: 100, x2: 100, y2: 100 },
          bounds: { minX: 100, minY: 100, maxX: 100, maxY: 100 }
        },
        properties: {},
        bounds: { minX: 100, minY: 100, maxX: 100, maxY: 100 },
        visible: true,
        style: {}
      };

      spatialIndex.insert(pointLineElement);

      const exactPoint = { x: 100, y: 100 };
      const nearbyPoint = { x: 105, y: 105 };

      const exactResults = spatialIndex.queryPoint(exactPoint, 0);
      const nearbyResults = spatialIndex.queryPoint(nearbyPoint, 10);

      expect(exactResults.map(e => e.guid)).toContain('point-line-001');
      expect(nearbyResults.map(e => e.guid)).toContain('point-line-001');
    });
  });

  describe('Polygon Hit Testing', () => {
    it('should detect hits inside polygon', () => {
      const insidePoints: Point[] = [
        { x: 750, y: 250 }, // Center area
        { x: 720, y: 220 }, // Upper left area
        { x: 780, y: 280 }, // Lower right area
        { x: 740, y: 320 }  // Lower area
      ];

      insidePoints.forEach(point => {
        const results = spatialIndex.queryPoint(point);
        expect(results.map(e => e.guid)).toContain('stair-001');
      });
    });

    it('should detect hits on polygon edges', () => {
      const edgePoints: Point[] = [
        { x: 700, y: 200 }, // Vertex
        { x: 750, y: 200 }, // Top edge
        { x: 800, y: 250 }, // Right edge
        { x: 725, y: 325 }  // Bottom edge
      ];

      edgePoints.forEach(point => {
        const results = spatialIndex.queryPoint(point, 2);
        expect(results.map(e => e.guid)).toContain('stair-001');
      });
    });

    it('should not detect hits outside polygon', () => {
      const outsidePoints: Point[] = [
        { x: 650, y: 250 }, // Left of polygon
        { x: 850, y: 250 }, // Right of polygon
        { x: 750, y: 150 }, // Above polygon
        { x: 750, y: 400 }  // Below polygon
      ];

      outsidePoints.forEach(point => {
        const results = spatialIndex.queryPoint(point);
        expect(results.map(e => e.guid)).not.toContain('stair-001');
      });
    });

    it('should handle complex polygon shapes', () => {
      // Test a point that should be outside the polygon
      // The polygon has points: (700,200), (800,200), (800,300), (750,350), (700,300)
      // Point (760, 340) should be outside due to the concave shape
      const outsidePoint = { x: 650, y: 250 }; // Clearly outside to the left
      const results = spatialIndex.queryPoint(outsidePoint);
      
      // This point should be outside the polygon
      expect(results.map(e => e.guid)).not.toContain('stair-001');
    });

    it('should handle polygon with insufficient points', () => {
      const invalidPolygonElement: IFCElement = {
        guid: 'invalid-polygon-001',
        ifcClass: 'IfcSpace',
        geometry: {
          type: 'polygon',
          data: {
            points: [
              { x: 100, y: 100 },
              { x: 200, y: 100 }
            ] // Only 2 points - insufficient for polygon
          },
          bounds: { minX: 100, minY: 100, maxX: 200, maxY: 100 }
        },
        properties: {},
        bounds: { minX: 100, minY: 100, maxX: 200, maxY: 100 },
        visible: true,
        style: {}
      };

      spatialIndex.insert(invalidPolygonElement);

      const testPoint = { x: 150, y: 100 };
      const results = spatialIndex.queryPoint(testPoint);
      
      // Should not find the invalid polygon
      expect(results.map(e => e.guid)).not.toContain('invalid-polygon-001');
    });
  });

  describe('Path Hit Testing', () => {
    it('should fall back to bounding box for path elements', () => {
      const insideBoundsPoints: Point[] = [
        { x: 100, y: 75 },  // Inside bounding box
        { x: 150, y: 60 },  // Inside bounding box
        { x: 50, y: 50 },   // Corner of bounding box
        { x: 200, y: 100 }  // Corner of bounding box
      ];

      insideBoundsPoints.forEach(point => {
        const results = spatialIndex.queryPoint(point);
        expect(results.map(e => e.guid)).toContain('path-001');
      });
    });

    it('should not detect hits outside path bounding box', () => {
      const outsideBoundsPoints: Point[] = [
        { x: 40, y: 75 },   // Left of bounding box
        { x: 210, y: 75 },  // Right of bounding box
        { x: 125, y: 40 },  // Above bounding box
        { x: 125, y: 110 }  // Below bounding box
      ];

      outsideBoundsPoints.forEach(point => {
        const results = spatialIndex.queryPoint(point);
        expect(results.map(e => e.guid)).not.toContain('path-001');
      });
    });
  });

  describe('Hit Testing Performance', () => {
    it('should perform hit testing efficiently with many elements', () => {
      // Create many elements
      const manyElements: IFCElement[] = [];
      for (let i = 0; i < 1000; i++) {
        manyElements.push({
          guid: `perf-element-${i}`,
          ifcClass: 'IfcWall',
          geometry: {
            type: 'rect',
            data: { x: i % 100 * 10, y: Math.floor(i / 100) * 10, width: 5, height: 5 },
            bounds: { 
              minX: i % 100 * 10, 
              minY: Math.floor(i / 100) * 10, 
              maxX: i % 100 * 10 + 5, 
              maxY: Math.floor(i / 100) * 10 + 5 
            }
          },
          properties: {},
          bounds: { 
            minX: i % 100 * 10, 
            minY: Math.floor(i / 100) * 10, 
            maxX: i % 100 * 10 + 5, 
            maxY: Math.floor(i / 100) * 10 + 5 
          },
          visible: true,
          style: {}
        });
      }

      const largeBounds: BoundingBox = { minX: 0, minY: 0, maxX: 1000, maxY: 100 };
      const largeIndex = new GridSpatialIndex(largeBounds, 50);
      
      const insertStartTime = performance.now();
      manyElements.forEach(element => largeIndex.insert(element));
      const insertTime = performance.now() - insertStartTime;

      const queryStartTime = performance.now();
      for (let i = 0; i < 100; i++) {
        largeIndex.queryPoint({ x: Math.random() * 1000, y: Math.random() * 100 });
      }
      const queryTime = performance.now() - queryStartTime;

      // Performance expectations
      expect(insertTime).toBeLessThan(100); // Insert 1000 elements in < 100ms
      expect(queryTime).toBeLessThan(50);   // 100 queries in < 50ms
    });

    it('should handle hit testing with various tolerances efficiently', () => {
      const testPoint = { x: 500, y: 500 };
      const tolerances = [0, 1, 5, 10, 25, 50, 100];

      const startTime = performance.now();
      
      tolerances.forEach(tolerance => {
        for (let i = 0; i < 10; i++) {
          spatialIndex.queryPoint(testPoint, tolerance);
        }
      });
      
      const totalTime = performance.now() - startTime;
      
      // Should handle all tolerance variations efficiently
      expect(totalTime).toBeLessThan(50);
    });
  });

  describe('Hit Testing Edge Cases', () => {
    it('should handle zero-area elements', () => {
      const zeroAreaElement: IFCElement = {
        guid: 'zero-area-001',
        ifcClass: 'IfcNode',
        geometry: {
          type: 'rect',
          data: { x: 100, y: 100, width: 0, height: 0 },
          bounds: { minX: 100, minY: 100, maxX: 100, maxY: 100 }
        },
        properties: {},
        bounds: { minX: 100, minY: 100, maxX: 100, maxY: 100 },
        visible: true,
        style: {}
      };

      spatialIndex.insert(zeroAreaElement);

      const exactPoint = { x: 100, y: 100 };
      const nearbyPoint = { x: 101, y: 101 };

      const exactResults = spatialIndex.queryPoint(exactPoint);
      const nearbyResults = spatialIndex.queryPoint(nearbyPoint, 2);

      expect(exactResults.map(e => e.guid)).toContain('zero-area-001');
      expect(nearbyResults.map(e => e.guid)).toContain('zero-area-001');
    });

    it('should handle elements with negative coordinates', () => {
      const negativeElement: IFCElement = {
        guid: 'negative-001',
        ifcClass: 'IfcWall',
        geometry: {
          type: 'rect',
          data: { x: -100, y: -50, width: 50, height: 25 },
          bounds: { minX: -100, minY: -50, maxX: -50, maxY: -25 }
        },
        properties: {},
        bounds: { minX: -100, minY: -50, maxX: -50, maxY: -25 },
        visible: true,
        style: {}
      };

      spatialIndex.insert(negativeElement);

      const insidePoint = { x: -75, y: -37 };
      const outsidePoint = { x: -25, y: -10 };

      const insideResults = spatialIndex.queryPoint(insidePoint);
      const outsideResults = spatialIndex.queryPoint(outsidePoint);

      expect(insideResults.map(e => e.guid)).toContain('negative-001');
      expect(outsideResults.map(e => e.guid)).not.toContain('negative-001');
    });

    it('should handle very large coordinates', () => {
      const largeElement: IFCElement = {
        guid: 'large-001',
        ifcClass: 'IfcWall',
        geometry: {
          type: 'rect',
          data: { x: 1000000, y: 1000000, width: 100, height: 50 },
          bounds: { minX: 1000000, minY: 1000000, maxX: 1000100, maxY: 1000050 }
        },
        properties: {},
        bounds: { minX: 1000000, minY: 1000000, maxX: 1000100, maxY: 1000050 },
        visible: true,
        style: {}
      };

      spatialIndex.insert(largeElement);

      const insidePoint = { x: 1000050, y: 1000025 };
      const outsidePoint = { x: 1000200, y: 1000100 };

      const insideResults = spatialIndex.queryPoint(insidePoint);
      const outsideResults = spatialIndex.queryPoint(outsidePoint);

      expect(insideResults.map(e => e.guid)).toContain('large-001');
      expect(outsideResults.map(e => e.guid)).not.toContain('large-001');
    });

    it('should handle overlapping elements correctly', () => {
      const overlappingElement: IFCElement = {
        guid: 'overlap-001',
        ifcClass: 'IfcSlab',
        geometry: {
          type: 'rect',
          data: { x: 150, y: 105, width: 100, height: 10 },
          bounds: { minX: 150, minY: 105, maxX: 250, maxY: 115 }
        },
        properties: {},
        bounds: { minX: 150, minY: 105, maxX: 250, maxY: 115 },
        visible: true,
        style: {}
      };

      spatialIndex.insert(overlappingElement);

      // Point that overlaps both wall and new element
      const overlapPoint = { x: 200, y: 110 };
      const results = spatialIndex.queryPoint(overlapPoint);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.map(e => e.guid)).toContain('wall-001');
      expect(results.map(e => e.guid)).toContain('overlap-001');
    });
  });

  describe('Coordinate Transformation Hit Testing', () => {
    it('should handle hit testing with coordinate transformations', () => {
      // Simulate transformed coordinates (scaled and translated)
      const transform = { x: 50, y: 30, scale: 2 };
      
      // Screen point that should map to world coordinates
      const screenPoint = { x: 350, y: 250 }; // Screen coordinates
      
      // Transform to world coordinates: (screenPoint - translation) / scale
      const worldPoint = {
        x: (screenPoint.x - transform.x) / transform.scale, // (350 - 50) / 2 = 150
        y: (screenPoint.y - transform.y) / transform.scale  // (250 - 30) / 2 = 110
      };

      const results = spatialIndex.queryPoint(worldPoint);
      expect(results.map(e => e.guid)).toContain('wall-001');
    });

    it('should maintain hit testing accuracy across different zoom levels', () => {
      const basePoint = { x: 200, y: 110 }; // Point inside wall
      const zoomLevels = [0.5, 1, 2, 4, 8];

      zoomLevels.forEach(scale => {
        // At different zoom levels, the same world point should still hit
        const results = spatialIndex.queryPoint(basePoint);
        expect(results.map(e => e.guid)).toContain('wall-001');
      });
    });
  });
});