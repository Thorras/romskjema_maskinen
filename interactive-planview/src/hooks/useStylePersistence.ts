import { useEffect, useCallback } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import type { ElementStyle } from '@/types';

const STYLE_STORAGE_KEY = 'interactive-planview-styles';
const STYLE_STORAGE_VERSION = '1.0';

interface StoredStyleData {
  version: string;
  timestamp: number;
  styles: Record<string, ElementStyle>;
}

export const useStylePersistence = () => {
  const styleOverrides = useViewerStore((state) => state.styleOverrides);
  const setElementStyle = useViewerStore((state) => state.setElementStyle);
  const clearAllStyleOverrides = useViewerStore((state) => state.clearAllStyleOverrides);

  // Save styles to localStorage
  const saveStyles = useCallback(() => {
    try {
      const styleData: StoredStyleData = {
        version: STYLE_STORAGE_VERSION,
        timestamp: Date.now(),
        styles: Object.fromEntries(styleOverrides),
      };
      
      localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify(styleData));
    } catch (error) {
      console.warn('Failed to save styles to localStorage:', error);
    }
  }, [styleOverrides]);

  // Load styles from localStorage
  const loadStyles = useCallback(() => {
    try {
      const stored = localStorage.getItem(STYLE_STORAGE_KEY);
      if (!stored) return false;

      const styleData: StoredStyleData = JSON.parse(stored);
      
      // Check version compatibility
      if (styleData.version !== STYLE_STORAGE_VERSION) {
        console.warn('Style storage version mismatch, clearing stored styles');
        localStorage.removeItem(STYLE_STORAGE_KEY);
        return false;
      }

      // Check if styles are not too old (30 days)
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      if (Date.now() - styleData.timestamp > maxAge) {
        console.info('Stored styles are too old, clearing');
        localStorage.removeItem(STYLE_STORAGE_KEY);
        return false;
      }

      // Clear existing styles and load stored ones
      clearAllStyleOverrides();
      
      // Apply each stored style
      Object.entries(styleData.styles).forEach(([className, style]) => {
        setElementStyle(className, style);
      });

      return true;
    } catch (error) {
      console.warn('Failed to load styles from localStorage:', error);
      return false;
    }
  }, [setElementStyle, clearAllStyleOverrides]);

  // Clear stored styles
  const clearStoredStyles = useCallback(() => {
    try {
      localStorage.removeItem(STYLE_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear stored styles:', error);
    }
  }, []);

  // Auto-save styles when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (styleOverrides.size > 0) {
        saveStyles();
      }
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [styleOverrides, saveStyles]);

  // Load styles on mount
  useEffect(() => {
    loadStyles();
  }, [loadStyles]);

  return {
    saveStyles,
    loadStyles,
    clearStoredStyles,
  };
};

export default useStylePersistence;