import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportDialog } from '../ExportDialog';
import { useViewerStore } from '@/store/viewerStore';
import { ExportUtils } from '@/utils/exportUtils';

// Mock the store and utilities
vi.mock('@/store/viewerStore');
vi.mock('@/utils/exportUtils');
vi.mock('@/hooks/useKiroHooks', () => ({
  useKiroHooks: () => ({
    onExportStart: vi.fn(),
    onExportComplete: vi.fn(),
    onExportError: vi.fn(),
  }),
}));

const mockUseViewerStore = vi.mocked(useViewerStore);
const mockExportUtils = vi.mocked(ExportUtils);

describe('ExportDialog', () => {
  const mockSvgRef = { current: document.createElementNS('http://www.w3.org/2000/svg', 'svg') };
  const mockOnClose = vi.fn();
  const mockVisibleLayers = new Set(['IfcWall', 'IfcDoor']);
  const mockTransform = { x: 10, y: 20, scale: 1.5 };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    svgRef: mockSvgRef,
  };

  beforeEach(() => {
    // Setup store mocks
    mockUseViewerStore.mockImplementation((selector: any) => {
      const state = {
        visibleLayers: mockVisibleLayers,
        transform: mockTransform,
      };
      return selector(state);
    });

    // Setup ExportUtils mocks
    mockExportUtils.exportToPNG = vi.fn();
    mockExportUtils.exportToSVG = vi.fn();
    mockExportUtils.exportToPDF = vi.fn();
    mockExportUtils.generateFilename = vi.fn().mockReturnValue('test-export.png');
    mockExportUtils.downloadBlob = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render when open', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
      expect(screen.getByText('Export Planview')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<ExportDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('export-dialog')).not.toBeInTheDocument();
    });

    it('should render all export format options', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByTestId('export-format-png')).toBeInTheDocument();
      expect(screen.getByTestId('export-format-svg')).toBeInTheDocument();
      expect(screen.getByTestId('export-format-pdf')).toBeInTheDocument();
    });

    it('should render current view information', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('Current View')).toBeInTheDocument();
      expect(screen.getByText('Zoom: 150%')).toBeInTheDocument();
      expect(screen.getByText('Visible layers: 2')).toBeInTheDocument();
    });

    it('should render annotation options', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByTestId('export-include-scale-bar')).toBeInTheDocument();
      expect(screen.getByTestId('export-include-north-arrow')).toBeInTheDocument();
    });
  });

  describe('Format Selection', () => {
    it('should select PNG by default', () => {
      render(<ExportDialog {...defaultProps} />);

      const pngButton = screen.getByTestId('export-format-png');
      expect(pngButton).toHaveClass('border-blue-500', 'bg-blue-50', 'text-blue-700');
    });

    it('should change format when clicked', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const svgButton = screen.getByTestId('export-format-svg');
      await user.click(svgButton);

      expect(svgButton).toHaveClass('border-blue-500', 'bg-blue-50', 'text-blue-700');
    });

    it('should show PNG-specific options when PNG is selected', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByTestId('export-resolution')).toBeInTheDocument();
    });

    it('should show PDF-specific options when PDF is selected', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const pdfButton = screen.getByTestId('export-format-pdf');
      await user.click(pdfButton);

      expect(screen.getByTestId('export-paper-size')).toBeInTheDocument();
      expect(screen.getByTestId('export-orientation-portrait')).toBeInTheDocument();
      expect(screen.getByTestId('export-orientation-landscape')).toBeInTheDocument();
    });

    it('should not show format-specific options for SVG', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const svgButton = screen.getByTestId('export-format-svg');
      await user.click(svgButton);

      expect(screen.queryByTestId('export-resolution')).not.toBeInTheDocument();
      expect(screen.queryByTestId('export-paper-size')).not.toBeInTheDocument();
    });
  });

  describe('Export Options', () => {
    it('should have scale bar and north arrow checked by default', () => {
      render(<ExportDialog {...defaultProps} />);

      const scaleBarCheckbox = screen.getByTestId('export-include-scale-bar');
      const northArrowCheckbox = screen.getByTestId('export-include-north-arrow');

      expect(scaleBarCheckbox).toBeChecked();
      expect(northArrowCheckbox).toBeChecked();
    });

    it('should toggle annotation options', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const scaleBarCheckbox = screen.getByTestId('export-include-scale-bar');
      await user.click(scaleBarCheckbox);

      expect(scaleBarCheckbox).not.toBeChecked();
    });

    it('should change resolution for PNG export', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const resolutionSelect = screen.getByTestId('export-resolution');
      await user.selectOptions(resolutionSelect, '2');

      expect(resolutionSelect).toHaveValue('2');
    });

    it('should change paper size for PDF export', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      // Switch to PDF format
      const pdfButton = screen.getByTestId('export-format-pdf');
      await user.click(pdfButton);

      const paperSizeSelect = screen.getByTestId('export-paper-size');
      await user.selectOptions(paperSizeSelect, 'A3');

      expect(paperSizeSelect).toHaveValue('A3');
    });

    it('should change orientation for PDF export', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      // Switch to PDF format
      const pdfButton = screen.getByTestId('export-format-pdf');
      await user.click(pdfButton);

      const portraitButton = screen.getByTestId('export-orientation-portrait');
      await user.click(portraitButton);

      expect(portraitButton).toHaveClass('border-blue-500', 'bg-blue-50', 'text-blue-700');
    });
  });

  describe('Export Process', () => {
    it('should export PNG successfully', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['mock-png-data'], { type: 'image/png' });
      mockExportUtils.exportToPNG.mockResolvedValue(mockBlob);

      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByTestId('export-confirm');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockExportUtils.exportToPNG).toHaveBeenCalledWith(mockSvgRef.current, {
          format: 'png',
          includeScaleBar: true,
          includeNorthArrow: true,
          resolution: 1,
        });
      });

      expect(mockExportUtils.generateFilename).toHaveBeenCalledWith('png');
      expect(mockExportUtils.downloadBlob).toHaveBeenCalledWith(mockBlob, 'test-export.png');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should export SVG successfully', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['mock-svg-data'], { type: 'image/svg+xml' });
      mockExportUtils.exportToSVG.mockResolvedValue(mockBlob);

      render(<ExportDialog {...defaultProps} />);

      // Switch to SVG format
      const svgButton = screen.getByTestId('export-format-svg');
      await user.click(svgButton);

      const exportButton = screen.getByTestId('export-confirm');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockExportUtils.exportToSVG).toHaveBeenCalledWith(mockSvgRef.current, {
          format: 'svg',
          includeScaleBar: true,
          includeNorthArrow: true,
        });
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should export PDF successfully', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['mock-pdf-data'], { type: 'application/pdf' });
      mockExportUtils.exportToPDF.mockResolvedValue(mockBlob);

      render(<ExportDialog {...defaultProps} />);

      // Switch to PDF format
      const pdfButton = screen.getByTestId('export-format-pdf');
      await user.click(pdfButton);

      const exportButton = screen.getByTestId('export-confirm');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockExportUtils.exportToPDF).toHaveBeenCalledWith(mockSvgRef.current, {
          format: 'pdf',
          includeScaleBar: true,
          includeNorthArrow: true,
          paperSize: 'A4',
          orientation: 'landscape',
        });
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show loading state during export', async () => {
      const user = userEvent.setup();
      
      // Create a promise that we can control
      let resolveExport: (value: Blob) => void;
      const exportPromise = new Promise<Blob>((resolve) => {
        resolveExport = resolve;
      });
      mockExportUtils.exportToPNG.mockReturnValue(exportPromise);

      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByTestId('export-confirm');
      await user.click(exportButton);

      // Should show loading state
      expect(screen.getByText('Exporting...')).toBeInTheDocument();
      expect(exportButton).toBeDisabled();

      // Resolve the export
      const mockBlob = new Blob(['mock-png-data'], { type: 'image/png' });
      resolveExport!(mockBlob);

      await waitFor(() => {
        expect(screen.queryByText('Exporting...')).not.toBeInTheDocument();
      });
    });

    it('should handle export errors', async () => {
      const user = userEvent.setup();
      const exportError = new Error('Export failed');
      mockExportUtils.exportToPNG.mockRejectedValue(exportError);

      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByTestId('export-confirm');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export Failed')).toBeInTheDocument();
        expect(screen.getByText('Export failed')).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should handle missing SVG element', async () => {
      const user = userEvent.setup();
      const propsWithoutSvg = {
        ...defaultProps,
        svgRef: { current: null },
      };

      render(<ExportDialog {...propsWithoutSvg} />);

      const exportButton = screen.getByTestId('export-confirm');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export Failed')).toBeInTheDocument();
        expect(screen.getByText('SVG element not available')).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Interaction', () => {
    it('should close when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const closeButton = screen.getByTestId('export-dialog-close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const cancelButton = screen.getByTestId('export-cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const backdrop = screen.getByTestId('export-dialog-backdrop');
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when dialog content is clicked', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const dialog = screen.getByTestId('export-dialog');
      await user.click(dialog);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should close when Escape key is pressed', () => {
      render(<ExportDialog {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when other keys are pressed', () => {
      render(<ExportDialog {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Enter' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ExportDialog {...defaultProps} />);

      const dialog = screen.getByTestId('export-dialog');
      expect(dialog).toBeInTheDocument();
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: 'Export Planview' })).toBeInTheDocument();
    });

    it('should disable buttons during export', async () => {
      const user = userEvent.setup();
      
      let resolveExport: (value: Blob) => void;
      const exportPromise = new Promise<Blob>((resolve) => {
        resolveExport = resolve;
      });
      mockExportUtils.exportToPNG.mockReturnValue(exportPromise);

      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByTestId('export-confirm');
      const cancelButton = screen.getByTestId('export-cancel');
      
      await user.click(exportButton);

      expect(exportButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();

      // Resolve the export
      const mockBlob = new Blob(['mock-png-data'], { type: 'image/png' });
      resolveExport!(mockBlob);

      await waitFor(() => {
        expect(exportButton).not.toBeDisabled();
        expect(cancelButton).not.toBeDisabled();
      });
    });
  });

  describe('Custom Options', () => {
    it('should export with custom options', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['mock-png-data'], { type: 'image/png' });
      mockExportUtils.exportToPNG.mockResolvedValue(mockBlob);

      render(<ExportDialog {...defaultProps} />);

      // Change resolution
      const resolutionSelect = screen.getByTestId('export-resolution');
      await user.selectOptions(resolutionSelect, '3');

      // Uncheck scale bar
      const scaleBarCheckbox = screen.getByTestId('export-include-scale-bar');
      await user.click(scaleBarCheckbox);

      const exportButton = screen.getByTestId('export-confirm');
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockExportUtils.exportToPNG).toHaveBeenCalledWith(mockSvgRef.current, {
          format: 'png',
          includeScaleBar: false,
          includeNorthArrow: true,
          resolution: 3,
        });
      });
    });
  });
});