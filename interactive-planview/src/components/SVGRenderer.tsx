import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { useViewerStore } from '@/store/viewerStore';
import { useInteractionController } from '@/hooks/useInteractionController';
import { createSpatialIndex, type SpatialIndex } from '@/utils/spatialIndex';
import { transformPoint } from '@/utils/coordinates';
import { StyleManager } from '@/utils/styleManager';
import type { IFCElement, Point, BoundingBox, ElementStyle } from '@/types';

interface SVGRendererProps {
  elements: IFCElement[];
  width: number;
  height: number;
  onElementClick?: (element: IFCElement, point: Point) => void;
  onElementHover?: (element: IFCElement | null) => void;
  className?: string;
  enablePan?: boolean;
  enableZoom?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
}

export const SVGRenderer: React.FC<SVGRendererProps> = ({
  elements,
  width,
  height,
  onElementClick,
  onElementHover,
  className = '',
  enablePan = true,
  enableZoom = true,
  minZoom = 0.1,
  maxZoom = 10,
  zoomStep = 1.2,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const spatialIndexRef = useRef<SpatialIndex | null>(null);
  const elementsMapRef = useRef<Map<string, IFCElement>>(new Map());
  const styleManagerRef = useRef<StyleManager | null>(null);
  
  // Zustand store selectors
  const transform = useViewerStore((state) => state.transform);
  const visibleLayers = useViewerStore((state) => state.visibleLayers);
  const styleOverrides = useViewerStore((state) => state.styleOverrides);
  const selectedElement = useViewerStore((state) => state.selectedElement);
  const hoveredElement = useViewerStore((state) => state.hoveredElement);
  
  // Store actions (removed unused setTransform)

  // Calculate viewport bounds
  const viewportBounds: BoundingBox = {
    minX: 0,
    minY: 0,
    maxX: width,
    maxY: height,
  };

  // Calculate content bounds from elements
  const contentBounds = React.useMemo(() => {
    if (elements.length === 0) {
      return { minX: 0, minY: 0, maxX: width, maxY: height };
    }
    
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
    
    return { minX, minY, maxX, maxY };
  }, [elements, width, height]);

  // Update spatial index when elements change
  useEffect(() => {
    if (elements.length > 0) {
      spatialIndexRef.current = createSpatialIndex(elements, contentBounds);
      
      // Update elements map for quick lookup
      elementsMapRef.current.clear();
      elements.forEach(element => {
        elementsMapRef.current.set(element.guid, element);
      });
    }
  }, [elements, contentBounds]);

  // Initialize interaction controller
  const interactionController = useInteractionController({
    contentBounds,
    viewportBounds,
    minZoom,
    maxZoom,
    zoomStep,
    enablePan,
    enableZoom,
  });

  // Initialize fit to view on first load
  useEffect(() => {
    if (elements.length > 0 && transform.scale === 1 && transform.x === 0 && transform.y === 0) {
      interactionController.fitToView();
    }
  }, [elements, transform, interactionController]);

  // Get effective style for an element with real-time updates
  const getElementStyle = useCallback((element: IFCElement): ElementStyle => {
    const baseStyle = element.style;
    const override = styleOverrides.get(element.ifcClass);
    
    // Merge base style with overrides
    const mergedStyle = {
      ...baseStyle,
      ...override,
    };
    
    // Add selection and hover states
    if (selectedElement?.guid === element.guid) {
      mergedStyle.stroke = '#ff6b35';
      mergedStyle.strokeWidth = (mergedStyle.strokeWidth || 1) + 1;
    }
    
    if (hoveredElement?.guid === element.guid) {
      mergedStyle.opacity = (mergedStyle.opacity || 1) * 0.8;
    }
    
    return mergedStyle;
  }, [styleOverrides, selectedElement, hoveredElement]);

  // Render SVG elements using D3
  const renderElements = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = svg.select('.elements-container');
    
    // Filter visible elements
    const visibleElements = elements.filter(element => 
      visibleLayers.has(element.ifcClass) && element.visible
    );

    // Bind data to elements
    const elementSelection = container
      .selectAll<SVGElement, IFCElement>('.ifc-element')
      .data(visibleElements, (d: IFCElement) => d.guid);

    // Remove elements that are no longer visible
    elementSelection.exit().remove();
    
    // Create elements based on geometry type
    visibleElements.forEach(element => {
      const existing = container.select(`[data-guid="${element.guid}"]`);
      if (!existing.empty()) return; // Skip if already exists
      
      let svgElement: d3.Selection<any, unknown, null, undefined>;
      
      switch (element.geometry.type) {
        case 'path':
          svgElement = container.append('path')
            .attr('d', (element.geometry.data as any).d);
          break;
          
        case 'rect':
          const rectData = element.geometry.data as any;
          svgElement = container.append('rect')
            .attr('x', rectData.x)
            .attr('y', rectData.y)
            .attr('width', rectData.width)
            .attr('height', rectData.height);
          break;
          
        case 'circle':
          const circleData = element.geometry.data as any;
          svgElement = container.append('circle')
            .attr('cx', circleData.cx)
            .attr('cy', circleData.cy)
            .attr('r', circleData.r);
          break;
          
        case 'line':
          const lineData = element.geometry.data as any;
          svgElement = container.append('line')
            .attr('x1', lineData.x1)
            .attr('y1', lineData.y1)
            .attr('x2', lineData.x2)
            .attr('y2', lineData.y2);
          break;
          
        case 'polygon':
          const polygonData = element.geometry.data as any;
          const pointsString = polygonData.points
            .map((p: Point) => `${p.x},${p.y}`)
            .join(' ');
          svgElement = container.append('polygon')
            .attr('points', pointsString);
          break;
          
        default:
          return; // Skip unknown geometry types
      }
      
      // Set common attributes
      svgElement
        .attr('class', 'ifc-element')
        .attr('data-guid', element.guid)
        .attr('data-ifc-class', element.ifcClass);
    });

    // Update styles for all elements with efficient batching
    container.selectAll('.ifc-element')
      .each(function() {
        const elementNode = d3.select(this);
        const guid = elementNode.attr('data-guid');
        const element = elementsMapRef.current.get(guid);
        
        if (element) {
          const style = getElementStyle(element);
          
          // Apply styles efficiently - only set attributes that have values
          elementNode
            .attr('fill', style.fill || 'none')
            .attr('stroke', style.stroke || 'none')
            .attr('stroke-width', style.strokeWidth !== undefined ? style.strokeWidth : 1)
            .attr('opacity', style.opacity !== undefined ? style.opacity : 1)
            .attr('fill-opacity', style.fillOpacity !== undefined ? style.fillOpacity : 1)
            .attr('stroke-opacity', style.strokeOpacity !== undefined ? style.strokeOpacity : 1)
            .attr('stroke-dasharray', style.strokeDasharray || 'none')
            .attr('visibility', style.visibility || 'visible');
        }
      });

  }, [elements, visibleLayers, getElementStyle]);

  // Handle mouse events for element interaction
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!spatialIndexRef.current || !onElementHover) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // Transform screen coordinates to world coordinates
    const worldPoint = transformPoint(screenPoint, {
      x: -transform.x,
      y: -transform.y,
      scale: 1 / transform.scale,
    });

    // Query spatial index for elements at this point
    const hitElements = spatialIndexRef.current.queryPoint(worldPoint, 5 / transform.scale);
    
    // Find the topmost element (last in rendering order)
    const hitElement = hitElements.length > 0 ? hitElements[hitElements.length - 1] : null;
    
    onElementHover(hitElement);
  }, [transform, onElementHover]);

  const handleClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!spatialIndexRef.current || !onElementClick) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // Transform screen coordinates to world coordinates
    const worldPoint = transformPoint(screenPoint, {
      x: -transform.x,
      y: -transform.y,
      scale: 1 / transform.scale,
    });

    // Query spatial index for elements at this point
    const hitElements = spatialIndexRef.current.queryPoint(worldPoint, 5 / transform.scale);
    
    // Find the topmost element (last in rendering order)
    const hitElement = hitElements.length > 0 ? hitElements[hitElements.length - 1] : null;
    
    if (hitElement) {
      onElementClick(hitElement, screenPoint);
    }
  }, [transform, onElementClick]);

  // Initialize SVG structure and attach interaction controller
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    // Clear existing content
    svg.selectAll('*').remove();
    
    // Create main group for elements with transform
    const mainGroup = svg.append('g')
      .attr('class', 'main-group');
    
    // Create container for elements
    const elementsContainer = mainGroup.append('g')
      .attr('class', 'elements-container');
    
    // Create container for overlays (measurements, etc.)
    mainGroup.append('g')
      .attr('class', 'overlay-container');

    // Initialize style manager
    styleManagerRef.current = new StyleManager({
      enableTransitions: true,
      transitionDuration: 200,
      batchUpdates: true,
    });
    styleManagerRef.current.initialize(elementsContainer);

    // Attach interaction controller
    interactionController.attachToElement(svgRef.current);

    // Cleanup on unmount
    return () => {
      interactionController.detachFromElement();
      if (styleManagerRef.current) {
        styleManagerRef.current.destroy();
        styleManagerRef.current = null;
      }
    };
  }, [interactionController]);

  // Update transform
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const mainGroup = svg.select('.main-group');
    
    // Apply transform to main group
    mainGroup.attr('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.scale})`);
  }, [transform]);

  // Handle style override changes with StyleManager
  useEffect(() => {
    if (!styleManagerRef.current) return;

    // Apply all current style overrides
    const styleOverridesObj = Object.fromEntries(styleOverrides);
    styleManagerRef.current.applyMultipleStyles(styleOverridesObj, false);
  }, [styleOverrides]);

  // Re-render elements when dependencies change
  useEffect(() => {
    renderElements();
  }, [renderElements]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className={`svg-renderer ${className}`}
      data-testid="svg-renderer"
      style={{ 
        cursor: enablePan ? 'grab' : 'crosshair',
        userSelect: 'none',
        background: '#f8f9fa',
        touchAction: 'none', // Prevent default touch behaviors
        WebkitTouchCallout: 'none', // Prevent iOS callout
        WebkitUserSelect: 'none', // Prevent text selection on iOS
      }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    />
  );
};

export default SVGRenderer;