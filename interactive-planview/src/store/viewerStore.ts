import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ViewerState,
  Transform,
  IFCElement,
  ElementStyle,
  IFCClass,
  ViewerError,
} from '@/types';

// Default transform state
const DEFAULT_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scale: 1,
};

// Default viewer state
const DEFAULT_VIEWER_STATE: ViewerState = {
  transform: DEFAULT_TRANSFORM,
  visibleLayers: new Set<string>(),
  selectedElement: undefined,
  measurementMode: false,
  measurements: [],
  styleOverrides: new Map<string, ElementStyle>(),
  splitViewMode: false,
  currentStorey: '',
  hoveredElement: undefined,
};

interface ViewerStore extends ViewerState {
  // Loading state
  isLoading: boolean;
  error: ViewerError | null;
  
  // Available data
  elements: Map<string, IFCElement>;
  availableLayers: IFCClass[];
  availableStoreys: string[];
  
  // Transform actions
  setTransform: (transform: Partial<Transform>) => void;
  resetTransform: () => void;
  updateTransform: (delta: Partial<Transform>) => void;
  
  // Layer visibility actions
  toggleLayer: (className: string) => void;
  showAllLayers: () => void;
  hideAllLayers: () => void;
  setLayerVisibility: (className: string, visible: boolean) => void;
  setVisibleLayers: (layers: Set<string>) => void;
  
  // Element selection actions
  selectElement: (element?: IFCElement) => void;
  setHoveredElement: (element?: IFCElement) => void;
  clearSelection: () => void;
  
  // Style override actions
  setElementStyle: (className: string, style: ElementStyle) => void;
  removeStyleOverride: (className: string) => void;
  clearAllStyleOverrides: () => void;
  resetElementStyle: (className: string) => void;
  
  // Storey navigation actions
  setCurrentStorey: (storey: string) => void;
  
  // Split view actions
  toggleSplitView: () => void;
  setSplitViewMode: (enabled: boolean) => void;
  
  // Data loading actions
  loadElements: (elements: IFCElement[]) => void;
  setAvailableLayers: (layers: IFCClass[]) => void;
  setAvailableStoreys: (storeys: string[]) => void;
  
  // Error handling
  setError: (error: ViewerError | null) => void;
  clearError: () => void;
  
  // Loading state
  setLoading: (loading: boolean) => void;
  
  // Reset actions
  resetViewerState: () => void;
  resetToDefaults: () => void;
}

// Persistent state configuration
interface PersistedState {
  transform: Transform;
  visibleLayers: string[]; // Convert Set to Array for JSON serialization
  styleOverrides: Record<string, ElementStyle>; // Convert Map to Record
  currentStorey: string;
  splitViewMode: boolean;
}

export const useViewerStore = create<ViewerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_VIEWER_STATE,
      isLoading: false,
      error: null,
      elements: new Map<string, IFCElement>(),
      availableLayers: [],
      availableStoreys: [],
      
      // Transform actions
      setTransform: (transform) =>
        set((state) => ({
          transform: { ...state.transform, ...transform },
        })),
      
      resetTransform: () =>
        set(() => ({
          transform: { ...DEFAULT_TRANSFORM },
        })),
      
      updateTransform: (delta) =>
        set((state) => ({
          transform: {
            x: state.transform.x + (delta.x || 0),
            y: state.transform.y + (delta.y || 0),
            scale: delta.scale !== undefined ? delta.scale : state.transform.scale,
          },
        })),
      
      // Layer visibility actions
      toggleLayer: (className) =>
        set((state) => {
          const newVisibleLayers = new Set(state.visibleLayers);
          if (newVisibleLayers.has(className)) {
            newVisibleLayers.delete(className);
          } else {
            newVisibleLayers.add(className);
          }
          return { visibleLayers: newVisibleLayers };
        }),
      
      showAllLayers: () =>
        set((state) => ({
          visibleLayers: new Set(state.availableLayers.map(layer => layer.name)),
        })),
      
      hideAllLayers: () =>
        set(() => ({
          visibleLayers: new Set<string>(),
        })),
      
      setLayerVisibility: (className, visible) =>
        set((state) => {
          const newVisibleLayers = new Set(state.visibleLayers);
          if (visible) {
            newVisibleLayers.add(className);
          } else {
            newVisibleLayers.delete(className);
          }
          return { visibleLayers: newVisibleLayers };
        }),
      
      setVisibleLayers: (layers) =>
        set(() => ({
          visibleLayers: new Set(layers),
        })),
      
      // Element selection actions
      selectElement: (element) =>
        set(() => ({
          selectedElement: element,
        })),
      
      setHoveredElement: (element) =>
        set(() => ({
          hoveredElement: element,
        })),
      
      clearSelection: () =>
        set(() => ({
          selectedElement: undefined,
          hoveredElement: undefined,
        })),
      
      // Style override actions
      setElementStyle: (className, style) =>
        set((state) => {
          const newStyleOverrides = new Map(state.styleOverrides);
          newStyleOverrides.set(className, { ...newStyleOverrides.get(className), ...style });
          return { styleOverrides: newStyleOverrides };
        }),
      
      removeStyleOverride: (className) =>
        set((state) => {
          const newStyleOverrides = new Map(state.styleOverrides);
          newStyleOverrides.delete(className);
          return { styleOverrides: newStyleOverrides };
        }),
      
      clearAllStyleOverrides: () =>
        set(() => ({
          styleOverrides: new Map<string, ElementStyle>(),
        })),
      
      resetElementStyle: (className) =>
        set((state) => {
          const newStyleOverrides = new Map(state.styleOverrides);
          newStyleOverrides.delete(className);
          return { styleOverrides: newStyleOverrides };
        }),
      
      // Storey navigation actions
      setCurrentStorey: (storey) =>
        set(() => ({
          currentStorey: storey,
        })),
      
      // Split view actions
      toggleSplitView: () =>
        set((state) => ({
          splitViewMode: !state.splitViewMode,
        })),
      
      setSplitViewMode: (enabled) =>
        set(() => ({
          splitViewMode: enabled,
        })),
      
      // Data loading actions
      loadElements: (elements) =>
        set(() => {
          const elementsMap = new Map<string, IFCElement>();
          elements.forEach(element => {
            elementsMap.set(element.guid, element);
          });
          return { elements: elementsMap };
        }),
      
      setAvailableLayers: (layers) =>
        set(() => ({
          availableLayers: layers,
        })),
      
      setAvailableStoreys: (storeys) =>
        set(() => ({
          availableStoreys: storeys,
        })),
      
      // Error handling
      setError: (error) =>
        set(() => ({
          error,
        })),
      
      clearError: () =>
        set(() => ({
          error: null,
        })),
      
      // Loading state
      setLoading: (loading) =>
        set(() => ({
          isLoading: loading,
        })),
      
      // Reset actions
      resetViewerState: () =>
        set(() => ({
          ...DEFAULT_VIEWER_STATE,
          // Keep data that shouldn't be reset
          elements: get().elements,
          availableLayers: get().availableLayers,
          availableStoreys: get().availableStoreys,
        })),
      
      resetToDefaults: () =>
        set(() => ({
          ...DEFAULT_VIEWER_STATE,
          isLoading: false,
          error: null,
          elements: new Map<string, IFCElement>(),
          availableLayers: [],
          availableStoreys: [],
        })),
    }),
    {
      name: 'interactive-planview-viewer',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        transform: state.transform,
        visibleLayers: Array.from(state.visibleLayers),
        styleOverrides: Object.fromEntries(state.styleOverrides),
        currentStorey: state.currentStorey,
        splitViewMode: state.splitViewMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert persisted arrays/objects back to Sets/Maps
          state.visibleLayers = new Set(
            (state as any).visibleLayers || []
          );
          state.styleOverrides = new Map(
            Object.entries((state as any).styleOverrides || {})
          );
        }
      },
    }
  )
);

// Selector hooks for better performance
export const useViewerTransform = () => useViewerStore((state) => state.transform);
export const useVisibleLayers = () => useViewerStore((state) => state.visibleLayers);
export const useSelectedElement = () => useViewerStore((state) => state.selectedElement);
export const useHoveredElement = () => useViewerStore((state) => state.hoveredElement);
export const useStyleOverrides = () => useViewerStore((state) => state.styleOverrides);
export const useCurrentStorey = () => useViewerStore((state) => state.currentStorey);
export const useSplitViewMode = () => useViewerStore((state) => state.splitViewMode);
export const useViewerError = () => useViewerStore((state) => state.error);
export const useViewerLoading = () => useViewerStore((state) => state.isLoading);
export const useAvailableLayers = () => useViewerStore((state) => state.availableLayers);
export const useAvailableStoreys = () => useViewerStore((state) => state.availableStoreys);
export const useElements = () => useViewerStore((state) => state.elements);