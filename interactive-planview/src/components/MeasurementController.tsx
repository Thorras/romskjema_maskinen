import React, { useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useMeasurementStore } from '@/store/measurementStore';
import { useViewerStore } from '@/store/viewerStore';
import { inverseTransformPoint } from '@/utils/coordinates';
import type { Point, Measurement } from '@/types';

interface MeasurementControllerProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  onMeasurementComplete?: (measurement: Measurement) => void;
}

export const MeasurementController: React.FC<MeasurementControllerProps> = ({
  svgRef,
  onMeasurementComplete,
}) => {
  const overlayRef = useRef<SVGGElement | null>(null);
  const isClickHandlerAttachedRef = useRef(false);

  // Measurement store
  const measurementMode = useMeasurementStore((state) => state.measurementMode);
  const activeMeasurement = useMeasurementStore((state) => state.activeMeasurement);
  const measurements = useMeasurementStore((state) => state.measurements);
  const nextMeasurementType = useMeasurementStore((state) => state.nextMeasurementType);
  const startMeasurement = useMeasurementStore((state) => state.startMeasurement);
  const addPointToMeasurement = useMeasurementStore((state) => state.addPointToMeasurement);
  const finishMeasurement = useMeasurementStore((state) => state.finishMeasurement);
  const cancelActiveMeasurement = useMeasurementStore((state) => state.cancelActiveMeasurement);

  // Viewer store
  const transform = useViewerStore((state) => state.transform);

  // Handle click events for measurement mode
  const handleMeasurementClick = useCallback((event: MouseEvent) => {
    if (!measurementMode || !svgRef.current) return;

    // Prevent event bubbling to avoid conflicts with element selection
    event.stopPropagation();

    const rect = svgRef.current.getBoundingClientRect();
    const screenPoint: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // Transform screen coordinates to world coordinates
    const worldPoint = inverseTransformPoint(screenPoint, transform);

    if (!activeMeasurement) {
      // Start new measurement using the selected type
      startMeasurement(nextMeasurementType, worldPoint);
    } else {
      // Add point to active measurement
      addPointToMeasurement(worldPoint);

      // For distance measurements, finish after 2 points
      if (activeMeasurement.type === 'distance' && activeMeasurement.points.length >= 1) {
        finishMeasurement();
      }
      // For area measurements, continue adding points (finish on double-click or manual finish)
    }
  }, [measurementMode, activeMeasurement, transform, startMeasurement, addPointToMeasurement, finishMeasurement]);

  // Handle double-click to finish area measurements
  const handleMeasurementDoubleClick = useCallback((event: MouseEvent) => {
    if (!measurementMode || !activeMeasurement || activeMeasurement.type !== 'area') return;

    event.stopPropagation();
    event.preventDefault();

    // Finish area measurement on double-click
    if (activeMeasurement.points.length >= 3) {
      finishMeasurement();
    }
  }, [measurementMode, activeMeasurement, finishMeasurement]);

  // Handle escape key to cancel measurement
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!measurementMode) return;

    if (event.key === 'Escape') {
      if (activeMeasurement) {
        cancelActiveMeasurement();
      }
    }
  }, [measurementMode, activeMeasurement, cancelActiveMeasurement]);

  // Attach/detach event listeners based on measurement mode
  useEffect(() => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;

    if (measurementMode && !isClickHandlerAttachedRef.current) {
      // Attach measurement event listeners
      svgElement.addEventListener('click', handleMeasurementClick, true);
      svgElement.addEventListener('dblclick', handleMeasurementDoubleClick, true);
      document.addEventListener('keydown', handleKeyDown);
      
      // Change cursor to indicate measurement mode
      svgElement.style.cursor = 'crosshair';
      
      isClickHandlerAttachedRef.current = true;
    } else if (!measurementMode && isClickHandlerAttachedRef.current) {
      // Detach measurement event listeners
      svgElement.removeEventListener('click', handleMeasurementClick, true);
      svgElement.removeEventListener('dblclick', handleMeasurementDoubleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      
      // Reset cursor
      svgElement.style.cursor = 'grab';
      
      isClickHandlerAttachedRef.current = false;
    }

    return () => {
      if (isClickHandlerAttachedRef.current) {
        svgElement.removeEventListener('click', handleMeasurementClick, true);
        svgElement.removeEventListener('dblclick', handleMeasurementDoubleClick, true);
        document.removeEventListener('keydown', handleKeyDown);
        isClickHandlerAttachedRef.current = false;
      }
    };
  }, [measurementMode, handleMeasurementClick, handleMeasurementDoubleClick, handleKeyDown]);

  // Render measurement overlays
  const renderMeasurementOverlays = useCallback(() => {
    if (!svgRef.current || !overlayRef.current) return;

    const overlay = d3.select(overlayRef.current);
    
    // Clear existing overlays
    overlay.selectAll('*').remove();

    // Render completed measurements
    measurements.forEach((measurement) => {
      if (!measurement.visible || measurement.points.length < 2) return;

      const measurementGroup = overlay.append('g')
        .attr('class', 'measurement')
        .attr('data-measurement-id', measurement.id);

      if (measurement.type === 'distance') {
        // Render distance measurement line
        measurementGroup.append('line')
          .attr('x1', measurement.points[0].x)
          .attr('y1', measurement.points[0].y)
          .attr('x2', measurement.points[1].x)
          .attr('y2', measurement.points[1].y)
          .attr('stroke', '#ff6b35')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .attr('opacity', 0.8);

        // Add measurement points
        measurement.points.forEach((point) => {
          measurementGroup.append('circle')
            .attr('cx', point.x)
            .attr('cy', point.y)
            .attr('r', 4)
            .attr('fill', '#ff6b35')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        });

        // Add measurement label
        const midPoint = {
          x: (measurement.points[0].x + measurement.points[1].x) / 2,
          y: (measurement.points[0].y + measurement.points[1].y) / 2,
        };

        const labelGroup = measurementGroup.append('g')
          .attr('class', 'measurement-label')
          .attr('transform', `translate(${midPoint.x}, ${midPoint.y})`);

        // Background for label
        const labelText = `${measurement.value.toFixed(2)} ${measurement.unit}`;
        const textElement = labelGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('font-family', 'Arial, sans-serif')
          .attr('font-size', '12px')
          .attr('fill', '#333')
          .text(labelText);

        // Get text dimensions for background
        const bbox = (textElement.node() as SVGTextElement)?.getBBox();
        if (bbox) {
          labelGroup.insert('rect', 'text')
            .attr('x', bbox.x - 4)
            .attr('y', bbox.y - 2)
            .attr('width', bbox.width + 8)
            .attr('height', bbox.height + 4)
            .attr('fill', 'rgba(255, 255, 255, 0.9)')
            .attr('stroke', '#ff6b35')
            .attr('stroke-width', 1)
            .attr('rx', 3);
        }

      } else if (measurement.type === 'area') {
        // Render area measurement polygon
        const pointsString = measurement.points
          .map(p => `${p.x},${p.y}`)
          .join(' ');

        measurementGroup.append('polygon')
          .attr('points', pointsString)
          .attr('fill', 'rgba(255, 107, 53, 0.2)')
          .attr('stroke', '#ff6b35')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5');

        // Add measurement points
        measurement.points.forEach((point) => {
          measurementGroup.append('circle')
            .attr('cx', point.x)
            .attr('cy', point.y)
            .attr('r', 4)
            .attr('fill', '#ff6b35')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        });

        // Add area label at centroid
        const centroid = {
          x: measurement.points.reduce((sum, p) => sum + p.x, 0) / measurement.points.length,
          y: measurement.points.reduce((sum, p) => sum + p.y, 0) / measurement.points.length,
        };

        const labelGroup = measurementGroup.append('g')
          .attr('class', 'measurement-label')
          .attr('transform', `translate(${centroid.x}, ${centroid.y})`);

        const labelText = `${measurement.value.toFixed(2)} ${measurement.unit}²`;
        const textElement = labelGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('font-family', 'Arial, sans-serif')
          .attr('font-size', '12px')
          .attr('fill', '#333')
          .text(labelText);

        // Background for label
        const bbox = (textElement.node() as SVGTextElement)?.getBBox();
        if (bbox) {
          labelGroup.insert('rect', 'text')
            .attr('x', bbox.x - 4)
            .attr('y', bbox.y - 2)
            .attr('width', bbox.width + 8)
            .attr('height', bbox.height + 4)
            .attr('fill', 'rgba(255, 255, 255, 0.9)')
            .attr('stroke', '#ff6b35')
            .attr('stroke-width', 1)
            .attr('rx', 3);
        }
      }
    });

    // Render active measurement preview
    if (activeMeasurement && activeMeasurement.points.length > 0) {
      const activeGroup = overlay.append('g')
        .attr('class', 'active-measurement')
        .attr('opacity', 0.7);

      if (activeMeasurement.type === 'distance' && activeMeasurement.points.length === 1) {
        // Show first point for distance measurement
        activeGroup.append('circle')
          .attr('cx', activeMeasurement.points[0].x)
          .attr('cy', activeMeasurement.points[0].y)
          .attr('r', 4)
          .attr('fill', '#ff6b35')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);

      } else if (activeMeasurement.type === 'area' && activeMeasurement.points.length >= 2) {
        // Show polygon preview for area measurement
        const pointsString = activeMeasurement.points
          .map(p => `${p.x},${p.y}`)
          .join(' ');

        activeGroup.append('polygon')
          .attr('points', pointsString)
          .attr('fill', 'rgba(255, 107, 53, 0.1)')
          .attr('stroke', '#ff6b35')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,3');

        // Show points
        activeMeasurement.points.forEach((point) => {
          activeGroup.append('circle')
            .attr('cx', point.x)
            .attr('cy', point.y)
            .attr('r', 4)
            .attr('fill', '#ff6b35')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        });
      }
    }
  }, [measurements, activeMeasurement]);

  // Initialize overlay container
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    let overlayContainer = svg.select<SVGGElement>('.measurement-overlay');
    
    if (overlayContainer.empty()) {
      // Create overlay container if it doesn't exist
      overlayContainer = svg.append('g')
        .attr('class', 'measurement-overlay')
        .style('pointer-events', 'none'); // Prevent interference with interactions
    }

    overlayRef.current = overlayContainer.node();
  }, []);

  // Re-render overlays when measurements or transform change
  useEffect(() => {
    renderMeasurementOverlays();
  }, [renderMeasurementOverlays]);

  // Handle measurement completion callback
  useEffect(() => {
    if (onMeasurementComplete && measurements.length > 0) {
      const lastMeasurement = measurements[measurements.length - 1];
      onMeasurementComplete(lastMeasurement);
    }
  }, [measurements, onMeasurementComplete]);

  // Provide visual feedback for measurement mode
  useEffect(() => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    
    if (measurementMode) {
      svgElement.classList.add('measurement-mode');
      // Add visual indicator that measurement mode is active
      svgElement.style.outline = '2px dashed #ff6b35';
      svgElement.style.outlineOffset = '-2px';
    } else {
      svgElement.classList.remove('measurement-mode');
      svgElement.style.outline = '';
      svgElement.style.outlineOffset = '';
    }
  }, [measurementMode]);

  return null; // This component only manages overlays and interactions
};

export default MeasurementController;