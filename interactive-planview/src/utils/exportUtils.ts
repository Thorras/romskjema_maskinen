import type { ExportOptions, ExportFormat, Transform } from '@/types';

// Export utility functions for different formats
export class ExportUtils {
  /**
   * Export SVG element to PNG using Canvas API
   */
  static async exportToPNG(
    svgElement: SVGSVGElement,
    options: ExportOptions & { resolution?: number; transform?: Transform }
  ): Promise<Blob> {
    const { resolution = 1, includeScaleBar = false, includeNorthArrow = false, transform } = options;
    
    // Validate inputs
    if (!svgElement) {
      throw new Error('SVG element is required for PNG export');
    }
    
    if (resolution <= 0 || resolution > 5) {
      throw new Error('Resolution must be between 0 and 5');
    }
    
    // Get SVG dimensions
    const svgRect = svgElement.getBoundingClientRect();
    if (svgRect.width === 0 || svgRect.height === 0) {
      throw new Error('SVG element has invalid dimensions');
    }
    
    const width = Math.round(svgRect.width * resolution);
    const height = Math.round(svgRect.height * resolution);
    
    // Check for reasonable size limits
    const maxPixels = 16777216; // 16MP limit
    if (width * height > maxPixels) {
      throw new Error(`Export size too large: ${width}x${height} pixels exceeds limit`);
    }
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context - browser may not support canvas');
    }
    
    try {
      // Set white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // Clone SVG and prepare for export
      const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
      svgClone.setAttribute('width', width.toString());
      svgClone.setAttribute('height', height.toString());
      
      // Add scale bar and north arrow if requested
      if (includeScaleBar || includeNorthArrow) {
        ExportUtils.addExportAnnotations(svgClone, { includeScaleBar, includeNorthArrow }, transform);
      }
      
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      try {
        // Load SVG into image with timeout
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('SVG image loading timeout'));
          }, 10000); // 10 second timeout
          
          img.onload = () => {
            clearTimeout(timeout);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load SVG image - may contain invalid elements'));
          };
          img.src = svgUrl;
        });
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to blob
        return new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create PNG blob - browser may not support PNG export'));
            }
          }, 'image/png', 0.95); // High quality
        });
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    } catch (error) {
      throw new Error(`PNG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Export SVG element to SVG format with current view state
   */
  static async exportToSVG(
    svgElement: SVGSVGElement,
    options: ExportOptions & { transform?: Transform }
  ): Promise<Blob> {
    const { includeScaleBar = false, includeNorthArrow = false, transform } = options;
    
    // Validate inputs
    if (!svgElement) {
      throw new Error('SVG element is required for SVG export');
    }
    
    try {
      // Clone SVG element
      const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Add XML declaration and namespace
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      
      // Add metadata
      const metadataGroup = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
      const exportInfo = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
      exportInfo.textContent = `Exported from Interactive Planview on ${new Date().toISOString()}`;
      metadataGroup.appendChild(exportInfo);
      
      // Insert metadata as first child
      if (svgClone.firstChild) {
        svgClone.insertBefore(metadataGroup, svgClone.firstChild);
      } else {
        svgClone.appendChild(metadataGroup);
      }
      
      // Add scale bar and north arrow if requested
      if (includeScaleBar || includeNorthArrow) {
        ExportUtils.addExportAnnotations(svgClone, { includeScaleBar, includeNorthArrow }, transform);
      }
      
      // Serialize SVG
      const svgData = new XMLSerializer().serializeToString(svgClone);
      const fullSvgData = `<?xml version="1.0" encoding="UTF-8"?>\n${svgData}`;
      
      return new Blob([fullSvgData], { type: 'image/svg+xml;charset=utf-8' });
    } catch (error) {
      throw new Error(`SVG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Export SVG element to PDF format
   */
  static async exportToPDF(
    svgElement: SVGSVGElement,
    options: ExportOptions & { paperSize?: string; orientation?: string; transform?: Transform }
  ): Promise<Blob> {
    // Validate inputs
    if (!svgElement) {
      throw new Error('SVG element is required for PDF export');
    }
    
    const { paperSize = 'A4', orientation = 'landscape' } = options;
    
    try {
      // For PDF export, we'll first convert to PNG and then embed in a simple PDF
      // In a real implementation, you might want to use a library like jsPDF or PDFKit
      
      const pngBlob = await ExportUtils.exportToPNG(svgElement, {
        ...options,
        resolution: 2, // Higher resolution for PDF
      });
      
      // Create a simple PDF with the PNG embedded
      // This is a basic implementation - for production use a proper PDF library
      const pdfData = await ExportUtils.createSimplePDF(pngBlob, { 
        ...options, 
        paperSize, 
        orientation 
      });
      
      return new Blob([pdfData], { type: 'application/pdf' });
    } catch (error) {
      throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Add scale bar and north arrow annotations to SVG
   */
  private static addExportAnnotations(
    svgElement: SVGSVGElement,
    options: { includeScaleBar: boolean; includeNorthArrow: boolean },
    transform?: Transform
  ): void {
    const { includeScaleBar, includeNorthArrow } = options;
    
    const svgWidth = parseFloat(svgElement.getAttribute('width') || '0');
    const svgHeight = parseFloat(svgElement.getAttribute('height') || '0');
    
    // Validate dimensions
    if (svgWidth <= 0 || svgHeight <= 0) {
      console.warn('Invalid SVG dimensions for export annotations');
      return;
    }
    
    // Create annotations group
    const annotationsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    annotationsGroup.setAttribute('class', 'export-annotations');
    annotationsGroup.setAttribute('style', 'pointer-events: none;');
    
    try {
      if (includeScaleBar) {
        const scaleBar = ExportUtils.createScaleBar(svgWidth, svgHeight, transform);
        annotationsGroup.appendChild(scaleBar);
      }
      
      if (includeNorthArrow) {
        const northArrow = ExportUtils.createNorthArrow(svgWidth, svgHeight);
        annotationsGroup.appendChild(northArrow);
      }
      
      svgElement.appendChild(annotationsGroup);
    } catch (error) {
      console.error('Error adding export annotations:', error);
      throw new Error('Failed to add export annotations');
    }
  }
  
  /**
   * Create scale bar SVG element with dynamic scaling
   */
  private static createScaleBar(svgWidth: number, svgHeight: number, transform?: Transform): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'scale-bar');
    
    // Position scale bar in bottom-left corner
    const x = 20;
    const y = svgHeight - 40;
    const scaleLength = 100; // pixels
    
    // Calculate real-world scale based on transform (if available)
    const scale = transform?.scale || 1;
    const realWorldLength = scaleLength / scale; // Convert pixels to real-world units
    
    // Determine appropriate scale value and unit
    let scaleValue: number;
    let unit: string;
    
    if (realWorldLength < 1) {
      scaleValue = Math.round(realWorldLength * 100) / 100;
      unit = 'm';
    } else if (realWorldLength < 10) {
      scaleValue = Math.round(realWorldLength * 10) / 10;
      unit = 'm';
    } else if (realWorldLength < 1000) {
      scaleValue = Math.round(realWorldLength);
      unit = 'm';
    } else {
      scaleValue = Math.round(realWorldLength / 100) / 10;
      unit = 'km';
    }
    
    // Background rectangle with shadow
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    shadow.setAttribute('x', (x - 8).toString());
    shadow.setAttribute('y', (y - 23).toString());
    shadow.setAttribute('width', (scaleLength + 56).toString());
    shadow.setAttribute('height', '33');
    shadow.setAttribute('fill', 'rgba(0, 0, 0, 0.1)');
    shadow.setAttribute('rx', '4');
    group.appendChild(shadow);
    
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', (x - 10).toString());
    bg.setAttribute('y', (y - 25).toString());
    bg.setAttribute('width', (scaleLength + 60).toString());
    bg.setAttribute('height', '35');
    bg.setAttribute('fill', 'rgba(255, 255, 255, 0.95)');
    bg.setAttribute('stroke', '#333');
    bg.setAttribute('stroke-width', '1');
    bg.setAttribute('rx', '3');
    group.appendChild(bg);
    
    // Scale line with alternating segments for better visibility
    const segments = 4;
    const segmentLength = scaleLength / segments;
    
    for (let i = 0; i < segments; i++) {
      const segmentX = x + i * segmentLength;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', segmentX.toString());
      rect.setAttribute('y', (y - 2).toString());
      rect.setAttribute('width', segmentLength.toString());
      rect.setAttribute('height', '4');
      rect.setAttribute('fill', i % 2 === 0 ? '#333' : '#fff');
      rect.setAttribute('stroke', '#333');
      rect.setAttribute('stroke-width', '0.5');
      group.appendChild(rect);
    }
    
    // Scale ticks
    for (let i = 0; i <= segments; i++) {
      const tickX = x + i * segmentLength;
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', tickX.toString());
      tick.setAttribute('y1', (y - 5).toString());
      tick.setAttribute('x2', tickX.toString());
      tick.setAttribute('y2', (y + 5).toString());
      tick.setAttribute('stroke', '#333');
      tick.setAttribute('stroke-width', '1');
      group.appendChild(tick);
    }
    
    // Scale text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', (x + scaleLength / 2).toString());
    text.setAttribute('y', (y - 10).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('font-size', '11');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('fill', '#333');
    text.textContent = `${scaleValue}${unit}`;
    group.appendChild(text);
    
    // Add "Scale" label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', (x - 5).toString());
    label.setAttribute('y', (y - 10).toString());
    label.setAttribute('text-anchor', 'start');
    label.setAttribute('font-family', 'Arial, sans-serif');
    label.setAttribute('font-size', '9');
    label.setAttribute('fill', '#666');
    label.textContent = 'Scale:';
    group.appendChild(label);
    
    return group;
  }
  
  /**
   * Create north arrow SVG element
   */
  private static createNorthArrow(svgWidth: number, svgHeight: number): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'north-arrow');
    
    // Position north arrow in top-right corner
    const x = svgWidth - 50;
    const y = 50;
    const size = 30;
    
    // Background circle
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bg.setAttribute('cx', x.toString());
    bg.setAttribute('cy', y.toString());
    bg.setAttribute('r', (size / 2 + 5).toString());
    bg.setAttribute('fill', 'rgba(255, 255, 255, 0.9)');
    bg.setAttribute('stroke', '#333');
    bg.setAttribute('stroke-width', '1');
    group.appendChild(bg);
    
    // North arrow (triangle pointing up)
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const points = [
      `${x},${y - size / 2}`, // Top point
      `${x - size / 4},${y + size / 4}`, // Bottom left
      `${x + size / 4},${y + size / 4}`, // Bottom right
    ].join(' ');
    arrow.setAttribute('points', points);
    arrow.setAttribute('fill', '#333');
    group.appendChild(arrow);
    
    // 'N' text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', (y + size / 2 + 12).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('fill', '#333');
    text.textContent = 'N';
    group.appendChild(text);
    
    return group;
  }
  
  /**
   * Create a simple PDF with embedded PNG
   * This is a basic implementation - for production use a proper PDF library
   */
  private static async createSimplePDF(pngBlob: Blob, _options: ExportOptions): Promise<ArrayBuffer> {
    // Convert PNG blob to base64
    const pngBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/png;base64, prefix
      };
      reader.readAsDataURL(pngBlob);
    });
    
    // Create basic PDF structure
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
  /XObject <<
    /Im1 4 0 R
  >>
>>
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /XObject
/Subtype /Image
/Width 612
/Height 792
/ColorSpace /DeviceRGB
/BitsPerComponent 8
/Filter /DCTDecode
/Length ${pngBase64.length}
>>
stream
${pngBase64}
endstream
endobj

5 0 obj
<<
/Length 44
>>
stream
q
612 0 0 792 0 0 cm
/Im1 Do
Q
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000348 00000 n 
0000000565 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
659
%%EOF`;
    
    return new TextEncoder().encode(pdfContent).buffer;
  }
  
  /**
   * Download blob as file
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  /**
   * Get file extension for export format
   */
  static getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'png':
        return '.png';
      case 'svg':
        return '.svg';
      case 'pdf':
        return '.pdf';
      default:
        return '.png';
    }
  }
  
  /**
   * Generate filename with timestamp
   */
  static generateFilename(format: ExportFormat, prefix = 'planview'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const extension = ExportUtils.getFileExtension(format);
    return `${prefix}_${timestamp}${extension}`;
  }
}