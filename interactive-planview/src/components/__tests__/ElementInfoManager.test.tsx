import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ElementInfoManager } from '../ElementInfoManager';
import { useViewerStore } from '@/store/viewerStore';
import type { IFCElement } from '@/types';

// Mock the viewer store
vi.mock('@/store/viewerStore', () => ({
  useViewerStore: vi.fn()
}));

// Mock SVGRenderer component
const MockSVGRenderer = ({ onElementClick, onElementHover, children }: any) => (
  <div data-testid="svg-renderer">
    <button
      data-testid="element-button"
      onClick={() => onElementClick?.(mockElement, { x: 150, y: 200 })}
      onMouseEnter={() => onElementHover?.(mockElement)}
      onMouseLeave={() => onElementHover?.(null)}
    >
      Mock Element
    </button>
    {children}
  </div>
);
MockSVGRenderer.displayName = 'MockSVGRenderer';

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

describe('ElementInfoManager', () => {
  const mockSelectElement = vi.fn();
  const mockSetHoveredElement = vi.fn();

  beforeEach(() => {
    // Reset mocks
    mockSelectElement.mockClear();
    mockSetHoveredElement.mockClear();

    // Mock the store
    (useViewerStore as any).mockImplementation((selector: any) => {
      const state = {
        selectElement: mockSelectElement,
        setHoveredElement: mockSetHoveredElement
      };
      return selector(state);
    });
  });

  it('renders children correctly', () => {
    render(
      <ElementInfoManager>
        <div data-testid="child-component">Child Content</div>
      </ElementInfoManager>
    );

    expect(screen.getByTestId('child-component')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('injects event handlers into SVGRenderer children', () => {
    render(
      <ElementInfoManager>
        <MockSVGRenderer />
      </ElementInfoManager>
    );

    expect(screen.getByTestId('svg-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('element-button')).toBeInTheDocument();
  });

  it('handles element click and shows popup', async () => {
    render(
      <ElementInfoManager>
        <MockSVGRenderer />
      </ElementInfoManager>
    );

    const elementButton = screen.getByTestId('element-button');
    fireEvent.click(elementButton);

    // Should call selectElement
    expect(mockSelectElement).toHaveBeenCalledWith(mockElement);

    // Should show popup
    await waitFor(() => {
      expect(screen.getByText('Wall')).toBeInTheDocument(); // Display name
    });
    expect(screen.getByText('test-element-001')).toBeInTheDocument(); // GUID
  });

  it('handles element hover', () => {
    render(
      <ElementInfoManager>
        <MockSVGRenderer />
      </ElementInfoManager>
    );

    const elementButton = screen.getByTestId('element-button');
    
    // Hover over element
    fireEvent.mouseEnter(elementButton);
    expect(mockSetHoveredElement).toHaveBeenCalledWith(mockElement);

    // Hover away from element
    fireEvent.mouseLeave(elementButton);
    expect(mockSetHoveredElement).toHaveBeenCalledWith(undefined);
  });

  it('closes popup when close button is clicked', () => {
    render(
      <ElementInfoManager>
        <MockSVGRenderer />
      </ElementInfoManager>
    );

    // Click element to show popup
    const elementButton = screen.getByTestId('element-button');
    fireEvent.click(elementButton);

    // Verify popup is shown
    expect(screen.getByText('Wall')).toBeInTheDocument();

    // Click close button
    const closeButton = screen.getByLabelText('Close popup');
    fireEvent.click(closeButton);

    // Should clear selection
    expect(mockSelectElement).toHaveBeenCalledWith(undefined);

    // Popup should be gone
    expect(screen.queryByText('Wall')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ElementInfoManager className="custom-manager">
        <div>Content</div>
      </ElementInfoManager>
    );

    const manager = container.querySelector('.element-info-manager');
    expect(manager).toHaveClass('custom-manager');
  });

  it('handles non-SVGRenderer children without modification', () => {
    render(
      <ElementInfoManager>
        <div data-testid="regular-div">Regular content</div>
        <button data-testid="regular-button">Regular button</button>
      </ElementInfoManager>
    );

    expect(screen.getByTestId('regular-div')).toBeInTheDocument();
    expect(screen.getByTestId('regular-button')).toBeInTheDocument();
    expect(screen.getByText('Regular content')).toBeInTheDocument();
  });

  it('handles multiple children including SVGRenderer', () => {
    render(
      <ElementInfoManager>
        <div data-testid="other-child">Other content</div>
        <MockSVGRenderer />
        <span data-testid="another-child">Another child</span>
      </ElementInfoManager>
    );

    expect(screen.getByTestId('other-child')).toBeInTheDocument();
    expect(screen.getByTestId('svg-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('another-child')).toBeInTheDocument();
  });

  it('positions popup correctly based on click position', async () => {
    const { container } = render(
      <ElementInfoManager>
        <MockSVGRenderer />
      </ElementInfoManager>
    );

    // Click element to show popup
    const elementButton = screen.getByTestId('element-button');
    fireEvent.click(elementButton);

    // Check popup positioning
    await waitFor(() => {
      const popup = container.querySelector('.element-info-popup');
      expect(popup).toHaveStyle({
        left: '150px',
        top: '200px'
      });
    });
  });

  it('handles popup state correctly', () => {
    render(
      <ElementInfoManager>
        <MockSVGRenderer />
      </ElementInfoManager>
    );

    // Initially no popup
    expect(screen.queryByText('Wall')).not.toBeInTheDocument();

    // Click to show popup
    const elementButton = screen.getByTestId('element-button');
    fireEvent.click(elementButton);
    expect(screen.getByText('Wall')).toBeInTheDocument();

    // Click again to show popup for same element (should update position)
    fireEvent.click(elementButton);
    expect(screen.getByText('Wall')).toBeInTheDocument();
    expect(mockSelectElement).toHaveBeenCalledTimes(2);
  });
});