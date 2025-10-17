import React, { useState, useCallback } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import { ElementInfoPopup } from './ElementInfoPopup';
import type { IFCElement, Point } from '@/types';

interface ElementInfoManagerProps {
  children: React.ReactNode;
  className?: string;
}

interface PopupState {
  element: IFCElement;
  position: Point;
}

export const ElementInfoManager: React.FC<ElementInfoManagerProps> = ({
  children,
  className = '',
}) => {
  const [popupState, setPopupState] = useState<PopupState | null>(null);
  
  // Zustand store actions
  const selectElement = useViewerStore((state) => state.selectElement);
  const setHoveredElement = useViewerStore((state) => state.setHoveredElement);

  // Handle element click - show popup and select element
  const handleElementClick = useCallback((element: IFCElement, position: Point) => {
    selectElement(element);
    setPopupState({ element, position });
  }, [selectElement]);

  // Handle element hover - update hover state
  const handleElementHover = useCallback((element: IFCElement | null) => {
    // @ts-ignore - TypeScript strict null check issue with null vs undefined
    setHoveredElement(element || undefined);
  }, [setHoveredElement]);

  // Close popup and clear selection
  const handleClosePopup = useCallback(() => {
    setPopupState(null);
    selectElement(undefined);
  }, [selectElement]);

  // Clone children and inject event handlers
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // Check if this is an SVGRenderer component or mock component
      const componentName = (child.type as any)?.name || (child.type as any)?.displayName;
      
      if (componentName === 'SVGRenderer' || componentName === 'MockSVGRenderer') {
        return React.cloneElement(child as React.ReactElement<any>, {
          onElementClick: handleElementClick,
          onElementHover: handleElementHover,
        });
      }
    }
    return child;
  });

  return (
    <div className={`element-info-manager relative ${className}`}>
      {childrenWithProps}
      
      {/* Render popup if element is selected */}
      {popupState && (
        <ElementInfoPopup
          element={popupState.element}
          position={popupState.position}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
};

export default ElementInfoManager;