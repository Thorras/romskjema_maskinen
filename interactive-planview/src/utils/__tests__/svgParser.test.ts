import { describe, it, expect } from 'vitest';
import {
  parseSVGData,
  calculateOverallBounds,
  groupElementsByClass,
  extractStoreys,
} from '../svgParser';
import type { SVGData, IFCElement } from '@/types';

describe('SVG Parser', () => {
  describe('parseSVGData', () => {
    it('should parse valid SVG with path elements', () => {
      const svgData: SVGData = {
        content: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <path d="M10,10 L90,10 L90,90 L10,90 Z" class="ifcwall" id="wall-1" />
            <path d="M30,10 L30,20" class="ifcdoor" id="door-1" />
          </svg>
        `,
      };

      const elements = parseSVGData(svgData);

      expect(elements).toHaveLength(2);
      expect(elements[0].ifcClass).toBe('ifcwall');
      expect(elements[0].guid).toBe('wall-1');
      expect(elements[0].geometry.type).toBe('path');
      expect(elements[1].ifcClass).toBe('ifcdoor');
      expect(elements[1].guid).toBe('door-1');
    });

    it('should parse SVG with rectangle elements', () => {
      const svgData: SVGData = {
        content: `
          <svg xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="20" width="50" height="30" class="ifcwindow" id="window-1" />
          </svg>
        `,
      };

      const elements = parseSVGData(svgData);

      expect(elements).toHaveLength(1);
      expect(elements[0].geometry.type).toBe('rect');
      expect(elements[0].geometry.data).toEqual({
        x: 10,
        y: 20,
        width: 50,
        height: 30,
      });
      expect(elements[0].bounds).toEqual({
        minX: 10,
        minY: 20,
        maxX: 60,
        maxY: 50,
      });
    });

    it('should parse SVG with circle elements', () => {
      const svgData: SVGData = {
        content: `
          <svg xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="25" class="ifccolumn" id="column-1" />
          </svg>
        `,
      };

      const elements = parseSVGData(svgData);

      expect(elements).toHaveLength(1);
      expect(elements[0].geometry.type).toBe('circle');
      expect(elements[0].geometry.data).toEqual({
        cx: 50,
        cy: 50,
        r: 25,
      });
      expect(elements[0].bounds).toEqual({
        minX: 25,
        minY: 25,
        maxX: 75,
        maxY: 75,
      });
    });

    it('should parse SVG with line elements', () => {
      const svgData: SVGData = {
        content: `
          <svg xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="0" x2="100" y2="50" class="ifcbeam" id="beam-1" />
          </svg>
        `,
      };

      const elements = parseSVGData(svgData);

      expect(elements).toHaveLength(1);
      expect(elements[0].geometry.type).toBe('line');
      expect(elements[0].geometry.data).toEqual({
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 50,
      });
      expect(elements[0].bounds).toEqual({
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 50,
      });
    });

    it('should parse SVG with polygon elements', () => {
      const svgData: SVGData = {
        content: `
          <svg xmlns="http://www.w3.org/2000/svg">
            <polygon points="10,10 50,10 30,50" class="ifcstair" id="stair-1" />
          </svg>
        `,
      };

      const elements = parseSVGData(svgData);

      expect(elements).toHaveLength(1);
      expect(elements[0].geometry.type).toBe('polygon');
      expect(elements[0].geometry.data).toEqual({
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 10 },
          { x: 30, y: 50 },
        ],
      });
      expect(elements[0].bounds).toEqual({
        minX: 10,
        minY: 10,
        maxX: 50,
        maxY: 50,
      });
    });

    it('should extract IFC class from different attribute patterns', () => {
      const svgData: SVGData = {
        content: `
          <svg xmlns="http://www.w3.org/2000/svg">
            <rect class="ifcwall" id="wall-1" x="0" y="0" width="10" height="10" />
            <rect data-ifc-class="ifcdoor" id="door-1" x="0" y="0" width="10" height="10" />
            <rect ifc-type="ifcwindow" id="window-1" x="0" y="0" width="10" height="10" />
            <rect id="generic-1" x="0" y="0" width="10" height="10" />
          </svg>
        `,
      };

      const elements = parseSVGData(svgData);

      expect(elements).toHaveLength(4);
      expect(elements[0].ifcClass).toBe('ifcwall');
      expect(elements[1].ifcClass).toBe('ifcdoor');
      expect(elements[2].ifcClass).toBe('ifcwindow');
      expect(elements[3].ifcClass).toBe('rect'); // fallback to tag name
    });

    it('should extract properties from data attributes', () => {
      const svgData: SVGData = {
        content: `
          <svg xmlns="http://www.w3.org/2000/svg">
            <rect 
              id="wall-1" 
              class="ifcwall"
              data-material="concrete"
              data-thickness="200"
              data-storey="ground-floor"
              title="Main Wall"
              x="0" y="0" width="10" height="10"
            />
          </svg>
        `,
      };

      const elements = parseSVGData(svgData);

      expect(elements).toHaveLength(1);
      expect(elements[0].properties).toEqual({
        material: 'concrete',
        thickness: '200',
        storey: 'ground-floor',
        id: 'wall-1',
        class: 'ifcwall',
        title: 'Main Wall',
      });
    });

    it('should extract style information', () => {
      const svgData: SVGData = {
        content: `
          <svg xmlns="http://www.w3.org/2000/svg">
            <rect 
              id="wall-1"
              fill="#ff0000"
              stroke="#000000"
              stroke-width="2"
              opacity="0.8"
              x="0" y="0" width="10" height="10"
            />
          </svg>
        `,
      };

      const elements = parseSVGData(svgData);

      expect(elements).toHaveLength(1);
      expect(elements[0].style).toEqual({
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
        opacity: 0.8,
      });
    });

    it('should handle malformed SVG gracefully', () => {
      const svgData: SVGData = {
        content: '<invalid-xml>',
      };

      expect(() => parseSVGData(svgData)).toThrow('SVG parsing failed');
    });

    it('should handle SVG without root element', () => {
      const svgData: SVGData = {
        content: '<div>Not an SVG</div>',
      };

      expect(() => parseSVGData(svgData)).toThrow('Invalid SVG document');
    });

    it('should skip non-geometric elements', () => {
      const svgData: SVGData = {
        content: `
          <svg xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="pattern1">
                <rect width="10" height="10" />
              </pattern>
            </defs>
            <title>Test SVG</title>
            <desc>Description</desc>
            <rect x="0" y="0" width="10" height="10" class="ifcwall" />
          </svg>
        `,
      };

      const elements = parseSVGData(svgData);

      // Should only include the rect element, not defs, title, desc, or nested elements
      expect(elements).toHaveLength(1);
      expect(elements[0].ifcClass).toBe('ifcwall');
    });

    it('should generate fallback GUIDs for elements without IDs', () => {
      const svgData: SVGData = {
        content: `
          <svg xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="10" height="10" />
            <circle cx="50" cy="50" r="10" />
          </svg>
        `,
      };

      const elements = parseSVGData(svgData);

      expect(elements).toHaveLength(2);
      expect(elements[0].guid).toBe('element-0');
      expect(elements[1].guid).toBe('element-1');
    });
  });

  describe('calculateOverallBounds', () => {
    it('should calculate bounds for multiple elements', () => {
      const elements: IFCElement[] = [
        {
          guid: '1',
          ifcClass: 'ifcwall',
          geometry: { type: 'rect', data: { x: 0, y: 0, width: 10, height: 10 }, bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 } },
          properties: {},
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          visible: true,
          style: {},
        },
        {
          guid: '2',
          ifcClass: 'ifcdoor',
          geometry: { type: 'rect', data: { x: 20, y: 20, width: 10, height: 10 }, bounds: { minX: 20, minY: 20, maxX: 30, maxY: 30 } },
          properties: {},
          bounds: { minX: 20, minY: 20, maxX: 30, maxY: 30 },
          visible: true,
          style: {},
        },
      ];

      const bounds = calculateOverallBounds(elements);

      expect(bounds).toEqual({
        minX: 0,
        minY: 0,
        maxX: 30,
        maxY: 30,
      });
    });

    it('should return null for empty element array', () => {
      const bounds = calculateOverallBounds([]);
      expect(bounds).toBeNull();
    });
  });

  describe('groupElementsByClass', () => {
    it('should group elements by IFC class', () => {
      const elements: IFCElement[] = [
        {
          guid: '1',
          ifcClass: 'ifcwall',
          geometry: { type: 'rect', data: { x: 0, y: 0, width: 10, height: 10 }, bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 } },
          properties: {},
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          visible: true,
          style: {},
        },
        {
          guid: '2',
          ifcClass: 'ifcwall',
          geometry: { type: 'rect', data: { x: 0, y: 0, width: 10, height: 10 }, bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 } },
          properties: {},
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          visible: true,
          style: {},
        },
        {
          guid: '3',
          ifcClass: 'ifcdoor',
          geometry: { type: 'rect', data: { x: 0, y: 0, width: 10, height: 10 }, bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 } },
          properties: {},
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          visible: true,
          style: {},
        },
      ];

      const groups = groupElementsByClass(elements);

      expect(groups.size).toBe(2);
      expect(groups.get('ifcwall')).toHaveLength(2);
      expect(groups.get('ifcdoor')).toHaveLength(1);
    });
  });

  describe('extractStoreys', () => {
    it('should extract storeys from metadata', () => {
      const svgData: SVGData = {
        content: '<svg></svg>',
        metadata: {
          storeys: ['Ground Floor', 'First Floor', 'Second Floor'],
        },
      };

      const storeys = extractStoreys(svgData, []);

      expect(storeys).toEqual(['Ground Floor', 'First Floor', 'Second Floor']);
    });

    it('should extract storeys from element properties', () => {
      const svgData: SVGData = {
        content: '<svg></svg>',
      };

      const elements: IFCElement[] = [
        {
          guid: '1',
          ifcClass: 'ifcwall',
          geometry: { type: 'rect', data: { x: 0, y: 0, width: 10, height: 10 }, bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 } },
          properties: { storey: 'Ground Floor' },
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          visible: true,
          style: {},
        },
        {
          guid: '2',
          ifcClass: 'ifcdoor',
          geometry: { type: 'rect', data: { x: 0, y: 0, width: 10, height: 10 }, bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 } },
          properties: { level: 'First Floor' },
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          visible: true,
          style: {},
        },
      ];

      const storeys = extractStoreys(svgData, elements);

      expect(storeys).toEqual(['First Floor', 'Ground Floor']); // sorted
    });

    it('should return default storey when none found', () => {
      const svgData: SVGData = {
        content: '<svg></svg>',
      };

      const storeys = extractStoreys(svgData, []);

      expect(storeys).toEqual(['Ground Floor']);
    });
  });
});
