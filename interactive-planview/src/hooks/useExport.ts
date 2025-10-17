import { useCallback, useState } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import { useKiroHooks } from '@/hooks/useKiroHooks';
import { ExportUtils } from '@/utils/exportUtils';
import type { ExportFormat, ExportOptions, ViewerError } from '@/types';

interface UseExportOptions {
  onSuccess?: (format: ExportFormat, blob: Blob) => void;
  onError?: (error: Error) => void;
  autoDownload?: boolean;
}

interface UseExportReturn {
  exportView: (
    svgElement: SVGSVGElement,
    format: ExportFormat,
    options?: Partial<ExportOptions>
  ) => Promise<Blob | null>;
  isExporting: boolean;
  exportError: ViewerError | null;
  clearError: () => void;
  downloadBlob: (blob: Blob, filename?: string) => void;
  generateFilename: (format: ExportFormat, prefix?: string) => string;
}

export function useExport(options: UseExportOptions = {}): UseExportReturn {
  const { onSuccess, onError, autoDownload = true } = options;
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<ViewerError | null>(null);
  
  const setError = useViewerStore((state) => state.setError);
  const { onExportStart, onExportComplete, onExportError } = useKiroHooks();

  const clearError = useCallback(() => {
    setExportError(null);
    setError(null);
  }, [setError]);

  const transform = useViewerStore((state) => state.transform);
  const visibleLayers = useViewerStore((state) => state.visibleLayers);

  const exportView = useCallback(async (
    svgElement: SVGSVGElement,
    format: ExportFormat,
    exportOptions: Partial<ExportOptions> = {}
  ): Promise<Blob | null> => {
    if (!svgElement) {
      const error = new Error('SVG element is required for export');
      setExportError({
        type: 'export',
        message: error.message,
        timestamp: new Date(),
      });
      onError?.(error);
      return null;
    }

    setIsExporting(true);
    setExportError(null);
    
    try {
      // Emit export start event with context
      onExportStart(format);
      
      const defaultOptions: ExportOptions = {
        format,
        includeScaleBar: true,
        includeNorthArrow: true,
        resolution: 1,
        paperSize: 'A4',
        orientation: 'landscape',
      };
      
      const finalOptions = { 
        ...defaultOptions, 
        ...exportOptions,
        // Include current viewer state for accurate scale bar
        transform,
      };
      
      let blob: Blob;
      const startTime = performance.now();

      switch (format) {
        case 'png':
          blob = await ExportUtils.exportToPNG(svgElement, finalOptions);
          break;
        case 'svg':
          blob = await ExportUtils.exportToSVG(svgElement, finalOptions);
          break;
        case 'pdf':
          blob = await ExportUtils.exportToPDF(svgElement, finalOptions);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // const exportTime = performance.now() - startTime;
      
      // Emit export complete event with metadata
      onExportComplete(format, blob.size);
      
      // Auto-download if enabled
      if (autoDownload) {
        const filename = ExportUtils.generateFilename(format);
        ExportUtils.downloadBlob(blob, filename);
      }
      
      // Call success callback
      onSuccess?.(format, blob);
      
      return blob;
      
    } catch (error) {
      const exportError: ViewerError = {
        type: 'export',
        message: error instanceof Error ? error.message : 'Unknown export error',
        details: error,
        timestamp: new Date(),
      };
      
      setExportError(exportError);
      setError(exportError);
      onExportError(format, error as Error);
      onError?.(error as Error);
      
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [onExportStart, onExportComplete, onExportError, onSuccess, onError, autoDownload, setError, transform, visibleLayers]);

  const downloadBlob = useCallback((blob: Blob, filename?: string) => {
    const finalFilename = filename || ExportUtils.generateFilename('png');
    ExportUtils.downloadBlob(blob, finalFilename);
  }, []);

  const generateFilename = useCallback((format: ExportFormat, prefix?: string) => {
    return ExportUtils.generateFilename(format, prefix);
  }, []);

  return {
    exportView,
    isExporting,
    exportError,
    clearError,
    downloadBlob,
    generateFilename,
  };
}

export default useExport;