import type { 
  SVGData, 
  IFCElement, 
  SVGGeometry, 
  BoundingBox, 
  ElementStyle,
  Point 
} from '@/types';
import { combineBoundingBoxes } from './coordinates';

/**
 * SVG parsing utilities for extracting IFC elements and metadata
 */

/**
 * Parse SVG content and extract IFC elements
 */
export function parseSVGData(svgData: SVGData): IFCElement[] {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgData.content, 'image/svg+xml');
  
  // Check for parsing errors
  const parserError = svgDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`SVG parsing failed: ${parserError.textContent}`);
  }
  
  const svgElement = svgDoc.documentElement;
  if (!svgElement || svgElement.tagName !== 'svg') {
    throw new Error('Invalid SVG document: missing or invalid root element');
  }
  
  const elements: IFCElement[] = [];
  const allElements = svgElement.querySelectorAll('*');
  
  allElements.forEach((element, index) => {
    const ifcElement = parseIFCElement(element as SVGElement, index);
    if (ifcElement) {
      elements.push(ifcElement);
    }
  });
  
  return elements;
}

/**
 * Parse a single SVG element into an IFC element
 */
function parseIFCElement(element: SVGElement, fallbackIndex: number): IFCElement | null {
  // Skip non-geometric elements
  if (!isGeometricElement(element)) {
    return null;
  }
  
  // Skip elements that are inside non-geometric containers
  if (isInsideNonGeometricContainer(element)) {
    return null;
  }
  
  const geometry = extractGeometry(element);
  if (!geometry) {
    return null;
  }
  
  const ifcClass = extractIFCClass(element);
  const guid = extractGUID(element, fallbackIndex);
  const properties = extractProperties(element);
  const style = extractStyle(element);
  
  return {
    guid,
    ifcClass,
    geometry,
    properties,
    bounds: geometry.bounds,
    visible: true,
    style,
    originalElement: element,
  };
}

/**
 * Check if an SVG element represents geometry
 */
function isGeometricElement(element: SVGElement): boolean {
  const geometricTags = ['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'];
  return geometricTags.includes(element.tagName.toLowerCase());
}

/**
 * Check if an element is inside a non-geometric container
 */
function isInsideNonGeometricContainer(element: SVGElement): boolean {
  const nonGeometricContainers = ['defs', 'title', 'desc', 'metadata', 'style', 'script'];
  let parent = element.parentElement;
  
  while (parent && parent.tagName !== 'svg') {
    if (nonGeometricContainers.includes(parent.tagName.toLowerCase())) {
      return true;
    }
    parent = parent.parentElement;
  }
  
  return false;
}

/**
 * Extract geometry information from an SVG element
 */
function extractGeometry(element: SVGElement): SVGGeometry | null {
  const tagName = element.tagName.toLowerCase();
  
  try {
    switch (tagName) {
      case 'path':
        return extractPathGeometry(element as SVGPathElement);
      case 'rect':
        return extractRectGeometry(element as SVGRectElement);
      case 'circle':
        return extractCircleGeometry(element as SVGCircleElement);
      case 'line':
        return extractLineGeometry(element as SVGLineElement);
      case 'polygon':
      case 'polyline':
        return extractPolygonGeometry(element as SVGPolygonElement);
      default:
        return null;
    }
  } catch (error) {
    console.warn(`Failed to extract geometry from ${tagName} element:`, error);
    return null;
  }
}

/**
 * Extract path geometry and calculate bounds
 */
function extractPathGeometry(element: SVGPathElement): SVGGeometry | null {
  const d = element.getAttribute('d');
  if (!d) return null;
  
  const bounds = calculatePathBounds(d);
  
  return {
    type: 'path',
    data: { d },
    bounds,
  };
}

/**
 * Extract rectangle geometry
 */
function extractRectGeometry(element: SVGRectElement): SVGGeometry {
  const x = parseFloat(element.getAttribute('x') || '0');
  const y = parseFloat(element.getAttribute('y') || '0');
  const width = parseFloat(element.getAttribute('width') || '0');
  const height = parseFloat(element.getAttribute('height') || '0');
  
  return {
    type: 'rect',
    data: { x, y, width, height },
    bounds: {
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height,
    },
  };
}

/**
 * Extract circle geometry
 */
function extractCircleGeometry(element: SVGCircleElement): SVGGeometry {
  const cx = parseFloat(element.getAttribute('cx') || '0');
  const cy = parseFloat(element.getAttribute('cy') || '0');
  const r = parseFloat(element.getAttribute('r') || '0');
  
  return {
    type: 'circle',
    data: { cx, cy, r },
    bounds: {
      minX: cx - r,
      minY: cy - r,
      maxX: cx + r,
      maxY: cy + r,
    },
  };
}

/**
 * Extract line geometry
 */
function extractLineGeometry(element: SVGLineElement): SVGGeometry {
  const x1 = parseFloat(element.getAttribute('x1') || '0');
  const y1 = parseFloat(element.getAttribute('y1') || '0');
  const x2 = parseFloat(element.getAttribute('x2') || '0');
  const y2 = parseFloat(element.getAttribute('y2') || '0');
  
  return {
    type: 'line',
    data: { x1, y1, x2, y2 },
    bounds: {
      minX: Math.min(x1, x2),
      minY: Math.min(y1, y2),
      maxX: Math.max(x1, x2),
      maxY: Math.max(y1, y2),
    },
  };
}

/**
 * Extract polygon/polyline geometry
 */
function extractPolygonGeometry(element: SVGPolygonElement | SVGPolylineElement): SVGGeometry {
  const pointsAttr = element.getAttribute('points') || '';
  const points = parsePointsAttribute(pointsAttr);
  
  const bounds = calculatePointsBounds(points);
  
  return {
    type: 'polygon',
    data: { points },
    bounds,
  };
}

/**
 * Parse SVG points attribute into Point array
 */
function parsePointsAttribute(pointsAttr: string): Point[] {
  const points: Point[] = [];
  const coords = pointsAttr.trim().split(/[\s,]+/);
  
  for (let i = 0; i < coords.length - 1; i += 2) {
    const x = parseFloat(coords[i]);
    const y = parseFloat(coords[i + 1]);
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
    }
  }
  
  return points;
}

/**
 * Calculate bounding box for an array of points
 */
function calculatePointsBounds(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  
  for (let i = 1; i < points.length; i++) {
    minX = Math.min(minX, points[i].x);
    minY = Math.min(minY, points[i].y);
    maxX = Math.max(maxX, points[i].x);
    maxY = Math.max(maxY, points[i].y);
  }
  
  return { minX, minY, maxX, maxY };
}

/**
 * Calculate bounding box for SVG path data (simplified implementation)
 */
function calculatePathBounds(pathData: string): BoundingBox {
  // This is a simplified implementation that extracts coordinate pairs
  // A more robust implementation would parse the full path syntax
  const coords = pathData.match(/-?\d+\.?\d*/g);
  if (!coords || coords.length < 2) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  const points: Point[] = [];
  for (let i = 0; i < coords.length - 1; i += 2) {
    const x = parseFloat(coords[i]);
    const y = parseFloat(coords[i + 1]);
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
    }
  }
  
  return calculatePointsBounds(points);
}

/**
 * Extract IFC class from element attributes
 */
function extractIFCClass(element: SVGElement): string {
  // Try different attribute patterns commonly used for IFC class information
  const classAttr = element.getAttribute('class') || '';
  const dataClass = element.getAttribute('data-ifc-class') || '';
  const ifcType = element.getAttribute('ifc-type') || '';
  
  // Look for IFC class patterns in class attribute
  const ifcClassMatch = classAttr.match(/ifc[a-z]*/i);
  if (ifcClassMatch) {
    return ifcClassMatch[0];
  }
  
  // Use data attributes if available
  if (dataClass) return dataClass;
  if (ifcType) return ifcType;
  
  // Fallback to element tag name
  return element.tagName.toLowerCase();
}

/**
 * Extract GUID from element attributes
 */
function extractGUID(element: SVGElement, fallbackIndex: number): string {
  const guid = element.getAttribute('id') || 
               element.getAttribute('data-guid') || 
               element.getAttribute('guid');
  
  return guid || `element-${fallbackIndex}`;
}

/**
 * Extract properties from element attributes
 */
function extractProperties(element: SVGElement): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // Extract all data-* attributes as properties
  Array.from(element.attributes).forEach(attr => {
    if (attr.name.startsWith('data-')) {
      const propName = attr.name.substring(5); // Remove 'data-' prefix
      properties[propName] = attr.value;
    }
  });
  
  // Add common SVG attributes as properties
  const commonAttrs = ['id', 'class', 'title'];
  commonAttrs.forEach(attrName => {
    const value = element.getAttribute(attrName);
    if (value) {
      properties[attrName] = value;
    }
  });
  
  return properties;
}

/**
 * Extract style information from element
 */
function extractStyle(element: SVGElement): ElementStyle {
  const style: ElementStyle = {};
  
  // Extract inline style attributes
  const fill = element.getAttribute('fill');
  const stroke = element.getAttribute('stroke');
  const strokeWidth = element.getAttribute('stroke-width');
  const opacity = element.getAttribute('opacity');
  const fillOpacity = element.getAttribute('fill-opacity');
  const strokeOpacity = element.getAttribute('stroke-opacity');
  const strokeDasharray = element.getAttribute('stroke-dasharray');
  const visibility = element.getAttribute('visibility');
  
  if (fill) style.fill = fill;
  if (stroke) style.stroke = stroke;
  if (strokeWidth) style.strokeWidth = parseFloat(strokeWidth);
  if (opacity) style.opacity = parseFloat(opacity);
  if (fillOpacity) style.fillOpacity = parseFloat(fillOpacity);
  if (strokeOpacity) style.strokeOpacity = parseFloat(strokeOpacity);
  if (strokeDasharray) style.strokeDasharray = strokeDasharray;
  if (visibility) style.visibility = visibility as 'visible' | 'hidden';
  
  // Extract computed styles if available
  if (element.ownerDocument && element.ownerDocument.defaultView) {
    const computedStyle = element.ownerDocument.defaultView.getComputedStyle(element);
    
    if (!style.fill && computedStyle.fill !== 'none') {
      style.fill = computedStyle.fill;
    }
    if (!style.stroke && computedStyle.stroke !== 'none') {
      style.stroke = computedStyle.stroke;
    }
    if (!style.strokeWidth && computedStyle.strokeWidth) {
      style.strokeWidth = parseFloat(computedStyle.strokeWidth);
    }
  }
  
  return style;
}

/**
 * Calculate overall bounds for all elements
 */
export function calculateOverallBounds(elements: IFCElement[]): BoundingBox | null {
  const bounds = elements.map(el => el.bounds);
  return combineBoundingBoxes(bounds);
}

/**
 * Group elements by IFC class
 */
export function groupElementsByClass(elements: IFCElement[]): Map<string, IFCElement[]> {
  const groups = new Map<string, IFCElement[]>();
  
  elements.forEach(element => {
    const className = element.ifcClass;
    if (!groups.has(className)) {
      groups.set(className, []);
    }
    groups.get(className)!.push(element);
  });
  
  return groups;
}

/**
 * Extract available storeys from SVG metadata or element analysis
 */
export function extractStoreys(svgData: SVGData, elements: IFCElement[]): string[] {
  // First try to get storeys from metadata
  if (svgData.metadata?.storeys) {
    return svgData.metadata.storeys;
  }
  
  // Try to extract from element properties
  const storeySet = new Set<string>();
  elements.forEach(element => {
    const storey = element.properties.storey || 
                   element.properties.level || 
                   element.properties['data-storey'];
    if (storey) {
      storeySet.add(storey);
    }
  });
  
  const storeys = Array.from(storeySet).sort();
  return storeys.length > 0 ? storeys : ['Ground Floor'];
}