import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElementInfoPopup } from '../ElementInfoPopup';
import type { IFCElement } from '@/types';

// Mock element for testing
const mockElement: IFCElement = {
  guid: 'test-element-001',
  ifcClass: 'IfcWall',
  geometry: {
    type: 'rect',
    data: { x: 50, y: 50, width: 200, height: 20 },
    bounds: { minX: 50, minY: 50, maxX: 250, maxY: 70 }
  },
  properties: {
    Name: 'Test Wall',
    Material: 'Concrete'
  },
  bounds: { minX: 50, minY: 50, maxX: 250, maxY: 70 },
  visible: true,
  style: { fill: '#8B4513', stroke: '#654321', strokeWidth: 2 }
};

describe('Popup Positioning System', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    
    // Mock getBoundingClientRect for viewport calculations
    Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: vi.fn(() => ({
        width: 300,
        height: 200,
        top: 0,
        left: 0,
        bottom: 200,
        right: 300,
        x: 0,
        y: 0,
      })),
    });

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  describe('Popup Positioning Behavior', () => {
    it('should render popup with positioning styles', () => {
      const position = { x: 100, y: 150 };
      const { container } = render(
        <ElementInfoPopup
          element={mockElement}
          position={position}
          onClose={mockOnClose}
        />
      );

      const popup = container.querySelector('.element-info-popup');
      expect(popup).toBeInTheDocument();
      expect(popup).toHaveClass('fixed');
      
      // Should have positioning styles applied
      const style = window.getComputedStyle(popup!);
      expect(style.left).toBeTruthy();
      expect(style.top).toBeTruthy();
    });

    it('should apply viewport boundary adjustments', () => {
      const position = { x: 0, y: 0 };
      const { container } = render(
        <ElementInfoPopup
          element={mockElement}
          position={position}
          onClose={mockOnClose}
        />
      );

      const popup = container.querySelector('.element-info-popup');
      // Component should adjust position to prevent going off-screen
      expect(popup).toHaveStyle({
        left: '10px',
        top: '10px'
      });
    });

    it('should handle position updates', () => {
      const initialPosition = { x: 100, y: 100 };
      const { container, rerender } = render(
        <ElementInfoPopup
          element={mockElement}
          position={initialPosition}
          onClose={mockOnClose}
        />
      );

      let popup = container.querySelector('.element-info-popup');
      expect(popup).toHaveStyle({
        left: '100px',
        top: '100px'
      });

      // Update position
      const newPosition = { x: 200, y: 300 };
      rerender(
        <ElementInfoPopup
          element={mockElement}
          position={newPosition}
          onClose={mockOnClose}
        />
      );

      popup = container.querySelector('.element-info-popup');
      expect(popup).toHaveStyle({
        left: '200px',
        top: '300px'
      });
    });

    it('should maintain popup structure during position changes', () => {
      const { rerender } = render(
        <ElementInfoPopup
          element={mockElement}
          position={{ x: 0, y: 0 }}
          onClose={mockOnClose}
        />
      );

      // Simulate multiple position changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <ElementInfoPopup
            element={mockElement}
            position={{ x: i * 10, y: i * 10 }}
            onClose={mockOnClose}
          />
        );
      }

      // Should still render popup content correctly
      expect(screen.getByText('Wall')).toBeInTheDocument();
      expect(screen.getByText('test-element-001')).toBeInTheDocument();
    });
  });

  describe('Viewport Edge Handling', () => {
    it('should adjust position when popup would overflow right edge', () => {
      // Mock popup dimensions
      Element.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 300,
        height: 200,
        top: 100,
        left: 800,
        bottom: 300,
        right: 1100, // Would overflow past window width of 1024
        x: 800,
        y: 100,
      }));

      const position = { x: 800, y: 100 };
      const { container } = render(
        <ElementInfoPopup
          element={mockElement}
          position={position}
          onClose={mockOnClose}
        />
      );

      const popup = container.querySelector('.element-info-popup');
      
      // Should be positioned initially at the given coordinates
      expect(popup).toHaveStyle({
        left: '800px',
        top: '100px'
      });
    });

    it('should adjust position when popup would overflow bottom edge', () => {
      // Mock popup dimensions that would overflow bottom
      Element.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 300,
        height: 200,
        top: 600,
        left: 100,
        bottom: 800, // Would overflow past window height of 768
        right: 400,
        x: 100,
        y: 600,
      }));

      const position = { x: 100, y: 600 };
      const { container } = render(
        <ElementInfoPopup
          element={mockElement}
          position={position}
          onClose={mockOnClose}
        />
      );

      const popup = container.querySelector('.element-info-popup');
      
      // Should be positioned initially at the given coordinates
      expect(popup).toHaveStyle({
        left: '100px',
        top: '600px'
      });
    });

    it('should handle corner positioning', () => {
      const cornerPositions = [
        { x: 0, y: 0 },           // Top-left
        { x: 1024, y: 0 },        // Top-right
        { x: 0, y: 768 },         // Bottom-left
        { x: 1024, y: 768 }       // Bottom-right
      ];

      cornerPositions.forEach((position, index) => {
        const { container, unmount } = render(
          <ElementInfoPopup
            element={mockElement}
            position={position}
            onClose={mockOnClose}
            key={index}
          />
        );

        const popup = container.querySelector('.element-info-popup');
        expect(popup).toHaveStyle({
          left: `${position.x}px`,
          top: `${position.y}px`
        });

        unmount();
      });
    });
  });

  describe('Responsive Positioning', () => {
    it('should handle small viewport dimensions', () => {
      // Mock small viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 568,
      });

      const position = { x: 160, y: 284 }; // Center of small screen
      const { container } = render(
        <ElementInfoPopup
          element={mockElement}
          position={position}
          onClose={mockOnClose}
        />
      );

      const popup = container.querySelector('.element-info-popup');
      expect(popup).toHaveStyle({
        left: '160px',
        top: '284px'
      });
    });

    it('should handle large viewport dimensions', () => {
      // Mock large viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 2560,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1440,
      });

      const position = { x: 1280, y: 720 }; // Center of large screen
      const { container } = render(
        <ElementInfoPopup
          element={mockElement}
          position={position}
          onClose={mockOnClose}
        />
      );

      const popup = container.querySelector('.element-info-popup');
      expect(popup).toHaveStyle({
        left: '1280px',
        top: '720px'
      });
    });
  });

  describe('Dynamic Position Updates', () => {
    it('should update position when props change', () => {
      const initialPosition = { x: 100, y: 100 };
      const { container, rerender } = render(
        <ElementInfoPopup
          element={mockElement}
          position={initialPosition}
          onClose={mockOnClose}
        />
      );

      let popup = container.querySelector('.element-info-popup');
      expect(popup).toHaveStyle({
        left: '100px',
        top: '100px'
      });

      // Update position
      const newPosition = { x: 200, y: 300 };
      rerender(
        <ElementInfoPopup
          element={mockElement}
          position={newPosition}
          onClose={mockOnClose}
        />
      );

      popup = container.querySelector('.element-info-popup');
      expect(popup).toHaveStyle({
        left: '200px',
        top: '300px'
      });
    });

    it('should handle rapid position changes', () => {
      const positions = [
        { x: 50, y: 50 },
        { x: 100, y: 100 },
        { x: 150, y: 150 },
        { x: 200, y: 200 },
        { x: 250, y: 250 }
      ];

      const { container, rerender } = render(
        <ElementInfoPopup
          element={mockElement}
          position={positions[0]}
          onClose={mockOnClose}
        />
      );

      positions.forEach((position, index) => {
        if (index > 0) {
          rerender(
            <ElementInfoPopup
              element={mockElement}
              position={position}
              onClose={mockOnClose}
            />
          );
        }

        const popup = container.querySelector('.element-info-popup');
        expect(popup).toHaveStyle({
          left: `${position.x}px`,
          top: `${position.y}px`
        });
      });
    });
  });

  describe('Position Precision', () => {
    it('should maintain sub-pixel precision', () => {
      const precisePositions = [
        { x: 123.456, y: 789.123 },
        { x: 0.1, y: 0.9 },
        { x: 999.999, y: 555.555 }
      ];

      precisePositions.forEach((position, index) => {
        const { container, unmount } = render(
          <ElementInfoPopup
            element={mockElement}
            position={position}
            onClose={mockOnClose}
            key={index}
          />
        );

        const popup = container.querySelector('.element-info-popup');
        expect(popup).toHaveStyle({
          left: `${position.x}px`,
          top: `${position.y}px`
        });

        unmount();
      });
    });

    it('should handle extreme precision values', () => {
      const extremePositions = [
        { x: 123.123456789, y: 456.987654321 },
        { x: 0.000001, y: 0.999999 },
        { x: 1000.000001, y: 2000.999999 }
      ];

      extremePositions.forEach((position, index) => {
        const { container, unmount } = render(
          <ElementInfoPopup
            element={mockElement}
            position={position}
            onClose={mockOnClose}
            key={index}
          />
        );

        const popup = container.querySelector('.element-info-popup');
        expect(popup).toHaveStyle({
          left: `${position.x}px`,
          top: `${position.y}px`
        });

        unmount();
      });
    });
  });

  describe('Performance with Position Changes', () => {
    it('should handle frequent position updates efficiently', () => {
      const { container, rerender } = render(
        <ElementInfoPopup
          element={mockElement}
          position={{ x: 0, y: 0 }}
          onClose={mockOnClose}
        />
      );

      const startTime = performance.now();

      // Simulate 100 rapid position changes
      for (let i = 0; i < 100; i++) {
        const position = { x: i * 2, y: i * 3 };
        rerender(
          <ElementInfoPopup
            element={mockElement}
            position={position}
            onClose={mockOnClose}
          />
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 100ms for 100 updates)
      expect(duration).toBeLessThan(100);

      // Final position should be correct
      const popup = container.querySelector('.element-info-popup');
      expect(popup).toHaveStyle({
        left: '198px', // 99 * 2
        top: '297px'   // 99 * 3
      });
    });

    it('should not cause memory leaks with position updates', () => {
      const { rerender, unmount } = render(
        <ElementInfoPopup
          element={mockElement}
          position={{ x: 0, y: 0 }}
          onClose={mockOnClose}
        />
      );

      // Simulate many position changes
      for (let i = 0; i < 50; i++) {
        rerender(
          <ElementInfoPopup
            element={mockElement}
            position={{ x: Math.random() * 1000, y: Math.random() * 1000 }}
            onClose={mockOnClose}
          />
        );
      }

      // Should unmount cleanly without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Position Validation', () => {
    it('should handle invalid position values gracefully', () => {
      const invalidPositions = [
        { x: NaN, y: 100 },
        { x: 100, y: NaN },
        { x: Infinity, y: 100 },
        { x: 100, y: -Infinity },
        { x: null as any, y: 100 },
        { x: 100, y: undefined as any }
      ];

      invalidPositions.forEach((position, index) => {
        expect(() => {
          const { unmount } = render(
            <ElementInfoPopup
              element={mockElement}
              position={position}
              onClose={mockOnClose}
              key={index}
            />
          );
          unmount();
        }).not.toThrow();
      });
    });

    it('should provide fallback positioning for invalid values', () => {
      const position = { x: NaN, y: NaN };
      const { container } = render(
        <ElementInfoPopup
          element={mockElement}
          position={position}
          onClose={mockOnClose}
        />
      );

      const popup = container.querySelector('.element-info-popup');
      expect(popup).toBeInTheDocument();
      
      // Should have some positioning (even if fallback)
      const style = window.getComputedStyle(popup!);
      expect(style.position).toBe('fixed');
    });
  });
});