import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StylingPanel } from '../StylingPanel';
import { useViewerStore } from '@/store/viewerStore';
import type { IFCClass } from '@/types';

// Mock the hooks
vi.mock('@/hooks/useRealTimeStyles', () => ({
  useRealTimeStyles: () => ({
    updateElementStyleWithTransition: vi.fn(),
  }),
}));

vi.mock('@/hooks/useStylePersistence', () => ({
  useStylePersistence: () => ({
    saveStyles: vi.fn(),
    clearStoredStyles: vi.fn(),
  }),
}));

// Mock the store
vi.mock('@/store/viewerStore');

const mockUseViewerStore = vi.mocked(useViewerStore);

describe('StylingPanel', () => {
  const mockLayers: IFCClass[] = [
    { name: 'Wall', displayName: 'Wall', count: 5, visible: true, style: { fill: '#cccccc', stroke: '#000000' } },
    { name: 'Door', displayName: 'Door', count: 3, visible: true, style: { fill: '#8b4513', stroke: '#000000' } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementation
    mockUseViewerStore.mockImplementation((selector: any) => {
      const state = {
        availableLayers: mockLayers,
        styleOverrides: new Map(),
        resetElementStyle: vi.fn(),
        clearAllStyleOverrides: vi.fn(),
      };
      return selector(state);
    });
  });

  it('renders styling panel with correct title', () => {
    render(<StylingPanel />);
    expect(screen.getByText('Element Styling')).toBeInTheDocument();
  });

  it('displays class selection dropdown', () => {
    render(<StylingPanel />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Select a class...')).toBeInTheDocument();
  });

  it('shows available layers in dropdown', () => {
    render(<StylingPanel />);
    
    const select = screen.getByRole('combobox');
    fireEvent.click(select);
    
    expect(screen.getByText('Wall (5)')).toBeInTheDocument();
    expect(screen.getByText('Door (3)')).toBeInTheDocument();
  });

  it('shows styling controls when class is selected', () => {
    render(<StylingPanel />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Wall' } });
    
    expect(screen.getByText('Fill Color')).toBeInTheDocument();
    expect(screen.getByText('Stroke Color')).toBeInTheDocument();
    expect(screen.getByText(/Stroke Width:/)).toBeInTheDocument();
    expect(screen.getByText(/Fill Opacity:/)).toBeInTheDocument();
    expect(screen.getByText(/Stroke Opacity:/)).toBeInTheDocument();
  });

  it('shows action buttons when class is selected', () => {
    render(<StylingPanel />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Wall' } });
    
    expect(screen.getByText('Reset Class')).toBeInTheDocument();
    expect(screen.getByText('Save Styles')).toBeInTheDocument();
    expect(screen.getByText('Reset All & Clear Storage')).toBeInTheDocument();
  });

  it('shows placeholder message when no class is selected', () => {
    render(<StylingPanel />);
    
    expect(screen.getByText('Select an IFC class to customize its styling')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<StylingPanel className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});