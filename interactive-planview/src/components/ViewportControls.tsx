import React from 'react';
import { useInteractionController } from '@/hooks/useInteractionController';
import type { BoundingBox } from '@/types';

interface ViewportControlsProps {
  contentBounds: BoundingBox;
  viewportBounds: BoundingBox;
  className?: string;
  showLabels?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const ViewportControls: React.FC<ViewportControlsProps> = ({
  contentBounds,
  viewportBounds,
  className = '',
  showLabels = false,
  position = 'top-right',
}) => {
  const interactionController = useInteractionController({
    contentBounds,
    viewportBounds,
  });

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const buttonClass = `
    flex items-center justify-center
    w-10 h-10
    bg-white
    border border-gray-300
    rounded-md
    shadow-sm
    hover:bg-gray-50
    hover:border-gray-400
    active:bg-gray-100
    transition-colors
    disabled:opacity-50
    disabled:cursor-not-allowed
  `;

  const iconClass = 'w-5 h-5 text-gray-600';

  return (
    <div className={`absolute ${positionClasses[position]} z-10 ${className}`}>
      <div className="flex flex-col gap-2">
        {/* Zoom In */}
        <button
          onClick={interactionController.zoomIn}
          className={buttonClass}
          title="Zoom In"
          aria-label="Zoom In"
        >
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {showLabels && <span className="ml-2 text-sm">Zoom In</span>}
        </button>

        {/* Zoom Out */}
        <button
          onClick={interactionController.zoomOut}
          className={buttonClass}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
          {showLabels && <span className="ml-2 text-sm">Zoom Out</span>}
        </button>

        {/* Fit to View */}
        <button
          onClick={interactionController.fitToView}
          className={buttonClass}
          title="Fit to View"
          aria-label="Fit to View"
        >
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          {showLabels && <span className="ml-2 text-sm">Fit to View</span>}
        </button>

        {/* Reset View */}
        <button
          onClick={interactionController.resetView}
          className={buttonClass}
          title="Reset View"
          aria-label="Reset View"
        >
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          {showLabels && <span className="ml-2 text-sm">Reset View</span>}
        </button>
      </div>
    </div>
  );
};

export default ViewportControls;