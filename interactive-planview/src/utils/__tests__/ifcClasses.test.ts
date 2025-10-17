import { describe, it, expect } from 'vitest';
import {
  extractIFCClasses,
  normalizeIFCClassName,
  getIFCClassDisplayName,
  getDefaultStyleForClass,
  DEFAULT_IFC_STYLES,
} from '../ifcClasses';
import type { IFCElement } from '@/types';

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
  ];

  describe('extractIFCClasses', () => {
    it('should extract unique IFC classes from elements', () => {
      const classes = extractIFCClasses(mockElements);
      expect(classes).toHaveLength(2); // wall, door

      const classNames = classes.map(c => c.name);
      expect(classNames).toContain('ifcwall');
      expect(classNames).toContain('ifcdoor');
    });

    it('should count elements correctly for each class', () => {
      const classes = extractIFCClasses(mockElements);

      const wallClass = classes.find(c => c.name === 'ifcwall');
      const doorClass = classes.find(c => c.name === 'ifcdoor');

      expect(wallClass?.count).toBe(2);
      expect(doorClass?.count).toBe(1);
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
});