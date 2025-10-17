import type { IFCElement, BoundingBox, Point } from '@/types';
import { isPointInBoundingBox, expandBoundingBox } from './coordinates';

/**
 * Spatial indexing system for efficient hit testing and spatial queries
 * Uses a simple grid-based spatial index for fast element lookup
 */

export interface SpatialIndex {
  insert(element: IFCElement): void;
  remove(element: IFCElement): void;
  query(bounds: BoundingBox): IFCElement[];
  queryPoint(point: Point, tolerance?: number): IFCElement[];
  clear(): void;
  rebuild(elements: IFCElement[]): void;
}

/**
 * Grid-based spatial index implementation
 */
export class GridSpatialIndex implements SpatialIndex {
  private grid: Map<string, Set<IFCElement>> = new Map();
  private cellSize: number;
  private bounds: BoundingBox;
  private elements: Set<IFCElement> = new Set();

  constructor(bounds: BoundingBox, cellSize: number = 100) {
    this.bounds = bounds;
    this.cellSize = cellSize;
  }

  /**
   * Insert an element into the spatial index
   */
  insert(element: IFCElement): void {
    this.elements.add(element);
    const cells = this.getCellsForBounds(element.bounds);
    
    cells.forEach(cellKey => {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, new Set());
      }
      this.grid.get(cellKey)!.add(element);
    });
  }

  /**
   * Remove an element from the spatial index
   */
  remove(element: IFCElement): void {
    this.elements.delete(element);
    const cells = this.getCellsForBounds(element.bounds);
    
    cells.forEach(cellKey => {
      const cell = this.grid.get(cellKey);
      if (cell) {
        cell.delete(element);
        if (cell.size === 0) {
          this.grid.delete(cellKey);
        }
      }
    });
  }

  /**
   * Query elements that intersect with the given bounds
   */
  query(bounds: BoundingBox): IFCElement[] {
    const cells = this.getCellsForBounds(bounds);
    const candidates = new Set<IFCElement>();
    
    cells.forEach(cellKey => {
      const cell = this.grid.get(cellKey);
      if (cell) {
        cell.forEach(element => candidates.add(element));
      }
    });
    
    // Filter candidates to only include elements that actually intersect
    return Array.from(candidates).filter(element => 
      this.boundsIntersect(element.bounds, bounds)
    );
  }

  /**
   * Query elements at a specific point with optional tolerance
   */
  queryPoint(point: Point, tolerance: number = 0): IFCElement[] {
    const queryBounds: BoundingBox = {
      minX: point.x - tolerance,
      minY: point.y - tolerance,
      maxX: point.x + tolerance,
      maxY: point.y + tolerance,
    };
    
    const candidates = this.query(queryBounds);
    
    // For point queries, we need more precise hit testing
    return candidates.filter(element => 
      this.isPointInElement(point, element, tolerance)
    );
  }

  /**
   * Clear all elements from the index
   */
  clear(): void {
    this.grid.clear();
    this.elements.clear();
  }

  /**
   * Rebuild the index with a new set of elements
   */
  rebuild(elements: IFCElement[]): void {
    this.clear();
    elements.forEach(element => this.insert(element));
  }

  /**
   * Get grid cell keys for a bounding box
   */
  private getCellsForBounds(bounds: BoundingBox): string[] {
    const startX = Math.floor((bounds.minX - this.bounds.minX) / this.cellSize);
    const startY = Math.floor((bounds.minY - this.bounds.minY) / this.cellSize);
    const endX = Math.floor((bounds.maxX - this.bounds.minX) / this.cellSize);
    const endY = Math.floor((bounds.maxY - this.bounds.minY) / this.cellSize);
    
    const cells: string[] = [];
    
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        cells.push(`${x},${y}`);
      }
    }
    
    return cells;
  }

  /**
   * Check if two bounding boxes intersect
   */
  private boundsIntersect(bounds1: BoundingBox, bounds2: BoundingBox): boolean {
    return !(
      bounds1.maxX < bounds2.minX ||
      bounds1.minX > bounds2.maxX ||
      bounds1.maxY < bounds2.minY ||
      bounds1.minY > bounds2.maxY
    );
  }

  /**
   * Check if a point is inside an element (with tolerance)
   */
  private isPointInElement(point: Point, element: IFCElement, tolerance: number): boolean {
    // First check bounding box with tolerance
    const expandedBounds = expandBoundingBox(element.bounds, tolerance);
    if (!isPointInBoundingBox(point, expandedBounds)) {
      return false;
    }
    
    // For more precise hit testing, we would need to check the actual geometry
    // This is a simplified implementation that uses bounding box testing
    // In a full implementation, you would check against the actual SVG path
    return this.preciseHitTest(point, element, tolerance);
  }

  /**
   * Perform precise hit testing against element geometry
   */
  private preciseHitTest(point: Point, element: IFCElement, tolerance: number): boolean {
    const geometry = element.geometry;
    
    switch (geometry.type) {
      case 'rect':
        return this.hitTestRect(point, geometry.data as any, tolerance);
      case 'circle':
        return this.hitTestCircle(point, geometry.data as any, tolerance);
      case 'line':
        return this.hitTestLine(point, geometry.data as any, tolerance);
      case 'polygon':
        return this.hitTestPolygon(point, geometry.data as any, tolerance);
      case 'path':
        // Path hit testing is complex, fall back to bounding box for now
        return isPointInBoundingBox(point, expandBoundingBox(element.bounds, tolerance));
      default:
        return isPointInBoundingBox(point, expandBoundingBox(element.bounds, tolerance));
    }
  }

  /**
   * Hit test against rectangle
   */
  private hitTestRect(point: Point, data: any, tolerance: number): boolean {
    const { x, y, width, height } = data;
    const bounds = {
      minX: x - tolerance,
      minY: y - tolerance,
      maxX: x + width + tolerance,
      maxY: y + height + tolerance,
    };
    return isPointInBoundingBox(point, bounds);
  }

  /**
   * Hit test against circle
   */
  private hitTestCircle(point: Point, data: any, tolerance: number): boolean {
    const { cx, cy, r } = data;
    const distance = Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2);
    return distance <= r + tolerance;
  }

  /**
   * Hit test against line
   */
  private hitTestLine(point: Point, data: any, tolerance: number): boolean {
    const { x1, y1, x2, y2 } = data;
    
    // Calculate distance from point to line segment
    const A = point.x - x1;
    const B = point.y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line is actually a point
      return Math.sqrt(A * A + B * B) <= tolerance;
    }
    
    const param = dot / lenSq;
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= tolerance;
  }

  /**
   * Hit test against polygon (simplified point-in-polygon test)
   */
  private hitTestPolygon(point: Point, data: any, tolerance: number): boolean {
    const { points } = data;
    
    if (points.length < 3) {
      return false;
    }
    
    // First check if point is inside polygon using ray casting
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x;
      const yi = points[i].y;
      const xj = points[j].x;
      const yj = points[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    if (inside) {
      return true;
    }
    
    // If not inside, check distance to edges with tolerance
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const lineData = {
        x1: points[i].x,
        y1: points[i].y,
        x2: points[j].x,
        y2: points[j].y,
      };
      
      if (this.hitTestLine(point, lineData, tolerance)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get statistics about the spatial index
   */
  getStats(): { totalElements: number; totalCells: number; averageElementsPerCell: number } {
    const totalElements = this.elements.size;
    const totalCells = this.grid.size;
    const averageElementsPerCell = totalCells > 0 ? 
      Array.from(this.grid.values()).reduce((sum, cell) => sum + cell.size, 0) / totalCells : 0;
    
    return {
      totalElements,
      totalCells,
      averageElementsPerCell,
    };
  }
}

/**
 * Create a spatial index for a set of elements
 */
export function createSpatialIndex(elements: IFCElement[], bounds?: BoundingBox): SpatialIndex {
  // Calculate bounds if not provided
  if (!bounds && elements.length > 0) {
    let minX = elements[0].bounds.minX;
    let minY = elements[0].bounds.minY;
    let maxX = elements[0].bounds.maxX;
    let maxY = elements[0].bounds.maxY;
    
    elements.forEach(element => {
      minX = Math.min(minX, element.bounds.minX);
      minY = Math.min(minY, element.bounds.minY);
      maxX = Math.max(maxX, element.bounds.maxX);
      maxY = Math.max(maxY, element.bounds.maxY);
    });
    
    bounds = { minX, minY, maxX, maxY };
  }
  
  if (!bounds) {
    bounds = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  }
  
  // Calculate appropriate cell size based on content bounds
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const cellSize = Math.max(50, Math.min(width, height) / 20);
  
  const index = new GridSpatialIndex(bounds, cellSize);
  index.rebuild(elements);
  
  return index;
}