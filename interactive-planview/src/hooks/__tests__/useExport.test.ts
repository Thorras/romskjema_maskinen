import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from '../useExport';
import { useViewerStore } from '@/store/viewerStore';
import { ExportUtils } from '@/utils/exportUtils';
import type { ExportFormat, Transform } from '@/types';

// Mock the store
vi.mock('@/store/viewerStore');
vi.mock('@/utils/exportUtils');
vi.mock('../useKiroHooks', () => ({
  useKiroHooks: () => ({
    onExportStart: vi.fn(),
    onExportComplete: vi.fn(),
    onExportError: vi.fn(),
  }),
}));

const mockUseViewerStore = vi.mocked(useViewerStore);
const mockExportUtils = vi.mocked(ExportUtils);

describe('useExport', () => {
  const mockTransform: Transform = { x: 10, y: 20, scale: 1.5 };
  const mockVisibleLayers = new Set(['IfcWall', 'IfcDoor']);
  const mockSetError = vi.fn();

  beforeEach(() => {
    // Setup store mocks
    mockUseViewerStore.mockImplementation((selector: any) => {
      const state = {
        transform: mockTransform,
        visibleLayers: mockVisibleLayers,
        setError: mockSetError,
      };
      return selector(state);
    });

    // Setup ExportUtils mocks
    mockExportUtils.exportToPNG = vi.fn();
    mockExportUtils.exportToSVG = vi.fn();
    mockExportUtils.exportToPDF = vi.fn();
    mockExportUtils.generateFilename = vi.fn();
    mockExportUtils.downloadBlob = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportView', () => {
    it('should export PNG successfully', async () => {
      const mockBlob = new Blob(['mock-png-data'], { type: 'image/png' });
      mockExportUtils.exportToPNG.mockResolvedValue(mockBlob);
      mockExportUtils.generateFilename.mockReturnValue('test.png');

      const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useExport({ onSuccess, autoDownload: false }));

      let exportResult: Blob | null = null;
      await act(async () => {
        exportResult = await result.current.exportView(mockSvgElement, 'png');
      });

      expect(exportResult).toBe(mockBlob);
      expect(mockExportUtils.exportToPNG).toHaveBeenCalledWith(mockSvgElement, {
        format: 'png',
        includeScaleBar: true,
        includeNorthArrow: true,
        resolution: 1,
        paperSize: 'A4',
        orientation: 'landscape',
        transform: mockTransform,
      });
      expect(onSuccess).toHaveBeenCalledWith('png', mockBlob);
      expect(result.current.isExporting).toBe(false);
    });

    it('should export SVG successfully', async () => {
      const mockBlob = new Blob(['mock-svg-data'], { type: 'image/svg+xml' });
      mockExportUtils.exportToSVG.mockResolvedValue(mockBlob);

      const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      const { result } = renderHook(() => useExport({ autoDownload: false }));

      let exportResult: Blob | null = null;
      await act(async () => {
        exportResult = await result.current.exportView(mockSvgElement, 'svg');
      });

      expect(exportResult).toBe(mockBlob);
      expect(mockExportUtils.exportToSVG).toHaveBeenCalledWith(mockSvgElement, {
        format: 'svg',
        includeScaleBar: true,
        includeNorthArrow: true,
        resolution: 1,
        paperSize: 'A4',
        orientation: 'landscape',
        transform: mockTransform,
      });
    });

    it('should export PDF successfully', async () => {
      const mockBlob = new Blob(['mock-pdf-data'], { type: 'application/pdf' });
      mockExportUtils.exportToPDF.mockResolvedValue(mockBlob);

      const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      const { result } = renderHook(() => useExport({ autoDownload: false }));

      let exportResult: Blob | null = null;
      await act(async () => {
        exportResult = await result.current.exportView(mockSvgElement, 'pdf');
      });

      expect(exportResult).toBe(mockBlob);
      expect(mockExportUtils.exportToPDF).toHaveBeenCalledWith(mockSvgElement, {
        format: 'pdf',
        includeScaleBar: true,
        includeNorthArrow: true,
        resolution: 1,
        paperSize: 'A4',
        orientation: 'landscape',
        transform: mockTransform,
      });
    });

    it('should handle custom export options', async () => {
      const mockBlob = new Blob(['mock-png-data'], { type: 'image/png' });
      mockExportUtils.exportToPNG.mockResolvedValue(mockBlob);

      const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const customOptions = {
        includeScaleBar: false,
        includeNorthArrow: false,
        resolution: 2,
      };

      const { result } = renderHook(() => useExport({ autoDownload: false }));

      await act(async () => {
        await result.current.exportView(mockSvgElement, 'png', customOptions);
      });

      expect(mockExportUtils.exportToPNG).toHaveBeenCalledWith(mockSvgElement, {
        format: 'png',
        includeScaleBar: false,
        includeNorthArrow: false,
        resolution: 2,
        paperSize: 'A4',
        orientation: 'landscape',
        transform: mockTransform,
      });
    });

    it('should auto-download when enabled', async () => {
      const mockBlob = new Blob(['mock-png-data'], { type: 'image/png' });
      mockExportUtils.exportToPNG.mockResolvedValue(mockBlob);
      mockExportUtils.generateFilename.mockReturnValue('planview_2024-01-01.png');

      const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      const { result } = renderHook(() => useExport({ autoDownload: true }));

      await act(async () => {
        await result.current.exportView(mockSvgElement, 'png');
      });

      expect(mockExportUtils.generateFilename).toHaveBeenCalledWith('png');
      expect(mockExportUtils.downloadBlob).toHaveBeenCalledWith(mockBlob, 'planview_2024-01-01.png');
    });

    it('should handle missing SVG element', async () => {
      const onError = vi.fn();

      const { result } = renderHook(() => useExport({ onError, autoDownload: false }));

      let exportResult: Blob | null = null;
      await act(async () => {
        exportResult = await result.current.exportView(null as any, 'png');
      });

      expect(exportResult).toBeNull();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(result.current.exportError).toBeDefined();
      expect(result.current.exportError?.message).toBe('SVG element is required for export');
    });

    it('should handle export errors', async () => {
      const exportError = new Error('Export failed');
      mockExportUtils.exportToPNG.mockRejectedValue(exportError);

      const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const onError = vi.fn();

      const { result } = renderHook(() => useExport({ onError, autoDownload: false }));

      let exportResult: Blob | null = null;
      await act(async () => {
        exportResult = await result.current.exportView(mockSvgElement, 'png');
      });

      expect(exportResult).toBeNull();
      expect(onError).toHaveBeenCalledWith(exportError);
      expect(result.current.exportError).toBeDefined();
      expect(result.current.exportError?.message).toBe('Export failed');
      expect(mockSetError).toHaveBeenCalled();
    });

    it('should handle unsupported format', async () => {
      const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const onError = vi.fn();

      const { result } = renderHook(() => useExport({ onError, autoDownload: false }));

      let exportResult: Blob | null = null;
      await act(async () => {
        exportResult = await result.current.exportView(mockSvgElement, 'unknown' as ExportFormat);
      });

      expect(exportResult).toBeNull();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(result.current.exportError?.message).toContain('Unsupported export format');
    });

    it('should set isExporting state correctly', async () => {
      const mockBlob = new Blob(['mock-png-data'], { type: 'image/png' });
      
      // Create a promise that we can control
      let resolveExport: (value: Blob) => void;
      const exportPromise = new Promise<Blob>((resolve) => {
        resolveExport = resolve;
      });
      mockExportUtils.exportToPNG.mockReturnValue(exportPromise);

      const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      const { result } = renderHook(() => useExport({ autoDownload: false }));

      // Start export
      const exportPromiseResult = act(async () => {
        return result.current.exportView(mockSvgElement, 'png');
      });

      // Should be exporting
      expect(result.current.isExporting).toBe(true);

      // Resolve the export
      act(() => {
        resolveExport!(mockBlob);
      });

      await exportPromiseResult;

      // Should no longer be exporting
      expect(result.current.isExporting).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear export error', async () => {
      const exportError = new Error('Export failed');
      mockExportUtils.exportToPNG.mockRejectedValue(exportError);

      const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      const { result } = renderHook(() => useExport({ autoDownload: false }));

      // Trigger an error
      await act(async () => {
        await result.current.exportView(mockSvgElement, 'png');
      });

      expect(result.current.exportError).toBeDefined();

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.exportError).toBeNull();
      expect(mockSetError).toHaveBeenCalledWith(null);
    });
  });

  describe('downloadBlob', () => {
    it('should download blob with custom filename', () => {
      const { result } = renderHook(() => useExport());

      const mockBlob = new Blob(['test data'], { type: 'text/plain' });
      const filename = 'custom.txt';

      act(() => {
        result.current.downloadBlob(mockBlob, filename);
      });

      expect(mockExportUtils.downloadBlob).toHaveBeenCalledWith(mockBlob, filename);
    });

    it('should download blob with generated filename', () => {
      mockExportUtils.generateFilename.mockReturnValue('generated.png');

      const { result } = renderHook(() => useExport());

      const mockBlob = new Blob(['test data'], { type: 'image/png' });

      act(() => {
        result.current.downloadBlob(mockBlob);
      });

      expect(mockExportUtils.generateFilename).toHaveBeenCalledWith('png');
      expect(mockExportUtils.downloadBlob).toHaveBeenCalledWith(mockBlob, 'generated.png');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with default prefix', () => {
      mockExportUtils.generateFilename.mockReturnValue('planview_2024-01-01.png');

      const { result } = renderHook(() => useExport());

      const filename = result.current.generateFilename('png');

      expect(mockExportUtils.generateFilename).toHaveBeenCalledWith('png', undefined);
      expect(filename).toBe('planview_2024-01-01.png');
    });

    it('should generate filename with custom prefix', () => {
      mockExportUtils.generateFilename.mockReturnValue('custom_2024-01-01.svg');

      const { result } = renderHook(() => useExport());

      const filename = result.current.generateFilename('svg', 'custom');

      expect(mockExportUtils.generateFilename).toHaveBeenCalledWith('svg', 'custom');
      expect(filename).toBe('custom_2024-01-01.svg');
    });
  });

  describe('integration with viewer state', () => {
    it('should pass current transform to export utils', async () => {
      const customTransform: Transform = { x: 100, y: 200, scale: 2.5 };
      
      mockUseViewerStore.mockImplementation((selector: any) => {
        const state = {
          transform: customTransform,
          visibleLayers: mockVisibleLayers,
          setError: mockSetError,
        };
        return selector(state);
      });

      const mockBlob = new Blob(['mock-png-data'], { type: 'image/png' });
      mockExportUtils.exportToPNG.mockResolvedValue(mockBlob);

      const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      const { result } = renderHook(() => useExport({ autoDownload: false }));

      await act(async () => {
        await result.current.exportView(mockSvgElement, 'png');
      });

      expect(mockExportUtils.exportToPNG).toHaveBeenCalledWith(mockSvgElement, expect.objectContaining({
        transform: customTransform,
      }));
    });
  });
});