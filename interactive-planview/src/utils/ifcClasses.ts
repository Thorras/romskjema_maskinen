import type { IFCElement, IFCClass, ElementStyle } from '@/types';

/**
 * IFC class management utilities
 */

/**
 * Default styles for common IFC classes
 */
export const DEFAULT_IFC_STYLES: Record<string, ElementStyle> = {
  ifcwall: {
    fill: 'none',
    stroke: '#2d3748',
    strokeWidth: 2,
    opacity: 1,
  },
  ifcdoor: {
    fill: '#d69e2e',
    stroke: '#b7791f',
    strokeWidth: 1,
    opacity: 0.8,
  },
  ifcwindow: {
    fill: '#3182ce',
    stroke: '#2c5282',
    strokeWidth: 1,
    opacity: 0.6,
  },
  ifcslab: {
    fill: '#718096',
    stroke: '#4a5568',
    strokeWidth: 1,
    opacity: 0.7,
  },
  ifccolumn: {
    fill: '#1a202c',
    stroke: '#2d3748',
    strokeWidth: 2,
    opacity: 1,
  },
  ifcbeam: {
    fill: '#2d3748',
    stroke: '#1a202c',
    strokeWidth: 2,
    opacity: 1,
  },
  ifcstair: {
    fill: '#805ad5',
    stroke: '#553c9a',
    strokeWidth: 1,
    opacity: 0.8,
  },
  ifcrailing: {
    fill: 'none',
    stroke: '#e53e3e',
    strokeWidth: 2,
    opacity: 1,
  },
  ifcfurnishingelement: {
    fill: '#38a169',
    stroke: '#2f855a',
    strokeWidth: 1,
    opacity: 0.7,
  },
  ifcspace: {
    fill: '#f7fafc',
    stroke: '#cbd5e0',
    strokeWidth: 1,
    opacity: 0.3,
  },
  // Generic fallback
  default: {
    fill: 'none',
    stroke: '#a0aec0',
    strokeWidth: 1,
    opacity: 1,
  },
};

/**
 * Human-readable display names for IFC classes
 */
export const IFC_CLASS_DISPLAY_NAMES: Record<string, string> = {
  ifcwall: 'Walls',
  ifcdoor: 'Doors',
  ifcwindow: 'Windows',
  ifcslab: 'Slabs',
  ifccolumn: 'Columns',
  ifcbeam: 'Beams',
  ifcstair: 'Stairs',
  ifcrailing: 'Railings',
  ifcfurnishingelement: 'Furniture',
  ifcspace: 'Spaces',
  ifcroof: 'Roofs',
  ifcwallstandardcase: 'Standard Walls',
  ifcdoorstandardcase: 'Standard Doors',
  ifcwindowstandardcase: 'Standard Windows',
  ifcmember: 'Members',
  ifcplate: 'Plates',
  ifccurtainwall: 'Curtain Walls',
  ifcbuildingelementproxy: 'Building Elements',
  ifcflowsegment: 'Flow Segments',
  ifcflowterminal: 'Flow Terminals',
  ifcflowfitting: 'Flow Fittings',
  ifcdistributionelement: 'Distribution Elements',
};

/**
 * Extract unique IFC classes from elements
 */
export function extractIFCClasses(elements: IFCElement[]): IFCClass[] {
  const classMap = new Map<string, { elements: IFCElement[]; count: number }>();
  
  // Group elements by IFC class
  elements.forEach(element => {
    const className = normalizeIFCClassName(element.ifcClass);
    
    if (!classMap.has(className)) {
      classMap.set(className, { elements: [], count: 0 });
    }
    
    const classInfo = classMap.get(className)!;
    classInfo.elements.push(element);
    classInfo.count++;
  });
  
  // Convert to IFCClass array
  const ifcClasses: IFCClass[] = [];
  
  classMap.forEach((classInfo, className) => {
    const displayName = getIFCClassDisplayName(className);
    const style = getDefaultStyleForClass(className);
    
    ifcClasses.push({
      name: className,
      displayName,
      count: classInfo.count,
      visible: true,
      style,
    });
  });
  
  // Sort by display name for consistent ordering
  ifcClasses.sort((a, b) => a.displayName.localeCompare(b.displayName));
  
  return ifcClasses;
}

/**
 * Normalize IFC class name to lowercase and remove prefixes
 */
export function normalizeIFCClassName(className: string): string {
  return className.toLowerCase().replace(/^ifc/, 'ifc');
}

/**
 * Get human-readable display name for IFC class
 */
export function getIFCClassDisplayName(className: string): string {
  const normalizedName = normalizeIFCClassName(className);
  return IFC_CLASS_DISPLAY_NAMES[normalizedName] || 
         className.charAt(0).toUpperCase() + className.slice(1);
}

/**
 * Get default style for IFC class
 */
export function getDefaultStyleForClass(className: string): ElementStyle {
  const normalizedName = normalizeIFCClassName(className);
  return DEFAULT_IFC_STYLES[normalizedName] ? 
    { ...DEFAULT_IFC_STYLES[normalizedName] } : 
    { ...DEFAULT_IFC_STYLES.default };
}

/**
 * Filter elements by IFC class visibility
 */
export function filterElementsByVisibility(
  elements: IFCElement[],
  visibleClasses: Set<string>
): IFCElement[] {
  return elements.filter(element => {
    const normalizedClass = normalizeIFCClassName(element.ifcClass);
    return visibleClasses.has(normalizedClass);
  });
}

/**
 * Update element visibility based on class visibility settings
 */
export function updateElementVisibility(
  elements: IFCElement[],
  visibleClasses: Set<string>
): IFCElement[] {
  return elements.map(element => ({
    ...element,
    visible: visibleClasses.has(normalizeIFCClassName(element.ifcClass)),
  }));
}

/**
 * Get elements belonging to a specific IFC class
 */
export function getElementsByClass(elements: IFCElement[], className: string): IFCElement[] {
  const normalizedClass = normalizeIFCClassName(className);
  return elements.filter(element => 
    normalizeIFCClassName(element.ifcClass) === normalizedClass
  );
}

/**
 * Get statistics about IFC classes in the dataset
 */
export function getIFCClassStatistics(elements: IFCElement[]): {
  totalElements: number;
  totalClasses: number;
  classDistribution: Array<{ className: string; count: number; percentage: number }>;
} {
  const totalElements = elements.length;
  const classMap = new Map<string, number>();
  
  elements.forEach(element => {
    const className = normalizeIFCClassName(element.ifcClass);
    classMap.set(className, (classMap.get(className) || 0) + 1);
  });
  
  const classDistribution = Array.from(classMap.entries())
    .map(([className, count]) => ({
      className: getIFCClassDisplayName(className),
      count,
      percentage: (count / totalElements) * 100,
    }))
    .sort((a, b) => b.count - a.count);
  
  return {
    totalElements,
    totalClasses: classMap.size,
    classDistribution,
  };
}

/**
 * Create a color palette for IFC classes
 */
export function generateIFCClassColors(classNames: string[]): Record<string, string> {
  const colors = [
    '#e53e3e', '#d69e2e', '#38a169', '#3182ce', '#805ad5',
    '#dd6b20', '#319795', '#2b6cb0', '#553c9a', '#c53030',
    '#b7791f', '#2f855a', '#2c5282', '#44337a', '#9c4221',
  ];
  
  const colorMap: Record<string, string> = {};
  
  classNames.forEach((className, index) => {
    const normalizedName = normalizeIFCClassName(className);
    colorMap[normalizedName] = colors[index % colors.length];
  });
  
  return colorMap;
}

/**
 * Validate IFC class name
 */
export function isValidIFCClassName(className: string): boolean {
  if (!className || typeof className !== 'string') {
    return false;
  }
  
  const normalizedName = className.toLowerCase();
  return normalizedName.startsWith('ifc') && normalizedName.length > 3;
}

/**
 * Search IFC classes by name or display name
 */
export function searchIFCClasses(
  classes: IFCClass[],
  searchTerm: string
): IFCClass[] {
  if (!searchTerm.trim()) {
    return classes;
  }
  
  const term = searchTerm.toLowerCase();
  
  return classes.filter(ifcClass => 
    ifcClass.name.toLowerCase().includes(term) ||
    ifcClass.displayName.toLowerCase().includes(term)
  );
}

/**
 * Sort IFC classes by different criteria
 */
export function sortIFCClasses(
  classes: IFCClass[],
  sortBy: 'name' | 'displayName' | 'count' = 'displayName',
  ascending: boolean = true
): IFCClass[] {
  const sorted = [...classes].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'displayName':
        comparison = a.displayName.localeCompare(b.displayName);
        break;
      case 'count':
        comparison = a.count - b.count;
        break;
    }
    
    return ascending ? comparison : -comparison;
  });
  
  return sorted;
}