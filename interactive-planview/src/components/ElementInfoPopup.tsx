import React, { useEffect, useRef, useState } from 'react';
import type { IFCElement, Point } from '@/types';

interface ElementInfoPopupProps {
  element: IFCElement;
  position: Point;
  onClose: () => void;
  className?: string;
}

export const ElementInfoPopup: React.FC<ElementInfoPopupProps> = ({
  element,
  position,
  onClose,
  className = '',
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<Point>(position);

  // Auto-position popup to stay within viewport
  useEffect(() => {
    if (!popupRef.current) return;

    const popup = popupRef.current;
    const rect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = position.x;
    let newY = position.y;

    // Adjust horizontal position if popup would overflow
    if (position.x + rect.width > viewportWidth - 20) {
      newX = position.x - rect.width - 10;
    }

    // Adjust vertical position if popup would overflow
    if (position.y + rect.height > viewportHeight - 20) {
      newY = position.y - rect.height - 10;
    }

    // Ensure popup doesn't go off-screen on the left or top
    newX = Math.max(10, newX);
    newY = Math.max(10, newY);

    setAdjustedPosition({ x: newX, y: newY });
  }, [position]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  // Format property values for display
  const formatPropertyValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // Get display name for IFC class
  const getDisplayName = (ifcClass: string): string => {
    // Remove 'Ifc' prefix and add spaces before capital letters
    const withoutPrefix = ifcClass.replace(/^Ifc/, '');
    return withoutPrefix.replace(/([A-Z])/g, ' $1').trim();
  };

  // Filter and organize properties for display
  const displayProperties = React.useMemo(() => {
    const props = { ...element.properties };
    
    // Remove internal/technical properties that aren't useful for display
    const excludeKeys = ['bounds', 'geometry', 'originalElement', 'visible'];
    excludeKeys.forEach(key => delete props[key]);
    
    // Sort properties alphabetically
    return Object.entries(props).sort(([a], [b]) => a.localeCompare(b));
  }, [element.properties]);

  return (
    <div
      ref={popupRef}
      className={`element-info-popup fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm max-h-96 overflow-y-auto ${className}`}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {getDisplayName(element.ifcClass)}
          </h3>
          <p className="text-sm text-gray-500 font-mono">
            {element.guid}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Close popup"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Basic Information */}
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium text-gray-700">Type:</span>
            <span className="ml-2 text-gray-900">{element.ifcClass}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Visible:</span>
            <span className="ml-2 text-gray-900">
              {element.visible ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Geometry Information */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-2">Geometry</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>
            <span className="font-medium">Type:</span>
            <span className="ml-2 capitalize">{element.geometry.type}</span>
          </div>
          <div>
            <span className="font-medium">Bounds:</span>
            <div className="ml-2 text-xs font-mono">
              <div>X: {element.bounds.minX.toFixed(2)} → {element.bounds.maxX.toFixed(2)}</div>
              <div>Y: {element.bounds.minY.toFixed(2)} → {element.bounds.maxY.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Properties */}
      {displayProperties.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Properties</h4>
          <div className="space-y-2">
            {displayProperties.map(([key, value]) => (
              <div key={key} className="text-sm">
                <div className="font-medium text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </div>
                <div className="text-gray-900 ml-2 break-words">
                  {formatPropertyValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No properties message */}
      {displayProperties.length === 0 && (
        <div className="text-sm text-gray-500 italic">
          No additional properties available
        </div>
      )}
    </div>
  );
};

export default ElementInfoPopup;