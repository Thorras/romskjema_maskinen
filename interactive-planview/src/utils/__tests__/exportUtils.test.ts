import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExportUtils } from '../exportUtils';
import type { ExportOptions, Transform } from '@/types';

// Mock DOM APIs
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(),
  toBlob: vi.fn(),
};

const mockContext = {
  fillStyle: '',
  fillRect: vi.fn(),
  drawImage: vi.fn(),
};

const mockImage = {
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  src: '',
};

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'mock-blob-url');
const mockRevokeObjectURL = vi.fn();

// Mock XMLSerializer
const mockXMLSerializer = vi.fn(() => ({
  serializeToString: vi.fn(() => '<svg>mock svg content</svg>'),
}));

// Mock Blob constructor
const mockBlob = vi.fn((content, options) => ({
  size: content[0].length,
  type: options?.type || 'application/octet-stream',
}));

// Mock document.createElement
const mockCreateElement = vi.fn((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas;
  }
  if (tagName === 'a') {
    return {
      href: '',
      download: '',
      click: vi.fn(),
    };
  }
  return {};
});

// Mock document.createElementNS
const mockCreateElementNS = vi.fn((namespace: string, tagName: string) => ({
  setAttribute: vi.fn(),
  appendChild: vi.fn(),
  textContent: '',
}));

// Mock document.body
const mockBody = {
  appendChild: vi.fn(),
  removeChild: vi.fn(),
};

describe('ExportUtils', () => {
  beforeEach(() => {
    // Setup DOM mocks
    global.document = {
      createElement: mockCreateElement,
      createElementNS: mockCreateElementNS,
      body: mockBody,
    } as any;

    global.URL = {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    } as any;

    global.XMLSerializer = mockXMLSerializer as any;
    global.Blob = mockBlob as any;
    global.Image = vi.fn(() => mockImage) as any;
    global.TextEncoder = vi.fn(() => ({
      encode: vi.fn((text: string) => new Uint8Array(text.length)),
    })) as any;

    // Setup canvas context mock
    mockCanvas.getContext.mockReturnValue(mockContext);
    mockCanvas.toBlob.mockImplementation((callback) => {
      callback(new mockBlob(['mock-png-data'], { type: 'image/png' }));
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportToPNG', () => {
    let mockSvgElement: SVGSVGElement;

    beforeEach(() => {
      mockSvgElement = {
        getBoundingClientRect: vi.fn(() => ({ width: 400, height: 300 })),
        cloneNode: vi.fn(() => ({
          ...mockSvgElement,
          setAttribute: vi.fn(),
          getAttribute: vi.fn((attr: string) => {
            if (attr === 'width') return '400';
            if (attr === 'height') return '300';
            return null;
          }),
          appendChild: vi.fn(),
        })),
        setAttribute: vi.fn(),
        getAttribute: vi.fn((attr: string) => {
          if (attr === 'width') return '400';
          if (attr === 'height') return '300';
          return null;
        }),
        appendChild: vi.fn(),
      } as any;
    });

    it('should export SVG to PNG successfully', async () => {
      const options: ExportOptions = {
        format: 'png',
        includeScaleBar: false,
        includeNorthArrow: false,
        resolution: 1,
      };

      // Mock successful image loading
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await ExportUtils.exportToPNG(mockSvgElement, options);

      expect(result).toBeDefined();
      expect(result.type).toBe('image/png');
      expect(mockCanvas.width).toBe(400);
      expect(mockCanvas.height).toBe(300);
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 400, 300);
      expect(mockContext.drawImage).toHaveBeenCalled();
    });

    it('should handle high resolution export', async () => {
      const options: ExportOptions = {
        format: 'png',
        includeScaleBar: false,
        includeNorthArrow: false,
        resolution: 2,
      };

      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      await ExportUtils.exportToPNG(mockSvgElement, options);

      expect(mockCanvas.width).toBe(800); // 400 * 2
      expect(mockCanvas.height).toBe(600); // 300 * 2
    });

    it('should throw error for invalid SVG element', async () => {
      const options: ExportOptions = {
        format: 'png',
        includeScaleBar: false,
        includeNorthArrow: false,
      };

      await expect(ExportUtils.exportToPNG(null as any, options)).rejects.toThrow(
        'SVG element is required for PNG export'
      );
    });

    it('should throw error for invalid resolution', async () => {
      const options: ExportOptions & { resolution: number } = {
        format: 'png',
        includeScaleBar: false,
        includeNorthArrow: false,
        resolution: 10, // Too high
      };

      await expect(ExportUtils.exportToPNG(mockSvgElement, options)).rejects.toThrow(
        'Resolution must be between 0 and 5'
      );
    });

    it('should throw error for zero dimensions', async () => {
      mockSvgElement.getBoundingClientRect = vi.fn(() => ({ width: 0, height: 300 }));

      const options: ExportOptions = {
        format: 'png',
        includeScaleBar: false,
        includeNorthArrow: false,
      };

      await expect(ExportUtils.exportToPNG(mockSvgElement, options)).rejects.toThrow(
        'SVG element has invalid dimensions'
      );
    });

    it('should throw error when canvas context is not available', async () => {
      mockCanvas.getContext.mockReturnValue(null);

      const options: ExportOptions = {
        format: 'png',
        includeScaleBar: false,
        includeNorthArrow: false,
      };

      await expect(ExportUtils.exportToPNG(mockSvgElement, options)).rejects.toThrow(
        'Failed to get canvas context'
      );
    });

    it('should handle image loading failure', async () => {
      const options: ExportOptions = {
        format: 'png',
        includeScaleBar: false,
        includeNorthArrow: false,
      };

      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror();
      }, 0);

      await expect(ExportUtils.exportToPNG(mockSvgElement, options)).rejects.toThrow(
        'PNG export failed'
      );
    });

    it('should handle image loading timeout', async () => {
      const options: ExportOptions = {
        format: 'png',
        includeScaleBar: false,
        includeNorthArrow: false,
      };

      // Don't trigger onload or onerror to simulate timeout
      await expect(ExportUtils.exportToPNG(mockSvgElement, options)).rejects.toThrow(
        'PNG export failed'
      );
    }, 15000); // Increase timeout for this test

    it('should include scale bar and north arrow when requested', async () => {
      const options: ExportOptions = {
        format: 'png',
        includeScaleBar: true,
        includeNorthArrow: true,
      };

      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      await ExportUtils.exportToPNG(mockSvgElement, options);

      // Verify that annotations were added (createElementNS should be called for annotations)
      expect(mockCreateElementNS).toHaveBeenCalled();
    });
  });

  describe('exportToSVG', () => {
    let mockSvgElement: SVGSVGElement;

    beforeEach(() => {
      mockSvgElement = {
        cloneNode: vi.fn(() => ({
          ...mockSvgElement,
          setAttribute: vi.fn(),
          getAttribute: vi.fn((attr: string) => {
            if (attr === 'width') return '400';
            if (attr === 'height') return '300';
            return null;
          }),
          appendChild: vi.fn(),
          insertBefore: vi.fn(),
          firstChild: {},
        })),
        setAttribute: vi.fn(),
        getAttribute: vi.fn((attr: string) => {
          if (attr === 'width') return '400';
          if (attr === 'height') return '300';
          return null;
        }),
        appendChild: vi.fn(),
        insertBefore: vi.fn(),
        firstChild: {},
      } as any;
    });

    it('should export SVG successfully', async () => {
      const options: ExportOptions = {
        format: 'svg',
        includeScaleBar: false,
        includeNorthArrow: false,
      };

      const result = await ExportUtils.exportToSVG(mockSvgElement, options);

      expect(result).toBeDefined();
      expect(result.type).toBe('image/svg+xml;charset=utf-8');
      expect(mockSvgElement.setAttribute).toHaveBeenCalledWith('xmlns', 'http://www.w3.org/2000/svg');
      expect(mockSvgElement.setAttribute).toHaveBeenCalledWith('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      expect(mockXMLSerializer.serializeToString).toHaveBeenCalled();
    });

    it('should throw error for invalid SVG element', async () => {
      const options: ExportOptions = {
        format: 'svg',
        includeScaleBar: false,
        includeNorthArrow: false,
      };

      await expect(ExportUtils.exportToSVG(null as any, options)).rejects.toThrow(
        'SVG element is required for SVG export'
      );
    });

    it('should include metadata in exported SVG', async () => {
      const options: ExportOptions = {
        format: 'svg',
        includeScaleBar: false,
        includeNorthArrow: false,
      };

      await ExportUtils.exportToSVG(mockSvgElement, options);

      // Verify metadata elements were created
      expect(mockCreateElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'metadata');
      expect(mockCreateElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'desc');
    });

    it('should include scale bar and north arrow when requested', async () => {
      const options: ExportOptions = {
        format: 'svg',
        includeScaleBar: true,
        includeNorthArrow: true,
      };

      await ExportUtils.exportToSVG(mockSvgElement, options);

      // Verify that annotations were added
      expect(mockCreateElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'g');
    });
  });

  describe('exportToPDF', () => {
    let mockSvgElement: SVGSVGElement;

    beforeEach(() => {
      mockSvgElement = {
        getBoundingClientRect: vi.fn(() => ({ width: 400, height: 300 })),
        cloneNode: vi.fn(() => ({
          ...mockSvgElement,
          setAttribute: vi.fn(),
          getAttribute: vi.fn((attr: string) => {
            if (attr === 'width') return '400';
            if (attr === 'height') return '300';
            return null;
          }),
          appendChild: vi.fn(),
        })),
        setAttribute: vi.fn(),
        getAttribute: vi.fn((attr: string) => {
          if (attr === 'width') return '400';
          if (attr === 'height') return '300';
          return null;
        }),
        appendChild: vi.fn(),
      } as any;

      // Mock successful PNG export for PDF
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);
    });

    it('should export SVG to PDF successfully', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        includeScaleBar: false,
        includeNorthArrow: false,
        paperSize: 'A4',
        orientation: 'landscape',
      };

      const result = await ExportUtils.exportToPDF(mockSvgElement, options);

      expect(result).toBeDefined();
      expect(result.type).toBe('application/pdf');
    });

    it('should throw error for invalid SVG element', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        includeScaleBar: false,
        includeNorthArrow: false,
      };

      await expect(ExportUtils.exportToPDF(null as any, options)).rejects.toThrow(
        'SVG element is required for PDF export'
      );
    });

    it('should handle different paper sizes and orientations', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        includeScaleBar: false,
        includeNorthArrow: false,
        paperSize: 'A3',
        orientation: 'portrait',
      };

      const result = await ExportUtils.exportToPDF(mockSvgElement, options);

      expect(result).toBeDefined();
      expect(result.type).toBe('application/pdf');
    });
  });

  describe('downloadBlob', () => {
    it('should create download link and trigger download', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      mockCreateElement.mockReturnValue(mockLink);

      const blob = new mockBlob(['test data'], { type: 'text/plain' });
      const filename = 'test.txt';

      ExportUtils.downloadBlob(blob as any, filename);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(mockLink.download).toBe(filename);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockBody.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockBody.removeChild).toHaveBeenCalledWith(mockLink);
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('getFileExtension', () => {
    it('should return correct extensions for different formats', () => {
      expect(ExportUtils.getFileExtension('png')).toBe('.png');
      expect(ExportUtils.getFileExtension('svg')).toBe('.svg');
      expect(ExportUtils.getFileExtension('pdf')).toBe('.pdf');
    });

    it('should return default extension for unknown format', () => {
      expect(ExportUtils.getFileExtension('unknown' as any)).toBe('.png');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with timestamp', () => {
      const filename = ExportUtils.generateFilename('png');
      
      expect(filename).toMatch(/^planview_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.png$/);
    });

    it('should use custom prefix', () => {
      const filename = ExportUtils.generateFilename('svg', 'custom');
      
      expect(filename).toMatch(/^custom_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.svg$/);
    });

    it('should handle different formats', () => {
      const pngFilename = ExportUtils.generateFilename('png');
      const svgFilename = ExportUtils.generateFilename('svg');
      const pdfFilename = ExportUtils.generateFilename('pdf');
      
      expect(pngFilename).toContain('.png');
      expect(svgFilename).toContain('.svg');
      expect(pdfFilename).toContain('.pdf');
    });
  });

  describe('Error handling', () => {
    let mockSvgElement: SVGSVGElement;

    beforeEach(() => {
      mockSvgElement = {
        getBoundingClientRect: vi.fn(() => ({ width: 400, height: 300 })),
        cloneNode: vi.fn(() => ({
          ...mockSvgElement,
          setAttribute: vi.fn(),
          getAttribute: vi.fn((attr: string) => {
            if (attr === 'width') return '400';
            if (attr === 'height') return '300';
            return null;
          }),
          appendChild: vi.fn(),
        })),
        setAttribute: vi.fn(),
        getAttribute: vi.fn((attr: string) => {
          if (attr === 'width') return '400';
          if (attr === 'height') return '300';
          return null;
        }),
        appendChild: vi.fn(),
      } as any;
    });

    it('should handle canvas blob creation failure', async () => {
      mockCanvas.toBlob.mockImplementation((callback) => {
        callback(null); // Simulate blob creation failure
      });

      const options: ExportOptions = {
        format: 'png',
        includeScaleBar: false,
        includeNorthArrow: false,
      };

      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      await expect(ExportUtils.exportToPNG(mockSvgElement, options)).rejects.toThrow(
        'PNG export failed'
      );
    });

    it('should handle XMLSerializer errors', async () => {
      mockXMLSerializer.serializeToString.mockImplementation(() => {
        throw new Error('Serialization failed');
      });

      const options: ExportOptions = {
        format: 'svg',
        includeScaleBar: false,
        includeNorthArrow: false,
      };

      await expect(ExportUtils.exportToSVG(mockSvgElement, options)).rejects.toThrow(
        'SVG export failed'
      );
    });

    it('should handle annotation creation errors', async () => {
      mockCreateElementNS.mockImplementation(() => {
        throw new Error('Element creation failed');
      });

      const options: ExportOptions = {
        format: 'svg',
        includeScaleBar: true,
        includeNorthArrow: true,
      };

      await expect(ExportUtils.exportToSVG(mockSvgElement, options)).rejects.toThrow(
        'SVG export failed'
      );
    });
  });

  describe('Scale bar and north arrow creation', () => {
    it('should create scale bar with proper dimensions', async () => {
      const mockSvgElement = {
        cloneNode: vi.fn(() => ({
          ...mockSvgElement,
          setAttribute: vi.fn(),
          getAttribute: vi.fn((attr: string) => {
            if (attr === 'width') return '400';
            if (attr === 'height') return '300';
            return null;
          }),
          appendChild: vi.fn(),
          insertBefore: vi.fn(),
          firstChild: {},
        })),
        setAttribute: vi.fn(),
        getAttribute: vi.fn((attr: string) => {
          if (attr === 'width') return '400';
          if (attr === 'height') return '300';
          return null;
        }),
        appendChild: vi.fn(),
        insertBefore: vi.fn(),
        firstChild: {},
      } as any;

      const options: ExportOptions = {
        format: 'svg',
        includeScaleBar: true,
        includeNorthArrow: false,
      };

      await ExportUtils.exportToSVG(mockSvgElement, options);

      // Verify scale bar elements were created
      expect(mockCreateElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'g');
      expect(mockCreateElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'rect');
      expect(mockCreateElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'text');
    });

    it('should create north arrow with proper elements', async () => {
      const mockSvgElement = {
        cloneNode: vi.fn(() => ({
          ...mockSvgElement,
          setAttribute: vi.fn(),
          getAttribute: vi.fn((attr: string) => {
            if (attr === 'width') return '400';
            if (attr === 'height') return '300';
            return null;
          }),
          appendChild: vi.fn(),
          insertBefore: vi.fn(),
          firstChild: {},
        })),
        setAttribute: vi.fn(),
        getAttribute: vi.fn((attr: string) => {
          if (attr === 'width') return '400';
          if (attr === 'height') return '300';
          return null;
        }),
        appendChild: vi.fn(),
        insertBefore: vi.fn(),
        firstChild: {},
      } as any;

      const options: ExportOptions = {
        format: 'svg',
        includeScaleBar: false,
        includeNorthArrow: true,
      };

      await ExportUtils.exportToSVG(mockSvgElement, options);

      // Verify north arrow elements were created
      expect(mockCreateElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'g');
      expect(mockCreateElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'circle');
      expect(mockCreateElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'polygon');
      expect(mockCreateElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'text');
    });
  });
});