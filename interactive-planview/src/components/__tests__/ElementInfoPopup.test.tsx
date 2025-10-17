import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ElementInfoPopup } from '../ElementInfoPopup';
import type { IFCElement } from '@/types';

// Mock element for testing
const mockElement: IFCElement = {
  guid: 'test-wall-001',
  ifcClass: 'IfcWall',
  geometry: {
    type: 'rect',
    data: { x: 50, y: 50, width: 200, height: 20 },
    bounds: { minX: 50, minY: 50, maxX: 250, maxY: 70 }
  },
  properties: {
    Name: 'Test Wall',
    Material: 'Concrete',
    Thickness: '200mm',
    FireRating: '2 hours',
    LoadBearing: true,
    Height: 3000,
    ComplexProperty: { nested: 'value', array: [1, 2, 3] }
  },
  bounds: { minX: 50, minY: 50, maxX: 250, maxY: 70 },
  visible: true,
  style: { fill: '#8B4513', stroke: '#654321', strokeWidth: 2 }
};

const mockPosition = { x: 100, y: 100 };

describe('ElementInfoPopup', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders element information correctly', () => {
    render(
      <ElementInfoPopup
        element={mockElement}
        position={mockPosition}
        onClose={mockOnClose}
      />
    );

    // Check header information
    expect(screen.getByText('Wall')).toBeInTheDocument();
    expect(screen.getByText('test-wall-001')).toBeInTheDocument();

    // Check basic information
    expect(screen.getByText('IfcWall')).toBeInTheDocument();
    
    // Check visible status (should be "Yes" in the basic info section)
    const visibleSection = screen.getByText('Visible:').parentElement;
    expect(visibleSection).toHaveTextContent('Yes');

    // Check geometry information
    expect(screen.getByText('Geometry')).toBeInTheDocument();
    expect(screen.getByText('rect')).toBeInTheDocument(); // Geometry type is lowercase

    // Check properties
    expect(screen.getByText('Test Wall')).toBeInTheDocument();
    expect(screen.getByText('Concrete')).toBeInTheDocument();
    expect(screen.getByText('200mm')).toBeInTheDocument();
    expect(screen.getByText('2 hours')).toBeInTheDocument();
    
    // Check LoadBearing property specifically
    const loadBearingSection = screen.getByText('Load Bearing:').parentElement;
    expect(loadBearingSection).toHaveTextContent('Yes');
    
    // Check Height property (formatted number)
    const heightSection = screen.getByText('Height:').parentElement;
    expect(heightSection).toHaveTextContent('3'); // Should contain the number 3
  });

  it('positions popup at specified coordinates', () => {
    const { container } = render(
      <ElementInfoPopup
        element={mockElement}
        position={mockPosition}
        onClose={mockOnClose}
      />
    );

    const popup = container.querySelector('.element-info-popup');
    expect(popup).toHaveStyle({
      left: '100px',
      top: '100px'
    });
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <ElementInfoPopup
        element={mockElement}
        position={mockPosition}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText('Close popup');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking outside popup', async () => {
    render(
      <div>
        <div data-testid="outside">Outside element</div>
        <ElementInfoPopup
          element={mockElement}
          position={mockPosition}
          onClose={mockOnClose}
        />
      </div>
    );

    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose when Escape key is pressed', async () => {
    render(
      <ElementInfoPopup
        element={mockElement}
        position={mockPosition}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('formats different property value types correctly', () => {
    render(
      <ElementInfoPopup
        element={mockElement}
        position={mockPosition}
        onClose={mockOnClose}
      />
    );

    // Boolean value (LoadBearing: true)
    const loadBearingSection = screen.getByText('Load Bearing:').parentElement;
    expect(loadBearingSection).toHaveTextContent('Yes');

    // Number value (formatted with locale) - Note: different locales format differently
    const heightSection = screen.getByText('Height:').parentElement;
    expect(heightSection).toHaveTextContent('3'); // Should contain the number 3 (formatted as 3,000 or 3 000)

    // Complex object (JSON stringified)
    expect(screen.getByText(/"nested": "value"/)).toBeInTheDocument();
  });

  it('handles element with no additional properties', () => {
    const elementWithoutProps: IFCElement = {
      ...mockElement,
      properties: {}
    };

    render(
      <ElementInfoPopup
        element={elementWithoutProps}
        position={mockPosition}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('No additional properties available')).toBeInTheDocument();
  });

  it('displays geometry bounds correctly', () => {
    render(
      <ElementInfoPopup
        element={mockElement}
        position={mockPosition}
        onClose={mockOnClose}
      />
    );

    // Check bounds display
    expect(screen.getByText('X: 50.00 → 250.00')).toBeInTheDocument();
    expect(screen.getByText('Y: 50.00 → 70.00')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ElementInfoPopup
        element={mockElement}
        position={mockPosition}
        onClose={mockOnClose}
        className="custom-popup"
      />
    );

    const popup = container.querySelector('.element-info-popup');
    expect(popup).toHaveClass('custom-popup');
  });

  it('converts IFC class name to display name', () => {
    const doorElement: IFCElement = {
      ...mockElement,
      ifcClass: 'IfcDoor',
      guid: 'door-001'
    };

    render(
      <ElementInfoPopup
        element={doorElement}
        position={mockPosition}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Door')).toBeInTheDocument();
  });

  it('handles null and undefined property values', () => {
    const elementWithNullProps: IFCElement = {
      ...mockElement,
      properties: {
        NullValue: null,
        UndefinedValue: undefined,
        EmptyString: '',
        ZeroValue: 0,
        FalseValue: false
      }
    };

    render(
      <ElementInfoPopup
        element={elementWithNullProps}
        position={mockPosition}
        onClose={mockOnClose}
      />
    );

    // Should show N/A for null and undefined
    const naElements = screen.getAllByText('N/A');
    expect(naElements).toHaveLength(2); // null and undefined

    // Should show actual values for falsy but valid values
    expect(screen.getByText('0')).toBeInTheDocument(); // ZeroValue
    expect(screen.getByText('No')).toBeInTheDocument(); // FalseValue
  });
});