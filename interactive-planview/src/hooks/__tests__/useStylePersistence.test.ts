import { renderHook, act } from '@testing-library/react';
import { useStylePersistence } from '../useStylePersistence';
import { useViewerStore } from '@/store/viewerStore';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock the viewer store
vi.mock('@/store/viewerStore');

describe('useStylePersistence', () => {
  const mockSetElementStyle = vi.fn();
  const mockClearAllStyleOverrides = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the store selectors
    (useViewerStore as any).mockImplementation((selector: any) => {
      const mockState = {
        styleOverrides: new Map([
          ['Wall', { fill: '#ff0000', stroke: '#000000' }],
          ['Door', { fill: '#00ff00', stroke: '#000000' }],
        ]),
        setElementStyle: mockSetElementStyle,
        clearAllStyleOverrides: mockClearAllStyleOverrides,
      };
      
      return selector(mockState);
    });
  });

  it('should save styles to localStorage', () => {
    const { result } = renderHook(() => useStylePersistence());
    
    act(() => {
      result.current.saveStyles();
    });
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'interactive-planview-styles',
      expect.stringContaining('"version":"1.0"')
    );
  });

  it('should load styles from localStorage', () => {
    const mockStoredData = {
      version: '1.0',
      timestamp: Date.now(),
      styles: {
        'Wall': { fill: '#0000ff', stroke: '#000000' },
      },
    };
    
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockStoredData));
    
    const { result } = renderHook(() => useStylePersistence());
    
    act(() => {
      result.current.loadStyles();
    });
    
    expect(mockClearAllStyleOverrides).toHaveBeenCalled();
    expect(mockSetElementStyle).toHaveBeenCalledWith('Wall', {
      fill: '#0000ff',
      stroke: '#000000',
    });
  });

  it('should clear stored styles', () => {
    const { result } = renderHook(() => useStylePersistence());
    
    act(() => {
      result.current.clearStoredStyles();
    });
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'interactive-planview-styles'
    );
  });

  it('should handle version mismatch', () => {
    const mockStoredData = {
      version: '0.9',
      timestamp: Date.now(),
      styles: {},
    };
    
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockStoredData));
    
    const { result } = renderHook(() => useStylePersistence());
    
    act(() => {
      const loaded = result.current.loadStyles();
      expect(loaded).toBe(false);
    });
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'interactive-planview-styles'
    );
  });

  it('should handle expired styles', () => {
    const mockStoredData = {
      version: '1.0',
      timestamp: Date.now() - (31 * 24 * 60 * 60 * 1000), // 31 days ago
      styles: {},
    };
    
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockStoredData));
    
    const { result } = renderHook(() => useStylePersistence());
    
    act(() => {
      const loaded = result.current.loadStyles();
      expect(loaded).toBe(false);
    });
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'interactive-planview-styles'
    );
  });
});