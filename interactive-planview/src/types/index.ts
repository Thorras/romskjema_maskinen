// Core geometry and coordinate types
export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

// SVG geometry types
export interface SVGGeometry {
  type: 'path' | 'rect' | 'circle' | 'line' | 'polygon';
  data: string | SVGPathData | SVGRectData | SVGCircleData | SVGLineData | SVGPolygonData;
  bounds: BoundingBox;
}

export interface SVGPathData {
  d: string;
}

export interface SVGRectData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SVGCircleData {
  cx: number;
  cy: number;
  r: number;
}

export interface SVGLineData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SVGPolygonData {
  points: Point[];
}

// Styling types
export interface ElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeDasharray?: string;
  visibility?: 'visible' | 'hidden';
}

export interface StyleConfig {
  [ifcClass: string]: ElementStyle;
}

// IFC Element types
export interface IFCElement {
  guid: string;
  ifcClass: string;
  geometry: SVGGeometry;
  properties: Record<string, any>;
  bounds: BoundingBox;
  visible: boolean;
  style: ElementStyle;
  originalElement?: SVGElement;
}

export interface IFCClass {
  name: string;
  displayName: string;
  count: number;
  visible: boolean;
  style: ElementStyle;
}

export interface IFCClassFilter {
  [className: string]: boolean;
}

// Measurement types
export interface Measurement {
  id: string;
  type: 'distance' | 'area';
  points: Point[];
  value: number;
  unit: string;
  label?: string;
  visible: boolean;
}

// Viewer state types
export interface ViewerState {
  transform: Transform;
  visibleLayers: Set<string>;
  selectedElement?: IFCElement;
  measurementMode: boolean;
  measurements: Measurement[];
  styleOverrides: Map<string, ElementStyle>;
  splitViewMode: boolean;
  currentStorey: string;
  hoveredElement?: IFCElement;
}

// Configuration types
export interface ViewerConfig {
  enableMeasurements: boolean;
  enableExport: boolean;
  enableSplitView: boolean;
  touchEnabled: boolean;
  defaultStyles: StyleConfig;
  exportFormats: ExportFormat[];
  maxZoom: number;
  minZoom: number;
  zoomStep: number;
  panSensitivity: number;
}

// Export types
export type ExportFormat = 'png' | 'svg' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  includeScaleBar: boolean;
  includeNorthArrow: boolean;
  resolution?: number; // For PNG export
  paperSize?: 'A4' | 'A3' | 'A2' | 'A1' | 'A0'; // For PDF export
  orientation?: 'portrait' | 'landscape';
}

// Data loading types
export interface SVGData {
  content: string;
  metadata?: Record<string, any>;
  storeys?: string[];
}

export interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: Record<string, any>;
}

export interface GeoJSONGeometry {
  type: 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | 'Point';
  coordinates: number[][] | number[][][] | number[];
}

// Search types
export interface SearchResult {
  element: IFCElement;
  matchType: 'id' | 'name' | 'class' | 'property';
  matchValue: string;
  score: number;
}

// Configuration preset types
export interface ConfigurationPreset {
  id: string;
  name: string;
  description?: string;
  config: {
    visibleLayers: string[];
    styleOverrides: Record<string, ElementStyle>;
    transform: Transform;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Error types
export interface ViewerError {
  type: 'loading' | 'rendering' | 'interaction' | 'export' | 'configuration';
  message: string;
  details?: any;
  timestamp: Date;
}

// Event types
export interface ElementClickEvent {
  element: IFCElement;
  point: Point;
  originalEvent: MouseEvent;
}

export interface MeasurementEvent {
  measurement: Measurement;
  action: 'created' | 'updated' | 'deleted';
}

export interface LayerToggleEvent {
  className: string;
  visible: boolean;
}

export interface StyleChangeEvent {
  className: string;
  style: ElementStyle;
}