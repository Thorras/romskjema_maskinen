import { describe, it, expect } from 'vitest';
import {
  extractIFCClasses,
  normalizeIFCClassName,
  getIFCClassDisplayName,
  getDefaultStyleForClass,
  filterElementsByVisibility,
  updateElementVisibility,
  getElementsByClass,
  getIFCClassStatistics,
  generateIFCClassColors,
  isValidIFCClassName,
  searchIFCClasses,
  sortIFCClasses,
  DEFAULT_IFC_STYLES,
} from '../ifcClasses';
import type { IFCElement, IFCClass } from '@/types';

describe('IFC Classes', () => {
  const mockElements: IFCElement[] = [
    {
      guid: 'wall-1',
      ifcClass: 'IfcWall',
      geometry: {
        type: 'rect',
        data: { x: 0, y: 0, width: 10, height: 10 },
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      },
      properties: { material: 'concrete' },
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      visible: true,
      style: {},
    },
    {
      guid: 'wall-2',
      ifcClass: 'ifcwall',
      geometry: {
        type: 'rect',
        data: { x: 10, y: 0, width: 10, height: 10 },
        bounds: { minX: 10, minY: 0, maxX: 20, maxY: 10 },
      },
      properties: { material: 'brick' },
      bounds: { minX: 10, minY: 0, maxX: 20, maxY: 10 },
      visible: true,
      style: {},
    },
    {
      guid: 'door-1',
      ifcClass: 'IfcDoor',
      geometry: {
        type: 'rect',
        data: { x: 5, y: 0, width: 3, height: 2 },
        bounds: { minX: 5, minY: 0, maxX: 8, maxY: 2 },
      },
      properties: { type: 'entrance' },
      bounds: { minX: 5, minY: 0, maxX: 8, maxY: 2 },
      visible: true,
      style: {},
    },
    {
      guid: 'window-1',
      ifcClass: 'ifcwindow',
      geometry: {
        type: 'rect',
        data: { x: 15, y: 5, width: 5, height: 3 },
        bounds: { minX: 15, minY: 5, maxX: 20, maxY: 8 },
      },
      properties: { glazing: 'double' },
      bounds: { minX: 15, minY: 5, maxX: 20, maxY: 8 },
      visible: true,
      style: {},
    },
  ];

  describe('extractIFCClasses', () => {
    it('should extract unique IFC classes from elements', () => {
      const classes = extractIFCClasses(mockElements);
      expect(classes).toHaveLength(3); // wall, door, window
      
      const classNames = classes.map(c => c.name);
      expect(classNames).toContain('ifcwall');
      expect(classNames).toContain('ifcdoor');
      expect(classNames).toContain('ifcwindow');
    });

    it('should count elements correctly for each class', () => {
      const classes = extractIFCClasses(mockElements);
      
      const wallClass = classes.find(c => c.name === 'ifcwall');
      const doorClass = classes.find(c => c.name === 'ifcdoor');
      const windowClass = classes.find(c => c.name === 'ifcwindow');

      expect(wallClass?.count).toBe(2);
      expect(doorClass?.count).toBe(1);
      expect(windowClass?.count).toBe(1);
    });
  });

  describe('normalizeIFCClassName', () => {
    it('should normalize class names to lowercase', () => {
      expect(normalizeIFCClassName('IfcWall')).toBe('ifcwall');
      expect(normalizeIFCClassName('IFCDOOR')).toBe('ifcdoor');
      expect(normalizeIFCClassName('ifcWindow')).toBe('ifcwindow');
    });
  });

  describe('getIFCClassDisplayName', () => {
    it('should return display names for known classes', () => {
      expect(getIFCClassDisplayName('ifcwall')).toBe('Walls');
      expect(getIFCClassDisplayName('ifcdoor')).toBe('Doors');
      expect(getIFCClassDisplayName('ifcwindow')).toBe('Windows');
    });

    it('should return capitalized name for unknown classes', () => {
      expect(getIFCClassDisplayName('ifcunknown')).toBe('Ifcunknown');
      expect(getIFCClassDisplayName('customclass')).toBe('Customclass');
    });
  });

  describe('getDefaultStyleForClass', () => {
    it('should return default styles for known classes', () => {
      const wallStyle = getDefaultStyleForClass('ifcwall');
      expect(wallStyle).toEqual(DEFAULT_IFC_STYLES.ifcwall);
      
      const doorStyle = getDefaultStyleForClass('ifcdoor');
      expect(doorStyle).toEqual(DEFAULT_IFC_STYLES.ifcdoor);
    });

    it('should return default style for unknown classes', () => {
      const unknownStyle = getDefaultStyleForClass('ifcunknown');
      expect(unknownStyle).toEqual(DEFAULT_IFC_STYLES.default);
    });
  });

  describe('filterElementsByVisibility', () => {
    it('should filter elements by visible classes', () => {
      const visibleClasses = new Set(['ifcwall', 'ifcdoor']);
      const filtered = filterElementsByVisibility(mockElements, visibleClasses);

      expect(filtered).toHaveLength(3); // 2 walls + 1 door
    });

    it('should return empty array when no classes are visible', () => {
      const visibleClasses = new Set<string>();
      const filtered = filterElementsByVisibility(mockElements, visibleClasses);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('updateElementVisibility', () => {
    it('should update element visibility based on class visibility', () => {
      const visibleClasses = new Set(['ifcwall']);
      const updated = updateElementVisibility(mockElements, visibleClasses);

      const wallElements = updated.filter(el => normalizeIFCClassName(el.ifcClass) === 'ifcwall');
      const nonWallElements = updated.filter(el => normalizeIFCClassName(el.ifcClass) !== 'ifcwall');

      expect(wallElements.every(el => el.visible)).toBe(true);
      expect(nonWallElements.every(el => !el.visible)).toBe(true);
    });
  });

  describe('getElementsByClass', () => {
    it('should return elements of specific class', () => {
      const wallElements = getElementsByClass(mockElements, 'ifcwall');
      expect(wallElements).toHaveLength(2);

      const doorElements = getElementsByClass(mockElements, 'ifcdoor');
      expect(doorElements).toHaveLength(1);
      expect(doorElements[0].guid).toBe('door-1');
    });
  });

  describe('getIFCClassStatistics', () => {
    it('should return correct statistics', () => {
      const stats = getIFCClassStatistics(mockElements);

      expect(stats.totalElements).toBe(4);
      expect(stats.totalClasses).toBe(3);
      expect(stats.classDistribution).toHaveLength(3);
    });
  });

  describe('generateIFCClassColors', () => {
    it('should generate colors for class names', () => {
      const classNames = ['ifcwall', 'ifcdoor', 'ifcwindow'];
      const colors = generateIFCClassColors(classNames);

      expect(Object.keys(colors)).toHaveLength(3);
      expect(colors.ifcwall).toBeDefined();
      expect(colors.ifcdoor).toBeDefined();
      expect(colors.ifcwindow).toBeDefined();
    });
  });

  describe('isValidIFCClassName', () => {
    it('should validate correct IFC class names', () => {
      expect(isValidIFCClassName('ifcwall')).toBe(true);
      expect(isValidIFCClassName('IfcWall')).toBe(true);
      expect(isValidIFCClassName('IFCWALLSTANDARDCASE')).toBe(true);
    });

    it('should reject invalid class names', () => {
      expect(isValidIFCClassName('wall')).toBe(false); // No ifc prefix
      expect(isValidIFCClassName('ifc')).toBe(false); // Too short
      expect(isValidIFCClassName('')).toBe(false); // Empty
    });
  });

  describe('searchIFCClasses', () => {
    const mockClasses: IFCClass[] = [
      {
        name: 'ifcwall',
        displayName: 'Walls',
        count: 2,
        visible: true,
        style: {},
      },
      {
        name: 'ifcdoor',
        displayName: 'Doors',
        count: 1,
        visible: true,
        style: {},
      },
    ];

    it('should search by class name', () => {
      const results = searchIFCClasses(mockClasses, 'wall');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('ifcwall');
    });

    it('should return all classes for empty search', () => {
      const results = searchIFCClasses(mockClasses, '');
      expect(results).toHaveLength(mockClasses.length);
    });
  });

  describe('sortIFCClasses', () => {
    const mockClasses: IFCClass[] = [
      {
        name: 'ifcwindow',
        displayName: 'Windows',
        count: 1,
        visible: true,
        style: {},
      },
      {
        name: 'ifcwall',
        displayName: 'Walls',
        count: 3,
        visible: true,
        style: {},
      },
    ];

    it('should sort by display name ascending by default', () => {
      const sorted = sortIFCClasses(mockClasses);
      
      expect(sorted[0].displayName).toBe('Walls');
      expect(sorted[1].displayName).toBe('Windows');
    });

    it('should sort by count descending', () => {
      const sorted = sortIFCClasses(mockClasses, 'count', false);
      
      expect(sorted[0].count).toBe(3);
      expect(sorted[1].count).toBe(1);
    });
  });
});