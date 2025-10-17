import React, { useState, useRef } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import { useKiroHooks } from '@/hooks/useKiroHooks';
import { ExportUtils } from '@/utils/exportUtils';
import type { ExportFormat, ExportOptions } from '@/types';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  className?: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  svgRef,
  className = '',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('png');
  const [includeScaleBar, setIncludeScaleBar] = useState(true);
  const [includeNorthArrow, setIncludeNorthArrow] = useState(true);
  const [resolution, setResolution] = useState(1);
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'A2' | 'A1' | 'A0'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  
  const visibleLayers = useViewerStore((state) => state.visibleLayers);
  const transform = useViewerStore((state) => state.transform);
  const { onExportStart, onExportComplete, onExportError } = useKiroHooks();
  
  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle export process
  const handleExport = async () => {
    if (!svgRef.current) {
      setExportError('SVG element not available');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    
    try {
      // Emit export start event
      onExportStart(selectedFormat);
      
      const exportOptions: ExportOptions = {
        format: selectedFormat,
        includeScaleBar,
        includeNorthArrow,
        ...(selectedFormat === 'png' && { resolution }),
        ...(selectedFormat === 'pdf' && { paperSize, orientation }),
      };

      let blob: Blob;
      const startTime = performance.now();

      switch (selectedFormat) {
        case 'png':
          blob = await ExportUtils.exportToPNG(svgRef.current, exportOptions);
          break;
        case 'svg':
          blob = await ExportUtils.exportToSVG(svgRef.current, exportOptions);
          break;
        case 'pdf':
          blob = await ExportUtils.exportToPDF(svgRef.current, exportOptions);
          break;
        default:
          throw new Error(`Unsupported export format: ${selectedFormat}`);
      }

      // const exportTime = performance.now() - startTime;
      
      // Generate filename and download
      const filename = ExportUtils.generateFilename(selectedFormat);
      ExportUtils.downloadBlob(blob, filename);
      
      // Emit export complete event
      onExportComplete(selectedFormat, blob.size);
      
      // Close dialog on successful export
      onClose();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error';
      setExportError(errorMessage);
      onExportError(selectedFormat, error as Error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle dialog backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      data-testid="export-dialog-backdrop"
    >
      <div
        ref={dialogRef}
        className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 ${className}`}
        data-testid="export-dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Export Planview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="export-dialog-close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['png', 'svg', 'pdf'] as ExportFormat[]).map((format) => (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`p-3 text-center border rounded-lg transition-colors ${
                    selectedFormat === format
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  data-testid={`export-format-${format}`}
                >
                  <div className="font-medium uppercase">{format}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {format === 'png' && 'Raster Image'}
                    {format === 'svg' && 'Vector Image'}
                    {format === 'pdf' && 'Document'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PNG Options */}
          {selectedFormat === 'png' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="export-resolution"
              >
                <option value={1}>1x (Standard)</option>
                <option value={2}>2x (High DPI)</option>
                <option value={3}>3x (Ultra High DPI)</option>
              </select>
            </div>
          )}

          {/* PDF Options */}
          {selectedFormat === 'pdf' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paper Size
                </label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  data-testid="export-paper-size"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="A2">A2</option>
                  <option value="A1">A1</option>
                  <option value="A0">A0</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orientation
                </label>
                <div className="flex space-x-3">
                  {(['portrait', 'landscape'] as const).map((orient) => (
                    <button
                      key={orient}
                      onClick={() => setOrientation(orient)}
                      className={`flex-1 p-2 text-center border rounded-md transition-colors ${
                        orientation === orient
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      data-testid={`export-orientation-${orient}`}
                    >
                      {orient.charAt(0).toUpperCase() + orient.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Export Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Include Annotations
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeScaleBar}
                  onChange={(e) => setIncludeScaleBar(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  data-testid="export-include-scale-bar"
                />
                <span className="ml-2 text-sm text-gray-700">Scale bar</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeNorthArrow}
                  onChange={(e) => setIncludeNorthArrow(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  data-testid="export-include-north-arrow"
                />
                <span className="ml-2 text-sm text-gray-700">North arrow</span>
              </label>
            </div>
          </div>

          {/* Current View Info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current View</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Zoom: {(transform.scale * 100).toFixed(0)}%</div>
              <div>Visible layers: {visibleLayers.size}</div>
            </div>
          </div>

          {/* Error Message */}
          {exportError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Export Failed</h4>
                  <p className="text-sm text-red-700 mt-1">{exportError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            data-testid="export-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="export-confirm"
          >
            {isExporting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exporting...
              </div>
            ) : (
              `Export ${selectedFormat.toUpperCase()}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;