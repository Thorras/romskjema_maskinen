import type { Point, BoundingBox, Transform } from '@/types';

/**
 * Coordinate transformation utilities for converting between different coordinate systems
 */

/**
 * Transform a point using the given transformation matrix
 */
export function transformPoint(point: Point, transform: Transform): Point {
  return {
    x: point.x * transform.scale + transform.x,
    y: point.y * transform.scale + transform.y,
  };
}

/**
 * Inverse transform a point (from screen coordinates to world coordinates)
 */
export function inverseTransformPoint(point: Point, transform: Transform): Point {
  return {
    x: (point.x - transform.x) / transform.scale,
    y: (point.y - transform.y) / transform.scale,
  };
}

/**
 * Transform a bounding box using the given transformation
 */
export function transformBoundingBox(bounds: BoundingBox, transform: Transform): BoundingBox {
  const topLeft = transformPoint({ x: bounds.minX, y: bounds.minY }, transform);
  const bottomRight = transformPoint({ x: bounds.maxX, y: bounds.maxY }, transform);
  
  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxX: Math.max(topLeft.x, bottomRight.x),
    maxY: Math.max(topLeft.y, bottomRight.y),
  };
}

/**
 * Calculate the distance between two points
 */
export function calculateDistance(point1: Point, point2: Point): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the area of a polygon defined by points
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Get the center point of a bounding box
 */
export function getBoundingBoxCenter(bounds: BoundingBox): Point {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

/**
 * Check if a point is inside a bounding box
 */
export function isPointInBoundingBox(point: Point, bounds: BoundingBox): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

/**
 * Expand a bounding box by a given margin
 */
export function expandBoundingBox(bounds: BoundingBox, margin: number): BoundingBox {
  return {
    minX: bounds.minX - margin,
    minY: bounds.minY - margin,
    maxX: bounds.maxX + margin,
    maxY: bounds.maxY + margin,
  };
}

/**
 * Combine multiple bounding boxes into one
 */
export function combineBoundingBoxes(boxes: BoundingBox[]): BoundingBox | null {
  if (boxes.length === 0) return null;
  
  let minX = boxes[0].minX;
  let minY = boxes[0].minY;
  let maxX = boxes[0].maxX;
  let maxY = boxes[0].maxY;
  
  for (let i = 1; i < boxes.length; i++) {
    minX = Math.min(minX, boxes[i].minX);
    minY = Math.min(minY, boxes[i].minY);
    maxX = Math.max(maxX, boxes[i].maxX);
    maxY = Math.max(maxY, boxes[i].maxY);
  }
  
  return { minX, minY, maxX, maxY };
}

/**
 * Convert GeoJSON coordinates to SVG coordinate system
 * Assumes GeoJSON uses geographic coordinates (longitude, latitude)
 */
export function geoJsonToSvgCoordinates(
  geoCoords: number[],
  bounds: BoundingBox,
  svgBounds: BoundingBox
): Point {
  const [lon, lat] = geoCoords;
  
  // Normalize to 0-1 range within the geographic bounds
  const normalizedX = (lon - bounds.minX) / (bounds.maxX - bounds.minX);
  const normalizedY = (lat - bounds.minY) / (bounds.maxY - bounds.minY);
  
  // Map to SVG coordinate space (note: SVG Y axis is inverted)
  return {
    x: svgBounds.minX + normalizedX * (svgBounds.maxX - svgBounds.minX),
    y: svgBounds.maxY - normalizedY * (svgBounds.maxY - svgBounds.minY),
  };
}

/**
 * Convert SVG coordinates to GeoJSON coordinate system
 */
export function svgToGeoJsonCoordinates(
  svgPoint: Point,
  bounds: BoundingBox,
  svgBounds: BoundingBox
): number[] {
  // Normalize SVG coordinates to 0-1 range
  const normalizedX = (svgPoint.x - svgBounds.minX) / (svgBounds.maxX - svgBounds.minX);
  const normalizedY = 1 - (svgPoint.y - svgBounds.minY) / (svgBounds.maxY - svgBounds.minY);
  
  // Map to geographic coordinate space
  const lon = bounds.minX + normalizedX * (bounds.maxX - bounds.minX);
  const lat = bounds.minY + normalizedY * (bounds.maxY - bounds.minY);
  
  return [lon, lat];
}

/**
 * Create a transformation matrix for fitting content to viewport
 */
export function createFitToViewTransform(
  contentBounds: BoundingBox,
  viewportBounds: BoundingBox,
  padding: number = 20
): Transform {
  const contentWidth = contentBounds.maxX - contentBounds.minX;
  const contentHeight = contentBounds.maxY - contentBounds.minY;
  const viewportWidth = viewportBounds.maxX - viewportBounds.minX - 2 * padding;
  const viewportHeight = viewportBounds.maxY - viewportBounds.minY - 2 * padding;
  
  // Calculate scale to fit content in viewport
  const scaleX = viewportWidth / contentWidth;
  const scaleY = viewportHeight / contentHeight;
  const scale = Math.min(scaleX, scaleY);
  
  // Calculate translation to center content
  const scaledContentWidth = contentWidth * scale;
  const scaledContentHeight = contentHeight * scale;
  const x = viewportBounds.minX + (viewportWidth - scaledContentWidth) / 2 + padding - contentBounds.minX * scale;
  const y = viewportBounds.minY + (viewportHeight - scaledContentHeight) / 2 + padding - contentBounds.minY * scale;
  
  return { x, y, scale };
}

/**
 * Clamp a transformation to prevent excessive zoom or pan
 */
export function clampTransform(
  transform: Transform,
  contentBounds: BoundingBox,
  viewportBounds: BoundingBox,
  minZoom: number = 0.1,
  maxZoom: number = 10
): Transform {
  // Clamp scale
  const clampedScale = Math.max(minZoom, Math.min(maxZoom, transform.scale));
  
  // Calculate content bounds in screen space
  const scaledContentBounds = transformBoundingBox(contentBounds, { ...transform, scale: clampedScale });
  
  // Clamp translation to keep content visible
  let clampedX = transform.x;
  let clampedY = transform.y;
  
  // Ensure content doesn't go too far off screen
  const maxOffsetX = viewportBounds.maxX - viewportBounds.minX;
  const maxOffsetY = viewportBounds.maxY - viewportBounds.minY;
  
  if (scaledContentBounds.maxX < viewportBounds.minX - maxOffsetX) {
    clampedX = viewportBounds.minX - maxOffsetX - contentBounds.maxX * clampedScale;
  } else if (scaledContentBounds.minX > viewportBounds.maxX + maxOffsetX) {
    clampedX = viewportBounds.maxX + maxOffsetX - contentBounds.minX * clampedScale;
  }
  
  if (scaledContentBounds.maxY < viewportBounds.minY - maxOffsetY) {
    clampedY = viewportBounds.minY - maxOffsetY - contentBounds.maxY * clampedScale;
  } else if (scaledContentBounds.minY > viewportBounds.maxY + maxOffsetY) {
    clampedY = viewportBounds.maxY + maxOffsetY - contentBounds.minY * clampedScale;
  }
  
  return {
    x: clampedX,
    y: clampedY,
    scale: clampedScale,
  };
}